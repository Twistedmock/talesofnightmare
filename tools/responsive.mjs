/**
 * Generates responsive variants of every piece.
 *
 * The gallery renders a piece at ~700 CSS px at most, and a phone needs about
 * 780px after device pixel ratio — but every visitor is currently sent the
 * 1600px master. This emits 800/1200/1600 in both WebP and AVIF so the browser
 * can take the smallest file that still looks right.
 */
import sharp from 'sharp';
import { readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';

const SRC = '/root/inid/artwork';
const OUT = '/root/inid/artwork';
const WIDTHS = [800, 1200, 1600];

const masters = readdirSync(SRC)
  .filter((f) => f.endsWith('.webp') && !/-\d+w\.(webp|avif)$/.test(f));

mkdirSync(OUT, { recursive: true });
const report = [];
let before = 0;

for (const file of masters) {
  const slug = file.replace(/\.webp$/, '');
  const src = `${SRC}/${file}`;
  before += statSync(src).size;
  const meta = await sharp(src).metadata();
  const row = { slug, natural: [meta.width, meta.height], variants: {} };

  for (const w of WIDTHS) {
    if (meta.width < w * 0.9 && w !== WIDTHS[0]) continue;  // don't upscale
    const resized = sharp(src).resize(w, null, { withoutEnlargement: true });

    const webp = await resized.clone().webp({ quality: 80 }).toFile(`${OUT}/${slug}-${w}w.webp`);
    const avif = await resized.clone().avif({ quality: 58, effort: 4 }).toFile(`${OUT}/${slug}-${w}w.avif`);
    row.variants[w] = { webp: webp.size, avif: avif.size, width: webp.width, height: webp.height };
  }
  report.push(row);
  console.log(`  ${slug}`);
}

writeFileSync('/tmp/claude-0/-root-inid/119f9969-ad50-4f57-8338-c4308988ef1d/scratchpad/variants.json',
  JSON.stringify(report, null, 1));

const sum = (fmt, w) => report.reduce((n, r) => n + (r.variants[w]?.[fmt] || 0), 0);
const kb = (b) => (b / 1024).toFixed(0).padStart(5) + ' KB';
console.log('\n  ships today  webp 1600  ' + kb(before));
for (const w of WIDTHS) {
  console.log(`               webp ${String(w).padStart(4)}  ${kb(sum('webp', w))}   avif ${kb(sum('avif', w))}`);
}
console.log(`\n  a phone would take the 800px row instead of ${kb(before)}`);
