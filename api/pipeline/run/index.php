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
$categorySlug = "trending";
$countryCode = "in";

// Keep body read to avoid breaking clients that still send it.
unset($body);

try {
    $stats = run_pipeline([
        "categorySlug" => $categorySlug !== "" ? $categorySlug : null,
        "countryCode" => $countryCode,
    ]);

    json_response([
        "message" => "Pipeline run completed",
        "stats" => $stats,
    ]);
} catch (Throwable $error) {
    json_response([
        "message" => $error->getMessage(),
    ], 400);
}
