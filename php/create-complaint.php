<?php

session_start();

header("Content-Type: application/json");

require_once "db.php";


/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

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
        "message" => "Only students can submit complaints."
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| Read Request
|--------------------------------------------------------------------------
*/

$data = json_decode(
    file_get_contents("php://input"),
    true
);


$categoryId =
    filter_var(
        $data["category_id"] ?? null,
        FILTER_VALIDATE_INT
    );


$locationId =
    filter_var(
        $data["location_id"] ?? null,
        FILTER_VALIDATE_INT
    );


$title =
    trim($data["title"] ?? "");


$description =
    trim($data["description"] ?? "");


$priority =
    $data["priority"] ?? "Medium";


/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

if (
    !$categoryId ||
    !$locationId ||
    $title === "" ||
    $description === ""
) {

    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "All required fields must be provided."
    ]);

    exit;
}


if (strlen($title) < 5 || strlen($title) > 200) {

    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Complaint title must contain between 5 and 200 characters."
    ]);

    exit;
}


if (strlen($description) < 10) {

    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Complaint description is too short."
    ]);

    exit;
}


$allowedPriorities = [
    "Low",
    "Medium",
    "High"
];


if (!in_array($priority, $allowedPriorities, true)) {

    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid priority."
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| Verify Category and Location
|--------------------------------------------------------------------------
*/

try {

    $stmt = $pdo->prepare(
        "SELECT category_id
         FROM categories
         WHERE category_id = ?
           AND status = 'active'"
    );


    $stmt->execute([
        $categoryId
    ]);


    if (!$stmt->fetch()) {

        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Invalid category."
        ]);

        exit;
    }


    $stmt = $pdo->prepare(
        "SELECT location_id
         FROM locations
         WHERE location_id = ?
           AND status = 'active'"
    );


    $stmt->execute([
        $locationId
    ]);


    if (!$stmt->fetch()) {

        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Invalid location."
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | Generate Complaint Code
    |--------------------------------------------------------------------------
    */

    $pdo->beginTransaction();


    $stmt = $pdo->prepare(
        "INSERT INTO complaints
        (
            complaint_code,
            student_id,
            category_id,
            location_id,
            title,
            description,
            priority,
            status
        )
        VALUES
        (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            'Submitted'
        )"
    );


    $placeholderCode = "TEMP-" . bin2hex(random_bytes(8));

    $stmt->execute([

        $placeholderCode,

        $_SESSION["user_id"],

        $categoryId,

        $locationId,

        $title,

        $description,

        $priority

    ]);


    $complaintId =
        $pdo->lastInsertId();


    $complaintCode =
        "FMC-" . str_pad(
            $complaintId,
            6,
            "0",
            STR_PAD_LEFT
        );

    $updateStmt = $pdo->prepare(
        "UPDATE complaints
         SET complaint_code = ?
         WHERE complaint_id = ?"
    );

    $updateStmt->execute([
        $complaintCode,
        $complaintId
    ]);


    /*
    |--------------------------------------------------------------------------
    | Initial Complaint History
    |--------------------------------------------------------------------------
    */

    $stmt = $pdo->prepare(
        "INSERT INTO complaint_updates
        (
            complaint_id,
            updated_by,
            old_status,
            new_status,
            remarks
        )
        VALUES
        (
            ?,
            ?,
            NULL,
            'Submitted',
            ?
        )"
    );


    $stmt->execute([

        $complaintId,

        $_SESSION["user_id"],

        "Complaint submitted by student."

    ]);


    $pdo->commit();


    echo json_encode([

        "success" => true,

        "message" =>
            "Complaint submitted successfully.",

        "complaint_id" =>
            $complaintId,

        "complaint_code" =>
            $complaintCode

    ]);


} catch (Throwable $e) {

    if ($pdo->inTransaction()) {

        $pdo->rollBack();

    }


    http_response_code(500);

    echo json_encode([

        "success" => false,

        "message" =>
            "Unable to submit the complaint."

    ]);

}
