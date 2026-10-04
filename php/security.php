<?php

$isHttps = (
    isset($_SERVER["HTTPS"]) &&
    $_SERVER["HTTPS"] !== "off"
);

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        "httponly" => true,
        "secure" => $isHttps,
        "samesite" => "Lax"
    ]);

    session_start();
}

/*
 * Create a CSRF token for the current session.
 */
if (empty($_SESSION["csrf_token"])) {
    $_SESSION["csrf_token"] = bin2hex(
        random_bytes(32)
    );
}

/*
 * Return the current CSRF token.
 */
function getCsrfToken(): string
{
    return $_SESSION["csrf_token"];
}

/*
 * Validate the CSRF token supplied by the client.
 */
function validateCsrfToken(?string $submittedToken): bool
{
    if (
        empty($_SESSION["csrf_token"]) ||
        empty($submittedToken)
    ) {
        return false;
    }

    return hash_equals(
        $_SESSION["csrf_token"],
        $submittedToken
    );
}

/*
 * Require an authenticated user.
 */
function requireAuthentication(): void
{
    if (!isset($_SESSION["user_id"])) {
        http_response_code(401);

        echo json_encode([
            "success" => false,
            "message" => "Authentication required."
        ]);

        exit;
    }
}

/*
 * Require one of the specified roles.
 */
function requireRole(array $allowedRoles): void
{
    requireAuthentication();

    $role = $_SESSION["role"] ?? null;

    if (
        $role === null ||
        !in_array($role, $allowedRoles, true)
    ) {
        http_response_code(403);

        echo json_encode([
            "success" => false,
            "message" => "You are not authorized to perform this action."
        ]);

        exit;
    }
}

/*
 * Require a POST request.
 */
function requirePostRequest(): void
{
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        http_response_code(405);

        echo json_encode([
            "success" => false,
            "message" => "Only POST requests are allowed."
        ]);

        exit;
    }
}

/*
 * Require a valid CSRF token.
 */
function requireCsrfToken(): void
{
    $submittedToken = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";

    if (!validateCsrfToken($submittedToken)) {
        http_response_code(403);

        echo json_encode([
            "success" => false,
            "message" => "Invalid CSRF token."
        ]);

        exit;
    }
}