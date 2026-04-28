<?php
declare(strict_types=1);

require_once dirname(__DIR__) . "/bootstrap.php";

$categories = array_map(static function (array $category): array {
    return [
        "slug" => $category["slug"],
        "display_name" => $category["displayName"],
    ];
}, get_categories());

json_response([
    "categories" => $categories,
]);
