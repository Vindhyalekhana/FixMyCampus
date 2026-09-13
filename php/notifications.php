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

try {
    // Fetch notifications belonging only to the logged-in user.
    $stmt = $pdo->prepare(
        "SELECT
            n.notification_id,
            n.complaint_id,
            n.message,
            n.is_read,
            n.created_at,
            c.complaint_code
        FROM notifications n
        LEFT JOIN complaints c
            ON n.complaint_id = c.complaint_id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC, n.notification_id DESC
        LIMIT 50"
    );

    $stmt->execute([
        $_SESSION["user_id"]
    ]);

    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Count unread notifications for the notification badge.
    $stmt = $pdo->prepare(
        "SELECT COUNT(*)
        FROM notifications
        WHERE user_id = ?
            AND is_read = 0"
    );

    $stmt->execute([
        $_SESSION["user_id"]
    ]);

    $unreadCount = (int) $stmt->fetchColumn();

    echo json_encode([
        "success" => true,
        "notifications" => $notifications,
        "unread_count" => $unreadCount
    ]);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to load notifications."
    ]);
}