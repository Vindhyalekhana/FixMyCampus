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

$data = json_decode(
    file_get_contents("php://input"),
    true
);

$messageId = filter_var(
    $data["message_id"] ?? null,
    FILTER_VALIDATE_INT
);

if (!$messageId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid message ID."
    ]);
    exit;
}

try {

    $userId = $_SESSION["user_id"];
    $role = $_SESSION["role"];

    // Mark a message as read only for its intended recipient.
    $stmt = $pdo->prepare(
        "SELECT
            m.message_id,
            m.complaint_id,
            m.sender_id,
            c.student_id,
            sa.staff_id
         FROM messages m
         INNER JOIN complaints c
            ON m.complaint_id = c.complaint_id
         LEFT JOIN staff_assignments sa
            ON c.complaint_id = sa.complaint_id
            AND sa.assignment_id = (
                SELECT MAX(sa2.assignment_id)
                FROM staff_assignments sa2
                WHERE sa2.complaint_id = c.complaint_id
            )
         WHERE m.message_id = ?
         LIMIT 1"
    );

    $stmt->execute([
        $messageId
    ]);

    $message = $stmt->fetch();

    if (!$message) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Message not found."
        ]);
        exit;
    }

    $authorized = false;

    if ($role === "student") {
        $authorized =
            $message["student_id"] == $userId;
    } elseif ($role === "staff") {
        $authorized =
            $message["staff_id"] == $userId;
    }

    if (!$authorized) {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "You are not authorized to update this message."
        ]);
        exit;
    }

    $stmt = $pdo->prepare(
        "UPDATE messages
         SET is_read = 1
         WHERE message_id = ?"
    );

    $stmt->execute([
        $messageId
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Message marked as read."
    ]);

} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to update message."
    ]);
}