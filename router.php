<?php
/**
 * Router for PHP's built-in server:
 *
 *     PHP_CLI_SERVER_WORKERS=8 php -S 0.0.0.0:8090 -t . router.php
 *
 * The built-in server ignores .htaccess entirely, so without this the private
 * folders would be reachable over HTTP. This reproduces the same rules the
 * Apache config applies, which keeps a preview server honest. On real Apache
 * hosting this file is simply never invoked.
 */

declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = '/' . ltrim(rawurldecode($path), '/');

$forbid = static function (): bool {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo "404 Not Found\n";
    return true;
};

// Anything that tries to climb out of the document root.
if (strpos($path, '..') !== false) {
    return $forbid();
}

// Private folders: data (credentials, JSON store), includes, tools.
if (preg_match('#^/(data|includes)(/|$)#i', $path)) {
    return $forbid();
}

// Dotfiles — .htaccess, .git, .env and friends.
if (preg_match('#(^|/)\.[^/]+#', $path)) {
    return $forbid();
}

// Repo furniture that has no business being served.
if (preg_match('#^/(README\.md|router\.php|config\.php|package(-lock)?\.json)$#i', $path)) {
    return $forbid();
}

// Nothing inside artwork/ may ever be executed, whatever its extension.
if (preg_match('#^/artwork/.+\.(php\d?|phtml|phar|cgi|pl|py|shtml)$#i', $path)) {
    return $forbid();
}

// The built-in server hands this router every path it cannot resolve to a
// file, and returning false then falls back to index.php — so /nonsense, and
// even /admin long after the panel was deleted, would answer 200 with the
// gallery. This site has exactly one page; everything else is a 404.
if ($path !== '/' && $path !== '/index.php') {
    $target = realpath(__DIR__ . $path);
    if ($target === false || strpos($target, __DIR__ . DIRECTORY_SEPARATOR) !== 0 || !is_file($target)) {
        return $forbid();
    }
}

// Match the headers the Apache config sets, so a preview behaves like the
// real thing rather than being quietly more permissive.
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; "
     . "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
     . "font-src 'self' https://fonts.gstatic.com; script-src 'self'; "
     . "object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'");

// false => let the built-in server handle it (static file or PHP script).
return false;
