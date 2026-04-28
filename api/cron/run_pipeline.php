<?php
declare(strict_types=1);

require_once dirname(__DIR__) . "/bootstrap.php";

try {
    $config = app_config();
    $stats = run_pipeline([
        "countryCode" => $config["defaultCountryCode"],
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
