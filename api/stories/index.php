<?php
declare(strict_types=1);

require_once dirname(__DIR__) . "/bootstrap.php";

$stories = list_stories($_GET);
json_response([
    "stories" => $stories,
]);
