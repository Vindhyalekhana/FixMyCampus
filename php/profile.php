<?php

session_start();

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Authentication required."
    ]);

    exit;
}

require_once "db.php";

try {
    $userId = (int) $_SESSION["user_id"];

    $stmt = $pdo->prepare(
        "SELECT
            user_id,
            name,
            email,
            phone,
            profile_picture,
            role,
            status,
            created_at
         FROM users
         WHERE user_id = :user_id
         LIMIT 1"
    );

    $stmt->execute([
        ":user_id" => $userId
    ]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);

        echo json_encode([
            "success" => false,
            "message" => "User profile not found."
        ]);

        exit;
    }

    echo json_encode([
        "success" => true,
        "user" => $user
    ]);
} catch (PDOException $e) {
    error_log("Profile loading error: " . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to load profile."
    ]);
}