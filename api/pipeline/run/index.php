<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . "/bootstrap.php";

if (strtoupper((string) ($_SERVER["REQUEST_METHOD"] ?? "GET")) !== "POST") {
    json_response([
        "message" => "Method not allowed",
    ], 405);
    return;
}

$config = app_config();
$body = read_json_body();

$categorySlug = isset($body["category"]) ? trim((string) $body["category"]) : "";
if ($categorySlug !== "" && get_category_by_slug($categorySlug) === null) {
    json_response(["message" => "Unknown category"], 400);
    return;
}
$countryCode = isset($body["country"]) ? sanitize_country_code((string) $body["country"]) : $config["defaultCountryCode"];

$providedToken = trim((string) ($_SERVER["HTTP_X_PIPELINE_TOKEN"] ?? ""));
$isAuthorized = $config["pipelineToken"] !== "" && hash_equals($config["pipelineToken"], $providedToken);

// Public callers (the Refresh button) can only trigger a run when the feed is stale.
if (!$isAuthorized && !is_pipeline_stale()) {
    json_response([
        "message" => "Stories are already fresh",
        "skipped" => true,
        "lastPipelineRunAt" => last_pipeline_run_at(),
    ]);
    return;
}

try {
    $stats = run_pipeline_exclusive([
        // Public refreshes always run all categories so the stale timer is meaningful.
        "categorySlug" => $isAuthorized && $categorySlug !== "" ? $categorySlug : null,
        "countryCode" => $countryCode,
    ]);

    if ($stats === null) {
        json_response([
            "message" => "A refresh is already running",
            "skipped" => true,
        ]);
        return;
    }

    json_response([
        "message" => "Pipeline run completed",
        "stats" => $stats,
    ]);
} catch (Throwable $error) {
    log_warning("Pipeline run failed: " . $error->getMessage());
    json_response([
        "message" => "Pipeline run failed",
    ], 500);
}
