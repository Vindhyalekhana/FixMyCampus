<?php

session_start();

header("Content-Type: application/json");

require_once "db.php";


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


$complaintId =
    filter_input(
        INPUT_GET,
        "id",
        FILTER_VALIDATE_INT
    );


if (!$complaintId) {

    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid complaint ID."
    ]);

    exit;
}


try {

    $stmt = $pdo->prepare(
        "SELECT

            c.complaint_id,
            c.complaint_code,
            c.title,
            c.description,
            c.priority,
            c.status,
            c.created_at,
            c.updated_at,
            c.resolved_at,
            c.closed_at,

            u.user_id AS student_id,
            u.name AS student_name,
            u.email AS student_email,
            u.phone AS student_phone,

            cat.category_name,

            l.building,
            l.floor,
            l.room

         FROM complaints c

         INNER JOIN users u
            ON c.student_id = u.user_id

         INNER JOIN categories cat
            ON c.category_id = cat.category_id

         INNER JOIN locations l
            ON c.location_id = l.location_id

         WHERE c.complaint_id = ?

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
    | Timeline
    |--------------------------------------------------------------------------
    */

    $stmt = $pdo->prepare(
        "SELECT

            cu.update_id,
            cu.old_status,
            cu.new_status,
            cu.remarks,
            cu.updated_at,

            u.name AS updated_by_name

         FROM complaint_updates cu

         INNER JOIN users u
            ON cu.updated_by = u.user_id

         WHERE cu.complaint_id = ?

         ORDER BY
            cu.updated_at ASC,
            cu.update_id ASC"
    );


    $stmt->execute([
        $complaintId
    ]);


    $updates =
        $stmt->fetchAll();


    /*
    |--------------------------------------------------------------------------
    | Current Staff Assignment
    |--------------------------------------------------------------------------
    */

    $stmt = $pdo->prepare(
        "SELECT

            sa.assignment_id,
            sa.staff_id,
            sa.assigned_at,

            u.name AS staff_name,
            u.phone AS staff_phone

         FROM staff_assignments sa

         INNER JOIN users u
            ON sa.staff_id = u.user_id

         WHERE sa.complaint_id = ?

         ORDER BY sa.assigned_at DESC

         LIMIT 1"
    );


    $stmt->execute([
        $complaintId
    ]);


    $assignment =
        $stmt->fetch();


    echo json_encode([

        "success" => true,

        "complaint" => $complaint,

        "updates" => $updates,

        "assignment" => $assignment

    ]);


} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([

        "success" => false,

        "message" =>
            "Unable to load complaint."

    ]);

}
