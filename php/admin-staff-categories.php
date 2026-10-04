<?php

require_once __DIR__ . "/security.php";

header("Content-Type: application/json");

require_once __DIR__ . "/db.php";

requireAuthentication();
requireRole(["admin"]);

try {
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        handleGet($pdo);
        exit;
    }

    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        requireCsrfToken();

        handlePost($pdo);
        exit;
    }

    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Method not allowed."
    ]);

} catch (PDOException $e) {

    error_log(
        "Admin staff category error: " . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to process category information."
    ]);
}


function handleGet(PDO $pdo): void
{
    $staffId = isset($_GET["staff_id"])
        ? (int) $_GET["staff_id"]
        : 0;

    $categoryStmt = $pdo->query(
        "
        SELECT
            category_id,
            category_name
        FROM categories
        WHERE status = 'active'
        ORDER BY category_name ASC
        "
    );

    $categories = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($categories as &$category) {
        $category["category_id"] = (int) $category["category_id"];
    }

    unset($category);

    $assignedCategoryIds = [];

    if ($staffId > 0) {
        $staffStmt = $pdo->prepare(
            "
            SELECT user_id
            FROM users
            WHERE user_id = ?
              AND role = 'staff'
            LIMIT 1
            "
        );

        $staffStmt->execute([$staffId]);

        if (!$staffStmt->fetch()) {
            http_response_code(404);

            echo json_encode([
                "success" => false,
                "message" => "Staff member not found."
            ]);

            return;
        }

        $mappingStmt = $pdo->prepare(
            "
            SELECT category_id
            FROM staff_category_assignments
            WHERE staff_id = ?
            ORDER BY category_id ASC
            "
        );

        $mappingStmt->execute([$staffId]);

        $assignedCategoryIds = array_map(
            "intval",
            $mappingStmt->fetchAll(PDO::FETCH_COLUMN)
        );
    }

    echo json_encode([
        "success" => true,
        "categories" => $categories,
        "assigned_category_ids" => $assignedCategoryIds
    ]);
}


function handlePost(PDO $pdo): void
{
    $input = json_decode(
        file_get_contents("php://input"),
        true
    );

    if (!is_array($input)) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Invalid request data."
        ]);

        return;
    }

    $staffId = isset($input["staff_id"])
        ? (int) $input["staff_id"]
        : 0;

    $categoryIds = $input["category_ids"] ?? [];

    if ($staffId <= 0) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "A valid staff member is required."
        ]);

        return;
    }

    if (!is_array($categoryIds)) {
        http_response_code(400);

        echo json_encode([
            "success" => false,
            "message" => "Category selection is invalid."
        ]);

        return;
    }

    $categoryIds = array_values(
        array_unique(
            array_filter(
                array_map("intval", $categoryIds),
                function ($id) {
                    return $id > 0;
                }
            )
        )
    );

    $staffStmt = $pdo->prepare(
        "
        SELECT
            user_id,
            name,
            status
        FROM users
        WHERE user_id = ?
          AND role = 'staff'
        LIMIT 1
        "
    );

    $staffStmt->execute([$staffId]);

    $staff = $staffStmt->fetch(PDO::FETCH_ASSOC);

    if (!$staff) {
        http_response_code(404);

        echo json_encode([
            "success" => false,
            "message" => "Staff member not found."
        ]);

        return;
    }

    if (!empty($categoryIds)) {
        $placeholders = implode(
            ",",
            array_fill(0, count($categoryIds), "?")
        );

        $categoryStmt = $pdo->prepare(
            "
            SELECT category_id
            FROM categories
            WHERE category_id IN ($placeholders)
              AND status = 'active'
            "
        );

        $categoryStmt->execute($categoryIds);

        $validCategoryIds = array_map(
            "intval",
            $categoryStmt->fetchAll(PDO::FETCH_COLUMN)
        );

        sort($categoryIds);
        sort($validCategoryIds);

        if ($categoryIds !== $validCategoryIds) {
            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" =>
                    "One or more selected categories are invalid."
            ]);

            return;
        }
    }

    try {
        $pdo->beginTransaction();

        $deleteStmt = $pdo->prepare(
            "
            DELETE FROM staff_category_assignments
            WHERE staff_id = ?
            "
        );

        $deleteStmt->execute([$staffId]);

        if (!empty($categoryIds)) {
            $insertStmt = $pdo->prepare(
                "
                INSERT INTO staff_category_assignments
                    (staff_id, category_id)
                VALUES
                    (?, ?)
                "
            );

            foreach ($categoryIds as $categoryId) {
                $insertStmt->execute([
                    $staffId,
                    $categoryId
                ]);
            }
        }

        $pdo->commit();

        echo json_encode([
            "success" => true,
            "message" =>
                "Staff category assignments updated successfully.",
            "staff_id" => $staffId,
            "category_ids" => $categoryIds
        ]);

    } catch (PDOException $e) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $e;
    }
}