<?php

session_start();

header("Content-Type: application/json");

require_once "db.php";


/*
|--------------------------------------------------------------------------
| Authorization
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


if ($_SESSION["role"] !== "admin") {

    http_response_code(403);

    echo json_encode([
        "success" => false,
        "message" => "Admin access required."
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| Request
|--------------------------------------------------------------------------
*/

$data = json_decode(
    file_get_contents("php://input"),
    true
);


$complaintId =
    filter_var(
        $data["complaint_id"] ?? null,
        FILTER_VALIDATE_INT
    );


$staffId =
    filter_var(
        $data["staff_id"] ?? null,
        FILTER_VALIDATE_INT
    );


if (!$complaintId || !$staffId) {

    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Complaint and staff are required."
    ]);

    exit;
}


try {

    /*
    |--------------------------------------------------------------------------
    | Verify Complaint
    |--------------------------------------------------------------------------
    */

    $stmt = $pdo->prepare(
        "SELECT
            complaint_id,
            status
         FROM complaints
         WHERE complaint_id = ?
         LIMIT 1"
    );


    $stmt->execute([
        $complaintId
    ]);


    $complaint =
        $stmt->fetch();


    if (!$complaint) {

        http_response_code(404);

        echo json_encode([
            "success" => false,
            "message" => "Complaint not found."
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | Verify Staff
    |--------------------------------------------------------------------------
    */

    $stmt = $pdo->prepare(
        "SELECT
            user_id,
            name
         FROM users
         WHERE user_id = ?
           AND role = 'staff'
           AND status = 'active'
         LIMIT 1"
    );


    $stmt->execute([
        $staffId
    ]);


    $staff =
        $stmt->fetch();


    if (!$staff) {

        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Invalid staff member."
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | Transaction
    |--------------------------------------------------------------------------
    */

    $pdo->beginTransaction();


    /*
    | Get current status
    */

    $oldStatus =
        $complaint["status"];


    /*
    | Create assignment
    */

    $stmt = $pdo->prepare(
        "INSERT INTO staff_assignments
        (
            complaint_id,
            staff_id,
            assigned_by
        )
        VALUES
        (
            ?,
            ?,
            ?
        )"
    );


    $stmt->execute([

        $complaintId,

        $staffId,

        $_SESSION["user_id"]

    ]);


    /*
    | Change status to Assigned
    */

    if ($oldStatus !== "Assigned") {

        $stmt = $pdo->prepare(
            "UPDATE complaints
             SET status = 'Assigned'
             WHERE complaint_id = ?"
        );


        $stmt->execute([
            $complaintId
        ]);


        /*
        | Complaint history
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
                ?,
                'Assigned',
                ?
            )"
        );


        $stmt->execute([

            $complaintId,

            $_SESSION["user_id"],

            $oldStatus,

            "Complaint assigned to " .
            $staff["name"] .
            "."

        ]);

    }


    /*
    |--------------------------------------------------------------------------
    | Staff Notification
    |--------------------------------------------------------------------------
    */

    $stmt = $pdo->prepare(
        "INSERT INTO notifications
        (
            user_id,
            complaint_id,
            message
        )
        VALUES
        (
            ?,
            ?,
            ?
        )"
    );


    $stmt->execute([

        $staffId,

        $complaintId,

        "A complaint has been assigned to you."

    ]);


    $pdo->commit();


    echo json_encode([

        "success" => true,

        "message" =>
            "Complaint assigned successfully."

    ]);


} catch (Throwable $e) {

    if ($pdo->inTransaction()) {

        $pdo->rollBack();

    }


    http_response_code(500);

    echo json_encode([

        "success" => false,

        "message" =>
            "Unable to assign complaint."

    ]);

}
