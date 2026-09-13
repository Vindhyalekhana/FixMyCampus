<?php

session_start();

header("Content-Type: application/json");

require_once "db.php";


/*
|--------------------------------------------------------------------------
| Authentication and Staff Authorization
|--------------------------------------------------------------------------
| Only logged-in Staff users can access this endpoint.
*/

if (!isset($_SESSION["user_id"])) {

    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Authentication required."
    ]);

    exit;
}


if ($_SESSION["role"] !== "staff") {

    http_response_code(403);

    echo json_encode([
        "success" => false,
        "message" => "Staff access required."
    ]);

    exit;
}


try {

    /*
    |--------------------------------------------------------------------------
    | Fetch Complaints Assigned to the Logged-in Staff Member
    |--------------------------------------------------------------------------
    | Staff assignments are stored in staff_assignments.
    | The current assignment is identified using the latest assignment
    | record for each complaint.
    |
    | Student phone is intentionally NOT selected because Staff should
    | not have access to the student's phone number.
    */

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
         INNER JOIN staff_assignments sa
            ON c.complaint_id = sa.complaint_id
         WHERE sa.staff_id = ?
           AND sa.assignment_id = (
                SELECT MAX(sa2.assignment_id)
                FROM staff_assignments sa2
                WHERE sa2.complaint_id = c.complaint_id
           )
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

    /*
    |--------------------------------------------------------------------------
    | Error Handling
    |--------------------------------------------------------------------------
    */

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to load assigned complaints."
    ]);

}

?>