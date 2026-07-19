# Tales of Nightmare

A portfolio site for the drawings of Inam. The work hangs behind panes of
condensation — you wipe them with the cursor to see what is there, and the fog
comes back.

No admin panel and no database. The content is two files you edit by hand, and
one command that rebuilds the page.

```
index.html           the built site — this is what GitHub Pages serves
build.php            rebuilds index.html; run it after any content change

config.php           your name, statement, email, Instagram
data/artworks.json   the list of works, in the order they hang
artwork/             the images themselves

index.php            the template index.html is rendered from
assets/              css, js, logo, favicon
includes/            bootstrap and the JSON reader
router.php           only used by `php -S`; ignored elsewhere
```

**Live at <https://talesofnightmare.com>**

---

## 1. Adding a piece

Three steps.

**First**, put the image in `artwork/`. Give it a plain lowercase filename with
no spaces — `the-red-hour.webp`, not `Web_Photo_Editor (20).jpg`.

Export it around **1600px on the long edge** and save as WebP or JPEG.

Then generate the responsive variants — this is what keeps the site fast:

```sh
node tools/responsive.mjs      # writes -800w / -1200w in WebP and AVIF
```

The page serves the smallest file that still looks right, so a phone pulls
about **1.0 MB for the whole gallery instead of 3.5 MB**. A piece with no
variants still works; it just ships more bytes.

**Second**, add an entry at the top of the `artworks` list in
`data/artworks.json`:

```json
{
  "artworks": [
    {
      "id": "art-the-red-hour",
      "title": "The Red Hour",
      "caption": "Grey ground, grey people, a moon with a bite taken out of it. The only colour is the flower the small one is holding.",
      "src": "artwork/the-red-hour.webp",
      "width": 1080,
      "height": 1456,
      "year": ""
    },

    ... the rest of them ...
  ]
}
```

| Field | What it does |
|---|---|
| `id` | Any unique string. Used to remember which pieces a visitor has cleared. |
| `title` | Shown under the work. |
| `caption` | One line, in italics, under the title. `""` to leave it off. |
| `src` | Path to the file, from the site root. |
| `width`, `height` | The image's real pixel size. **Get these right** — they reserve the correct space before the image loads, so the page does not jump. |
| `year` | Optional. `""` hides it. |

**The order of the list is the order on the wall.** Move an entry up, and the
piece moves up. New work usually goes at the top.

Two things worth knowing:

- **JSON does not allow a trailing comma** after the last entry. This is the
  one mistake everyone makes. If you get it wrong the site will tell you which
  error it hit rather than showing an empty wall.
- **SVG files are refused** by the gallery on principle — an SVG can carry
  script. Use WebP, JPEG, PNG, GIF or AVIF.

**Third**, rebuild and publish:

```sh
php build.php
git add -A && git commit -m "add The Red Hour" && git push
```

`build.php` renders `index.php` into `index.html`. GitHub Pages cannot run PHP,
so the page is pre-rendered rather than generated per visit — and rendering it
from the template means the markup is only ever described in one place.

The build refuses to write a broken page: it fails if there is no artwork, or
if any link came out root-relative.

**If you forget to run `php build.php`, the live site will not change.** The
JSON is the content; `index.html` is what visitors get.

To remove a piece, delete its entry, delete the file, rebuild.

---

## 2. Everything else

`config.php` holds the name, the tagline, the statement, the footer line, and
your contact details. It is commented; edit it, save, reload.

Instagram accepts a full URL or a bare handle — `https://instagram.com/you`,
`@you` and `you` all work.

---

## 3. Hosting

It is on **GitHub Pages**, served from the `main` branch of
`Twistedmock/talesofnightmare`, on the custom domain **talesofnightmare.com**
(registered at Spaceship). Push, wait about a minute, and the change is live.
Free, HTTPS included, no server to maintain.

The domain is held in the repo by the `CNAME` file. Deleting that file drops
the custom domain, so leave it alone.

### Putting a real domain on it

Pages will host a custom domain for free. In the repository, go to
**Settings → Pages → Custom domain**, enter the domain, and add these records
at your registrar:

```
A     @    185.199.108.153
A     @    185.199.109.153
A     @    185.199.110.153
A     @    185.199.111.153
CNAME www  twistedmock.github.io
```

Then tick **Enforce HTTPS** once the certificate is issued (usually under an
hour). A `.com` is about $10/year; there is no free option worth having for an
artist's address that goes on a card.

If you set a custom domain, update `siteUrl` in `config.php` and rebuild, so
link previews point at the right place.

### If you ever move it to PHP hosting

The site still runs as PHP — `index.php` is the template, and it will serve
directly on any host with PHP 7.4+. Nothing is written at runtime, so there are
no permissions to set.

### Free PHP hosts, should you want one

| Host | Free tier | Custom domain | Notes |
|---|---|---|---|
| **InfinityFree** | 5 GB, unmetered | yes | No card. Free subdomain included. |
| **AwardSpace** | 1 GB | yes | One site free, reliable. |
| **ProFreeHost** | 1 GB | yes | Rougher control panel. |
| **000webhost** | 300 MB | yes | Sleeps periodically on the free tier. |

### A free domain name

- Your host's own subdomain (e.g. `talesofnightmare.rf.gd`) costs nothing.
- **[is-a.dev](https://github.com/is-a-dev/register)** and
  **[js.org](https://github.com/js-org/js.org)** give free subdomains by pull
  request, and are permanent.
- Avoid Freenom-style `.tk` / `.ml` / `.ga` — they have become unreliable.
- A real `.com` is about $10/year, and worth it for an address going on a card.

Point the domain at the host with the nameservers they give you, then add the
domain in their control panel. Propagation takes a few hours.

---

## 4. The glass

The condensation is a canvas layer over each piece. Moving the cursor wipes it,
droplets run down and clear their own trails, and the fog slowly returns. In
the lightbox the fog creeps back from the edges, so nothing stays clear.

- **The glass is on by default.** The **"clear the glass"** control breathes —
  border, text and dot warming together and settling back on one 4.6s cycle —
  until the visitor has used it once, so nobody is stuck behind fog they did
  not realise they could switch off. Their choice is remembered, and only ever
  saved when they actually operate the toggle.
- The gallery **works without JavaScript** — the fog is layered on top of a
  plain, sharp, readable page. If the script is blocked, the work is still there.
- `prefers-reduced-motion` keeps the glass clear automatically, and drops the
  sweep to a plain label.
- The site remembers which pieces you have cleared, in your browser only, and
  the footer keeps a quiet count.

The fog is tuned for Inam's light watercolours: it drains a piece of colour and
light rather than laying a pale veil over it, so that wiping brings the colour
back. Dark artwork would want the opposite. Tuning is at the top of
`assets/js/glass.js` (`refog`, `wipeRadius`, `dropChance`) and in the
`.glass-on .piece__image` rule in `assets/css/gallery.css`.

---

## 5. Notes for other servers

On Apache the included `.htaccess` files hide `data/` and `includes/`, stop
anything in `artwork/` from executing, and set the security headers.

On **nginx** those are ignored, so add:

```nginx
location ~ ^/(data|includes)/ { deny all; return 404; }
location ~ /\.              { deny all; return 404; }
location = /config.php      { deny all; return 404; }
location ^~ /artwork/ { location ~ \.(php|phtml|phar)$ { deny all; return 404; } }
```

For a preview on any machine with PHP:

```sh
PHP_CLI_SERVER_WORKERS=8 php -S 0.0.0.0:8090 -t . router.php
```

`router.php` applies the same rules, because PHP's built-in server ignores
`.htaccess`. It is used by nothing else.
