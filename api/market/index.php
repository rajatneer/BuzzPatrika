<?php
declare(strict_types=1);

require_once dirname(__DIR__) . "/bootstrap.php";

try {
    $snapshot = get_market_snapshot();
    header("Cache-Control: public, max-age=30");
    json_response($snapshot);
} catch (Throwable $error) {
    log_warning("Market endpoint failed: " . $error->getMessage());
    json_response(["quotes" => [], "stale" => true, "message" => "Market data unavailable"], 503);
}
