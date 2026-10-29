<?php
declare(strict_types=1);

date_default_timezone_set("UTC");

const API_ROOT = __DIR__;
const API_DATA_DIR = API_ROOT . "/data";
const API_LOG_DIR = API_ROOT . "/logs";
const API_STORE_FILE = API_DATA_DIR . "/store.json";

// Free publisher RSS feeds (no key, no quota). Each feed failure is non-fatal.
const PUBLISHER_FEEDS = [
    "trending" => [
        ["name" => "The Economic Times", "url" => "https://economictimes.indiatimes.com/rssfeedstopstories.cms"],
        ["name" => "NDTV", "url" => "https://feeds.feedburner.com/ndtvnews-top-stories"],
    ],
    "business" => [
        ["name" => "ET Markets", "url" => "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms"],
        ["name" => "Business Standard", "url" => "https://www.business-standard.com/rss/markets-106.rss"],
        ["name" => "Livemint", "url" => "https://www.livemint.com/rss/markets"],
        ["name" => "Moneycontrol", "url" => "https://www.moneycontrol.com/rss/latestnews.xml"],
    ],
    "tech" => [
        ["name" => "ET Tech", "url" => "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms"],
        ["name" => "Livemint", "url" => "https://www.livemint.com/rss/technology"],
    ],
    "startup" => [
        ["name" => "Inc42", "url" => "https://inc42.com/feed/"],
        ["name" => "ET Startups", "url" => "https://economictimes.indiatimes.com/tech/startups/rssfeeds/78570540.cms"],
    ],
    "entertainment" => [
        ["name" => "The Hindu", "url" => "https://www.thehindu.com/entertainment/feeder/default.rss"],
    ],
    "social-media" => [],
    "sports" => [
        ["name" => "The Hindu", "url" => "https://www.thehindu.com/sport/feeder/default.rss"],
    ],
    "news" => [
        ["name" => "The Hindu", "url" => "https://www.thehindu.com/news/national/feeder/default.rss"],
    ],
];

const MARKET_SYMBOLS = [
    ["symbol" => "^NSEI", "name" => "Nifty 50"],
    ["symbol" => "^BSESN", "name" => "Sensex"],
    ["symbol" => "^NSEBANK", "name" => "Bank Nifty"],
    ["symbol" => "INR=X", "name" => "USD/INR"],
];

const API_MARKET_CACHE_FILE = API_DATA_DIR . "/market.json";
const API_PIPELINE_LOCK_FILE = API_DATA_DIR . "/pipeline.lock";

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
        "schedulerCron" => "*/10 * * * *",
        "ingestLimitPerCategory" => 15,
        "ingestMaxAgeHours" => 72,
        "storiesMaxAgeDays" => 7,
        "autoPublish" => true,
        "defaultCountryCode" => "in",
        // Optional. NewsAPI's free plan is for development only, so it stays off unless a key is set.
        "newsApiKey" => "",
        "newsApiDailyRequestLimit" => 25,
        // Secret for forcing a pipeline run (header X-Pipeline-Token). Leave empty to allow only cooldown-limited refreshes.
        "pipelineToken" => "",
        // A public refresh (visitor or Refresh button) only runs when the last run is older than this.
        "staleRefreshMinutes" => 10,
        // Market ticker cache lifetime.
        "marketCacheSeconds" => 60,
        // Optional: Google Sheets "Publish to web" CSV URL with GOOGLEFINANCE quotes (see api/README.md).
        "marketSheetCsvUrl" => "",
        // Public site address used in story links, sitemaps and share links.
        "siteUrl" => "https://buzzpatrika.com",
        // Optional: replace the built-in publisher feed list (same shape as PUBLISHER_FEEDS).
        "publisherFeeds" => null,
    ];

    $local = [];
    $localPath = API_ROOT . "/config.local.php";
    if (is_file($localPath)) {
        $loaded = require $localPath;
        if (is_array($loaded)) {
            $local = $loaded;
        }
    }

    $env = [];
    $envMap = [
        "serviceName" => "SERVICE_NAME",
        "schedulerCron" => "SCHEDULER_CRON",
        "ingestLimitPerCategory" => "INGEST_LIMIT_PER_CATEGORY",
        "ingestMaxAgeHours" => "INGEST_MAX_AGE_HOURS",
        "storiesMaxAgeDays" => "STORIES_MAX_AGE_DAYS",
        "autoPublish" => "AUTO_PUBLISH",
        "defaultCountryCode" => "DEFAULT_COUNTRY_CODE",
        "newsApiKey" => "NEWS_API_KEY",
        "newsApiDailyRequestLimit" => "NEWS_API_DAILY_REQUEST_LIMIT",
        "pipelineToken" => "PIPELINE_TOKEN",
        "staleRefreshMinutes" => "STALE_REFRESH_MINUTES",
        "marketCacheSeconds" => "MARKET_CACHE_SECONDS",
        "marketSheetCsvUrl" => "MARKET_SHEET_CSV_URL",
        "siteUrl" => "SITE_URL",
    ];
    foreach ($envMap as $key => $envName) {
        $value = getenv($envName);
        if ($value !== false && $value !== "") {
            $env[$key] = $value;
        }
    }

    $config = array_merge($default, $env, $local);
    $config["ingestLimitPerCategory"] = max(1, min(50, (int) $config["ingestLimitPerCategory"]));
    $config["ingestMaxAgeHours"] = max(1, (int) $config["ingestMaxAgeHours"]);
    $config["storiesMaxAgeDays"] = sanitize_max_age_days($config["storiesMaxAgeDays"]);
    $config["autoPublish"] = is_bool($config["autoPublish"])
        ? $config["autoPublish"]
        : strtolower((string) $config["autoPublish"]) === "true";
    $config["defaultCountryCode"] = sanitize_country_code((string) $config["defaultCountryCode"]);
    $config["newsApiKey"] = trim((string) $config["newsApiKey"]);
    $config["newsApiDailyRequestLimit"] = max(1, (int) $config["newsApiDailyRequestLimit"]);
    $config["pipelineToken"] = trim((string) $config["pipelineToken"]);
    $config["staleRefreshMinutes"] = max(2, (int) $config["staleRefreshMinutes"]);
    $config["marketCacheSeconds"] = max(15, (int) $config["marketCacheSeconds"]);
    $config["marketSheetCsvUrl"] = trim((string) $config["marketSheetCsvUrl"]);
    $config["siteUrl"] = rtrim(trim((string) $config["siteUrl"]), "/");
    $config["publisherFeeds"] = is_array($config["publisherFeeds"]) ? $config["publisherFeeds"] : PUBLISHER_FEEDS;

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
        "read_clicks" => [],
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
    $decoded["read_clicks"] = is_array($decoded["read_clicks"] ?? null) ? $decoded["read_clicks"] : [];

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
            "publishedAt" => normalize_published_at((string) ($article["publishedAt"] ?? "")),
            "marketSignal" => null,
            "relevanceScore" => 0.8,
            "rawPayload" => json_encode($article, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            "ingestionStatus" => "ingested",
        ];
    }

    return $results;
}

function normalize_published_at(string $raw): string
{
    $raw = trim($raw);
    if ($raw === "") {
        return now_iso();
    }

    $ts = strtotime($raw);
    if ($ts === false) {
        return now_iso();
    }

    // Guard against feeds that post future-dated items.
    return gmdate("c", min($ts, time()));
}

function extract_feed_image(SimpleXMLElement $item): ?string
{
    $media = $item->children("http://search.yahoo.com/mrss/");
    if (isset($media->content)) {
        foreach ($media->content as $content) {
            $url = trim((string) ($content->attributes()["url"] ?? ""));
            if ($url !== "") {
                return $url;
            }
        }
    }
    if (isset($media->thumbnail)) {
        $url = trim((string) ($media->thumbnail->attributes()["url"] ?? ""));
        if ($url !== "") {
            return $url;
        }
    }
    if (isset($item->enclosure)) {
        $attrs = $item->enclosure->attributes();
        $type = strtolower((string) ($attrs["type"] ?? ""));
        $url = trim((string) ($attrs["url"] ?? ""));
        if ($url !== "" && ($type === "" || strpos($type, "image") === 0)) {
            return $url;
        }
    }

    $description = (string) ($item->description ?? "");
    if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $description, $match) === 1) {
        return html_entity_decode($match[1], ENT_QUOTES);
    }

    return null;
}

function clean_feed_text(string $value): string
{
    $value = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, "UTF-8");
    $value = preg_replace('/\s+/u', ' ', $value) ?? $value;
    return trim($value);
}

/**
 * Parses an RSS 2.0 or Atom document into a flat list of entries.
 */
function parse_feed_entries(string $body): array
{
    $previous = libxml_use_internal_errors(true);
    $xml = simplexml_load_string($body, "SimpleXMLElement", LIBXML_NOCDATA);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);

    if ($xml === false) {
        return [];
    }

    $entries = [];

    if (isset($xml->channel->item)) {
        foreach ($xml->channel->item as $item) {
            $entries[] = [
                "title" => clean_feed_text((string) ($item->title ?? "")),
                "link" => trim((string) ($item->link ?? "")),
                "description" => clean_feed_text((string) ($item->description ?? "")),
                "pubDate" => trim((string) ($item->pubDate ?? "")),
                "sourceName" => trim((string) ($item->source ?? "")),
                "image" => extract_feed_image($item),
            ];
        }
        return $entries;
    }

    if (isset($xml->entry)) {
        foreach ($xml->entry as $entry) {
            $link = "";
            foreach ($entry->link as $linkNode) {
                $rel = (string) ($linkNode->attributes()["rel"] ?? "alternate");
                if ($rel === "alternate") {
                    $link = trim((string) ($linkNode->attributes()["href"] ?? ""));
                    break;
                }
            }
            $entries[] = [
                "title" => clean_feed_text((string) ($entry->title ?? "")),
                "link" => $link,
                "description" => clean_feed_text((string) ($entry->summary ?? $entry->content ?? "")),
                "pubDate" => trim((string) ($entry->updated ?? $entry->published ?? "")),
                "sourceName" => "",
                "image" => null,
            ];
        }
    }

    return $entries;
}

function feed_entries_to_source_items(array $entries, array $category, string $countryCode, string $provider, string $defaultSourceName, float $relevance, array $config): array
{
    $maxAgeSeconds = (int) $config["ingestMaxAgeHours"] * 3600;
    $results = [];

    foreach ($entries as $entry) {
        $title = (string) ($entry["title"] ?? "");
        $link = (string) ($entry["link"] ?? "");
        if ($title === "" || $link === "") {
            continue;
        }

        // Skip undated items: without a real publish time they would always look like the latest news.
        if (trim((string) ($entry["pubDate"] ?? "")) === "" || strtotime((string) $entry["pubDate"]) === false) {
            continue;
        }
        $publishedAt = normalize_published_at((string) $entry["pubDate"]);
        if (time() - (int) strtotime($publishedAt) > $maxAgeSeconds) {
            continue;
        }

        $sourceName = (string) ($entry["sourceName"] ?? "") !== "" ? (string) $entry["sourceName"] : $defaultSourceName;

        // Google News titles end with " - Publisher"; strip it for cleaner headlines.
        if ($provider === "rss" && $sourceName !== "") {
            $suffix = " - " . $sourceName;
            if (substr($title, -strlen($suffix)) === $suffix) {
                $title = trim(substr($title, 0, -strlen($suffix)));
            }
        }

        $description = (string) ($entry["description"] ?? "");
        if ($provider === "rss") {
            // Google News descriptions only repeat the headline and publisher.
            $description = "";
        }

        $payload = [
            "title" => $title,
            "link" => $link,
            "description" => $description,
            "pubDate" => (string) ($entry["pubDate"] ?? ""),
            "source" => ["name" => $sourceName],
            "image" => $entry["image"] ?? null,
        ];

        $results[] = [
            "externalId" => sha1($provider . ":" . $link),
            "provider" => $provider,
            "countryCode" => $countryCode,
            "categorySlug" => $category["slug"],
            "title" => $title,
            "summary" => $description,
            "sourceUrl" => $link,
            "publishedAt" => $publishedAt,
            "marketSignal" => null,
            "relevanceScore" => $relevance,
            "rawPayload" => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            "ingestionStatus" => "ingested",
        ];
    }

    return $results;
}

function fetch_publisher_items(array $category, string $countryCode, array $config, array &$errors): array
{
    if ($countryCode !== "in") {
        return [];
    }

    $feeds = $config["publisherFeeds"][$category["slug"]] ?? [];
    $results = [];

    foreach ($feeds as $feed) {
        $url = (string) ($feed["url"] ?? "");
        $name = (string) ($feed["name"] ?? "Publisher");
        if ($url === "") {
            continue;
        }

        try {
            $response = http_get($url, ["Accept: application/rss+xml, application/xml, text/xml"], 15);
            if ($response["status"] < 200 || $response["status"] >= 300) {
                $errors[] = "Feed " . $name . " returned HTTP " . $response["status"];
                continue;
            }
            $entries = parse_feed_entries($response["body"]);
            if (count($entries) === 0) {
                $errors[] = "Feed " . $name . " returned no parsable items";
                continue;
            }
            $results = array_merge(
                $results,
                feed_entries_to_source_items($entries, $category, $countryCode, "publisher", $name, 0.8, $config)
            );
        } catch (Throwable $error) {
            $errors[] = "Feed " . $name . " failed: " . $error->getMessage();
        }
    }

    return $results;
}

function fetch_rss_items(array $category, int $limit, string $countryCode, array $config): array
{
    $normalizedCountryCode = sanitize_country_code($countryCode);
    $query = build_country_aware_query($category, $normalizedCountryCode) . " when:1d";

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

    $response = http_get($url, [], 20);
    if ($response["status"] < 200 || $response["status"] >= 300) {
        throw new RuntimeException("Google News RSS returned HTTP " . $response["status"]);
    }

    $entries = array_slice(parse_feed_entries($response["body"]), 0, $limit * 2);
    return feed_entries_to_source_items($entries, $category, $normalizedCountryCode, "rss", "Google News", 0.74, $config);
}

function headline_fingerprint(string $title): string
{
    $normalized = strtolower($title);
    $normalized = preg_replace('/[^a-z0-9 ]+/', ' ', $normalized) ?? $normalized;
    $words = array_values(array_filter(explode(" ", $normalized), static fn(string $w): bool => strlen($w) > 2));
    return implode(" ", array_slice($words, 0, 6));
}

function fetch_source_items_for_category(array $category, int $limit, string $countryCode, array $config): array
{
    $errors = [];
    $items = [];

    // 1) Direct publisher feeds (free, fastest to update).
    $items = array_merge($items, fetch_publisher_items($category, $countryCode, $config, $errors));

    // 2) Google News search feed (free) for broader coverage.
    try {
        $items = array_merge($items, fetch_rss_items($category, $limit, $countryCode, $config));
    } catch (Throwable $error) {
        $errors[] = "Google News RSS failed for " . $category["slug"] . ": " . $error->getMessage();
    }

    // 3) Optional NewsAPI, only when a key is configured.
    try {
        $items = array_merge($items, fetch_newsapi_items($category, $limit, $countryCode, $config));
    } catch (Throwable $error) {
        $errors[] = "NewsAPI failed for " . $category["slug"] . ": " . $error->getMessage();
    }

    // Newest first, then drop duplicate headlines across sources.
    usort($items, static function (array $a, array $b): int {
        return strcmp((string) $b["publishedAt"], (string) $a["publishedAt"]);
    });

    $seen = [];
    $unique = [];
    foreach ($items as $item) {
        $fingerprint = headline_fingerprint((string) $item["title"]);
        if ($fingerprint === "" || isset($seen[$fingerprint])) {
            continue;
        }
        $seen[$fingerprint] = true;
        $unique[] = $item;
        if (count($unique) >= $limit) {
            break;
        }
    }

    return [
        "items" => $unique,
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
        "publisher" => 0.8,
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
        $summary = "Latest " . $categoryLabel . " update. Open the source for the full story.";
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

    // Always keep the source's own publish time so re-runs never reshuffle older stories to the top.
    $publishedAt = normalize_published_at((string) ($sourceItem["publishedAt"] ?? ""));

    $sourceName = trim((string) ($payload["source"]["name"] ?? $providerLabel));
    $storyBody = implode("\n\n", array_filter([
        $summary,
        "Source: " . $sourceName . ". Read the full report at the original publisher for complete details.",
    ]));

    return [
        "source_item_id" => (int) ($sourceItem["id"] ?? 0),
        "category_slug" => $categorySlug,
        "slug" => $slug,
        "headline" => $headline,
        "summary" => $summary,
        "story_body" => $storyBody,
        "author_name" => trim((string) ($payload["author"] ?? ($sourceName . " Desk"))),
        "organization_name" => $sourceName,
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
            // Never move an existing story's publish time; only refresh its content and updated_at.
            "published_at" => (string) ($existing["published_at"] ?? ($story["published_at"] ?? $now)),
            "updated_at" => $now,
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
            trim_job_runs($store);
            if ($categorySlug === null) {
                $store["meta"]["lastFullPipelineRunAt"] = now_iso();
            }
            $store["meta"]["lastPipelineRunAt"] = now_iso();
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
            trim_job_runs($store);
            // Record the attempt so a failing source does not trigger a retry on every request.
            $store["meta"]["lastPipelineRunAt"] = now_iso();
        });

        throw $error;
    }
}

function trim_job_runs(array &$store, int $keep = 200): void
{
    if (count($store["job_runs"]) > $keep) {
        $store["job_runs"] = array_values(array_slice($store["job_runs"], -$keep));
    }
}

function last_pipeline_run_at(): ?string
{
    $snapshot = read_store_snapshot();
    $value = $snapshot["meta"]["lastFullPipelineRunAt"] ?? ($snapshot["meta"]["lastPipelineRunAt"] ?? null);
    return is_string($value) && $value !== "" ? $value : null;
}

function minutes_since_last_run(): ?float
{
    $last = last_pipeline_run_at();
    if ($last === null) {
        return null;
    }
    $ts = strtotime($last);
    return $ts === false ? null : (time() - $ts) / 60;
}

function is_pipeline_stale(): bool
{
    $minutes = minutes_since_last_run();
    return $minutes === null || $minutes >= (float) app_config()["staleRefreshMinutes"];
}

/**
 * Runs the pipeline only if no other run is in progress. Returns null when skipped.
 */
function run_pipeline_exclusive(array $input = []): ?array
{
    ensure_store_file();
    @set_time_limit(180);

    $fp = fopen(API_PIPELINE_LOCK_FILE, "c");
    if ($fp === false) {
        return run_pipeline($input);
    }

    try {
        if (!flock($fp, LOCK_EX | LOCK_NB)) {
            return null;
        }
        try {
            return run_pipeline($input);
        } finally {
            flock($fp, LOCK_UN);
        }
    } finally {
        fclose($fp);
    }
}

/**
 * Lazy refresh: after the response is sent, run a full pipeline if the feed is stale.
 * This keeps the site fresh between cron runs without any paid service.
 */
function schedule_refresh_if_stale(): void
{
    if (PHP_SAPI === "cli" || !is_pipeline_stale()) {
        return;
    }

    register_shutdown_function(static function (): void {
        if (function_exists("fastcgi_finish_request")) {
            fastcgi_finish_request();
        } elseif (function_exists("litespeed_finish_request")) {
            litespeed_finish_request();
        } else {
            // Cannot detach from the visitor's request on this server; let cron handle it.
            return;
        }
        ignore_user_abort(true);
        try {
            run_pipeline_exclusive([
                "countryCode" => app_config()["defaultCountryCode"],
            ]);
        } catch (Throwable $error) {
            log_warning("Lazy refresh failed: " . $error->getMessage());
        }
    });
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

        $rows[] = to_story_row($story, $source);
    }

    usort($rows, static function (array $a, array $b): int {
        return strcmp((string) ($b["publishedAt"] ?? ""), (string) ($a["publishedAt"] ?? ""));
    });

    return array_slice($rows, 0, $limit);
}

function list_provider_usage(): array
{
    $config = app_config();
    $snapshot = read_store_snapshot();
    $todayStartTs = strtotime(gmdate("Y-m-d") . " 00:00:00 UTC");

    $counts = ["publisher" => 0, "rss" => 0, "newsapi" => 0];
    foreach ($snapshot["source_items"] as $item) {
        $provider = strtolower((string) ($item["provider"] ?? ""));
        if (!array_key_exists($provider, $counts)) {
            continue;
        }
        $createdTs = strtotime((string) ($item["created_at"] ?? ""));
        if ($createdTs !== false && $createdTs >= $todayStartTs) {
            $counts[$provider] += 1;
        }
    }

    // Publisher feeds and Google News RSS are free with no daily quota.
    $providers = [
        ["provider" => "publisher", "used" => $counts["publisher"], "limit" => null, "remaining" => null, "capped" => false],
        ["provider" => "rss", "used" => $counts["rss"], "limit" => null, "remaining" => null, "capped" => false],
    ];

    if ($config["newsApiKey"] !== "") {
        $limit = (int) $config["newsApiDailyRequestLimit"];
        $providers[] = [
            "provider" => "newsapi",
            "used" => $counts["newsapi"],
            "limit" => $limit,
            "remaining" => max(0, $limit - $counts["newsapi"]),
            "capped" => $counts["newsapi"] >= $limit,
        ];
    }

    return $providers;
}

function normalize_read_action(string $action): ?string
{
    $normalized = strtolower(trim($action));
    $normalized = str_replace("_", "-", $normalized);

    if ($normalized === "read-more" || $normalized === "read-full-story") {
        return $normalized;
    }

    return null;
}

function sanitize_read_click_stats($raw): array
{
    if (!is_array($raw)) {
        return [
            "readMore" => 0,
            "readFullStory" => 0,
            "lastClickedAt" => null,
        ];
    }

    return [
        "readMore" => max(0, (int) ($raw["readMore"] ?? 0)),
        "readFullStory" => max(0, (int) ($raw["readFullStory"] ?? 0)),
        "lastClickedAt" => is_string($raw["lastClickedAt"] ?? null) ? (string) $raw["lastClickedAt"] : null,
    ];
}

function list_read_click_stats(): array
{
    $snapshot = read_store_snapshot();
    $rawStats = is_array($snapshot["read_clicks"] ?? null) ? $snapshot["read_clicks"] : [];
    $normalized = [];

    foreach ($rawStats as $storyId => $stats) {
        $storyKey = (string) $storyId;
        if ($storyKey === "") {
            continue;
        }

        $normalized[$storyKey] = sanitize_read_click_stats($stats);
    }

    return $normalized;
}

function record_read_click(int $storyId, string $action): array
{
    if ($storyId <= 0) {
        throw new RuntimeException("Invalid storyId");
    }

    $normalizedAction = normalize_read_action($action);
    if ($normalizedAction === null) {
        throw new RuntimeException("Invalid action");
    }

    return with_store_lock(function (array &$store) use ($storyId, $normalizedAction): array {
        if (!isset($store["read_clicks"]) || !is_array($store["read_clicks"])) {
            $store["read_clicks"] = [];
        }

        $storyKey = (string) $storyId;
        $current = sanitize_read_click_stats($store["read_clicks"][$storyKey] ?? []);

        if ($normalizedAction === "read-more") {
            $current["readMore"] += 1;
        } else {
            $current["readFullStory"] += 1;
        }

        $current["lastClickedAt"] = now_iso();
        $store["read_clicks"][$storyKey] = $current;

        return $current;
    });
}

/* -------------------------------------------------------------------------
 * Market ticker (free sources, cached)
 * ---------------------------------------------------------------------- */

function parse_number($value): ?float
{
    if (is_int($value) || is_float($value)) {
        return (float) $value;
    }
    $clean = str_replace([",", "%", " "], "", trim((string) $value));
    return is_numeric($clean) ? (float) $clean : null;
}

/**
 * Reads a Google Sheet published as CSV with columns:
 * symbol, name, price, change, changePercent
 */
function fetch_market_from_sheet(string $csvUrl): array
{
    $response = http_get($csvUrl, [], 15);
    if ($response["status"] < 200 || $response["status"] >= 300) {
        throw new RuntimeException("Sheet CSV returned HTTP " . $response["status"]);
    }

    $lines = preg_split('/\r\n|\n|\r/', trim($response["body"])) ?: [];
    $quotes = [];
    foreach ($lines as $index => $line) {
        $cols = str_getcsv($line);
        if ($index === 0 && !is_numeric(str_replace(",", "", (string) ($cols[2] ?? "")))) {
            continue; // header row
        }
        $price = parse_number($cols[2] ?? null);
        if ($price === null) {
            continue;
        }
        $change = parse_number($cols[3] ?? null) ?? 0.0;
        $changePercent = parse_number($cols[4] ?? null);
        if ($changePercent === null) {
            $previous = $price - $change;
            $changePercent = $previous != 0.0 ? ($change / $previous) * 100 : 0.0;
        }
        $quotes[] = [
            "symbol" => trim((string) ($cols[0] ?? "")),
            "name" => trim((string) ($cols[1] ?? ($cols[0] ?? ""))),
            "price" => round($price, 2),
            "change" => round($change, 2),
            "changePercent" => round($changePercent, 2),
        ];
    }

    return $quotes;
}

/**
 * Yahoo Finance public chart endpoint. Free and keyless, but unofficial and may rate-limit.
 */
function fetch_market_from_yahoo(): array
{
    $quotes = [];
    foreach (MARKET_SYMBOLS as $entry) {
        $url = "https://query1.finance.yahoo.com/v8/finance/chart/" . rawurlencode($entry["symbol"])
            . "?interval=1d&range=1d";
        try {
            $payload = http_get_json($url, ["Accept: application/json"], 10);
        } catch (Throwable $error) {
            log_warning("Market quote failed for " . $entry["symbol"] . ": " . $error->getMessage());
            continue;
        }
        $meta = $payload["chart"]["result"][0]["meta"] ?? null;
        if (!is_array($meta)) {
            continue;
        }
        $price = parse_number($meta["regularMarketPrice"] ?? null);
        $previous = parse_number($meta["chartPreviousClose"] ?? ($meta["previousClose"] ?? null));
        if ($price === null) {
            continue;
        }
        $change = $previous !== null ? $price - $previous : 0.0;
        $quotes[] = [
            "symbol" => $entry["symbol"],
            "name" => $entry["name"],
            "price" => round($price, 2),
            "change" => round($change, 2),
            "changePercent" => $previous ? round(($change / $previous) * 100, 2) : 0.0,
        ];
    }

    return $quotes;
}

function is_indian_market_open(?int $timestamp = null): bool
{
    $now = new DateTimeImmutable("@" . ($timestamp ?? time()));
    $ist = $now->setTimezone(new DateTimeZone("Asia/Kolkata"));
    $day = (int) $ist->format("N");
    if ($day >= 6) {
        return false;
    }
    $minutes = (int) $ist->format("G") * 60 + (int) $ist->format("i");
    return $minutes >= 9 * 60 + 15 && $minutes <= 15 * 60 + 30;
}

function get_market_snapshot(): array
{
    $config = app_config();
    ensure_store_file();

    $cached = null;
    if (is_file(API_MARKET_CACHE_FILE)) {
        $decoded = json_decode((string) @file_get_contents(API_MARKET_CACHE_FILE), true);
        if (is_array($decoded) && isset($decoded["fetchedAt"], $decoded["quotes"])) {
            $cached = $decoded;
        }
    }

    $marketOpen = is_indian_market_open();
    // Outside market hours prices do not move, so cache longer.
    $ttl = $marketOpen ? (int) $config["marketCacheSeconds"] : 15 * 60;

    if ($cached !== null && time() - (int) strtotime((string) $cached["fetchedAt"]) < $ttl) {
        return array_merge($cached, ["marketOpen" => $marketOpen, "stale" => false]);
    }

    // Only one request refreshes the cache; others serve the cached copy.
    $lock = fopen(API_MARKET_CACHE_FILE . ".lock", "c");
    if ($lock !== false && !flock($lock, LOCK_EX | LOCK_NB)) {
        fclose($lock);
        if ($cached !== null) {
            return array_merge($cached, ["marketOpen" => $marketOpen, "stale" => true]);
        }
        $lock = false;
    }

    try {
        $quotes = [];
        $source = "";
        if ($config["marketSheetCsvUrl"] !== "") {
            try {
                $quotes = fetch_market_from_sheet($config["marketSheetCsvUrl"]);
                $source = "Google Finance via Google Sheets (may be delayed up to 20 min)";
            } catch (Throwable $error) {
                log_warning("Market sheet failed: " . $error->getMessage());
            }
        }
        if (count($quotes) === 0) {
            $quotes = fetch_market_from_yahoo();
            $source = "Yahoo Finance";
        }

        if (count($quotes) === 0) {
            if ($cached !== null) {
                return array_merge($cached, ["marketOpen" => $marketOpen, "stale" => true]);
            }
            return ["quotes" => [], "source" => null, "fetchedAt" => null, "marketOpen" => $marketOpen, "stale" => true];
        }

        $snapshot = [
            "quotes" => $quotes,
            "source" => $source,
            "fetchedAt" => now_iso(),
        ];
        @file_put_contents(API_MARKET_CACHE_FILE, json_encode($snapshot, JSON_UNESCAPED_SLASHES), LOCK_EX);

        return array_merge($snapshot, ["marketOpen" => $marketOpen, "stale" => false]);
    } finally {
        if ($lock !== false) {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}

/* -------------------------------------------------------------------------
 * Public story pages and sitemaps
 * ---------------------------------------------------------------------- */

function story_public_url(string $slug): string
{
    return app_config()["siteUrl"] . "/news/" . rawurlencode($slug);
}

/**
 * Published stories, newest first, without the 100-row API cap (for sitemaps and listings).
 */
function list_published_story_rows(int $limit = 1000, ?string $category = null, int $offset = 0): array
{
    $snapshot = read_store_snapshot();
    $sourceById = [];
    foreach ($snapshot["source_items"] as $sourceItem) {
        $sourceById[(int) ($sourceItem["id"] ?? 0)] = $sourceItem;
    }

    $rows = [];
    foreach ($snapshot["generated_stories"] as $story) {
        if ((string) ($story["editorial_status"] ?? "published") !== "published") {
            continue;
        }
        if ($category !== null && $category !== "" && (string) ($story["category_slug"] ?? "") !== $category) {
            continue;
        }
        $rows[] = to_story_row($story, $sourceById[(int) ($story["source_item_id"] ?? 0)] ?? null);
    }

    usort($rows, static function (array $a, array $b): int {
        return strcmp((string) ($b["publishedAt"] ?? ""), (string) ($a["publishedAt"] ?? ""));
    });

    return array_slice($rows, max(0, $offset), max(1, $limit));
}

function find_story_by_slug(string $slug): ?array
{
    $rows = list_stories(["slug" => $slug, "status" => "published", "limit" => 1]);
    return $rows[0] ?? null;
}
