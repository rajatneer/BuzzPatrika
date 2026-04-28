<?php
declare(strict_types=1);

require_once dirname(__DIR__) . "/bootstrap.php";

try {
    $stats = run_pipeline([
        "categorySlug" => "trending",
        "countryCode" => "in",
    ]);

    json_response([
        "message" => "Scheduled pipeline run completed",
        "stats" => $stats,
    ]);
} catch (Throwable $error) {
    json_response([
        "message" => $error->getMessage(),
    ], 500);
}
