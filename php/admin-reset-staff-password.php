<?php

session_start();

header("Content-Type: application/json");

require_once "db.php";

try {

    if (!isset($_SESSION["user_id"]) || $_SESSION["role"] !== "admin") {
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

    $data = json_decode(file_get_contents("php://input"), true);

    if (!is_array($data)) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Invalid request data."
        ]);

        exit;
    }

    $staffId = isset($data["staff_id"])
        ? (int) $data["staff_id"]
        : 0;

    $password = isset($data["password"])
        ? trim($data["password"])
        : "";

    $confirmPassword = isset($data["confirm_password"])
        ? trim($data["confirm_password"])
        : "";

    if ($staffId <= 0) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Invalid staff account."
        ]);

        exit;
    }

    if ($password === "") {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Password is required."
        ]);

        exit;
    }

    if (strlen($password) < 8) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Password must contain at least 8 characters."
        ]);

        exit;
    }

    if ($password !== $confirmPassword) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Passwords do not match."
        ]);

        exit;
    }

    $staffQuery = $pdo->prepare(
        "SELECT user_id, name, role
         FROM users
         WHERE user_id = ?
         LIMIT 1"
    );

    $staffQuery->execute([$staffId]);

    $staff = $staffQuery->fetch(PDO::FETCH_ASSOC);

    if (!$staff) {
        http_response_code(404);

        echo json_encode([
            "success" => false,
            "message" => "Staff account not found."
        ]);

        exit;
    }

    if ($staff["role"] !== "staff") {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Password reset is available only for staff accounts."
        ]);

        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    if ($passwordHash === false) {
        throw new Exception("Password hashing failed.");
    }

    $updateQuery = $pdo->prepare(
        "UPDATE users
         SET password = ?
         WHERE user_id = ?
           AND role = 'staff'"
    );

    $updateQuery->execute([
        $passwordHash,
        $staffId
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Password reset successfully for " . $staff["name"] . "."
    ]);

} catch (Throwable $e) {

    error_log(
        "admin-reset-staff-password.php error: " . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to reset the staff password."
    ]);
}