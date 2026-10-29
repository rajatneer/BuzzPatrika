<?php
declare(strict_types=1);

require_once dirname(__DIR__) . "/bootstrap.php";

$stories = list_stories($_GET);

header("Cache-Control: no-store");
json_response([
    "stories" => $stories,
    "lastPipelineRunAt" => last_pipeline_run_at(),
]);

// Refresh in the background if the last run is older than staleRefreshMinutes.
schedule_refresh_if_stale();
