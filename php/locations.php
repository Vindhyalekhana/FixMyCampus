<?php

header("Content-Type: application/json");

require_once "db.php";


try {

    $stmt = $pdo->query(
        "SELECT
            location_id,
            building,
            floor,
            room,
            description
         FROM locations
         WHERE status = 'active'
         ORDER BY building, floor, room"
    );


    $locations = $stmt->fetchAll();


    echo json_encode([
        "success" => true,
        "locations" => $locations
    ]);


} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to load locations."
    ]);

}
