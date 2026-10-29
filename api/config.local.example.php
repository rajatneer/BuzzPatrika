<?php
return [
    // Copy to config.local.php on the server. Everything here is free; no paid keys needed.
    "serviceName" => "mediababa-php",
    "schedulerCron" => "*/10 * * * *",
    "ingestLimitPerCategory" => 15,
    "ingestMaxAgeHours" => 72,
    "autoPublish" => true,
    "defaultCountryCode" => "in",

    // Long random string. Send it as the X-Pipeline-Token header to force a run.
    "pipelineToken" => "",

    // Visitors and the Refresh button trigger a background run only if the last run is older than this.
    "staleRefreshMinutes" => 10,

    // Market ticker cache (seconds) during market hours.
    "marketCacheSeconds" => 60,

    // Recommended: Google Sheets CSV with GOOGLEFINANCE quotes (see api/README.md).
    "marketSheetCsvUrl" => "",

    // Optional. NewsAPI's free plan does not allow production use, so leave empty.
    "newsApiKey" => "",
    "newsApiDailyRequestLimit" => 25,
];
