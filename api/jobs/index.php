<?php
declare(strict_types=1);

require_once dirname(__DIR__) . "/bootstrap.php";

$limit = $_GET["limit"] ?? null;
$jobs = list_job_runs($limit);

json_response([
    "jobs" => $jobs,
]);
