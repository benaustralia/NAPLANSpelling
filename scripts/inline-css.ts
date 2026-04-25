import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const dist = './dist';
const htmlPath = join(dist, 'index.html');
const html = await readFile(htmlPath, 'utf8');

const match = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"[^>]*>/);
if (!match) {
  console.log('No CSS <link> tag found; skipping.');
  process.exit(0);
}

const cssHref = match[1]!;
const cssFsPath = join(dist, cssHref.replace(/^\//, ''));
const css = await readFile(cssFsPath, 'utf8');

await writeFile(htmlPath, html.replace(match[0], `<style>${css}</style>`));
await unlink(cssFsPath).catch(() => {});

console.log(`Inlined ${css.length} B of CSS, removed ${cssHref}`);
