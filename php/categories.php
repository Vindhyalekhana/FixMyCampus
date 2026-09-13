<?php

header("Content-Type: application/json");

require_once "db.php";


try {

    $stmt = $pdo->query(
        "SELECT
            category_id,
            category_name,
            description
         FROM categories
         WHERE status = 'active'
         ORDER BY category_name"
    );


    $categories = $stmt->fetchAll();


    echo json_encode([
        "success" => true,
        "categories" => $categories
    ]);


} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to load categories."
    ]);

}
