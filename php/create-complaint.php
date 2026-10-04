<?php

require_once __DIR__ . "/security.php";

header("Content-Type: application/json");

require_once __DIR__ . "/db.php";

requirePostRequest();
requireRole(["student"]);
requireCsrfToken();

$data = json_decode(
    file_get_contents("php://input"),
    true
);

$categoryId = filter_var(
    $data["category_id"] ?? null,
    FILTER_VALIDATE_INT
);

$locationId = filter_var(
    $data["location_id"] ?? null,
    FILTER_VALIDATE_INT
);

$title = trim(
    $data["title"] ?? ""
);

$description = trim(
    $data["description"] ?? ""
);

$priority = $data["priority"] ?? "Medium";

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

if (
    strlen($title) < 5 ||
    strlen($title) > 200
) {
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

    $pdo->beginTransaction();

    $placeholderCode =
        "TEMP-" . bin2hex(random_bytes(8));

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
        (int) $pdo->lastInsertId();

    $complaintCode =
        "FMC-" .
        str_pad(
            $complaintId,
            6,
            "0",
            STR_PAD_LEFT
        );

    $stmt = $pdo->prepare(
        "UPDATE complaints
         SET complaint_code = ?
         WHERE complaint_id = ?"
    );

    $stmt->execute([
        $complaintCode,
        $complaintId
    ]);

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

    $staffQuery = $pdo->prepare(
        "SELECT
            u.user_id,
            u.name,
            COUNT(
                DISTINCT CASE
                    WHEN c.status IN ('Assigned', 'In Progress')
                    THEN c.complaint_id
                END
            ) AS active_workload
         FROM users u
         INNER JOIN staff_category_assignments sca
             ON sca.staff_id = u.user_id
            AND sca.category_id = ?
         LEFT JOIN staff_assignments sa
             ON sa.staff_id = u.user_id
         LEFT JOIN complaints c
             ON c.complaint_id = sa.complaint_id
         WHERE u.role = 'staff'
           AND u.status = 'active'
         GROUP BY
             u.user_id,
             u.name
         ORDER BY
             active_workload ASC,
             u.user_id ASC
         LIMIT 1"
    );

    $staffQuery->execute([
        $categoryId
    ]);

    $staff =
        $staffQuery->fetch(PDO::FETCH_ASSOC);

    if ($staff) {
        $staffId =
            (int) $staff["user_id"];

        $assignmentStmt = $pdo->prepare(
            "INSERT INTO staff_assignments
            (
                complaint_id,
                staff_id,
                assigned_by,
                assignment_type
            )
            VALUES
            (
                ?,
                ?,
                NULL,
                'automatic'
            )"
        );

        $assignmentStmt->execute([
            $complaintId,
            $staffId
        ]);

        $statusStmt = $pdo->prepare(
            "UPDATE complaints
             SET status = 'Assigned'
             WHERE complaint_id = ?"
        );

        $statusStmt->execute([
            $complaintId
        ]);

        $historyStmt = $pdo->prepare(
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
                'Submitted',
                'Assigned',
                ?
            )"
        );

        $historyStmt->execute([
            $complaintId,
            $_SESSION["user_id"],
            "Complaint automatically assigned to "
            . $staff["name"]
            . " based on category and current workload."
        ]);

        $notificationStmt = $pdo->prepare(
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

        $notificationStmt->execute([
            $staffId,
            $complaintId,
            "New complaint "
            . $complaintCode
            . " has been automatically assigned to you."
        ]);

        $notificationStmt->execute([
            $_SESSION["user_id"],
            $complaintId,
            "Your complaint "
            . $complaintCode
            . " has been automatically assigned to "
            . $staff["name"]
            . "."
        ]);

        $pdo->commit();

        echo json_encode([
            "success" => true,
            "message" =>
                "Complaint submitted and automatically assigned.",
            "complaint_id" =>
                $complaintId,
            "complaint_code" =>
                $complaintCode,
            "status" =>
                "Assigned",
            "assigned_staff" =>
                $staff["name"]
        ]);

        exit;
    }

    $adminStmt = $pdo->prepare(
        "SELECT user_id
         FROM users
         WHERE role = 'admin'
           AND status = 'active'"
    );

    $adminStmt->execute();

    $admins =
        $adminStmt->fetchAll(PDO::FETCH_COLUMN);

    $notificationStmt = $pdo->prepare(
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

    foreach ($admins as $adminId) {
        $notificationStmt->execute([
            $adminId,
            $complaintId,
            "Complaint "
            . $complaintCode
            . " requires staff assignment. No active staff member is currently mapped to this category."
        ]);
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" =>
            "Complaint submitted successfully. It is awaiting staff assignment.",
        "complaint_id" =>
            $complaintId,
        "complaint_code" =>
            $complaintCode,
        "status" =>
            "Submitted",
        "assigned_staff" =>
            null
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log(
        "FixMyCampus create complaint error: "
        . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" =>
            "Unable to submit the complaint."
    ]);
}