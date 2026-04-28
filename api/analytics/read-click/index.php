<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . "/bootstrap.php";

if (strtoupper((string) ($_SERVER["REQUEST_METHOD"] ?? "GET")) !== "POST") {
    json_response([
        "message" => "Method not allowed",
    ], 405);
    return;
}

$body = read_json_body();
$storyId = (int) ($body["storyId"] ?? 0);
$action = (string) ($body["action"] ?? "");

try {
    $stats = record_read_click($storyId, $action);

    json_response([
        "message" => "Read click tracked",
        "storyId" => $storyId,
        "stats" => $stats,
    ]);
} catch (Throwable $error) {
    json_response([
        "message" => $error->getMessage(),
    ], 400);
}
