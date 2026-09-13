<?php

session_start();

header("Content-Type: application/json");

require_once "db.php";

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Authentication required."
    ]);
    exit;
}

if ($_SESSION["role"] !== "student") {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Student access required."
    ]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);

$complaintId = isset($input["complaint_id"])
    ? filter_var($input["complaint_id"], FILTER_VALIDATE_INT)
    : false;

if (!$complaintId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid complaint ID."
    ]);
    exit;
}

try {
    $pdo->beginTransaction();

    // Lock and verify the complaint belongs to the logged-in student.
    $stmt = $pdo->prepare(
        "SELECT
            c.complaint_id,
            c.complaint_code,
            c.status
         FROM complaints c
         WHERE c.complaint_id = ?
           AND c.student_id = ?
         FOR UPDATE"
    );

    $stmt->execute([
        $complaintId,
        $_SESSION["user_id"]
    ]);

    $complaint = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$complaint) {
        $pdo->rollBack();

        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Complaint not found."
        ]);
        exit;
    }

    if ($complaint["status"] !== "Resolved") {
        $pdo->rollBack();

        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Only resolved complaints can be closed."
        ]);
        exit;
    }

    // Close the complaint and record the closure time.
    $stmt = $pdo->prepare(
        "UPDATE complaints
         SET
            status = 'Closed',
            closed_at = NOW()
         WHERE complaint_id = ?"
    );

    $stmt->execute([
        $complaintId
    ]);

    // Add the closure event to the complaint timeline.
    $stmt = $pdo->prepare(
        "INSERT INTO complaint_updates
            (
                complaint_id,
                updated_by,
                old_status,
                new_status,
                remarks
            )
         VALUES
            (?, ?, 'Resolved', 'Closed', ?)"
    );

    $stmt->execute([
        $complaintId,
        $_SESSION["user_id"],
        "Complaint closed by the student after confirming resolution."
    ]);

    // Find the currently assigned staff member.
    $stmt = $pdo->prepare(
        "SELECT
            sa.staff_id
         FROM staff_assignments sa
         WHERE sa.complaint_id = ?
           AND sa.assignment_id = (
                SELECT MAX(sa2.assignment_id)
                FROM staff_assignments sa2
                WHERE sa2.complaint_id = ?
           )
         LIMIT 1"
    );

    $stmt->execute([
        $complaintId,
        $complaintId
    ]);

    $assignment = $stmt->fetch(PDO::FETCH_ASSOC);

    // Notify the assigned staff member when the student closes the complaint.
    if ($assignment) {
        $stmt = $pdo->prepare(
            "INSERT INTO notifications
                (
                    user_id,
                    complaint_id,
                    message
                )
             VALUES
                (?, ?, ?)"
        );

        $stmt->execute([
            $assignment["staff_id"],
            $complaintId,
            "Complaint " . $complaint["complaint_code"] . " has been closed by the student."
        ]);
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "Complaint closed successfully."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to close the complaint."
    ]);
}