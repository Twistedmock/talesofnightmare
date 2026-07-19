<?php
/**
 * Reads the content. That is all it does.
 *
 * The site has no admin panel and nothing writes at runtime, so this file
 * cannot damage anything — the artwork is added by putting a file in artwork/
 * and adding an entry to data/artworks.json by hand.
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/* --------------------------------------------------------------- artworks */

/**
 * The order in the file is the order on the wall.
 *
 * A stray comma in hand-edited JSON would otherwise produce a silently empty
 * gallery, which is a miserable thing to debug, so a parse failure says so
 * plainly instead.
 */
function artworks_for_display(): array
{
    if (!is_file(ARTWORKS_FILE)) {
        return [];
    }
    $raw = @file_get_contents(ARTWORKS_FILE);
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        content_error(
            'data/artworks.json could not be read: ' . json_last_error_msg() . '.',
            'A trailing comma after the last entry is the usual cause. '
            . 'Paste the file into jsonlint.com to find the exact line.'
        );
    }

    $list = $data['artworks'] ?? [];
    return is_array($list) ? array_values(array_filter($list, 'is_array')) : [];
}

/* ------------------------------------------------------------- site config */

function site_defaults(): array
{
    return [
        'artistName' => 'TALES OF NIGHTMARE',
        'tagline'    => '',
        'statement'  => '',
        'email'      => '',
        'instagram'  => '',
        'footerNote' => '',
        'siteUrl'    => '',
    ];
}

function load_site(): array
{
    $file = APP_ROOT . '/config.php';
    $config = is_file($file) ? require $file : [];
    $site = array_merge(site_defaults(), is_array($config) ? $config : []);

    // Accept a full profile URL or a bare handle for Instagram, with or
    // without the @ — whichever the artist happened to paste.
    $handle = trim((string) $site['instagram']);
    if ($handle !== '') {
        // Delimiter is ~ rather than # — the character class contains a literal
        // '#', which would otherwise close the pattern early.
        if (preg_match('~instagram\.com/([^/?#\s]+)~i', $handle, $m)) {
            $handle = $m[1];
        }
        $site['instagram'] = ltrim($handle, '@');
    }

    return $site;
}

/* ------------------------------------------------------------------ errors */

/**
 * A broken content file should explain itself rather than render a blank wall.
 */
function content_error(string $problem, string $hint): never
{
    http_response_code(500);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><meta charset="utf-8">'
       . '<title>Content problem</title>'
       . '<style>body{background:#0a0d13;color:#c2ccd9;font:16px/1.7 ui-sans-serif,system-ui,sans-serif;'
       . 'padding:12vh 8vw;max-width:44rem}h1{font-weight:400;font-size:1.4rem;color:#e2e8f0}'
       . 'p{color:#8592a4}code{color:#a3675a}</style>'
       . '<h1>' . e($problem) . '</h1><p>' . e($hint) . '</p>';
    exit;
}
