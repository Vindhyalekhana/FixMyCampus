<?php

session_start();

header("Content-Type: application/json");

require_once "db.php";

try {

    if (
        !isset($_SESSION["user_id"]) ||
        !isset($_SESSION["role"]) ||
        $_SESSION["role"] !== "admin"
    ) {
        http_response_code(403);

        echo json_encode([
            "success" => false,
            "message" => "Admin access required."
        ]);

        exit;
    }

    if ($_SERVER["REQUEST_METHOD"] !== "GET") {
        http_response_code(405);

        echo json_encode([
            "success" => false,
            "message" => "Invalid request method."
        ]);

        exit;
    }

    $statusQuery = $pdo->query(
        "SELECT
            status,
            COUNT(*) AS total
         FROM complaints
         GROUP BY status
         ORDER BY FIELD(
            status,
            'Submitted',
            'Under Review',
            'Assigned',
            'In Progress',
            'Resolved',
            'Closed',
            'Rejected',
            'Duplicate'
         )"
    );

    $statusRows = $statusQuery->fetchAll(PDO::FETCH_ASSOC);

    $priorityQuery = $pdo->query(
        "SELECT
            priority,
            COUNT(*) AS total
         FROM complaints
         GROUP BY priority
         ORDER BY FIELD(
            priority,
            'High',
            'Medium',
            'Low'
         )"
    );

    $priorityRows = $priorityQuery->fetchAll(PDO::FETCH_ASSOC);

    $categoryQuery = $pdo->query(
        "SELECT
            cat.category_name,
            COUNT(c.complaint_id) AS total
         FROM categories cat
         LEFT JOIN complaints c
            ON c.category_id = cat.category_id
         GROUP BY
            cat.category_id,
            cat.category_name
         ORDER BY
            total DESC,
            cat.category_name ASC"
    );

    $categoryRows = $categoryQuery->fetchAll(PDO::FETCH_ASSOC);

    $staffQuery = $pdo->query(
        "SELECT
            u.user_id,
            u.name,
            u.status,

            COUNT(
                DISTINCT CASE
                    WHEN c.status IN ('Assigned', 'In Progress')
                    THEN c.complaint_id
                END
            ) AS active_workload,

            COUNT(
                DISTINCT CASE
                    WHEN c.status = 'Resolved'
                    THEN c.complaint_id
                END
            ) AS resolved_count,

            COUNT(
                DISTINCT CASE
                    WHEN c.status = 'Closed'
                    THEN c.complaint_id
                END
            ) AS closed_count

         FROM users u

         LEFT JOIN staff_assignments sa
            ON sa.staff_id = u.user_id

         LEFT JOIN complaints c
            ON c.complaint_id = sa.complaint_id

         WHERE u.role = 'staff'

         GROUP BY
            u.user_id,
            u.name,
            u.status

         ORDER BY
            active_workload DESC,
            u.name ASC"
    );

    $staffRows = $staffQuery->fetchAll(PDO::FETCH_ASSOC);

    $monthlyQuery = $pdo->query(
        "SELECT
            DATE_FORMAT(created_at, '%Y-%m') AS month,
            COUNT(*) AS total

         FROM complaints

         GROUP BY DATE_FORMAT(created_at, '%Y-%m')

         ORDER BY month ASC"
    );

    $monthlyRows = $monthlyQuery->fetchAll(PDO::FETCH_ASSOC);

    $summaryQuery = $pdo->query(
        "SELECT
            COUNT(*) AS total_complaints,

            COALESCE(
                SUM(
                    status IN ('Submitted', 'Under Review')
                ),
                0
            ) AS pending_complaints,

            COALESCE(
                SUM(status = 'Assigned'),
                0
            ) AS assigned_complaints,

            COALESCE(
                SUM(status = 'In Progress'),
                0
            ) AS in_progress_complaints,

            COALESCE(
                SUM(status = 'Resolved'),
                0
            ) AS resolved_complaints,

            COALESCE(
                SUM(status = 'Closed'),
                0
            ) AS closed_complaints,

            COALESCE(
                SUM(
                    status IN ('Rejected', 'Duplicate')
                ),
                0
            ) AS rejected_or_duplicate

         FROM complaints"
    );

    $summary = $summaryQuery->fetch(PDO::FETCH_ASSOC);

    $resolutionQuery = $pdo->query(
        "SELECT
            COUNT(*) AS resolved_total,

            AVG(
                TIMESTAMPDIFF(
                    MINUTE,
                    created_at,
                    resolved_at
                )
            ) / 60 AS average_resolution_hours

         FROM complaints

         WHERE resolved_at IS NOT NULL
           AND resolved_at >= created_at"
    );

    $resolution = $resolutionQuery->fetch(PDO::FETCH_ASSOC);

    $recentQuery = $pdo->query(
        "SELECT
            c.complaint_id,
            c.complaint_code,
            c.title,
            c.status,
            c.priority,
            c.created_at,
            cat.category_name,
            u.name AS student_name

         FROM complaints c

         INNER JOIN categories cat
            ON cat.category_id = c.category_id

         INNER JOIN users u
            ON u.user_id = c.student_id

         ORDER BY c.created_at DESC

         LIMIT 10"
    );

    $recentRows = $recentQuery->fetchAll(PDO::FETCH_ASSOC);

    $summaryData = [
        "total_complaints" =>
            (int) ($summary["total_complaints"] ?? 0),

        "pending_complaints" =>
            (int) ($summary["pending_complaints"] ?? 0),

        "assigned_complaints" =>
            (int) ($summary["assigned_complaints"] ?? 0),

        "in_progress_complaints" =>
            (int) ($summary["in_progress_complaints"] ?? 0),

        "resolved_complaints" =>
            (int) ($summary["resolved_complaints"] ?? 0),

        "closed_complaints" =>
            (int) ($summary["closed_complaints"] ?? 0),

        "rejected_or_duplicate" =>
            (int) ($summary["rejected_or_duplicate"] ?? 0)
    ];

    $resolutionHours = 0;

    if (
        isset($resolution["average_resolution_hours"]) &&
        $resolution["average_resolution_hours"] !== null
    ) {
        $resolutionHours = round(
            (float) $resolution["average_resolution_hours"],
            1
        );
    }

    $resolutionData = [
        "resolved_total" =>
            (int) ($resolution["resolved_total"] ?? 0),

        "average_resolution_hours" =>
            $resolutionHours
    ];

    foreach ($statusRows as &$row) {
        $row["total"] = (int) $row["total"];
    }

    unset($row);

    foreach ($priorityRows as &$row) {
        $row["total"] = (int) $row["total"];
    }

    unset($row);

    foreach ($categoryRows as &$row) {
        $row["total"] = (int) $row["total"];
    }

    unset($row);

    foreach ($staffRows as &$row) {
        $row["user_id"] = (int) $row["user_id"];
        $row["active_workload"] = (int) $row["active_workload"];
        $row["resolved_count"] = (int) $row["resolved_count"];
        $row["closed_count"] = (int) $row["closed_count"];
    }

    unset($row);

    foreach ($monthlyRows as &$row) {
        $row["total"] = (int) $row["total"];
    }

    unset($row);

    echo json_encode([
        "success" => true,

        "summary" => $summaryData,

        "resolution" => $resolutionData,

        "status" => $statusRows,

        "categories" => $categoryRows,

        "priority" => $priorityRows,

        "staff" => $staffRows,

        "monthly" => $monthlyRows,

        "recent" => $recentRows
    ]);

} catch (Throwable $e) {

    error_log(
        "admin-reports.php error: " . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to load report information."
    ]);
}