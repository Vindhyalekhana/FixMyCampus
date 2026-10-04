<?php

session_start();

header("Content-Type: application/json");

require_once __DIR__ . "/db.php";

if (!isset($_SESSION["user_id"]) || $_SESSION["role"] !== "admin") {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Admin authentication required."
    ]);

    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Only POST requests are allowed."
    ]);

    exit;
}

try {
    $input = json_decode(file_get_contents("php://input"), true);

    if (!is_array($input)) {
        throw new Exception("Invalid request data.");
    }

    $staffId = filter_var(
        $input["staff_id"] ?? null,
        FILTER_VALIDATE_INT
    );

    $name = trim($input["name"] ?? "");
    $email = strtolower(trim($input["email"] ?? ""));
    $phone = trim($input["phone"] ?? "");

    if (!$staffId || $staffId < 1) {
        throw new Exception("Invalid staff member.");
    }

    if ($name === "") {
        throw new Exception("Staff name is required.");
    }

    if (mb_strlen($name) > 100) {
        throw new Exception("Staff name must not exceed 100 characters.");
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception("Please enter a valid email address.");
    }

    if (mb_strlen($email) > 150) {
        throw new Exception("Email address must not exceed 150 characters.");
    }

    if (!preg_match("/^[0-9]{7,15}$/", $phone)) {
        throw new Exception("Phone number must contain 7 to 15 digits.");
    }

    $checkStaff = $pdo->prepare(
        "SELECT user_id, role
         FROM users
         WHERE user_id = ?
         LIMIT 1"
    );

    $checkStaff->execute([$staffId]);

    $staff = $checkStaff->fetch(PDO::FETCH_ASSOC);

    if (!$staff) {
        http_response_code(404);

        echo json_encode([
            "success" => false,
            "message" => "Staff member not found."
        ]);

        exit;
    }

    if ($staff["role"] !== "staff") {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "The selected user is not a staff member."
        ]);

        exit;
    }

    $checkEmail = $pdo->prepare(
        "SELECT user_id
         FROM users
         WHERE email = ?
           AND user_id <> ?
         LIMIT 1"
    );

    $checkEmail->execute([
        $email,
        $staffId
    ]);

    if ($checkEmail->fetch()) {
        http_response_code(409);

        echo json_encode([
            "success" => false,
            "message" => "Another account already uses this email address."
        ]);

        exit;
    }

    $update = $pdo->prepare(
        "UPDATE users
         SET name = ?,
             email = ?,
             phone = ?
         WHERE user_id = ?
           AND role = 'staff'"
    );

    $update->execute([
        $name,
        $email,
        $phone,
        $staffId
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Staff information updated successfully.",
        "staff" => [
            "user_id" => $staffId,
            "name" => $name,
            "email" => $email,
            "phone" => $phone
        ]
    ]);
} catch (PDOException $e) {
    error_log("Admin edit staff database error: " . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to update staff information."
    ]);
} catch (Exception $e) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}