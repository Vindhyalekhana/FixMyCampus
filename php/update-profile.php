<?php

session_start();

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Invalid request method."
    ]);

    exit;
}

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

    $input = json_decode(
        file_get_contents("php://input"),
        true
    );

    if (!is_array($input)) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Invalid request data."
        ]);

        exit;
    }

    $name = trim($input["name"] ?? "");
    $email = trim($input["email"] ?? "");
    $phone = trim($input["phone"] ?? "");

    if ($name === "") {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Name is required."
        ]);

        exit;
    }

    if (mb_strlen($name) > 100) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Name must not exceed 100 characters."
        ]);

        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Please enter a valid email address."
        ]);

        exit;
    }

    if (mb_strlen($email) > 150) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Email must not exceed 150 characters."
        ]);

        exit;
    }

    if (!preg_match("/^[0-9]{10,15}$/", $phone)) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Phone number must contain 10 to 15 digits."
        ]);

        exit;
    }

    $emailCheck = $pdo->prepare(
        "SELECT user_id
         FROM users
         WHERE email = :email
         AND user_id <> :user_id
         LIMIT 1"
    );

    $emailCheck->execute([
        ":email" => $email,
        ":user_id" => $userId
    ]);

    if ($emailCheck->fetch()) {
        http_response_code(409);

        echo json_encode([
            "success" => false,
            "message" => "This email address is already in use."
        ]);

        exit;
    }

    $stmt = $pdo->prepare(
        "UPDATE users
         SET name = :name,
             email = :email,
             phone = :phone
         WHERE user_id = :user_id"
    );

    $stmt->execute([
        ":name" => $name,
        ":email" => $email,
        ":phone" => $phone,
        ":user_id" => $userId
    ]);

    $_SESSION["name"] = $name;

    echo json_encode([
        "success" => true,
        "message" => "Profile updated successfully.",
        "user" => [
            "user_id" => $userId,
            "name" => $name,
            "email" => $email,
            "phone" => $phone
        ]
    ]);
} catch (PDOException $e) {
    error_log("Profile update error: " . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to update profile."
    ]);
}