<?php

require_once __DIR__ . "/security.php";

header("Content-Type: application/json");

require_once __DIR__ . "/db.php";

$data = json_decode(
    file_get_contents("php://input"),
    true
);

$email = trim($data["email"] ?? "");
$password = $data["password"] ?? "";

if ($email === "" || $password === "") {
    echo json_encode([
        "success" => false,
        "message" => "Email and password are required."
    ]);

    exit;
}

try {
    $stmt = $pdo->prepare(
        "SELECT
            user_id,
            name,
            email,
            password,
            role,
            status
         FROM users
         WHERE email = ?
         LIMIT 1"
    );

    $stmt->execute([$email]);

    $user = $stmt->fetch();

    if (!$user) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid email or password."
        ]);

        exit;
    }

    if ($user["status"] !== "active") {
        echo json_encode([
            "success" => false,
            "message" => "Your account is inactive."
        ]);

        exit;
    }

    if (!password_verify($password, $user["password"])) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid email or password."
        ]);

        exit;
    }

    session_regenerate_id(true);

    $_SESSION["user_id"] = $user["user_id"];
    $_SESSION["name"] = $user["name"];
    $_SESSION["role"] = $user["role"];

    if ($user["role"] === "student") {
        $redirect = "student/dashboard.html";
    } elseif ($user["role"] === "staff") {
        $redirect = "staff/dashboard.html";
    } elseif ($user["role"] === "admin") {
        $redirect = "admin/dashboard.html";
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Invalid account role."
        ]);

        exit;
    }

    echo json_encode([
        "success" => true,
        "message" => "Login successful.",
        "redirect" => $redirect
    ]);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to process login."
    ]);
}