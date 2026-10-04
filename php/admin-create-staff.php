<?php

require_once __DIR__ . "/security.php";

header("Content-Type: application/json");

require_once __DIR__ . "/db.php";

requirePostRequest();
requireRole(["admin"]);
requireCsrfToken();

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

$name = trim((string) ($input["name"] ?? ""));

$email = strtolower(
    trim((string) ($input["email"] ?? ""))
);

$phone = trim((string) ($input["phone"] ?? ""));

$password = (string) ($input["password"] ?? "");

$confirmPassword = (string) (
    $input["confirm_password"] ?? ""
);

$status = strtolower(
    trim((string) ($input["status"] ?? "active"))
);

if (
    $name === "" ||
    $email === "" ||
    $phone === "" ||
    $password === ""
) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" =>
            "Name, email, phone and password are required."
    ]);

    exit;
}

if (mb_strlen($name) > 100) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" =>
            "Name must not exceed 100 characters."
    ]);

    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" =>
            "Please enter a valid email address."
    ]);

    exit;
}

if (mb_strlen($email) > 150) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" =>
            "Email address must not exceed 150 characters."
    ]);

    exit;
}

if (!preg_match("/^[0-9]{7,15}$/", $phone)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" =>
            "Phone number must contain 7 to 15 digits."
    ]);

    exit;
}

if (strlen($password) < 8) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" =>
            "Password must contain at least 8 characters."
    ]);

    exit;
}

if ($password !== $confirmPassword) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" =>
            "Passwords do not match."
    ]);

    exit;
}

if (
    !in_array(
        $status,
        ["active", "inactive"],
        true
    )
) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" =>
            "Invalid staff account status."
    ]);

    exit;
}

try {
    $check = $pdo->prepare(
        "SELECT user_id
         FROM users
         WHERE email = ?
         LIMIT 1"
    );

    $check->execute([$email]);

    if ($check->fetch(PDO::FETCH_ASSOC)) {
        http_response_code(409);

        echo json_encode([
            "success" => false,
            "message" =>
                "An account with this email address already exists."
        ]);

        exit;
    }

    $passwordHash = password_hash(
        $password,
        PASSWORD_DEFAULT
    );

    if ($passwordHash === false) {
        throw new RuntimeException(
            "Unable to create password hash."
        );
    }

    $stmt = $pdo->prepare(
        "INSERT INTO users
            (
                name,
                email,
                phone,
                profile_picture,
                password,
                role,
                status
            )
         VALUES
            (
                ?,
                ?,
                ?,
                NULL,
                ?,
                'staff',
                ?
            )"
    );

    $stmt->execute([
        $name,
        $email,
        $phone,
        $passwordHash,
        $status
    ]);

    $staffId = (int) $pdo->lastInsertId();

    echo json_encode([
        "success" => true,
        "message" =>
            "Staff account created successfully.",
        "staff" => [
            "user_id" => $staffId,
            "name" => $name,
            "email" => $email,
            "phone" => $phone,
            "status" => $status
        ]
    ]);

} catch (PDOException $e) {

    error_log(
        "Admin create staff error: " .
        $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" =>
            "Unable to create staff account."
    ]);

} catch (Throwable $e) {

    error_log(
        "Admin create staff error: " .
        $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" =>
            "Unable to create staff account."
    ]);
}