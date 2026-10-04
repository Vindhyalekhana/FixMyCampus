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
    $sql = "
        SELECT
            u.user_id,
            u.name,
            u.email,
            u.phone,
            u.status,

            COALESCE(
                GROUP_CONCAT(
                    DISTINCT c.category_name
                    ORDER BY c.category_name
                    SEPARATOR ', '
                ),
                ''
            ) AS categories,

            COUNT(
                DISTINCT CASE
                    WHEN co.status IN ('Assigned', 'In Progress')
                    THEN co.complaint_id
                END
            ) AS current_workload,

            COUNT(
                DISTINCT CASE
                    WHEN co.status = 'Assigned'
                    THEN co.complaint_id
                END
            ) AS assigned_count,

            COUNT(
                DISTINCT CASE
                    WHEN co.status = 'In Progress'
                    THEN co.complaint_id
                END
            ) AS in_progress_count

        FROM users u

        LEFT JOIN staff_category_assignments sca
            ON sca.staff_id = u.user_id

        LEFT JOIN categories c
            ON c.category_id = sca.category_id

        LEFT JOIN staff_assignments sa
            ON sa.staff_id = u.user_id
            AND sa.completed_at IS NULL

        LEFT JOIN complaints co
            ON co.complaint_id = sa.complaint_id
            AND co.status IN ('Assigned', 'In Progress')

        WHERE u.role = 'staff'

        GROUP BY
            u.user_id,
            u.name,
            u.email,
            u.phone,
            u.status

        ORDER BY
            CASE
                WHEN u.status = 'active' THEN 0
                ELSE 1
            END,
            u.name ASC
    ";

    $stmt = $pdo->query($sql);

    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalStaff = count($staff);
    $activeStaff = 0;
    $staffWithWork = 0;
    $totalWorkload = 0;

    foreach ($staff as &$member) {
        $member["current_workload"] = (int) $member["current_workload"];
        $member["assigned_count"] = (int) $member["assigned_count"];
        $member["in_progress_count"] = (int) $member["in_progress_count"];

        if ($member["status"] === "active") {
            $activeStaff++;
        }

        if ($member["current_workload"] > 0) {
            $staffWithWork++;
        }

        $totalWorkload += $member["current_workload"];
    }

    unset($member);

    echo json_encode([
        "success" => true,
        "staff" => $staff,
        "summary" => [
            "total_staff" => $totalStaff,
            "active_staff" => $activeStaff,
            "staff_with_work" => $staffWithWork,
            "total_workload" => $totalWorkload
        ]
    ]);

} catch (PDOException $e) {

    error_log(
        "Admin staff monitoring error: " . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to load staff information."
    ]);
}