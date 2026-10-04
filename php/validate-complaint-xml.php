<?php

session_start();

header("Content-Type: text/html; charset=UTF-8");

require_once __DIR__ . "/db.php";

if (!isset($_SESSION["user_id"], $_SESSION["role"])) {
    http_response_code(401);
    exit("Authentication required.");
}

$complaintId = filter_input(
    INPUT_GET,
    "complaint_id",
    FILTER_VALIDATE_INT
);

if (!$complaintId) {
    http_response_code(400);
    exit("Invalid complaint ID.");
}

$userId = (int) $_SESSION["user_id"];
$role = $_SESSION["role"];

try {
    $sql = "
        SELECT
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
    ";

    $params = [$complaintId];

    if ($role === "student") {
        $sql .= "
            WHERE c.complaint_id = ?
              AND c.student_id = ?
        ";

        $params[] = $userId;
    } elseif ($role === "staff") {
        $sql .= "
            WHERE c.complaint_id = ?
              AND EXISTS (
                  SELECT 1
                  FROM staff_assignments sa
                  WHERE sa.complaint_id = c.complaint_id
                    AND sa.assignment_id = (
                        SELECT MAX(sa2.assignment_id)
                        FROM staff_assignments sa2
                        WHERE sa2.complaint_id = c.complaint_id
                    )
                    AND sa.staff_id = ?
              )
        ";

        $params[] = $userId;
    } elseif ($role === "admin") {
        $sql .= "
            WHERE c.complaint_id = ?
        ";
    } else {
        http_response_code(403);
        exit("You are not authorized to validate complaint XML.");
    }

    $sql .= " LIMIT 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $complaint = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$complaint) {
        http_response_code(404);
        exit("Complaint not found or access denied.");
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

    $dtdPath = __DIR__
        . DIRECTORY_SEPARATOR . ".."
        . DIRECTORY_SEPARATOR . "xml"
        . DIRECTORY_SEPARATOR . "complaint.dtd";

    if (!file_exists($dtdPath)) {
        http_response_code(500);
        exit("DTD file not found.");
    }

    $dtdContent = file_get_contents($dtdPath);

    if ($dtdContent === false) {
        http_response_code(500);
        exit("Unable to read DTD file.");
    }

    $xmlContent = $xml->saveXML();

    $doctype = '<!DOCTYPE fixMyCampusComplaint ['
        . PHP_EOL
        . $dtdContent
        . PHP_EOL
        . ']>'
        . PHP_EOL;

    $xmlContent = preg_replace(
        '/(<\?xml[^>]*\?>\s*)/',
        '$1' . $doctype,
        $xmlContent,
        1
    );

    $tempXmlPath = tempnam(
        sys_get_temp_dir(),
        "fixmycampus_"
    );

    if ($tempXmlPath === false) {
        http_response_code(500);
        exit("Unable to create temporary XML file.");
    }

    if (file_put_contents($tempXmlPath, $xmlContent) === false) {
        if (file_exists($tempXmlPath)) {
            unlink($tempXmlPath);
        }

        http_response_code(500);
        exit("Unable to create temporary XML document.");
    }

    $xsdPath = __DIR__
        . DIRECTORY_SEPARATOR . ".."
        . DIRECTORY_SEPARATOR . "xml"
        . DIRECTORY_SEPARATOR . "complaint.xsd";

    if (!file_exists($xsdPath)) {
        unlink($tempXmlPath);

        http_response_code(500);
        exit("XSD file not found.");
    }

    libxml_use_internal_errors(true);

    $xsdValid = false;
    $dtdValid = false;

    $xsdErrors = [];
    $dtdErrors = [];

    $validationXml = new DOMDocument();

    if ($validationXml->load($tempXmlPath)) {

        if ($validationXml->schemaValidate($xsdPath)) {
            $xsdValid = true;
        } else {
            foreach (libxml_get_errors() as $error) {
                $xsdErrors[] = trim($error->message);
            }
        }

        libxml_clear_errors();

        if ($validationXml->validate()) {
            $dtdValid = true;
        } else {
            foreach (libxml_get_errors() as $error) {
                $dtdErrors[] = trim($error->message);
            }
        }

        libxml_clear_errors();
    }

    if (file_exists($tempXmlPath)) {
        unlink($tempXmlPath);
    }

    echo "<!DOCTYPE html>";
    echo "<html lang='en'>";
    echo "<head>";
    echo "<meta charset='UTF-8'>";
    echo "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    echo "<title>XML Validation - FixMyCampus</title>";

    echo "<style>";
    echo "*{box-sizing:border-box;}";
    echo "body{margin:0;padding:40px;font-family:Arial,sans-serif;background:#f4f7fc;color:#202633;}";
    echo ".container{max-width:850px;margin:0 auto;background:#fff;padding:32px;border-radius:14px;box-shadow:0 5px 25px rgba(0,0,0,.08);}";
    echo "h1{margin:0 0 10px;font-size:28px;}";
    echo ".subtitle{color:#697386;margin-bottom:28px;}";
    echo ".complaint{background:#f7f8fc;padding:16px;border-radius:9px;margin-bottom:22px;}";
    echo ".result{padding:18px;border-radius:9px;margin:15px 0;}";
    echo ".success{background:#edf9f0;border:1px solid #b7e2c0;}";
    echo ".error{background:#fff0f0;border:1px solid #f0b7b7;}";
    echo ".icon{font-size:20px;font-weight:bold;}";
    echo ".details{color:#596273;line-height:1.5;margin-top:5px;}";
    echo ".button{display:inline-block;margin-top:22px;padding:11px 18px;background:#4568e8;color:#fff;text-decoration:none;border-radius:7px;}";
    echo ".button:hover{opacity:.9;}";
    echo ".errors{margin-top:10px;color:#a52828;line-height:1.6;}";
    echo "</style>";

    echo "</head>";
    echo "<body>";

    echo "<div class='container'>";

    echo "<h1>FixMyCampus XML Validation</h1>";

    echo "<div class='subtitle'>";
    echo "Dynamic validation of complaint data from MySQL";
    echo "</div>";

    echo "<div class='complaint'>";
    echo "<strong>Complaint Code:</strong> "
        . htmlspecialchars(
            $complaint["complaint_code"],
            ENT_QUOTES,
            "UTF-8"
        );

    echo "<br>";

    echo "<strong>Title:</strong> "
        . htmlspecialchars(
            $complaint["title"],
            ENT_QUOTES,
            "UTF-8"
        );

    echo "</div>";

    if ($xsdValid) {
        echo "<div class='result success'>";
        echo "<div class='icon'>✓ XSD Validation Successful</div>";
        echo "<div class='details'>";
        echo "The current complaint XML conforms to complaint.xsd.";
        echo "</div>";
        echo "</div>";
    } else {
        echo "<div class='result error'>";
        echo "<div class='icon'>✗ XSD Validation Failed</div>";
        echo "<div class='errors'>";

        foreach ($xsdErrors as $error) {
            echo htmlspecialchars(
                $error,
                ENT_QUOTES,
                "UTF-8"
            ) . "<br>";
        }

        echo "</div>";
        echo "</div>";
    }

    if ($dtdValid) {
        echo "<div class='result success'>";
        echo "<div class='icon'>✓ DTD Validation Successful</div>";
        echo "<div class='details'>";
        echo "The current complaint XML conforms to complaint.dtd.";
        echo "</div>";
        echo "</div>";
    } else {
        echo "<div class='result error'>";
        echo "<div class='icon'>✗ DTD Validation Failed</div>";
        echo "<div class='errors'>";

        foreach ($dtdErrors as $error) {
            echo htmlspecialchars(
                $error,
                ENT_QUOTES,
                "UTF-8"
            ) . "<br>";
        }

        echo "</div>";
        echo "</div>";
    }

    echo "<a class='button' href='../student/dashboard.html'>";
    echo "Back to Dashboard";
    echo "</a>";

    echo "</div>";
    echo "</body>";
    echo "</html>";

} catch (PDOException $e) {
    error_log(
        "Complaint XML validation database error: "
        . $e->getMessage()
    );

    http_response_code(500);
    exit("Unable to validate complaint XML.");

} catch (Throwable $e) {
    error_log(
        "Complaint XML validation error: "
        . $e->getMessage()
    );

    http_response_code(500);
    exit("Unable to validate complaint XML.");
}