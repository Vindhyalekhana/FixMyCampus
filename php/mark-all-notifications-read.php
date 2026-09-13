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
    // Mark all notifications belonging to the logged-in user as read.
    $stmt = $pdo->prepare(
        "UPDATE notifications
        SET is_read = 1
        WHERE user_id = ?
            AND is_read = 0"
    );

    $stmt->execute([
        $_SESSION["user_id"]
    ]);

    echo json_encode([
        "success" => true,
        "message" => "All notifications marked as read."
    ]);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to update notifications."
    ]);
}