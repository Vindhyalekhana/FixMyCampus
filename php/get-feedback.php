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

$complaintId = filter_input(INPUT_GET, "complaint_id", FILTER_VALIDATE_INT);

if (!$complaintId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid complaint ID."
    ]);
    exit;
}

try {
    // Verify that the complaint belongs to the logged-in student.
    $stmt = $pdo->prepare(
        "SELECT complaint_id, status
        FROM complaints
        WHERE complaint_id = ?
            AND student_id = ?
        LIMIT 1"
    );

    $stmt->execute([
        $complaintId,
        $_SESSION["user_id"]
    ]);

    $complaint = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$complaint) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Complaint not found."
        ]);
        exit;
    }

    // Retrieve feedback submitted for this complaint.
    $stmt = $pdo->prepare(
        "SELECT
            feedback_id,
            complaint_id,
            rating,
            comment,
            created_at
        FROM feedback
        WHERE complaint_id = ?
            AND student_id = ?
        LIMIT 1"
    );

    $stmt->execute([
        $complaintId,
        $_SESSION["user_id"]
    ]);

    $feedback = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "has_feedback" => $feedback !== false,
        "feedback" => $feedback ?: null
    ]);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to load feedback."
    ]);
}