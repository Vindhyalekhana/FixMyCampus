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

$data = json_decode(file_get_contents("php://input"), true);

$notificationId = isset($data["notification_id"])
    ? filter_var($data["notification_id"], FILTER_VALIDATE_INT)
    : false;

if (!$notificationId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid notification ID."
    ]);
    exit;
}

try {
    // Update only a notification owned by the logged-in user.
    $stmt = $pdo->prepare(
        "UPDATE notifications
        SET is_read = 1
        WHERE notification_id = ?
            AND user_id = ?"
    );

    $stmt->execute([
        $notificationId,
        $_SESSION["user_id"]
    ]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Notification not found."
        ]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "message" => "Notification marked as read."
    ]);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to update notification."
    ]);
}