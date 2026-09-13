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


if ($_SESSION["role"] !== "student") {

    http_response_code(403);

    echo json_encode([
        "success" => false,
        "message" => "Access denied."
    ]);

    exit;
}


try {

    $stmt = $pdo->prepare(
        "SELECT
            c.complaint_id,
            c.complaint_code,
            c.title,
            c.status,
            c.created_at,
            cat.category_name
         FROM complaints c
         INNER JOIN categories cat
            ON c.category_id = cat.category_id
         WHERE c.student_id = ?
         ORDER BY c.created_at DESC"
    );


    $stmt->execute([
        $_SESSION["user_id"]
    ]);


    $complaints = $stmt->fetchAll();


    echo json_encode([
        "success" => true,
        "complaints" => $complaints
    ]);


} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to load complaints."
    ]);
}
