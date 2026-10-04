<?php

session_start();

header("Content-Type: application/json");

require_once __DIR__ . "/db.php";

if (!isset($_SESSION["user_id"]) || $_SESSION["role"] !== "admin") {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Admin authentication required."
    ]);

    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Only POST requests are allowed."
    ]);

    exit;
}

try {
    $input = json_decode(file_get_contents("php://input"), true);

    if (!is_array($input)) {
        throw new Exception("Invalid request data.");
    }

    $staffId = filter_var(
        $input["staff_id"] ?? null,
        FILTER_VALIDATE_INT
    );

    $action = strtolower(trim($input["action"] ?? ""));

    if (!$staffId || $staffId < 1) {
        throw new Exception("Invalid staff member.");
    }

    if (!in_array($action, ["activate", "deactivate"], true)) {
        throw new Exception("Invalid staff status action.");
    }

    $staffQuery = $pdo->prepare(
        "SELECT
            user_id,
            name,
            email,
            status,
            role
         FROM users
         WHERE user_id = ?
         LIMIT 1"
    );

    $staffQuery->execute([$staffId]);

    $staff = $staffQuery->fetch(PDO::FETCH_ASSOC);

    if (!$staff) {
        http_response_code(404);

        echo json_encode([
            "success" => false,
            "message" => "Staff member not found."
        ]);

        exit;
    }

    if ($staff["role"] !== "staff") {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "The selected user is not a staff member."
        ]);

        exit;
    }

    if ($action === "deactivate") {
        if ($staff["status"] === "inactive") {
            echo json_encode([
                "success" => true,
                "message" => "Staff member is already inactive.",
                "status" => "inactive"
            ]);

            exit;
        }

        $workloadQuery = $pdo->prepare(
            "SELECT COUNT(DISTINCT c.complaint_id)
             FROM staff_assignments sa
             INNER JOIN complaints c
                 ON c.complaint_id = sa.complaint_id
             WHERE sa.staff_id = ?
               AND c.status IN ('Assigned', 'In Progress')"
        );

        $workloadQuery->execute([$staffId]);

        $activeWorkload = (int) $workloadQuery->fetchColumn();

        if ($activeWorkload > 0) {
            http_response_code(409);

            echo json_encode([
                "success" => false,
                "message" =>
                    "This staff member cannot be deactivated because they currently have " .
                    $activeWorkload .
                    " active complaint" .
                    ($activeWorkload === 1 ? "" : "s") .
                    ". Resolve the active complaints before deactivating the account."
            ]);

            exit;
        }

        $newStatus = "inactive";
    } else {
        if ($staff["status"] === "active") {
            echo json_encode([
                "success" => true,
                "message" => "Staff member is already active.",
                "status" => "active"
            ]);

            exit;
        }

        $newStatus = "active";
    }

    $update = $pdo->prepare(
        "UPDATE users
         SET status = ?
         WHERE user_id = ?
           AND role = 'staff'"
    );

    $update->execute([
        $newStatus,
        $staffId
    ]);

    echo json_encode([
        "success" => true,
        "message" =>
            $newStatus === "active"
                ? "Staff member activated successfully."
                : "Staff member deactivated successfully.",
        "status" => $newStatus
    ]);
} catch (PDOException $e) {
    error_log("Admin toggle staff database error: " . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to change staff status."
    ]);
} catch (Exception $e) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}