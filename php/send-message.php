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

$complaintId = filter_var(
    $data["complaint_id"] ?? null,
    FILTER_VALIDATE_INT
);

$message = trim(
    $data["message"] ?? ""
);

if (!$complaintId || $message === "") {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Complaint ID and message are required."
    ]);
    exit;
}

if (mb_strlen($message) > 2000) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Message is too long."
    ]);
    exit;
}

try {
    $userId = $_SESSION["user_id"];
    $role = $_SESSION["role"];

    if ($role === "student") {
        $stmt = $pdo->prepare(
            "SELECT
                c.complaint_id,
                c.complaint_code,
                c.status,
                c.student_id,
                sa.staff_id
             FROM complaints c
             INNER JOIN staff_assignments sa
                ON c.complaint_id = sa.complaint_id
                AND sa.assignment_id = (
                    SELECT MAX(sa2.assignment_id)
                    FROM staff_assignments sa2
                    WHERE sa2.complaint_id = c.complaint_id
                )
             WHERE c.complaint_id = ?
               AND c.student_id = ?
             LIMIT 1"
        );

        $stmt->execute([
            $complaintId,
            $userId
        ]);

    } elseif ($role === "staff") {
        $stmt = $pdo->prepare(
            "SELECT
                c.complaint_id,
                c.complaint_code,
                c.status,
                c.student_id,
                sa.staff_id
             FROM complaints c
             INNER JOIN staff_assignments sa
                ON c.complaint_id = sa.complaint_id
                AND sa.assignment_id = (
                    SELECT MAX(sa2.assignment_id)
                    FROM staff_assignments sa2
                    WHERE sa2.complaint_id = c.complaint_id
                )
             WHERE c.complaint_id = ?
               AND sa.staff_id = ?
             LIMIT 1"
        );

        $stmt->execute([
            $complaintId,
            $userId
        ]);

    } else {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "You are not authorized to send messages."
        ]);
        exit;
    }

    $complaint = $stmt->fetch();

    if (!$complaint) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Complaint not found."
        ]);
        exit;
    }

    if ($complaint["status"] === "Closed") {
        http_response_code(403);
        echo json_encode([
            "success" => false,
            "message" => "Chat is closed for this complaint."
        ]);
        exit;
    }

    if (!$complaint["staff_id"]) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "No staff member is currently assigned."
        ]);
        exit;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO messages
        (
            complaint_id,
            sender_id,
            message
        )
        VALUES (?, ?, ?)"
    );

    $stmt->execute([
        $complaintId,
        $userId,
        $message
    ]);

    $messageId = $pdo->lastInsertId();

    $recipientId =
        $role === "student"
            ? $complaint["staff_id"]
            : $complaint["student_id"];

    $notificationMessage =
        "New chat message for complaint " .
        $complaint["complaint_code"] .
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
        $recipientId,
        $complaintId,
        $notificationMessage
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Message sent successfully.",
        "message_id" => $messageId
    ]);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to send message."
    ]);
}