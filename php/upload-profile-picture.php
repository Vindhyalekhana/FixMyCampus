<?php

session_start();

header("Content-Type: application/json");

function respond($statusCode, $data)
{
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(405, [
        "success" => false,
        "message" => "Invalid request method."
    ]);
}

if (!isset($_SESSION["user_id"])) {
    respond(401, [
        "success" => false,
        "message" => "Authentication required."
    ]);
}

if (!isset($_FILES["profile_picture"])) {
    respond(400, [
        "success" => false,
        "message" => "No profile picture was uploaded."
    ]);
}

$file = $_FILES["profile_picture"];

if ($file["error"] !== UPLOAD_ERR_OK) {
    $uploadErrors = [
        UPLOAD_ERR_INI_SIZE => "The uploaded file is too large.",
        UPLOAD_ERR_FORM_SIZE => "The uploaded file is too large.",
        UPLOAD_ERR_PARTIAL => "The file upload was incomplete.",
        UPLOAD_ERR_NO_FILE => "No profile picture was uploaded.",
        UPLOAD_ERR_NO_TMP_DIR => "Temporary upload directory is missing.",
        UPLOAD_ERR_CANT_WRITE => "The server could not save the uploaded file.",
        UPLOAD_ERR_EXTENSION => "The upload was blocked by a server extension."
    ];

    respond(400, [
        "success" => false,
        "message" => $uploadErrors[$file["error"]] ?? "Profile picture upload failed."
    ]);
}

if ($file["size"] > 5 * 1024 * 1024) {
    respond(400, [
        "success" => false,
        "message" => "Profile picture must be 5 MB or smaller."
    ]);
}

$tmpPath = $file["tmp_name"];

if (!is_uploaded_file($tmpPath)) {
    respond(400, [
        "success" => false,
        "message" => "Invalid uploaded file."
    ]);
}

$imageInfo = @getimagesize($tmpPath);

if ($imageInfo === false) {
    respond(400, [
        "success" => false,
        "message" => "The selected file is not a valid image."
    ]);
}

$allowedMimeTypes = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp"
];

$detectedMimeType = $imageInfo["mime"] ?? "";

if (!isset($allowedMimeTypes[$detectedMimeType])) {
    respond(400, [
        "success" => false,
        "message" => "Only JPG, PNG and WEBP images are allowed."
    ]);
}

$extension = $allowedMimeTypes[$detectedMimeType];

require_once "db.php";

try {
    $userId = (int) $_SESSION["user_id"];

    $uploadDirectory = dirname(__DIR__) . DIRECTORY_SEPARATOR . "uploads" . DIRECTORY_SEPARATOR . "profiles";

    if (!is_dir($uploadDirectory)) {
        if (!mkdir($uploadDirectory, 0755, true)) {
            throw new RuntimeException("Unable to create profile upload directory.");
        }
    }

    if (!is_writable($uploadDirectory)) {
        throw new RuntimeException("Profile upload directory is not writable.");
    }

    $randomName = bin2hex(random_bytes(16));

    $fileName = "profile_" . $userId . "_" . $randomName . "." . $extension;

    $destination = $uploadDirectory . DIRECTORY_SEPARATOR . $fileName;

    $relativePath = "uploads/profiles/" . $fileName;

    if (!move_uploaded_file($tmpPath, $destination)) {
        throw new RuntimeException("Unable to save the uploaded profile picture.");
    }

    $stmt = $pdo->prepare(
        "SELECT profile_picture
         FROM users
         WHERE user_id = :user_id
         LIMIT 1"
    );

    $stmt->execute([
        ":user_id" => $userId
    ]);

    $oldProfilePicture = $stmt->fetchColumn();

    $updateStmt = $pdo->prepare(
        "UPDATE users
         SET profile_picture = :profile_picture
         WHERE user_id = :user_id"
    );

    $updateStmt->execute([
        ":profile_picture" => $relativePath,
        ":user_id" => $userId
    ]);

    if (
        $oldProfilePicture &&
        str_starts_with($oldProfilePicture, "uploads/profiles/")
    ) {
        $oldFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace(
            "/",
            DIRECTORY_SEPARATOR,
            $oldProfilePicture
        );

        if (
            is_file($oldFile) &&
            realpath($oldFile) !== realpath($destination)
        ) {
            @unlink($oldFile);
        }
    }

    respond(200, [
        "success" => true,
        "message" => "Profile picture updated successfully.",
        "profile_picture" => $relativePath
    ]);
} catch (Throwable $e) {
    error_log("Profile picture upload error: " . $e->getMessage());

    respond(500, [
        "success" => false,
        "message" => "Unable to upload profile picture. " . $e->getMessage()
    ]);
}