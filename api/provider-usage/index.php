<?php
declare(strict_types=1);

require_once dirname(__DIR__) . "/bootstrap.php";

json_response([
    "providers" => list_provider_usage(),
]);
