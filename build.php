<?php
/**
 * Renders the gallery to a single static index.html.
 *
 *     php build.php
 *
 * GitHub Pages (and Netlify, and Cloudflare Pages) will not run PHP, so the
 * page is pre-rendered instead of being generated per request. Rendering it
 * rather than hand-writing the HTML keeps one source of truth for the markup:
 * index.php stays the only place the page is described.
 *
 * Run this after editing config.php or data/artworks.json, then commit.
 */

declare(strict_types=1);

// Makes url() emit page-relative links, so the result works at a domain root
// or under /reponame/ without changing anything.
define('STATIC_BUILD', true);

$root = __DIR__;

ob_start();
require $root . '/index.php';
$html = ob_get_clean();

if ($html === false || strpos($html, '<!DOCTYPE html>') !== 0) {
    fwrite(STDERR, "build failed: index.php did not render a page\n");
    exit(1);
}

$pieces = substr_count($html, 'class="piece"');
if ($pieces === 0) {
    fwrite(STDERR, "build failed: no artwork in the page — check data/artworks.json\n");
    exit(1);
}

// Belt and braces: a leading slash here would break the site under /reponame/.
if (preg_match('~(?:href|src)="/(?!/)~', $html)) {
    fwrite(STDERR, "build failed: page contains root-relative links, which break on a project page\n");
    exit(1);
}

file_put_contents($root . '/index.html', $html);

// Tells GitHub Pages to serve the files as they are instead of running them
// through Jekyll, which would drop anything beginning with an underscore.
file_put_contents($root . '/.nojekyll', '');

printf("built index.html — %d pieces, %s\n", $pieces, human_size(strlen($html)));

function human_size(int $bytes): string
{
    return $bytes > 1024 ? round($bytes / 1024, 1) . ' KB' : $bytes . ' B';
}
