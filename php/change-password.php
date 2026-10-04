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

if ($_SESSION["role"] !== "admin") {
    http_response_code(403);

    echo json_encode([
        "success" => false,
        "message" => "Admin access required."
    ]);

    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Invalid request method."
    ]);

    exit;
}

$data = json_decode(
    file_get_contents("php://input"),
    true
);

if (!is_array($data)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid request data."
    ]);

    exit;
}

$currentPassword =
    isset($data["current_password"])
        ? (string) $data["current_password"]
        : "";

$newPassword =
    isset($data["new_password"])
        ? (string) $data["new_password"]
        : "";

$confirmPassword =
    isset($data["confirm_password"])
        ? (string) $data["confirm_password"]
        : "";

if ($currentPassword === "") {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Current password is required."
    ]);

    exit;
}

if ($newPassword === "") {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "New password is required."
    ]);

    exit;
}

if (strlen($newPassword) < 8) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "New password must contain at least 8 characters."
    ]);

    exit;
}

if ($newPassword !== $confirmPassword) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "New passwords do not match."
    ]);

    exit;
}

if ($currentPassword === $newPassword) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "New password must be different from the current password."
    ]);

    exit;
}

try {
    $stmt = $pdo->prepare(
        "SELECT user_id, password
         FROM users
         WHERE user_id = ?
           AND role = 'admin'
         LIMIT 1"
    );

    $stmt->execute([
        $_SESSION["user_id"]
    ]);

    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$admin) {
        http_response_code(404);

        echo json_encode([
            "success" => false,
            "message" => "Admin account not found."
        ]);

        exit;
    }

    if (!password_verify(
        $currentPassword,
        $admin["password"]
    )) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Current password is incorrect."
        ]);

        exit;
    }

    $passwordHash = password_hash(
        $newPassword,
        PASSWORD_DEFAULT
    );

    if ($passwordHash === false) {
        throw new Exception(
            "Password hashing failed."
        );
    }

    $update = $pdo->prepare(
        "UPDATE users
         SET password = ?
         WHERE user_id = ?
           AND role = 'admin'"
    );

    $update->execute([
        $passwordHash,
        $_SESSION["user_id"]
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Password changed successfully."
    ]);

} catch (Throwable $e) {
    error_log(
        "change-password.php error: " .
        $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to change the password."
    ]);
}