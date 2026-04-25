import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const BASE_URL = process.env.BASE_URL ?? 'https://naplan-spelling.netlify.app';
const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'public/codes');

const LEVELS = ['y3-lc', 'y5-lc', 'y7-lc', 'y9-lc'] as const;

await mkdir(OUT_DIR, { recursive: true });

type LevelInfo = { id: string; partsCount: number };

async function readLevel(id: string): Promise<LevelInfo> {
  const json = JSON.parse(await readFile(join(ROOT, `src/data/${id}.json`), 'utf8'));
  return { id, partsCount: json.parts.length };
}

const levels = await Promise.all(LEVELS.map(readLevel));

for (const { id, partsCount } of levels) {
  const levelDir = join(OUT_DIR, id);
  await mkdir(levelDir, { recursive: true });
  for (let i = 1; i <= partsCount; i++) {
    const n = String(i).padStart(2, '0');
    const url = `${BASE_URL}/${id}/part/${i}/`;
    const outPath = join(levelDir, `part-${n}.svg`);
    const r = spawnSync(
      'bunx',
      ['-p', 'qrcode', 'qrcode', url, '-t', 'svg', '-e', 'H', '-o', outPath, '--margin', '1'],
      { stdio: 'inherit' },
    );
    if (r.status !== 0) {
      console.error(`Failed for ${id} part ${i}`);
      process.exit(r.status ?? 1);
    }
  }
  const indexUrl = `${BASE_URL}/${id}/`;
  spawnSync(
    'bunx',
    ['-p', 'qrcode', 'qrcode', indexUrl, '-t', 'svg', '-e', 'H', '-o', join(levelDir, 'index.svg'), '--margin', '1'],
    { stdio: 'inherit' },
  );
}

const CELL = 220;
const PAD = 40;
const COLS = 3;
const totalCells = levels.reduce((s, l) => s + l.partsCount + 1, 0);
const rows = Math.ceil(totalCells / COLS);
const W = COLS * CELL + 2 * PAD;
const H = rows * CELL + 2 * PAD;

const cells: string[] = [];
let i = 0;
for (const { id, partsCount } of levels) {
  for (let p = 0; p <= partsCount; p++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * CELL;
    const y = PAD + row * CELL;
    const label = p === 0 ? `${id} — All` : `${id} — Part ${p}`;
    const href = p === 0 ? `${BASE_URL}/${id}/` : `${BASE_URL}/${id}/part/${p}/`;
    cells.push(
      `<g transform="translate(${x},${y})">
        <rect width="${CELL - 16}" height="${CELL - 16}" fill="#fff" stroke="#e5e5e5" rx="8"/>
        <text x="${(CELL - 16) / 2}" y="24" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="600" fill="#111">${label}</text>
        <text x="${(CELL - 16) / 2}" y="${CELL - 24}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="10" fill="#666">${href}</text>
      </g>`,
    );
    i++;
  }
}

const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="#fafafa"/>
  ${cells.join('\n')}
</svg>`;
await writeFile(join(OUT_DIR, 'sheet.svg'), sheet);
console.log(`Wrote QR codes for ${levels.length} levels + sheet.svg to ${OUT_DIR}`);
