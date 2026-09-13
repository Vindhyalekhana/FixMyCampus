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

$complaintId = filter_input(
    INPUT_GET,
    "complaint_id",
    FILTER_VALIDATE_INT
);

if (!$complaintId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid complaint ID."
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
                c.status,
                c.student_id,
                sa.staff_id,
                staff.name AS staff_name,
                staff.phone AS staff_phone
             FROM complaints c
             INNER JOIN staff_assignments sa
                ON c.complaint_id = sa.complaint_id
                AND sa.assignment_id = (
                    SELECT MAX(sa2.assignment_id)
                    FROM staff_assignments sa2
                    WHERE sa2.complaint_id = c.complaint_id
                )
             INNER JOIN users staff
                ON sa.staff_id = staff.user_id
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
                c.status,
                c.student_id,
                sa.staff_id,
                student.name AS student_name
             FROM complaints c
             INNER JOIN staff_assignments sa
                ON c.complaint_id = sa.complaint_id
                AND sa.assignment_id = (
                    SELECT MAX(sa2.assignment_id)
                    FROM staff_assignments sa2
                    WHERE sa2.complaint_id = c.complaint_id
                )
             INNER JOIN users student
                ON c.student_id = student.user_id
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
            "message" => "Chat access is not available for this account."
        ]);
        exit;
    }

    $complaint = $stmt->fetch();

    if (!$complaint) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Chat not found."
        ]);
        exit;
    }

    $stmt = $pdo->prepare(
        "SELECT
            m.message_id,
            m.sender_id,
            u.name AS sender_name,
            u.role AS sender_role,
            m.message,
            m.created_at,
            m.is_read
         FROM messages m
         INNER JOIN users u
            ON m.sender_id = u.user_id
         WHERE m.complaint_id = ?
         ORDER BY m.created_at ASC, m.message_id ASC"
    );

    $stmt->execute([
        $complaintId
    ]);

    $messages = $stmt->fetchAll();

    echo json_encode([
        "success" => true,
        "complaint" => $complaint,
        "messages" => $messages,
        "chat_closed" => $complaint["status"] === "Closed"
    ]);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to load chat."
    ]);
}