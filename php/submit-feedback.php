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

$data = json_decode(file_get_contents("php://input"), true);

$complaintId = isset($data["complaint_id"])
    ? filter_var($data["complaint_id"], FILTER_VALIDATE_INT)
    : false;

$rating = isset($data["rating"])
    ? filter_var($data["rating"], FILTER_VALIDATE_INT)
    : false;

$comment = isset($data["comment"])
    ? trim($data["comment"])
    : "";

if (!$complaintId || !$rating) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Complaint ID and rating are required."
    ]);
    exit;
}

if ($rating < 1 || $rating > 5) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Rating must be between 1 and 5."
    ]);
    exit;
}

try {
    $pdo->beginTransaction();

    // Verify that the complaint belongs to the logged-in student and is closed.
    $stmt = $pdo->prepare(
        "SELECT
            complaint_id,
            status
        FROM complaints
        WHERE complaint_id = ?
            AND student_id = ?
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

    if ($complaint["status"] !== "Closed") {
        $pdo->rollBack();

        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Feedback can only be submitted for closed complaints."
        ]);
        exit;
    }

    // Prevent duplicate feedback submissions.
    $stmt = $pdo->prepare(
        "SELECT feedback_id
        FROM feedback
        WHERE complaint_id = ?
        LIMIT 1"
    );

    $stmt->execute([
        $complaintId
    ]);

    if ($stmt->fetch(PDO::FETCH_ASSOC)) {
        $pdo->rollBack();

        http_response_code(409);
        echo json_encode([
            "success" => false,
            "message" => "Feedback has already been submitted for this complaint."
        ]);
        exit;
    }

    // Store the student's feedback.
    $stmt = $pdo->prepare(
        "INSERT INTO feedback
            (complaint_id, student_id, rating, comment)
        VALUES
            (?, ?, ?, ?)"
    );

    $stmt->execute([
        $complaintId,
        $_SESSION["user_id"],
        $rating,
        $comment !== "" ? $comment : null
    ]);

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "Feedback submitted successfully."
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to submit feedback."
    ]);
}