<?php

require_once __DIR__ . "/security.php";

header("Content-Type: application/json");

requireAuthentication();

echo json_encode([
    "success" => true,
    "csrf_token" => getCsrfToken()
]);