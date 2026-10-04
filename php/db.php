<?php

$envFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . ".env";

if (!file_exists($envFile)) {
    die("Environment configuration file not found.");
}

$env = parse_ini_file($envFile);

if ($env === false) {
    die("Unable to load environment configuration.");
}

$host = $env["DB_HOST"] ?? "";
$port = $env["DB_PORT"] ?? "3306";
$dbname = $env["DB_NAME"] ?? "";
$username = $env["DB_USER"] ?? "";
$password = $env["DB_PASSWORD"] ?? "";

if (
    $host === "" ||
    $dbname === "" ||
    $username === ""
) {
    die("Incomplete database configuration.");
}

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
        $username,
        $password
    );

    $pdo->setAttribute(
        PDO::ATTR_ERRMODE,
        PDO::ERRMODE_EXCEPTION
    );

    $pdo->setAttribute(
        PDO::ATTR_DEFAULT_FETCH_MODE,
        PDO::FETCH_ASSOC
    );

} catch (PDOException $e) {

    die("Database connection failed.");
}