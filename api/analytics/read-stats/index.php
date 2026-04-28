<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . "/bootstrap.php";

$stats = list_read_click_stats();
$totalClicks = 0;

foreach ($stats as $item) {
    $totalClicks += (int) ($item["readMore"] ?? 0);
    $totalClicks += (int) ($item["readFullStory"] ?? 0);
}

json_response([
    "stats" => $stats,
    "totalClicks" => $totalClicks,
]);
