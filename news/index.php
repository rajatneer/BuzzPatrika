<?php
declare(strict_types=1);

/*
 * Server-rendered story pages so search engines and social apps can read each story.
 *   /news/                 latest stories (optional ?category= and ?page=)
 *   /news/{slug}           one story
 *   /news/sitemap.xml      all stories
 *   /news/news-sitemap.xml Google News sitemap (last 48 hours)
 */

require_once dirname(__DIR__) . "/api/bootstrap.php";

const CATEGORY_IMAGES = [
    "trending" => "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop",
    "business" => "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&auto=format&fit=crop",
    "tech" => "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop",
    "startup" => "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&auto=format&fit=crop",
    "entertainment" => "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop",
    "social-media" => "https://images.unsplash.com/photo-1611262588024-d12430b98920?w=1200&auto=format&fit=crop",
    "sports" => "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&auto=format&fit=crop",
    "news" => "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&auto=format&fit=crop",
];

const PAGE_SIZE = 30;

function h(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_HTML5, "UTF-8");
}

function category_label(string $slug): string
{
    $category = get_category_by_slug($slug);
    return $category["displayName"] ?? ucwords(str_replace("-", " ", $slug));
}

function format_ist(string $iso): string
{
    $ts = strtotime($iso);
    if ($ts === false) {
        return "";
    }
    $date = (new DateTimeImmutable("@" . $ts))->setTimezone(new DateTimeZone("Asia/Kolkata"));
    return $date->format("j M Y, g:i A") . " IST";
}

function story_image(array $story): array
{
    $url = trim((string) ($story["featuredMediaUrl"] ?? ""));
    if ($url !== "" && preg_match('#^https?://#i', $url) === 1) {
        return [$url, false];
    }
    return [CATEGORY_IMAGES[$story["category"]] ?? CATEGORY_IMAGES["news"], true];
}

function safe_source_url(array $story): ?string
{
    $url = trim((string) ($story["sourceUrl"] ?? ""));
    return preg_match('#^https?://#i', $url) === 1 ? $url : null;
}

function clean_description(string $text, int $max = 160): string
{
    $text = trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    if (mb_strlen($text) <= $max) {
        return $text;
    }
    return rtrim(mb_substr($text, 0, $max - 1)) . "…";
}

function share_links(string $url, string $title): array
{
    $text = $title . " " . $url;
    return [
        "whatsapp" => "https://wa.me/?text=" . rawurlencode($text),
        "x" => "https://twitter.com/intent/tweet?text=" . rawurlencode($title) . "&url=" . rawurlencode($url),
        "telegram" => "https://t.me/share/url?url=" . rawurlencode($url) . "&text=" . rawurlencode($title),
    ];
}

function json_ld(array $data): string
{
    $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG);
    return '<script type="application/ld+json">' . $json . "</script>";
}

function render_head(string $title, string $description, string $canonical, ?string $image, string $ogType, array $extra = [], string $robots = "index, follow, max-image-preview:large"): void
{
    $siteUrl = app_config()["siteUrl"];
    ?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($title) ?></title>
<meta name="description" content="<?= h($description) ?>">
<meta name="robots" content="<?= h($robots) ?>">
<link rel="canonical" href="<?= h($canonical) ?>">
<meta property="og:site_name" content="BuzzPatrika">
<meta property="og:type" content="<?= h($ogType) ?>">
<meta property="og:title" content="<?= h($title) ?>">
<meta property="og:description" content="<?= h($description) ?>">
<meta property="og:url" content="<?= h($canonical) ?>">
<?php if ($image !== null): ?>
<meta property="og:image" content="<?= h($image) ?>">
<meta name="twitter:image" content="<?= h($image) ?>">
<?php endif; ?>
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<?= h($title) ?>">
<meta name="twitter:description" content="<?= h($description) ?>">
<?php foreach ($extra as $line) { echo $line, "\n"; } ?>
<style>
  :root {
    --bg: #f8fafc; --surface: #ffffff; --text: #0f172a; --muted: #475569; --subtle: #64748b;
    --border: #e2e8f0; --accent: #dc2626; --accent-2: #f97316; --chip: #fee2e2; --chip-text: #b91c1c;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text);
    font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", sans-serif; }
  a { color: inherit; }
  .bar { background: linear-gradient(90deg, #0f172a, #1e293b, #0f172a); color: #fff; }
  .bar-inner { max-width: 960px; margin: 0 auto; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .logo { font-weight: 900; font-size: 22px; text-decoration: none; }
  .logo span { background: linear-gradient(90deg, #fb923c, #ef4444); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .bar nav { display: flex; gap: 14px; font-size: 14px; overflow-x: auto; white-space: nowrap; scrollbar-width: none; }
  @media (max-width: 640px) { .bar-inner { flex-direction: column; align-items: flex-start; gap: 8px; } .bar nav { width: 100%; } }
  .bar nav a { color: #cbd5e1; text-decoration: none; }
  .bar nav a:hover { color: #fff; }
  main { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
  .crumbs { font-size: 13px; color: var(--subtle); margin-bottom: 12px; }
  .crumbs a { text-decoration: none; }
  .chip { display: inline-block; padding: 2px 10px; border-radius: 999px; background: var(--chip); color: var(--chip-text); font-size: 12px; font-weight: 600; text-decoration: none; }
  h1 { font-size: clamp(26px, 4.5vw, 38px); line-height: 1.2; margin: 12px 0; text-wrap: balance; }
  .meta { color: var(--subtle); font-size: 14px; margin-bottom: 20px; }
  .hero { width: 100%; aspect-ratio: 16 / 9; max-height: 440px; object-fit: cover; border-radius: 14px; background: var(--border); display: block; }
  .hero-note { font-size: 12px; color: var(--subtle); margin: 6px 0 0; }
  .summary { font-size: 19px; color: var(--text); margin: 22px 0; }
  .cta { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 10px; color: #fff; font-weight: 700; text-decoration: none;
    background: linear-gradient(90deg, var(--accent-2), var(--accent)); }
  .share { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin: 24px 0; padding: 16px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .share strong { font-size: 14px; margin-right: 4px; }
  .share a, .share button { font: inherit; font-size: 14px; font-weight: 600; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; text-decoration: none; color: var(--text); }
  .share a:hover, .share button:hover { border-color: var(--accent); color: var(--accent); }
  h2 { font-size: 22px; margin: 32px 0 12px; }
  .list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
  .item { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; }
  .item a.title { font-weight: 700; font-size: 17px; text-decoration: none; display: block; }
  .item a.title:hover { color: var(--accent); }
  .item .meta { margin: 4px 0 0; font-size: 13px; }
  .pager { display: flex; justify-content: space-between; margin-top: 24px; }
  .pager a { font-weight: 600; color: var(--accent); text-decoration: none; }
  footer { text-align: center; color: var(--subtle); font-size: 13px; padding: 24px 16px 40px; }
</style>
</head>
<body>
<header class="bar">
  <div class="bar-inner">
    <a class="logo" href="<?= h($siteUrl) ?>/"><span>Buzz</span>पत्रिका</a>
    <nav aria-label="Sections">
      <a href="<?= h($siteUrl) ?>/news/">Latest</a>
      <?php foreach (get_categories() as $cat): ?>
        <a href="<?= h($siteUrl) ?>/news/?category=<?= h($cat["slug"]) ?>"><?= h($cat["displayName"]) ?></a>
      <?php endforeach; ?>
    </nav>
  </div>
</header>
<main>
<?php
}

function render_foot(): void
{
    ?>
</main>
<footer>© <?= date("Y") ?> BuzzPatrika. Headlines link to the original publishers.</footer>
<script>
  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var url = button.getAttribute("data-copy");
      var done = function () { button.textContent = "Link copied"; };
      if (navigator.share) {
        navigator.share({ title: document.title, url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(done, function () {});
      }
    });
  });
</script>
</body>
</html>
<?php
}

function render_story_list(array $stories): void
{
    echo '<ul class="list">';
    foreach ($stories as $story) {
        $url = story_public_url((string) $story["slug"]);
        echo '<li class="item"><a class="title" href="', h($url), '">', h($story["headline"]), '</a>';
        echo '<p class="meta">', h(category_label((string) $story["category"])), ' · ', h((string) $story["organizationName"]),
            ' · <time datetime="', h((string) $story["publishedAt"]), '">', h(format_ist((string) $story["publishedAt"])), '</time></p></li>';
    }
    echo '</ul>';
}

function render_story(array $story): void
{
    $config = app_config();
    $url = story_public_url((string) $story["slug"]);
    [$image, $isPlaceholder] = story_image($story);
    $sourceUrl = safe_source_url($story);
    $publisher = (string) ($story["organizationName"] ?: "Publisher");
    $categorySlug = (string) $story["category"];
    $summary = (string) $story["summary"];
    $description = clean_description($summary !== "" ? $summary : (string) $story["headline"]);

    $ld = [
        "@context" => "https://schema.org",
        "@graph" => [
            [
                "@type" => "NewsArticle",
                "headline" => mb_substr((string) $story["headline"], 0, 110),
                "description" => $description,
                "image" => [$image],
                "datePublished" => $story["publishedAt"],
                "dateModified" => $story["updatedAt"],
                "mainEntityOfPage" => $url,
                "articleSection" => category_label($categorySlug),
                "author" => ["@type" => "Organization", "name" => $publisher],
                "publisher" => ["@type" => "Organization", "name" => "BuzzPatrika", "url" => $config["siteUrl"] . "/"],
                "isBasedOn" => $sourceUrl,
            ],
            [
                "@type" => "BreadcrumbList",
                "itemListElement" => [
                    ["@type" => "ListItem", "position" => 1, "name" => "Home", "item" => $config["siteUrl"] . "/"],
                    ["@type" => "ListItem", "position" => 2, "name" => category_label($categorySlug), "item" => $config["siteUrl"] . "/news/?category=" . rawurlencode($categorySlug)],
                    ["@type" => "ListItem", "position" => 3, "name" => (string) $story["headline"], "item" => $url],
                ],
            ],
        ],
    ];

    render_head(
        $story["headline"] . " | BuzzPatrika",
        $description,
        $url,
        $image,
        "article",
        [
            '<meta property="article:published_time" content="' . h((string) $story["publishedAt"]) . '">',
            '<meta property="article:section" content="' . h(category_label($categorySlug)) . '">',
            json_ld($ld),
        ]
    );

    $share = share_links($url, (string) $story["headline"]);
    ?>
<article>
  <div class="crumbs"><a href="<?= h($config["siteUrl"]) ?>/">Home</a> › <a href="<?= h($config["siteUrl"]) ?>/news/?category=<?= h($categorySlug) ?>"><?= h(category_label($categorySlug)) ?></a></div>
  <a class="chip" href="<?= h($config["siteUrl"]) ?>/news/?category=<?= h($categorySlug) ?>"><?= h(category_label($categorySlug)) ?></a>
  <h1><?= h($story["headline"]) ?></h1>
  <p class="meta">Source: <strong><?= h($publisher) ?></strong> · <time datetime="<?= h((string) $story["publishedAt"]) ?>"><?= h(format_ist((string) $story["publishedAt"])) ?></time></p>
  <img class="hero" src="<?= h($image) ?>" alt="<?= h($isPlaceholder ? category_label($categorySlug) . " news" : $story["headline"]) ?>" loading="eager" referrerpolicy="no-referrer">
  <?php if ($isPlaceholder): ?><p class="hero-note">Representative image</p><?php endif; ?>
  <?php if ($summary !== ""): ?><p class="summary"><?= h($summary) ?></p><?php endif; ?>
  <?php if ($sourceUrl !== null): ?>
    <a class="cta" href="<?= h($sourceUrl) ?>" target="_blank" rel="noopener nofollow">Read the full story at <?= h($publisher) ?> →</a>
  <?php endif; ?>
  <div class="share" aria-label="Share this story">
    <strong>Share:</strong>
    <a href="<?= h($share["whatsapp"]) ?>" target="_blank" rel="noopener">WhatsApp</a>
    <a href="<?= h($share["x"]) ?>" target="_blank" rel="noopener">X</a>
    <a href="<?= h($share["telegram"]) ?>" target="_blank" rel="noopener">Telegram</a>
    <button type="button" data-copy="<?= h($url) ?>">Copy link</button>
  </div>
</article>
<?php
    $related = array_values(array_filter(
        list_published_story_rows(7, $categorySlug),
        static fn(array $row): bool => (int) $row["id"] !== (int) $story["id"]
    ));
    if (count($related) > 0) {
        echo '<h2>More in ', h(category_label($categorySlug)), '</h2>';
        render_story_list(array_slice($related, 0, 6));
    }
    render_foot();
}

function render_index(?string $category, int $page): void
{
    $config = app_config();
    $offset = ($page - 1) * PAGE_SIZE;
    $stories = list_published_story_rows(PAGE_SIZE + 1, $category, $offset);
    $hasNext = count($stories) > PAGE_SIZE;
    $stories = array_slice($stories, 0, PAGE_SIZE);

    $label = $category !== null ? category_label($category) . " news" : "Latest news";
    $query = array_filter(["category" => $category, "page" => $page > 1 ? $page : null]);
    $canonical = $config["siteUrl"] . "/news/" . (count($query) > 0 ? "?" . http_build_query($query) : "");

    if (count($stories) === 0 && $page > 1) {
        http_response_code(404);
    }

    render_head(
        $label . " from India | BuzzPatrika",
        "Latest " . strtolower($label) . " from India's top publishers, updated every few minutes on BuzzPatrika.",
        $canonical,
        null,
        "website"
    );

    echo '<h1>', h($label), '</h1>';
    if (count($stories) === 0) {
        echo '<p>No stories yet. Check back in a few minutes.</p>';
    } else {
        render_story_list($stories);
    }

    $base = $config["siteUrl"] . "/news/?" . ($category !== null ? "category=" . rawurlencode($category) . "&" : "");
    echo '<nav class="pager" aria-label="Pages"><span>';
    if ($page > 1) {
        echo '<a href="', h($base . "page=" . ($page - 1)), '">← Newer</a>';
    }
    echo '</span><span>';
    if ($hasNext) {
        echo '<a href="', h($base . "page=" . ($page + 1)), '">Older →</a>';
    }
    echo '</span></nav>';
    render_foot();
}

function render_sitemap(bool $newsOnly): void
{
    $config = app_config();
    header("Content-Type: application/xml; charset=utf-8");
    header("Cache-Control: public, max-age=600");

    $stories = list_published_story_rows($newsOnly ? 1000 : 5000);
    $cutoff = time() - 48 * 3600;

    echo '<?xml version="1.0" encoding="UTF-8"?>', "\n";
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
    echo $newsOnly ? ' xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">' : '>';
    echo "\n";

    if (!$newsOnly) {
        echo '<url><loc>', h($config["siteUrl"] . "/"), '</loc><changefreq>always</changefreq><priority>1.0</priority></url>', "\n";
        echo '<url><loc>', h($config["siteUrl"] . "/news/"), '</loc><changefreq>always</changefreq><priority>0.9</priority></url>', "\n";
        foreach (get_categories() as $cat) {
            echo '<url><loc>', h($config["siteUrl"] . "/news/?category=" . $cat["slug"]), '</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>', "\n";
        }
    }

    foreach ($stories as $story) {
        $publishedTs = strtotime((string) $story["publishedAt"]);
        if ($newsOnly && ($publishedTs === false || $publishedTs < $cutoff)) {
            continue;
        }
        $loc = story_public_url((string) $story["slug"]);
        $lastmod = gmdate("c", (int) (strtotime((string) $story["updatedAt"]) ?: $publishedTs ?: time()));
        echo '<url><loc>', h($loc), '</loc><lastmod>', h($lastmod), '</lastmod>';
        if ($newsOnly) {
            echo '<news:news><news:publication><news:name>BuzzPatrika</news:name><news:language>en</news:language></news:publication>';
            echo '<news:publication_date>', h(gmdate("c", (int) $publishedTs)), '</news:publication_date>';
            echo '<news:title>', h((string) $story["headline"]), '</news:title></news:news>';
        }
        echo "</url>\n";
    }

    echo "</urlset>\n";
}

// ---------------------------------------------------------------------------

$sitemap = (string) ($_GET["sitemap"] ?? "");
if ($sitemap === "all" || $sitemap === "news") {
    render_sitemap($sitemap === "news");
    return;
}

header("Content-Type: text/html; charset=utf-8");
header("Cache-Control: public, max-age=300");

$slug = trim((string) ($_GET["slug"] ?? ""), "/ ");
if ($slug !== "") {
    $story = preg_match('/^[a-z0-9-]{1,200}$/', $slug) === 1 ? find_story_by_slug($slug) : null;
    if ($story === null) {
        http_response_code(404);
        header("Cache-Control: no-store");
        render_head("Story not found | BuzzPatrika", "This story is no longer available.", app_config()["siteUrl"] . "/news/", null, "website", [], "noindex");
        echo '<h1>Story not found</h1><p>It may have been removed. <a href="', h(app_config()["siteUrl"]), '/news/">See the latest news</a>.</p>';
        render_foot();
        return;
    }
    render_story($story);
    return;
}

$category = trim((string) ($_GET["category"] ?? ""));
$category = $category !== "" && get_category_by_slug($category) !== null ? $category : null;
$page = max(1, min(500, (int) ($_GET["page"] ?? 1)));
render_index($category, $page);

// Keep stories fresh for crawlers too.
schedule_refresh_if_stale();
