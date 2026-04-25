/**
 * Generate downloadable PDFs of every part's answer sheet + answer key by
 * driving Chrome headless against the running dev server.
 *
 * Usage:
 *   1. In one terminal: `bun run dev`  (must be serving on :5173)
 *   2. In another:      `bun run scripts/build-pdfs.ts`
 *
 * Output: public/pdfs/<levelId>/part-NN.pdf — ready to be served as static
 * downloads. PDFs are deterministic from the level data (which is locked
 * once audio is rendered), so re-run only when content changes.
 *
 * Why Chrome CLI instead of Puppeteer: zero npm dep, zero ~80 MB install,
 * uses the macOS Chrome already on the machine. The `--no-pdf-header-footer`
 * flag suppresses the URL/date/page-number that browser print dialogs inject.
 */
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const LEVELS = ['y3-lc', 'y5-lc', 'y7-lc', 'y9-lc'];

const probe = spawnSync('curl', ['-sS', '-o', '/dev/null', '-w', '%{http_code}', BASE_URL + '/'], { encoding: 'utf-8' });
if (probe.stdout.trim() !== '200') {
  console.error(`Dev server not responding at ${BASE_URL}. Start it with: bun run dev`);
  process.exit(1);
}

let total = 0;
const start = Date.now();
for (const id of LEVELS) {
  const data = JSON.parse(await readFile(join('src/data', `${id}.json`), 'utf-8')) as {
    parts: { part: number }[];
  };
  const outDir = join('public/pdfs', id);
  await mkdir(outDir, { recursive: true });
  for (const p of data.parts) {
    const nn = String(p.part).padStart(2, '0');
    const out = join(outDir, `part-${nn}.pdf`);
    const url = `${BASE_URL}/${id}/part/${p.part}/print/`;
    const r = spawnSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        '--virtual-time-budget=4000', // give icon font + lucide SVGs time to render
        `--print-to-pdf=${out}`,
        url,
      ],
      { encoding: 'utf-8' },
    );
    if (r.status !== 0) {
      console.error(`FAIL ${id} part ${p.part}: ${r.stderr.slice(0, 300)}`);
      process.exit(r.status ?? 1);
    }
    total++;
    process.stdout.write(`${id} p${p.part} `);
  }
  process.stdout.write('\n');
}
console.log(`\nWrote ${total} PDFs in ${((Date.now() - start) / 1000).toFixed(1)}s`);
