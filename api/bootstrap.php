<?php
declare(strict_types=1);

date_default_timezone_set("UTC");

const API_ROOT = __DIR__;
const API_DATA_DIR = API_ROOT . "/data";
const API_LOG_DIR = API_ROOT . "/logs";
const API_STORE_FILE = API_DATA_DIR . "/store.json";

const CATEGORY_CONFIG = [
    [
        "slug" => "trending",
        "displayName" => "Trending",
        "newsQuery" => "trending india media startups technology",
    ],
    [
        "slug" => "business",
        "displayName" => "Business",
        "newsQuery" => "business india markets economy companies",
    ],
    [
        "slug" => "tech",
        "displayName" => "Tech",
        "newsQuery" => "technology AI startups product launches india",
    ],
    [
        "slug" => "startup",
        "displayName" => "Startup",
        "newsQuery" => "startup funding venture capital india",
    ],
    [
        "slug" => "entertainment",
        "displayName" => "Entertainment",
        "newsQuery" => "entertainment OTT cinema media india",
    ],
    [
        "slug" => "social-media",
        "displayName" => "Social Media",
        "newsQuery" => "social media creator economy platform policy india",
    ],
    [
        "slug" => "sports",
        "displayName" => "Sports",
        "newsQuery" => "sports cricket football leagues india",
    ],
    [
        "slug" => "news",
        "displayName" => "News",
        "newsQuery" => "india breaking news policy updates",
    ],
];

const COUNTRY_LABEL_BY_CODE = [
    "in" => "India",
    "us" => "United States",
    "gb" => "United Kingdom",
    "au" => "Australia",
    "ca" => "Canada",
    "ae" => "United Arab Emirates",
    "sg" => "Singapore",
];

const NEWSAPI_CATEGORY_BY_SLUG = [
    "business" => "business",
    "entertainment" => "entertainment",
    "sports" => "sports",
    "tech" => "technology",
    "trending" => "general",
    "startup" => "general",
    "social-media" => "general",
    "news" => "general",
];

function app_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $default = [
        "serviceName" => "mediababa-php",
        "schedulerCron" => "*/30 * * * *",
        "ingestLimitPerCategory" => 5,
        "storiesMaxAgeDays" => 7,
        "autoPublish" => true,
        "defaultCountryCode" => "in",
        "newsApiKey" => "",
        "alphaVantageApiKey" => "",
    ];

    $localPath = API_ROOT . "/config.local.php";
    if (is_file($localPath)) {
        $local = require $localPath;
        if (is_array($local)) {
            $config = array_merge($default, $local);
            $config["ingestLimitPerCategory"] = max(1, (int) ($config["ingestLimitPerCategory"] ?? 5));
            $config["storiesMaxAgeDays"] = sanitize_max_age_days($config["storiesMaxAgeDays"] ?? 7);
            $config["defaultCountryCode"] = sanitize_country_code((string) ($config["defaultCountryCode"] ?? "in"));
            $config["newsApiKey"] = trim((string) ($config["newsApiKey"] ?? ""));
            $config["alphaVantageApiKey"] = trim((string) ($config["alphaVantageApiKey"] ?? ""));
            return $config;
        }
    }

    $config = [
        "serviceName" => getenv("SERVICE_NAME") ?: $default["serviceName"],
        "schedulerCron" => getenv("SCHEDULER_CRON") ?: $default["schedulerCron"],
        "ingestLimitPerCategory" => (int) (getenv("INGEST_LIMIT_PER_CATEGORY") ?: $default["ingestLimitPerCategory"]),
        "storiesMaxAgeDays" => sanitize_max_age_days(getenv("STORIES_MAX_AGE_DAYS") ?: $default["storiesMaxAgeDays"]),
        "autoPublish" => strtolower((string) (getenv("AUTO_PUBLISH") ?: ($default["autoPublish"] ? "true" : "false"))) === "true",
        "defaultCountryCode" => sanitize_country_code(getenv("DEFAULT_COUNTRY_CODE") ?: $default["defaultCountryCode"]),
        "newsApiKey" => trim((string) (getenv("NEWS_API_KEY") ?: "")),
        "alphaVantageApiKey" => trim((string) (getenv("ALPHA_VANTAGE_API_KEY") ?: "")),
    ];

    return $config;
}

function sanitize_country_code(string $countryCode): string
{
    $normalized = strtolower(trim($countryCode));
    return preg_match('/^[a-z]{2}$/', $normalized) === 1 ? $normalized : "in";
}

function sanitize_max_age_days($raw): int
{
    $days = (int) $raw;
    if ($days < 1) {
        $days = 1;
    }

    if ($days > 7) {
        $days = 7;
    }

    return $days;
}

function now_iso(): string
{
    return gmdate("c");
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function read_json_body(): array
{
    $raw = file_get_contents("php://input");
    if (!is_string($raw) || trim($raw) === "") {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function log_warning(string $message): void
{
    if (!is_dir(API_LOG_DIR)) {
        @mkdir(API_LOG_DIR, 0775, true);
    }

    $line = "[" . now_iso() . "] " . $message . PHP_EOL;
    @file_put_contents(API_LOG_DIR . "/api.log", $line, FILE_APPEND);
}

function default_store(): array
{
    return [
        "meta" => [
            "sourceItemLastId" => 0,
            "storyLastId" => 0,
            "jobLastId" => 0,
        ],
        "source_items" => [],
        "generated_stories" => [],
        "job_runs" => [],
    ];
}

function ensure_store_file(): void
{
    if (!is_dir(API_DATA_DIR)) {
        mkdir(API_DATA_DIR, 0775, true);
    }

    if (!is_file(API_STORE_FILE)) {
        file_put_contents(API_STORE_FILE, json_encode(default_store(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }
}

function decode_store(string $raw): array
{
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return default_store();
    }

    $decoded["meta"] = is_array($decoded["meta"] ?? null) ? $decoded["meta"] : [];
    $decoded["meta"]["sourceItemLastId"] = (int) ($decoded["meta"]["sourceItemLastId"] ?? 0);
    $decoded["meta"]["storyLastId"] = (int) ($decoded["meta"]["storyLastId"] ?? 0);
    $decoded["meta"]["jobLastId"] = (int) ($decoded["meta"]["jobLastId"] ?? 0);
    $decoded["source_items"] = is_array($decoded["source_items"] ?? null) ? $decoded["source_items"] : [];
    $decoded["generated_stories"] = is_array($decoded["generated_stories"] ?? null) ? $decoded["generated_stories"] : [];
    $decoded["job_runs"] = is_array($decoded["job_runs"] ?? null) ? $decoded["job_runs"] : [];

    return $decoded;
}

function read_store_snapshot(): array
{
    ensure_store_file();

    $fp = fopen(API_STORE_FILE, "c+");
    if ($fp === false) {
        return default_store();
    }

    try {
        flock($fp, LOCK_SH);
        rewind($fp);
        $raw = stream_get_contents($fp);
        flock($fp, LOCK_UN);
    } finally {
        fclose($fp);
    }

    return decode_store(is_string($raw) ? $raw : "");
}

function with_store_lock(callable $callback)
{
    ensure_store_file();

    $fp = fopen(API_STORE_FILE, "c+");
    if ($fp === false) {
        throw new RuntimeException("Unable to open store file");
    }

    try {
        if (!flock($fp, LOCK_EX)) {
            throw new RuntimeException("Unable to lock store file");
        }

        rewind($fp);
        $raw = stream_get_contents($fp);
        $store = decode_store(is_string($raw) ? $raw : "");

        $result = call_user_func_array($callback, [&$store]);

        $json = json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException("Failed to encode store JSON");
        }

        rewind($fp);
        ftruncate($fp, 0);
        fwrite($fp, $json);
        fflush($fp);
        flock($fp, LOCK_UN);

        return $result;
    } finally {
        fclose($fp);
    }
}

function get_categories(): array
{
    return array_map(static function (array $category): array {
        return [
            "slug" => $category["slug"],
            "displayName" => $category["displayName"],
        ];
    }, CATEGORY_CONFIG);
}

function get_category_by_slug(string $slug): ?array
{
    foreach (CATEGORY_CONFIG as $category) {
        if ($category["slug"] === $slug) {
            return $category;
        }
    }

    return null;
}

function next_store_id(array &$store, string $metaKey): int
{
    $current = (int) ($store["meta"][$metaKey] ?? 0);
    $current += 1;
    $store["meta"][$metaKey] = $current;
    return $current;
}

function slugify(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? "";
    $value = trim($value, '-');
    $value = preg_replace('/-{2,}/', '-', $value) ?? "";
    return $value !== "" ? $value : "story";
}

function to_provider_label(?string $provider): string
{
    if ($provider === null || trim($provider) === "") {
        return "BuzzPatrika";
    }

    $parts = preg_split('/[-_\s]+/', $provider) ?: [];
    $parts = array_filter($parts, static fn(string $part): bool => $part !== "");
    $parts = array_map(static function (string $part): string {
        return strtoupper(substr($part, 0, 1)) . strtolower(substr($part, 1));
    }, $parts);

    return implode(" ", $parts);
}

function build_country_aware_query(array $category, string $countryCode): string
{
    $baseQuery = preg_replace('/\bindia\b/i', '', $category["newsQuery"]) ?? $category["newsQuery"];
    $baseQuery = trim(preg_replace('/\s+/', ' ', $baseQuery) ?? $baseQuery);
    $countryLabel = COUNTRY_LABEL_BY_CODE[$countryCode] ?? strtoupper($countryCode);
    $categoryHint = strtolower($category["displayName"]);

    if ($countryCode === "in") {
        return $category["newsQuery"];
    }

    $query = trim($categoryHint . " " . $baseQuery . " " . $countryLabel);
    return preg_replace('/\s+/', ' ', $query) ?? $query;
}

function http_get(string $url, array $headers = [], int $timeout = 20): array
{
    if (!function_exists("curl_init")) {
        throw new RuntimeException("cURL is not available on this hosting.");
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_USERAGENT, "MediababaPHP/1.0");

    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno !== 0) {
        throw new RuntimeException("HTTP request failed: " . $error);
    }

    if (!is_string($body)) {
        $body = "";
    }

    return [
        "status" => $status,
        "body" => $body,
    ];
}

function http_get_json(string $url, array $headers = [], int $timeout = 20): array
{
    $response = http_get($url, $headers, $timeout);
    if ($response["status"] < 200 || $response["status"] >= 300) {
        throw new RuntimeException("Request failed with status " . $response["status"]);
    }

    $decoded = json_decode($response["body"], true);
    if (!is_array($decoded)) {
        throw new RuntimeException("Invalid JSON response");
    }

    return $decoded;
}

function fetch_newsapi_items(array $category, int $limit, string $countryCode, array $config): array
{
    if (($config["newsApiKey"] ?? "") === "") {
        return [];
    }

    $normalizedCountryCode = sanitize_country_code($countryCode);
    $apiCategory = NEWSAPI_CATEGORY_BY_SLUG[$category["slug"]] ?? "general";
    $query = build_country_aware_query($category, $normalizedCountryCode);

    $params = http_build_query([
        "country" => $normalizedCountryCode,
        "category" => $apiCategory,
        "q" => $query,
        "pageSize" => max(1, min($limit, 30)),
    ]);

    $payload = http_get_json(
        "https://newsapi.org/v2/top-headlines?" . $params,
        ["X-Api-Key: " . $config["newsApiKey"]],
        25
    );

    $articles = is_array($payload["articles"] ?? null) ? $payload["articles"] : [];
    $results = [];

    foreach ($articles as $article) {
        if (!is_array($article)) {
            continue;
        }

        $sourceUrl = trim((string) ($article["url"] ?? ""));
        if ($sourceUrl === "") {
            continue;
        }

        $results[] = [
            "externalId" => sha1("newsapi:" . $sourceUrl),
            "provider" => "newsapi",
            "countryCode" => $normalizedCountryCode,
            "categorySlug" => $category["slug"],
            "title" => trim((string) ($article["title"] ?? "Untitled story")),
            "summary" => trim((string) (($article["description"] ?? "") !== "" ? $article["description"] : ($article["content"] ?? ""))),
            "sourceUrl" => $sourceUrl,
            "publishedAt" => trim((string) ($article["publishedAt"] ?? now_iso())),
            "marketSignal" => null,
            "relevanceScore" => 0.8,
            "rawPayload" => json_encode($article, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            "ingestionStatus" => "ingested",
        ];
    }

    return $results;
}

function fetch_alpha_vantage_signal(array $category, string $countryCode, array $config): array
{
    if (($config["alphaVantageApiKey"] ?? "") === "") {
        return [];
    }

    $normalizedCountryCode = sanitize_country_code($countryCode);
    if ($normalizedCountryCode !== "in") {
        return [];
    }

    $payload = http_get_json(
        "https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=" . rawurlencode((string) $config["alphaVantageApiKey"]),
        [],
        25
    );

    $gainers = is_array($payload["top_gainers"] ?? null) ? array_slice($payload["top_gainers"], 0, 3) : [];
    $results = [];

    foreach ($gainers as $index => $item) {
        if (!is_array($item)) {
            continue;
        }

        $ticker = trim((string) ($item["ticker"] ?? ("TICKER-" . $index)));
        if ($ticker === "") {
            $ticker = "TICKER-" . $index;
        }

        $results[] = [
            "externalId" => sha1("alphavantage:" . $ticker . ":" . gmdate("Y-m-d")),
            "provider" => "alphavantage",
            "countryCode" => $normalizedCountryCode,
            "categorySlug" => $category["slug"],
            "title" => $ticker . " leads market momentum",
            "summary" => $ticker . " moved " . ((string) ($item["change_percentage"] ?? "N/A")) . " with volume " . ((string) ($item["volume"] ?? "N/A")) . ".",
            "sourceUrl" => "https://www.alphavantage.co/",
            "publishedAt" => now_iso(),
            "marketSignal" => json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            "relevanceScore" => 0.7,
            "rawPayload" => json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            "ingestionStatus" => "ingested",
        ];
    }

    return $results;
}

function fetch_rss_items(array $category, int $limit, string $countryCode): array
{
    $normalizedCountryCode = sanitize_country_code($countryCode);
    $query = build_country_aware_query($category, $normalizedCountryCode);

    $rssCountryMap = [
        "in" => ["gl" => "IN", "ceid" => "IN:en"],
        "us" => ["gl" => "US", "ceid" => "US:en"],
        "gb" => ["gl" => "GB", "ceid" => "GB:en"],
        "au" => ["gl" => "AU", "ceid" => "AU:en"],
        "ca" => ["gl" => "CA", "ceid" => "CA:en"],
        "ae" => ["gl" => "AE", "ceid" => "AE:en"],
        "sg" => ["gl" => "SG", "ceid" => "SG:en"],
    ];

    $targetGeo = $rssCountryMap[$normalizedCountryCode] ?? $rssCountryMap["in"];

    $url = "https://news.google.com/rss/search?" . http_build_query([
        "q" => $query,
        "hl" => "en-IN",
        "gl" => $targetGeo["gl"],
        "ceid" => $targetGeo["ceid"],
    ]);

    $response = http_get($url, [], 25);
    if ($response["status"] < 200 || $response["status"] >= 300) {
        return [];
    }

    $xml = @simplexml_load_string($response["body"]);
    if ($xml === false || !isset($xml->channel->item)) {
        return [];
    }

    $results = [];
    foreach ($xml->channel->item as $item) {
        if (count($results) >= $limit) {
            break;
        }

        $title = trim((string) ($item->title ?? "Untitled story"));
        $link = trim((string) ($item->link ?? ""));
        if ($link === "") {
            continue;
        }

        $description = trim(strip_tags((string) ($item->description ?? "")));
        $pubDate = trim((string) ($item->pubDate ?? ""));
        $publishedAt = $pubDate !== "" ? date(DATE_ATOM, strtotime($pubDate)) : now_iso();

        $payload = [
            "title" => $title,
            "link" => $link,
            "description" => $description,
            "pubDate" => $pubDate,
        ];

        $results[] = [
            "externalId" => sha1("rss:" . $link),
            "provider" => "rss",
            "countryCode" => $normalizedCountryCode,
            "categorySlug" => $category["slug"],
            "title" => $title,
            "summary" => $description,
            "sourceUrl" => $link,
            "publishedAt" => $publishedAt,
            "marketSignal" => null,
            "relevanceScore" => 0.68,
            "rawPayload" => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            "ingestionStatus" => "ingested",
        ];
    }

    return $results;
}

function fetch_source_items_for_category(array $category, int $limit, string $countryCode, array $config): array
{
    $errors = [];
    $newsItems = [];
    $marketItems = [];

    try {
        $newsItems = fetch_newsapi_items($category, $limit, $countryCode, $config);
    } catch (Throwable $error) {
        $errors[] = "News provider failed for " . $category["slug"] . ": " . $error->getMessage();
    }

    try {
        $marketItems = fetch_alpha_vantage_signal($category, $countryCode, $config);
    } catch (Throwable $error) {
        $errors[] = "Market provider failed for " . $category["slug"] . ": " . $error->getMessage();
    }

    $combined = array_merge($newsItems, $marketItems);
    if (count($combined) > 0) {
        return [
            "items" => $combined,
            "errors" => $errors,
        ];
    }

    try {
        $rssItems = fetch_rss_items($category, $limit, $countryCode);
        if (count($rssItems) > 0) {
            return [
                "items" => $rssItems,
                "errors" => $errors,
            ];
        }
    } catch (Throwable $error) {
        $errors[] = "RSS fallback failed for " . $category["slug"] . ": " . $error->getMessage();
    }

    return [
        "items" => [],
        "errors" => $errors,
    ];
}

function parse_raw_payload(?string $rawPayload): array
{
    if ($rawPayload === null || trim($rawPayload) === "") {
        return [];
    }

    $decoded = json_decode($rawPayload, true);
    return is_array($decoded) ? $decoded : [];
}

function to_credibility_score(string $provider, $relevanceScore): float
{
    $providerScores = [
        "newsapi" => 0.78,
        "alphavantage" => 0.84,
        "rss" => 0.74,
        "mock" => 0.45,
    ];

    $fallback = is_numeric($relevanceScore) ? (float) $relevanceScore : 0.55;
    $score = isset($providerScores[$provider]) ? (float) $providerScores[$provider] : $fallback;

    return max(0.0, min(1.0, $score));
}

function build_tags(array $sourceItem, array $payload): array
{
    $rawTitle = strtolower((string) ($payload["title"] ?? $sourceItem["title"] ?? ""));
    $parts = preg_split('/[^a-z0-9]+/', $rawTitle) ?: [];

    $tokens = [];
    foreach ($parts as $part) {
        if (strlen($part) >= 4) {
            $tokens[] = $part;
        }
        if (count($tokens) >= 4) {
            break;
        }
    }

    $tags = array_merge([
        (string) ($sourceItem["categorySlug"] ?? "news"),
        (string) ($sourceItem["provider"] ?? "news"),
        sanitize_country_code((string) ($sourceItem["countryCode"] ?? "in")),
    ], $tokens);

    $tags = array_values(array_unique(array_filter($tags, static fn(string $value): bool => trim($value) !== "")));
    return $tags;
}

function generate_story_from_source(array $sourceItem, array $config): array
{
    $now = now_iso();
    $payload = parse_raw_payload((string) ($sourceItem["rawPayload"] ?? ""));
    $providerLabel = to_provider_label((string) ($sourceItem["provider"] ?? ""));
    $categorySlug = (string) ($sourceItem["categorySlug"] ?? "news");
    $categoryLabel = str_replace("-", " ", $categorySlug);

    $headline = trim((string) ($sourceItem["title"] ?? "Untitled story"));
    $summary = trim((string) ($sourceItem["summary"] ?? ""));
    if ($summary === "") {
        $summary = "Latest " . $categoryLabel . " update sourced from market/news feeds.";
    }

    $slugBase = substr(slugify($headline), 0, 80);
    $slugSuffix = substr(slugify((string) ($sourceItem["externalId"] ?? "story")), 0, 10);
    $slug = $slugBase . "-" . ($slugSuffix !== "" ? $slugSuffix : "story");

    $featuredMediaUrl = null;
    if (!empty($payload["urlToImage"]) && is_string($payload["urlToImage"])) {
        $featuredMediaUrl = trim($payload["urlToImage"]);
    } elseif (!empty($payload["image"]) && is_string($payload["image"])) {
        $featuredMediaUrl = trim($payload["image"]);
    }

    $credibility = to_credibility_score((string) ($sourceItem["provider"] ?? ""), $sourceItem["relevanceScore"] ?? 0.55);
    $tags = build_tags($sourceItem, $payload);

    $countryCode = sanitize_country_code((string) ($sourceItem["countryCode"] ?? "in"));
    $countryLabel = COUNTRY_LABEL_BY_CODE[$countryCode] ?? strtoupper($countryCode);

    $publishedAt = ($config["autoPublish"] ?? true)
        ? $now
        : ((string) ($sourceItem["publishedAt"] ?? $now));

    $storyBody = implode("\n\n", [
        "This automated story was generated for the " . $categoryLabel . " desk based on the latest source feed item.",
        "Source headline: " . $headline,
        "Key context: " . $summary,
        !empty($sourceItem["marketSignal"])
            ? "Market signal snapshot: " . (string) $sourceItem["marketSignal"]
            : "No additional market-signal payload was attached to this source item.",
        "Editorial note: this is phase-1 auto-generated content. Add review workflows and model-based summarization before production publishing.",
    ]);

    return [
        "source_item_id" => (int) ($sourceItem["id"] ?? 0),
        "category_slug" => $categorySlug,
        "slug" => $slug,
        "headline" => $headline,
        "summary" => $summary,
        "story_body" => $storyBody,
        "author_name" => trim((string) ($payload["author"] ?? ($providerLabel . " Desk"))),
        "organization_name" => trim((string) ($payload["source"]["name"] ?? $providerLabel)),
        "location" => trim((string) ($payload["location"] ?? $countryLabel)),
        "source_credibility_score" => $credibility,
        "featured_media_url" => $featuredMediaUrl,
        "tags_json" => json_encode($tags, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        "confidence_score" => ($sourceItem["provider"] ?? "") === "mock" ? 0.45 : 0.72,
        "generation_model" => "rules-v1",
        "generation_status" => "generated",
        "editorial_status" => ($config["autoPublish"] ?? true) ? "published" : "review_required",
        "published_at" => $publishedAt,
        "updated_at" => $now,
    ];
}

function upsert_source_item(array &$store, array $item): array
{
    $now = now_iso();
    $externalId = (string) ($item["externalId"] ?? "");

    foreach ($store["source_items"] as $index => $existing) {
        if ((string) ($existing["external_id"] ?? "") !== $externalId) {
            continue;
        }

        $store["source_items"][$index] = array_merge($existing, [
            "provider" => (string) ($item["provider"] ?? "newsapi"),
            "country_code" => sanitize_country_code((string) ($item["countryCode"] ?? "in")),
            "category_slug" => (string) ($item["categorySlug"] ?? "news"),
            "title" => trim((string) ($item["title"] ?? "Untitled story")),
            "summary" => trim((string) ($item["summary"] ?? "")),
            "source_url" => trim((string) ($item["sourceUrl"] ?? "")),
            "published_at" => trim((string) ($item["publishedAt"] ?? $now)),
            "market_signal" => $item["marketSignal"] ?? null,
            "relevance_score" => (float) ($item["relevanceScore"] ?? 0.0),
            "raw_payload" => (string) ($item["rawPayload"] ?? "{}"),
            "ingestion_status" => (string) ($item["ingestionStatus"] ?? "ingested"),
            "updated_at" => $now,
        ]);

        return [
            "id" => (int) $store["source_items"][$index]["id"],
            "inserted" => false,
        ];
    }

    $id = next_store_id($store, "sourceItemLastId");
    $store["source_items"][] = [
        "id" => $id,
        "external_id" => $externalId,
        "provider" => (string) ($item["provider"] ?? "newsapi"),
        "country_code" => sanitize_country_code((string) ($item["countryCode"] ?? "in")),
        "category_slug" => (string) ($item["categorySlug"] ?? "news"),
        "title" => trim((string) ($item["title"] ?? "Untitled story")),
        "summary" => trim((string) ($item["summary"] ?? "")),
        "source_url" => trim((string) ($item["sourceUrl"] ?? "")),
        "published_at" => trim((string) ($item["publishedAt"] ?? $now)),
        "market_signal" => $item["marketSignal"] ?? null,
        "relevance_score" => (float) ($item["relevanceScore"] ?? 0.0),
        "raw_payload" => (string) ($item["rawPayload"] ?? "{}"),
        "ingestion_status" => (string) ($item["ingestionStatus"] ?? "ingested"),
        "created_at" => $now,
        "updated_at" => $now,
    ];

    return [
        "id" => $id,
        "inserted" => true,
    ];
}

function mark_source_item_status(array &$store, int $sourceItemId, string $status): void
{
    foreach ($store["source_items"] as $index => $sourceItem) {
        if ((int) ($sourceItem["id"] ?? 0) !== $sourceItemId) {
            continue;
        }

        $store["source_items"][$index]["ingestion_status"] = $status;
        $store["source_items"][$index]["updated_at"] = now_iso();
        break;
    }
}

function upsert_generated_story(array &$store, array $story): array
{
    $now = now_iso();
    $sourceItemId = (int) ($story["source_item_id"] ?? 0);

    foreach ($store["generated_stories"] as $index => $existing) {
        if ((int) ($existing["source_item_id"] ?? 0) !== $sourceItemId) {
            continue;
        }

        $store["generated_stories"][$index] = array_merge($existing, [
            "category_slug" => (string) ($story["category_slug"] ?? "news"),
            "slug" => (string) ($story["slug"] ?? "story"),
            "headline" => (string) ($story["headline"] ?? "Untitled story"),
            "summary" => (string) ($story["summary"] ?? ""),
            "story_body" => (string) ($story["story_body"] ?? ""),
            "author_name" => (string) ($story["author_name"] ?? "BuzzPatrika Desk"),
            "organization_name" => (string) ($story["organization_name"] ?? "BuzzPatrika"),
            "location" => (string) ($story["location"] ?? "India"),
            "source_credibility_score" => (float) ($story["source_credibility_score"] ?? 0.5),
            "featured_media_url" => $story["featured_media_url"] ?? null,
            "tags_json" => (string) ($story["tags_json"] ?? "[]"),
            "confidence_score" => (float) ($story["confidence_score"] ?? 0.72),
            "generation_model" => (string) ($story["generation_model"] ?? "rules-v1"),
            "generation_status" => (string) ($story["generation_status"] ?? "generated"),
            "editorial_status" => (string) ($story["editorial_status"] ?? "published"),
            "published_at" => (string) ($story["published_at"] ?? $now),
            "updated_at" => (string) ($story["updated_at"] ?? $now),
        ]);

        return [
            "id" => (int) $store["generated_stories"][$index]["id"],
            "inserted" => false,
        ];
    }

    $id = next_store_id($store, "storyLastId");
    $store["generated_stories"][] = [
        "id" => $id,
        "source_item_id" => $sourceItemId,
        "category_slug" => (string) ($story["category_slug"] ?? "news"),
        "slug" => (string) ($story["slug"] ?? "story"),
        "headline" => (string) ($story["headline"] ?? "Untitled story"),
        "summary" => (string) ($story["summary"] ?? ""),
        "story_body" => (string) ($story["story_body"] ?? ""),
        "author_name" => (string) ($story["author_name"] ?? "BuzzPatrika Desk"),
        "organization_name" => (string) ($story["organization_name"] ?? "BuzzPatrika"),
        "location" => (string) ($story["location"] ?? "India"),
        "source_credibility_score" => (float) ($story["source_credibility_score"] ?? 0.5),
        "featured_media_url" => $story["featured_media_url"] ?? null,
        "tags_json" => (string) ($story["tags_json"] ?? "[]"),
        "confidence_score" => (float) ($story["confidence_score"] ?? 0.72),
        "generation_model" => (string) ($story["generation_model"] ?? "rules-v1"),
        "generation_status" => (string) ($story["generation_status"] ?? "generated"),
        "editorial_status" => (string) ($story["editorial_status"] ?? "published"),
        "published_at" => (string) ($story["published_at"] ?? $now),
        "updated_at" => (string) ($story["updated_at"] ?? $now),
        "created_at" => $now,
    ];

    return [
        "id" => $id,
        "inserted" => true,
    ];
}

function run_pipeline(array $input = []): array
{
    $config = app_config();

    $categorySlug = isset($input["categorySlug"]) && is_string($input["categorySlug"]) && trim($input["categorySlug"]) !== ""
        ? trim($input["categorySlug"])
        : null;

    $countryCode = sanitize_country_code((string) ($input["countryCode"] ?? $config["defaultCountryCode"]));

    $categories = [];
    if ($categorySlug !== null) {
        $category = get_category_by_slug($categorySlug);
        if ($category !== null) {
            $categories[] = $category;
        }
    } else {
        $categories = CATEGORY_CONFIG;
    }

    if (count($categories) === 0) {
        throw new RuntimeException("Unknown category: " . (string) $categorySlug);
    }

    $stats = [
        "categoriesProcessed" => 0,
        "sourceItemsUpserted" => 0,
        "sourceItemsInserted" => 0,
        "sourceItemsUpdated" => 0,
        "storiesCreated" => 0,
        "storiesUpdated" => 0,
        "providerErrors" => 0,
        "failures" => 0,
    ];

    $providerErrors = [];
    $allSourceItems = [];
    $startedAt = now_iso();

    try {
        foreach ($categories as $category) {
            $stats["categoriesProcessed"] += 1;
            $result = fetch_source_items_for_category($category, (int) $config["ingestLimitPerCategory"], $countryCode, $config);
            $allSourceItems = array_merge($allSourceItems, $result["items"]);
            $providerErrors = array_merge($providerErrors, $result["errors"]);
        }

        $stats["providerErrors"] = count($providerErrors);

        with_store_lock(function (array &$store) use ($allSourceItems, $config, &$stats, $categorySlug, $startedAt): void {
            foreach ($allSourceItems as $sourceItem) {
                $upsertResult = upsert_source_item($store, $sourceItem);

                $stats["sourceItemsUpserted"] += 1;
                if ($upsertResult["inserted"]) {
                    $stats["sourceItemsInserted"] += 1;
                } else {
                    $stats["sourceItemsUpdated"] += 1;
                }

                $sourceItemWithId = array_merge($sourceItem, [
                    "id" => $upsertResult["id"],
                ]);

                $story = generate_story_from_source($sourceItemWithId, $config);
                $storyResult = upsert_generated_story($store, $story);

                if ($storyResult["inserted"]) {
                    $stats["storiesCreated"] += 1;
                } else {
                    $stats["storiesUpdated"] += 1;
                }

                mark_source_item_status($store, (int) $upsertResult["id"], "generated");
            }

            $jobId = next_store_id($store, "jobLastId");
            $store["job_runs"][] = [
                "id" => $jobId,
                "jobType" => $categorySlug !== null ? "pipeline:single" : "pipeline:all",
                "category" => $categorySlug,
                "status" => "success",
                "message" => "Pipeline completed",
                "statsJson" => json_encode($stats, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                "startedAt" => $startedAt,
                "finishedAt" => now_iso(),
                "stats" => $stats,
            ];
        });

        foreach ($providerErrors as $providerError) {
            log_warning($providerError);
        }

        return $stats;
    } catch (Throwable $error) {
        $stats["failures"] += 1;

        with_store_lock(function (array &$store) use ($stats, $categorySlug, $startedAt, $error): void {
            $jobId = next_store_id($store, "jobLastId");
            $store["job_runs"][] = [
                "id" => $jobId,
                "jobType" => $categorySlug !== null ? "pipeline:single" : "pipeline:all",
                "category" => $categorySlug,
                "status" => "failed",
                "message" => $error->getMessage(),
                "statsJson" => json_encode($stats, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                "startedAt" => $startedAt,
                "finishedAt" => now_iso(),
                "stats" => $stats,
            ];
        });

        throw $error;
    }
}

function list_job_runs($limit = null): array
{
    $snapshot = read_store_snapshot();
    $rows = $snapshot["job_runs"];

    usort($rows, static function (array $a, array $b): int {
        return strcmp((string) ($b["startedAt"] ?? ""), (string) ($a["startedAt"] ?? ""));
    });

    $normalizedLimit = is_numeric($limit) ? (int) $limit : 20;
    $normalizedLimit = max(1, min($normalizedLimit, 100));

    $rows = array_slice($rows, 0, $normalizedLimit);

    return array_map(static function (array $row): array {
        if (!isset($row["stats"]) || !is_array($row["stats"])) {
            $decoded = json_decode((string) ($row["statsJson"] ?? "{}"), true);
            $row["stats"] = is_array($decoded) ? $decoded : [];
        }
        return $row;
    }, $rows);
}

function to_story_row(array $story, ?array $source): array
{
    $countryCode = sanitize_country_code((string) ($source["country_code"] ?? "in"));

    $tagsJson = (string) ($story["tags_json"] ?? "[]");
    $tags = json_decode($tagsJson, true);
    if (!is_array($tags)) {
        $tags = [];
    }

    $featuredMediaUrl = null;
    if (!empty($story["featured_media_url"]) && is_string($story["featured_media_url"])) {
        $featuredMediaUrl = trim($story["featured_media_url"]);
    }

    if (($featuredMediaUrl === null || $featuredMediaUrl === "") && $source !== null) {
        $payload = parse_raw_payload((string) ($source["raw_payload"] ?? ""));
        if (!empty($payload["urlToImage"]) && is_string($payload["urlToImage"])) {
            $featuredMediaUrl = trim($payload["urlToImage"]);
        } elseif (!empty($payload["image"]) && is_string($payload["image"])) {
            $featuredMediaUrl = trim($payload["image"]);
        }
    }

    return [
        "id" => (int) ($story["id"] ?? 0),
        "category" => (string) ($story["category_slug"] ?? "news"),
        "slug" => (string) ($story["slug"] ?? ("story-" . (string) ($story["id"] ?? 0))),
        "headline" => (string) ($story["headline"] ?? "Untitled story"),
        "summary" => (string) ($story["summary"] ?? ""),
        "storyBody" => (string) ($story["story_body"] ?? ""),
        "authorName" => (string) ($story["author_name"] ?? "BuzzPatrika Desk"),
        "organizationName" => (string) ($story["organization_name"] ?? "BuzzPatrika"),
        "location" => (string) ($story["location"] ?? "India"),
        "sourceCredibilityScore" => (float) ($story["source_credibility_score"] ?? ($story["confidence_score"] ?? 0.5)),
        "featuredMediaUrl" => $featuredMediaUrl,
        "featured_media_url" => $featuredMediaUrl,
        "tagsJson" => $tagsJson,
        "tags" => $tags,
        "confidenceScore" => (float) ($story["confidence_score"] ?? 0.72),
        "editorialStatus" => (string) ($story["editorial_status"] ?? "published"),
        "publishedAt" => (string) ($story["published_at"] ?? ($story["created_at"] ?? now_iso())),
        "updatedAt" => (string) ($story["updated_at"] ?? ($story["published_at"] ?? now_iso())),
        "sourceUrl" => (string) ($source["source_url"] ?? ""),
        "provider" => (string) ($source["provider"] ?? "newsapi"),
        "countryCode" => $countryCode,
        "sourcePublishedAt" => (string) ($source["published_at"] ?? now_iso()),
    ];
}

function list_stories(array $query): array
{
    $config = app_config();
    $snapshot = read_store_snapshot();
    $stories = $snapshot["generated_stories"];
    $sourceById = [];

    foreach ($snapshot["source_items"] as $sourceItem) {
        $sourceById[(int) ($sourceItem["id"] ?? 0)] = $sourceItem;
    }

    $status = isset($query["status"]) && trim((string) $query["status"]) !== ""
        ? trim((string) $query["status"])
        : "published";

    $category = isset($query["category"]) ? trim((string) $query["category"]) : "";
    $country = isset($query["country"]) ? sanitize_country_code((string) $query["country"]) : "";
    $tag = isset($query["tag"]) ? strtolower(trim((string) $query["tag"])) : "";
    $location = isset($query["location"]) ? strtolower(trim((string) $query["location"])) : "";
    $slug = isset($query["slug"]) ? trim((string) $query["slug"]) : "";
    $search = isset($query["q"]) ? strtolower(trim((string) $query["q"])) : "";
    $minCredibilityRaw = $query["minCredibility"] ?? null;
    $minCredibility = is_numeric($minCredibilityRaw) ? (float) $minCredibilityRaw : null;

    $limitRaw = $query["limit"] ?? 20;
    $limit = is_numeric($limitRaw) ? (int) $limitRaw : 20;
    $limit = max(1, min($limit, 100));

    $maxAgeDaysRaw = $query["maxAgeDays"] ?? ($config["storiesMaxAgeDays"] ?? 7);
    $maxAgeDays = sanitize_max_age_days($maxAgeDaysRaw);
    $freshnessCutoffTs = time() - ($maxAgeDays * 24 * 60 * 60);

    $rows = [];

    foreach ($stories as $story) {
        $sourceItemId = (int) ($story["source_item_id"] ?? 0);
        $source = $sourceById[$sourceItemId] ?? null;

        $editorialStatus = (string) ($story["editorial_status"] ?? "published");
        if ($status !== "" && $editorialStatus !== $status) {
            continue;
        }

        $categorySlug = (string) ($story["category_slug"] ?? "news");
        if ($category !== "" && $categorySlug !== $category) {
            continue;
        }

        $countryCode = sanitize_country_code((string) ($source["country_code"] ?? "in"));
        if ($country !== "" && $countryCode !== $country) {
            continue;
        }

        $tagsJson = strtolower((string) ($story["tags_json"] ?? ""));
        if ($tag !== "" && strpos($tagsJson, '"' . str_replace('"', '', $tag) . '"') === false) {
            continue;
        }

        $rowLocation = strtolower((string) ($story["location"] ?? ""));
        if ($location !== "" && strpos($rowLocation, $location) === false) {
            continue;
        }

        $credibility = is_numeric($story["source_credibility_score"] ?? null)
            ? (float) $story["source_credibility_score"]
            : (float) ($story["confidence_score"] ?? 0.5);
        if ($minCredibility !== null && $credibility < $minCredibility) {
            continue;
        }

        $rowSlug = (string) ($story["slug"] ?? ("story-" . (string) ($story["id"] ?? 0)));
        if ($slug !== "" && $rowSlug !== $slug) {
            continue;
        }

        if ($search !== "") {
            $haystack = strtolower(implode(" ", [
                (string) ($story["headline"] ?? ""),
                (string) ($story["summary"] ?? ""),
                (string) ($story["story_body"] ?? ""),
                (string) ($story["tags_json"] ?? ""),
                (string) ($story["location"] ?? ""),
            ]));
            if (strpos($haystack, $search) === false) {
                continue;
            }
        }

        $freshnessCandidate = (string) (
            $source["published_at"]
            ?? $story["published_at"]
            ?? $story["created_at"]
            ?? now_iso()
        );
        $freshnessTs = strtotime($freshnessCandidate);
        if ($freshnessTs === false) {
            $freshnessTs = time();
        }

        if ($freshnessTs < $freshnessCutoffTs) {
            continue;
        }

        $rows[] = to_story_row($story, $source);
    }

    usort($rows, static function (array $a, array $b): int {
        return strcmp((string) ($b["publishedAt"] ?? ""), (string) ($a["publishedAt"] ?? ""));
    });

    return array_slice($rows, 0, $limit);
}
