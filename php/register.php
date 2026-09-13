<?php

header("Content-Type: application/json");

require_once "db.php";


$data = json_decode(
    file_get_contents("php://input"),
    true
);


$name = trim($data["name"] ?? "");
$email = trim($data["email"] ?? "");
$phone = trim($data["phone"] ?? "");
$password = $data["password"] ?? "";


if (
    $name === "" ||
    $email === "" ||
    $phone === "" ||
    $password === ""
) {

    echo json_encode([
        "success" => false,
        "message" => "All fields are required."
    ]);

    exit;
}


if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {

    echo json_encode([
        "success" => false,
        "message" => "Please enter a valid email address."
    ]);

    exit;
}


if (strlen($password) < 8) {

    echo json_encode([
        "success" => false,
        "message" => "Password must contain at least 8 characters."
    ]);

    exit;
}


try {

    $stmt = $pdo->prepare(
        "SELECT user_id
         FROM users
         WHERE email = ?"
    );

    $stmt->execute([$email]);


    if ($stmt->fetch()) {

        echo json_encode([
            "success" => false,
            "message" => "An account with this email already exists."
        ]);

        exit;
    }


    $hashedPassword = password_hash(
        $password,
        PASSWORD_DEFAULT
    );


    $stmt = $pdo->prepare(
        "INSERT INTO users
        (name, email, phone, password, role)
        VALUES (?, ?, ?, ?, 'student')"
    );


    $stmt->execute([
        $name,
        $email,
        $phone,
        $hashedPassword
    ]);


    echo json_encode([
        "success" => true,
        "message" => "Student account created successfully."
    ]);


} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to create the account."
    ]);
}
