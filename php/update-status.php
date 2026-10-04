<?php

require_once __DIR__ . "/security.php";

header("Content-Type: application/json");

require_once __DIR__ . "/db.php";

requirePostRequest();
requireRole(["staff"]);
requireCsrfToken();

$data = json_decode(
    file_get_contents("php://input"),
    true
);

$complaintId = filter_var(
    $data["complaint_id"] ?? null,
    FILTER_VALIDATE_INT
);

$status = trim($data["status"] ?? "");
$remarks = trim($data["remarks"] ?? "");

$allowedStatuses = [
    "In Progress",
    "Resolved"
];

if (!$complaintId || !in_array($status, $allowedStatuses, true)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid complaint or status."
    ]);

    exit;
}

if ($remarks === "") {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Remarks are required."
    ]);

    exit;
}

try {
    // Verify that the complaint is assigned to the logged-in staff member.
    $stmt = $pdo->prepare(
        "SELECT
            c.complaint_id,
            c.complaint_code,
            c.status,
            c.student_id,
            sa.assignment_id
         FROM complaints c
         INNER JOIN staff_assignments sa
            ON c.complaint_id = sa.complaint_id
         WHERE c.complaint_id = ?
           AND sa.staff_id = ?
           AND sa.assignment_id = (
                SELECT MAX(sa2.assignment_id)
                FROM staff_assignments sa2
                WHERE sa2.complaint_id = c.complaint_id
           )
         LIMIT 1"
    );

    $stmt->execute([
        $complaintId,
        $_SESSION["user_id"]
    ]);

    $complaint = $stmt->fetch();

    if (!$complaint) {
        http_response_code(404);

        echo json_encode([
            "success" => false,
            "message" => "Complaint not found."
        ]);

        exit;
    }

    $oldStatus = $complaint["status"];

    $validTransition =
        ($oldStatus === "Assigned" && $status === "In Progress") ||
        ($oldStatus === "In Progress" && $status === "Resolved");

    if (!$validTransition) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Invalid status transition."
        ]);

        exit;
    }

    $pdo->beginTransaction();

    if ($status === "Resolved") {
        $stmt = $pdo->prepare(
            "UPDATE complaints
             SET status = ?, resolved_at = NOW()
             WHERE complaint_id = ?"
        );

        $stmt->execute([
            $status,
            $complaintId
        ]);

        // Mark the current staff assignment as completed.
        $stmt = $pdo->prepare(
            "UPDATE staff_assignments
             SET completed_at = NOW()
             WHERE assignment_id = ?"
        );

        $stmt->execute([
            $complaint["assignment_id"]
        ]);
    } else {
        $stmt = $pdo->prepare(
            "UPDATE complaints
             SET status = ?
             WHERE complaint_id = ?"
        );

        $stmt->execute([
            $status,
            $complaintId
        ]);
    }

    // Record the status change.
    $stmt = $pdo->prepare(
        "INSERT INTO complaint_updates
        (
            complaint_id,
            updated_by,
            old_status,
            new_status,
            remarks
        )
        VALUES (?, ?, ?, ?, ?)"
    );

    $stmt->execute([
        $complaintId,
        $_SESSION["user_id"],
        $oldStatus,
        $status,
        $remarks
    ]);

    // Notify the student about the status change.
    $message = "Your complaint " .
        $complaint["complaint_code"] .
        " is now " .
        $status .
        ".";

    $stmt = $pdo->prepare(
        "INSERT INTO notifications
        (
            user_id,
            complaint_id,
            message
        )
        VALUES (?, ?, ?)"
    );

    $stmt->execute([
        $complaint["student_id"],
        $complaintId,
        $message
    ]);

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "Complaint updated successfully."
    ]);

} catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log(
        "FixMyCampus update-status error: " . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to update complaint."
    ]);
}