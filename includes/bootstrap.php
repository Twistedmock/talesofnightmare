<?php
/**
 * Shared bootstrap. The gallery's only entry point includes this first.
 *
 * Dependency-free on purpose: no composer, no database, no GD. Free PHP hosts
 * vary wildly in what they enable, so this sticks to what ships with every
 * PHP 7.4+ build.
 */

declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__));
define('DATA_DIR', APP_ROOT . '/data');
define('ARTWORK_DIR', APP_ROOT . '/artwork');
define('ARTWORKS_FILE', DATA_DIR . '/artworks.json');

/* ------------------------------------------------------------------ paths */

/**
 * URL prefix the site is mounted at. Works whether it is served from a domain
 * root or a subfolder like example.com/gallery, which is common on free hosts.
 */
function base_url(): string
{
    static $base = null;
    if ($base !== null) {
        return $base;
    }
    $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '/index.php');
    $dir = rtrim(dirname($script), '/');
    return $base = ($dir === '' || $dir === '.') ? '' : $dir;
}

/**
 * Link to something relative to the site root.
 *
 * A static build has to work from wherever it is dropped — a GitHub project
 * page lives under /reponame/, not at the domain root — so in that mode every
 * link is emitted relative to the page rather than rooted at /.
 */
function url(string $path = ''): string
{
    $clean = ltrim($path, '/');
    if (defined('STATIC_BUILD')) {
        return $clean === '' ? './' : $clean;
    }
    return base_url() . '/' . $clean;
}

/** Absolute URL, for the social tags that will not accept a relative one. */
function absolute_url(string $path, string $siteUrl): string
{
    return $siteUrl === '' ? '' : rtrim($siteUrl, '/') . '/' . ltrim($path, '/');
}

/* ------------------------------------------------------------------ output */

function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Bust caches when CSS/JS change, without touching filenames by hand. */
function asset(string $path): string
{
    $full = APP_ROOT . '/' . ltrim($path, '/');
    $stamp = is_file($full) ? filemtime($full) : 0;
    return url($path) . ($stamp ? '?v=' . $stamp : '');
}

/**
 * Finds the responsive variants sitting next to a master image.
 *
 * `artwork/nightwatch.webp` picks up `artwork/nightwatch-800w.avif`,
 * `-800w.webp`, `-1200w.*` and so on. Missing sizes are simply left out, so a
 * newly added piece with no variants yet still renders from its master rather
 * than breaking — it just won't be as small.
 *
 * @return array{avif:string[],webp:string[]}
 */
function image_variants(string $src): array
{
    $dir  = dirname($src);
    $base = pathinfo($src, PATHINFO_FILENAME);
    $out  = ['avif' => [], 'webp' => []];

    foreach ([800, 1200, 1600] as $w) {
        foreach (['avif', 'webp'] as $ext) {
            $rel = ($dir === '.' ? '' : $dir . '/') . $base . '-' . $w . 'w.' . $ext;
            if (is_file(APP_ROOT . '/' . $rel)) {
                $out[$ext][] = url($rel) . ' ' . $w . 'w';
            }
        }
    }
    return $out;
}

/* -------------------------------------------------------------------- misc */

/** Roman numerals — the gallery numbers every piece this way. */
function roman(int $number): string
{
    $map = ['M' => 1000, 'CM' => 900, 'D' => 500, 'CD' => 400, 'C' => 100, 'XC' => 90,
            'L' => 50, 'XL' => 40, 'X' => 10, 'IX' => 9, 'V' => 5, 'IV' => 4, 'I' => 1];
    $out = '';
    foreach ($map as $glyph => $value) {
        while ($number >= $value) {
            $out .= $glyph;
            $number -= $value;
        }
    }
    return $out;
}
