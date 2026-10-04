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

try {

    $stmt = $pdo->query(
        "SELECT
            c.complaint_id,
            c.complaint_code,
            c.title,
            c.priority,
            c.status,
            c.created_at,

            u.name AS student_name,

            cat.category_name,

            l.building,
            l.floor,
            l.room,

            sa.staff_id,
            staff.name AS staff_name,
            sa.assignment_type,
            sa.assigned_at

         FROM complaints c

         INNER JOIN users u
            ON c.student_id = u.user_id

         INNER JOIN categories cat
            ON c.category_id = cat.category_id

         INNER JOIN locations l
            ON c.location_id = l.location_id

         LEFT JOIN staff_assignments sa
            ON sa.assignment_id = (
                SELECT MAX(sa2.assignment_id)
                FROM staff_assignments sa2
                WHERE sa2.complaint_id = c.complaint_id
            )

         LEFT JOIN users staff
            ON sa.staff_id = staff.user_id

         ORDER BY c.created_at DESC"
    );

    $complaints = $stmt->fetchAll();

    echo json_encode([
        "success" => true,
        "complaints" => $complaints
    ]);

} catch (PDOException $e) {

    error_log("Admin complaints error: " . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to load complaints."
    ]);
}