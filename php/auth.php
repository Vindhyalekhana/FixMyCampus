<?php

require_once __DIR__ . "/security.php";

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {
    echo json_encode([
        "authenticated" => false
    ]);

    exit;
}

echo json_encode([
    "authenticated" => true,
    "user_id" => $_SESSION["user_id"],
    "name" => $_SESSION["name"] ?? "",
    "role" => $_SESSION["role"] ?? ""
]);