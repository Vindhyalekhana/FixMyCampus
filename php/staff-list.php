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


try {

    $stmt = $pdo->query(
        "SELECT
            user_id,
            name,
            email
         FROM users
         WHERE role = 'staff'
           AND status = 'active'
         ORDER BY name"
    );


    $staff =
        $stmt->fetchAll();


    echo json_encode([

        "success" => true,

        "staff" => $staff

    ]);


} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([

        "success" => false,

        "message" =>
            "Unable to load staff."

    ]);

}
