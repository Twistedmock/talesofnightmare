<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/store.php';

$site = load_site();
$artworks = artworks_for_display();
$first = $artworks[0] ?? null;

$description = $site['tagline'] !== ''
    ? $site['tagline'] . '. A gallery behind glass — wipe the condensation to see the work.'
    : 'A gallery behind glass — wipe the condensation to see the work.';

// Social previews will not accept a relative image, so they are emitted only
// when config.php says where the site actually lives.
$canonical = absolute_url('', (string) $site['siteUrl']);
$ogImage = $first ? absolute_url((string) $first['src'], (string) $site['siteUrl']) : '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= e($site['artistName']) ?><?= $site['tagline'] ? ' — ' . e($site['tagline']) : '' ?></title>
<meta name="description" content="<?= e($description) ?>">
<meta name="theme-color" content="#0b0e14">

<?php if ($canonical !== ''): ?>
<link rel="canonical" href="<?= e($canonical) ?>">
<?php endif; ?>
<meta property="og:type" content="website">
<meta property="og:title" content="<?= e($site['artistName']) ?>">
<meta property="og:description" content="<?= e($description) ?>">
<?php if ($canonical !== ''): ?>
<meta property="og:url" content="<?= e($canonical) ?>">
<?php endif; ?>
<?php if ($ogImage !== ''): ?>
<meta property="og:image" content="<?= e($ogImage) ?>">
<meta name="twitter:card" content="summary_large_image">
<?php endif; ?>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap">
<link rel="stylesheet" href="<?= e(asset('assets/css/gallery.css')) ?>">
<link rel="icon" href="<?= e(asset('assets/favicon.svg')) ?>" type="image/svg+xml">

<!-- Deliberately render-blocking: it must set up the reveal before first paint. -->
<script src="<?= e(asset('assets/js/boot.js')) ?>"></script>
</head>
<body>

<!-- Breathed onto the glass, then cleared. Shown once per visit. -->
<div class="veil" id="veil" aria-hidden="true">
  <div class="veil__inner">
    <img class="veil__mark" src="<?= e(asset('assets/mark.svg')) ?>" alt=""
         width="140" height="112">
    <h1 class="veil__name"><?= e($site['artistName']) ?></h1>
    <p class="veil__hint">breathe on the glass</p>
  </div>
</div>

<div class="grain" aria-hidden="true"></div>

<header class="masthead">
  <div class="masthead__bar">
    <img class="masthead__mark" src="<?= e(asset('assets/mark.svg')) ?>" alt=""
         width="140" height="112" decoding="async">
    <div>
      <p class="masthead__name"><?= e($site['artistName']) ?></p>
      <?php if ($site['tagline']): ?>
        <p class="masthead__tagline"><?= e($site['tagline']) ?></p>
      <?php endif; ?>
    </div>
  </div>
  <button type="button" class="glass-toggle" id="glassToggle"
          aria-pressed="false" title="Show every piece without the glass">
    <span class="glass-toggle__dot" aria-hidden="true"></span>
    <span class="glass-toggle__label">clear the glass</span>
  </button>
</header>

<!-- Fills as you descend. Cold, slow, and slightly reluctant. -->
<div class="rail" aria-hidden="true">
  <div class="rail__track"><div class="rail__fill" id="railFill"></div></div>
</div>

<main id="gallery">
<?php if (!$artworks): ?>
  <p class="empty">The wall is bare for now.</p>
<?php else: ?>
  <section class="hang">
    <?php foreach ($artworks as $i => $art):
      $w = max(1, (int) ($art['width'] ?? 4));
      $h = max(1, (int) ($art['height'] ?? 5));
      $numeral = roman($i + 1);
      // No two panes of glass in a room mist up identically. Varying the
      // density and the origin of each veil is what stops the wall reading
      // as fifteen copies of the same grey rectangle.
      $fog = 0.74 + (($i * 37) % 27) / 100;
      $fx  = 16 + ($i * 53) % 62;
      $fy  = 10 + ($i * 29) % 58;
    ?>
    <figure class="piece" data-index="<?= $i ?>" data-id="<?= e($art['id'] ?? (string) $i) ?>"
            style="--fog:<?= $fog ?>; --fx:<?= $fx ?>%; --fy:<?= $fy ?>%">
      <div class="piece__frame" style="aspect-ratio: <?= $w ?> / <?= $h ?>">
        <img class="piece__image"
             src="<?= e(url($art['src'])) ?>"
             alt="<?= e($art['title'] ?? 'Untitled') ?>"
             width="<?= $w ?>" height="<?= $h ?>"
             loading="<?= $i < 2 ? 'eager' : 'lazy' ?>"
             decoding="async">
        <canvas class="piece__glass" aria-hidden="true"></canvas>
        <button type="button" class="piece__open"
                aria-label="Open <?= e($art['title'] ?? 'Untitled') ?>"></button>
      </div>
      <figcaption class="piece__caption">
        <span class="piece__numeral" aria-hidden="true"><?= e($numeral) ?></span>
        <h2 class="piece__title"><?= e($art['title'] ?? 'Untitled') ?></h2>
        <?php if (!empty($art['caption'])): ?>
          <p class="piece__words"><?= e($art['caption']) ?></p>
        <?php endif; ?>
        <?php if (!empty($art['year'])): ?>
          <p class="piece__year"><?= e($art['year']) ?></p>
        <?php endif; ?>
      </figcaption>
    </figure>
    <?php endforeach; ?>
  </section>
<?php endif; ?>

<?php if (trim((string) $site['statement']) !== ''): ?>
  <section class="statement">
    <div class="statement__rule" aria-hidden="true"></div>
    <?php foreach (preg_split('/\n\s*\n/', trim((string) $site['statement'])) as $para): ?>
      <p><?= nl2br(e(trim($para))) ?></p>
    <?php endforeach; ?>
  </section>
<?php endif; ?>
</main>

<footer class="colophon">
  <p class="colophon__tally" id="tally" data-total="<?= count($artworks) ?>"></p>
  <?php if ($site['email'] || $site['instagram']): ?>
  <p class="colophon__links">
    <?php if ($site['email']): ?>
      <a href="mailto:<?= e($site['email']) ?>"><?= e($site['email']) ?></a>
    <?php endif; ?>
    <?php if ($site['email'] && $site['instagram']): ?><span aria-hidden="true">·</span><?php endif; ?>
    <?php if ($site['instagram']): ?>
      <a href="https://instagram.com/<?= e(ltrim($site['instagram'], '@')) ?>" rel="me noopener">
        @<?= e(ltrim($site['instagram'], '@')) ?>
      </a>
    <?php endif; ?>
  </p>
  <?php endif; ?>
  <p class="colophon__note"><?= e($site['footerNote']) ?></p>
</footer>

<!-- Filled in by the lightbox. Empty until something is opened. -->
<div class="plate" id="plate" hidden>
  <button type="button" class="plate__close" id="plateClose" aria-label="Close">&#215;</button>
  <figure class="plate__body">
    <div class="plate__frame">
      <img class="plate__image" id="plateImage" alt="">
      <canvas class="plate__glass" id="plateGlass" aria-hidden="true"></canvas>
    </div>
    <figcaption class="plate__caption">
      <span class="plate__numeral" id="plateNumeral"></span>
      <h2 class="plate__title" id="plateTitle"></h2>
      <p class="plate__words" id="plateWords"></p>
    </figcaption>
  </figure>
  <button type="button" class="plate__step plate__step--prev" id="platePrev" aria-label="Previous">&#8249;</button>
  <button type="button" class="plate__step plate__step--next" id="plateNext" aria-label="Next">&#8250;</button>
</div>

<script src="<?= e(asset('assets/js/glass.js')) ?>" defer></script>
</body>
</html>
