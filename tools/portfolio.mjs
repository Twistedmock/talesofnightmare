/**
 * Builds a portfolio PDF from the live gallery content — the asset a gallery,
 * advisor or curated platform asks for. One work per page, the site's own
 * statement, dark to match the brand and to let the light watercolours carry.
 *
 *   node tools/portfolio.mjs
 *
 * Nothing here is invented: titles come from data/artworks.json, the statement
 * and contacts from config.php. Biographical claims and exhibition history are
 * deliberately absent — those are the artist's to supply, and a portfolio that
 * fabricates them is worse than one that omits them.
 */
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = '/root/inid';
const OUT = process.env.OUT || `${ROOT}/tools/Inam-Tales-of-Nightmare-Portfolio.pdf`;

const site = JSON.parse(execSync(`php -r 'echo json_encode(require "${ROOT}/config.php");'`).toString());
const works = JSON.parse(readFileSync(`${ROOT}/data/artworks.json`, 'utf8')).artworks;
const mark = readFileSync(`${ROOT}/assets/mark.svg`, 'utf8').replace(/<\?xml.*?\?>/s, '');
const igIcon = readFileSync(`${ROOT}/assets/instagram.svg`, 'utf8').replace(/<\?xml.*?\?>/s, '');

const roman = (n) => {
  const m = [['M',1000],['CM',900],['D',500],['CD',400],['C',100],['XC',90],['L',50],
             ['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1]];
  let out = '';
  for (const [g, v] of m) while (n >= v) { out += g; n -= v; }
  return out;
};

const dataUri = (relSrc) => {
  const buf = readFileSync(`${ROOT}/${relSrc}`);
  return `data:image/webp;base64,${buf.toString('base64')}`;
};

const handle = String(site.instagram).replace(/.*instagram\.com\//, '').replace(/^@/, '').replace(/\/.*/, '') || site.instagram;
const domain = String(site.siteUrl).replace(/^https?:\/\//, '').replace(/\/$/, '');
const statementParas = String(site.statement).split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);

const workPages = works.map((w, i) => `
  <section class="page work">
    <div class="work__inner">
      <p class="work__num">${roman(i + 1)}</p>
      <div class="work__img" style="aspect-ratio:${w.width}/${w.height}">
        <img src="${dataUri(w.src)}" alt="">
      </div>
      <h2 class="work__title">${w.title.replace(/&/g, '&amp;')}</h2>
    </div>
  </section>`).join('');

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap">
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink:#05070a; --ground:#0a0d13; --ground-lit:#11161f;
    --text:#c2ccd9; --dim:#7a8697; --faint:#4a5464; --sorrow:#a3675a;
    --serif:'Cormorant Garamond',Garamond,'Hoefler Text','Times New Roman',serif;
    --sans:ui-sans-serif,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: var(--serif); color: var(--text); background: var(--ground); font-weight: 300; }

  .page {
    position: relative;
    width: 210mm; height: 297mm;
    background:
      radial-gradient(120% 70% at 50% -8%, var(--ground-lit) 0%, transparent 58%),
      radial-gradient(90% 55% at 50% 108%, #0d1119 0%, transparent 52%),
      var(--ground);
    page-break-after: always;
    overflow: hidden;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 24mm;
  }
  .page:last-child { page-break-after: auto; }

  /* fine grain over each page so the dark fields do not read as flat ink */
  .page::after {
    content:''; position:absolute; inset:0; pointer-events:none; opacity:.03;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* ---- cover ---- */
  .cover { justify-content: center; }
  .cover__mark { width: 46mm; height: auto; opacity: .95; margin-bottom: 14mm; }
  .cover__title { font-size: 30pt; font-weight: 300; letter-spacing: .42em; text-indent: .42em; color: #dbe4ef; }
  .cover__rule { width: 1px; height: 16mm; margin: 9mm auto; background: linear-gradient(180deg, transparent, rgba(190,210,235,.4)); }
  .cover__tag { font-style: italic; font-size: 15pt; color: var(--dim); }
  .cover__site { position: absolute; bottom: 22mm; font-family: var(--sans); font-size: 8pt; letter-spacing: .28em; text-transform: uppercase; color: var(--faint); }

  /* ---- statement ---- */
  .statement { justify-content: center; }
  .statement__rule { width: 1px; height: 18mm; margin-bottom: 12mm; background: linear-gradient(180deg, transparent, rgba(190,210,235,.35)); }
  .statement__body { max-width: 118mm; text-align: center; }
  .statement__body p { font-style: italic; font-size: 15pt; line-height: 1.85; color: var(--dim); margin-bottom: 7mm; text-wrap: pretty; }
  .statement__medium { margin-top: 10mm; font-family: var(--sans); font-size: 7.5pt; letter-spacing: .26em; text-transform: uppercase; color: var(--faint); }

  /* ---- a work ---- */
  .work__inner { display: flex; flex-direction: column; align-items: center; width: 100%; height: 100%; justify-content: center; }
  .work__num { font-family: var(--sans); font-size: 8pt; letter-spacing: .34em; color: var(--faint); margin-bottom: 9mm; }
  .work__img {
    max-height: 205mm; max-width: 150mm;
    box-shadow: 0 10mm 26mm -12mm rgba(0,0,0,.9), 0 1mm 8mm -4mm rgba(0,0,0,.7);
    line-height: 0;
  }
  .work__img img { display: block; height: 100%; width: 100%; max-height: 205mm; max-width: 150mm; object-fit: contain; }
  .work__title { margin-top: 9mm; font-size: 18pt; font-weight: 400; letter-spacing: .02em; color: #d7dfea; }

  /* ---- contact ---- */
  .contact { justify-content: center; }
  .contact__mark { width: 26mm; margin-bottom: 12mm; opacity: .9; }
  .contact__h { font-size: 20pt; font-weight: 400; letter-spacing: .04em; margin-bottom: 9mm; color: #d7dfea; }
  .contact__line { font-size: 13pt; color: var(--dim); margin-bottom: 3mm; }
  .contact__line a { color: var(--text); text-decoration: none; }
  .contact__ig { display: inline-flex; align-items: center; gap: .5em; }
  .contact__ig .ig { width: 1.15em; height: 1.15em; }
  .contact__note { position: absolute; bottom: 22mm; font-family: var(--sans); font-size: 7.5pt; letter-spacing: .2em; text-transform: uppercase; color: var(--faint); }
</style></head><body>

  <section class="page cover">
    <div class="cover__mark">${mark}</div>
    <h1 class="cover__title">${site.artistName}</h1>
    <div class="cover__rule"></div>
    <p class="cover__tag">${site.tagline}</p>
    <p class="cover__site">Selected works &middot; ${domain}</p>
  </section>

  <section class="page statement">
    <div class="statement__rule"></div>
    <div class="statement__body">
      ${statementParas.map((p) => `<p>${p.replace(/&/g, '&amp;')}</p>`).join('')}
      <p class="statement__medium">Ink, watercolour and pencil on paper</p>
    </div>
  </section>

  ${workPages}

  <section class="page contact">
    <div class="contact__mark">${mark}</div>
    <p class="contact__h">Enquiries</p>
    <p class="contact__line"><a href="mailto:${site.email}">${site.email}</a></p>
    <p class="contact__line"><a class="contact__ig" href="https://instagram.com/${handle}">${igIcon}<span>@${handle}</span></a></p>
    <p class="contact__line"><a href="${site.siteUrl}">${domain}</a></p>
    <p class="contact__note">${site.footerNote || ('All works © ' + site.artistName)}</p>
  </section>

</body></html>`;

// Load from a file rather than setContent: the page carries ~4.7MB of inlined
// image data, which is slow and unreliable to push over CDP in one string.
const tmp = `${process.env.TMPHTML || '/tmp/portfolio-build'}.html`;
writeFileSync(tmp, html);

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.goto(`file://${tmp}`, { waitUntil: 'load', timeout: 120000 });

// Wait for the webfont, but never hang on it — a serif fallback is fine, an
// eternal wait is not.
await page.evaluate(() => Promise.race([
  document.fonts.ready,
  new Promise((r) => setTimeout(r, 6000)),
]));
await new Promise((r) => setTimeout(r, 400));

// Chromium embeds images losslessly, so the raw PDF is ~90MB. Ghostscript
// re-encodes them at 150dpi (/ebook) — plenty for screen and small print —
// which brings a 15-work portfolio down to well under 10MB, the difference
// between an attachable file and one that bounces.
const raw = `${OUT}.raw.pdf`;
await page.pdf({ path: raw, format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();

let compressed = false;
try {
  execSync(`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.5 -dPDFSETTINGS=/ebook `
    + `-dDetectDuplicateImages=true -dNOPAUSE -dQUIET -dBATCH `
    + `-sOutputFile=${JSON.stringify(OUT)} ${JSON.stringify(raw)}`, { stdio: 'ignore' });
  execSync(`rm -f ${JSON.stringify(raw)}`);
  compressed = true;
} catch (e) {
  execSync(`mv -f ${JSON.stringify(raw)} ${JSON.stringify(OUT)}`);
  console.warn('ghostscript not found — shipping the uncompressed PDF (large). Install ghostscript to shrink it.');
}

const kb = Math.round(execSync(`stat -c%s ${JSON.stringify(OUT)}`).toString() / 1024);
console.log(`portfolio written: ${OUT}`);
console.log(`pages: ${works.length + 3} (cover, statement, ${works.length} works, contact)  size: ${kb} KB${compressed ? ' (150dpi)' : ''}`);
