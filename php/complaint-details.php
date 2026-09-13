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

if ($_SESSION["role"] !== "student") {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Student access required."
    ]);
    exit;
}

$complaintId = filter_input(INPUT_GET, "complaint_id", FILTER_VALIDATE_INT);

if (!$complaintId) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid complaint ID."
    ]);
    exit;
}

try {
    // Fetch the complaint and its currently assigned staff member.
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
            cat.category_name,
            l.building,
            l.floor,
            l.room,
            l.description AS location_description,
            sa.staff_id,
            staff.name AS staff_name,
            staff.phone AS staff_phone
        FROM complaints c
        INNER JOIN categories cat
            ON c.category_id = cat.category_id
        INNER JOIN locations l
            ON c.location_id = l.location_id
        LEFT JOIN staff_assignments sa
            ON sa.complaint_id = c.complaint_id
            AND sa.assignment_id = (
                SELECT MAX(sa2.assignment_id)
                FROM staff_assignments sa2
                WHERE sa2.complaint_id = c.complaint_id
            )
        LEFT JOIN users staff
            ON staff.user_id = sa.staff_id
            AND staff.role = 'staff'
        WHERE c.complaint_id = ?
            AND c.student_id = ?
        LIMIT 1"
    );

    $stmt->execute([
        $complaintId,
        $_SESSION["user_id"]
    ]);

    $complaint = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$complaint) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Complaint not found."
        ]);
        exit;
    }

    // Fetch the complete complaint timeline.
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
        ORDER BY cu.updated_at ASC, cu.update_id ASC"
    );

    $stmt->execute([
        $complaintId
    ]);

    $updates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "complaint" => $complaint,
        "timeline" => $updates
    ]);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to load complaint details."
    ]);
}