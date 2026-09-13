<?php

session_start();

require_once "db.php";

if (!isset($_SESSION["user_id"])) {
    http_response_code(401);
    exit("Authentication required.");
}

$complaintId = filter_input(INPUT_GET, "complaint_id", FILTER_VALIDATE_INT);

if (!$complaintId) {
    http_response_code(400);
    exit("Invalid complaint ID.");
}

try {
    $stmt = $pdo->prepare(
        "SELECT
            c.complaint_id,
            c.complaint_code,
            c.student_id,
            c.category_id,
            c.location_id,
            c.title,
            c.description,
            c.priority,
            c.status,
            c.created_at,
            c.updated_at,
            c.resolved_at,
            c.closed_at,
            u.name AS student_name,
            u.email AS student_email,
            cat.category_name,
            l.building,
            l.floor,
            l.room,
            l.description AS location_description
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

    $stmt->execute([$complaintId]);

    $complaint = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$complaint) {
        http_response_code(404);
        exit("Complaint not found.");
    }

    $xml = new DOMDocument("1.0", "UTF-8");
    $xml->formatOutput = true;

    $root = $xml->createElement("fixMyCampusComplaint");
    $xml->appendChild($root);

    $complaintElement = $xml->createElement("complaint");
    $root->appendChild($complaintElement);

    $fields = [
        "complaintId" => $complaint["complaint_id"],
        "complaintCode" => $complaint["complaint_code"],
        "title" => $complaint["title"],
        "description" => $complaint["description"],
        "priority" => $complaint["priority"],
        "status" => $complaint["status"],
        "createdAt" => $complaint["created_at"],
        "updatedAt" => $complaint["updated_at"],
        "resolvedAt" => $complaint["resolved_at"],
        "closedAt" => $complaint["closed_at"]
    ];

    foreach ($fields as $name => $value) {
        $element = $xml->createElement($name);

        if ($value !== null) {
            $element->appendChild(
                $xml->createTextNode($value)
            );
        }

        $complaintElement->appendChild($element);
    }

    $student = $xml->createElement("student");
    $complaintElement->appendChild($student);

    $studentFields = [
        "studentId" => $complaint["student_id"],
        "name" => $complaint["student_name"],
        "email" => $complaint["student_email"]
    ];

    foreach ($studentFields as $name => $value) {
        $element = $xml->createElement($name);
        $element->appendChild(
            $xml->createTextNode($value)
        );
        $student->appendChild($element);
    }

    $category = $xml->createElement("category");
    $complaintElement->appendChild($category);

    $categoryFields = [
        "categoryId" => $complaint["category_id"],
        "name" => $complaint["category_name"]
    ];

    foreach ($categoryFields as $name => $value) {
        $element = $xml->createElement($name);
        $element->appendChild(
            $xml->createTextNode($value)
        );
        $category->appendChild($element);
    }

    $location = $xml->createElement("location");
    $complaintElement->appendChild($location);

    $locationFields = [
        "locationId" => $complaint["location_id"],
        "building" => $complaint["building"],
        "floor" => $complaint["floor"],
        "room" => $complaint["room"],
        "description" => $complaint["location_description"]
    ];

    foreach ($locationFields as $name => $value) {
        $element = $xml->createElement($name);

        if ($value !== null) {
            $element->appendChild(
                $xml->createTextNode($value)
            );
        }

        $location->appendChild($element);
    }

    $xmlContent = $xml->saveXML();

    $doctype = '<!DOCTYPE fixMyCampusComplaint SYSTEM "complaint.dtd">' . PHP_EOL;

    $xmlContent = preg_replace(
        '/(<\?xml[^>]*\?>\s*)/',
        '$1' . $doctype,
        $xmlContent,
        1
    );

    header("Content-Type: application/xml; charset=UTF-8");

    header(
        "Content-Disposition: attachment; filename=\""
        . $complaint["complaint_code"]
        . ".xml\""
    );

    echo $xmlContent;

} catch (PDOException $e) {
    http_response_code(500);
    exit("Unable to export complaint XML.");
}