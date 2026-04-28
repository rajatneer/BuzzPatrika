<?php
declare(strict_types=1);

require_once dirname(__DIR__) . "/bootstrap.php";

$config = app_config();
json_response([
    "status" => "ok",
    "service" => $config["serviceName"],
    "schedulerCron" => $config["schedulerCron"],
    "autoPublish" => (bool) $config["autoPublish"],
    "timestamp" => now_iso(),
]);
