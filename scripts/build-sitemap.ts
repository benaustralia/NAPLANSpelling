import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = 'https://naplan-spelling.netlify.app';
const dataDir = './src/data';

const files = (await readdir(dataDir)).filter((f) => f.endsWith('.json'));
type Level = { id: string; parts: { part: number }[] };
const levels: Level[] = await Promise.all(
  files.map(async (f) => {
    const json: Level = await Bun.file(join(dataDir, f)).json();
    return { id: json.id, parts: json.parts };
  }),
);
levels.sort((a, b) => a.id.localeCompare(b.id));

const urls = ['/', '/about/'];
for (const lvl of levels) {
  urls.push(`/${lvl.id}/`);
  for (const p of lvl.parts) urls.push(`/${lvl.id}/part/${p.part}/`);
}

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  <url><loc>${BASE}${u}</loc></url>`).join('\n') +
  '\n</urlset>\n';

await Bun.write('public/sitemap.xml', xml);
console.log(`Wrote public/sitemap.xml — ${urls.length} URLs`);
