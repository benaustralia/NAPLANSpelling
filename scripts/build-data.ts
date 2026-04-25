import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const WORDS_PER_PART = 20;

type Level = {
  id: string;
  title: string;
  /** Seeded shuffle keeps test ordering non-alphabetic but stable across rebuilds.
   *  IMMUTABLE once audio is rendered — changing the seed would re-map words to
   *  different MP3 positions and silently break every existing audio file. */
  seed: number;
};

const LEVELS: Level[] = [
  { id: 'y3-lc', title: 'Year 3 Language Conventions', seed: 30303 },
  { id: 'y5-lc', title: 'Year 5 Language Conventions', seed: 50505 },
];

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseCsv(csv: string) {
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0);
  lines.shift();
  return lines.map((line) => {
    const i = line.indexOf(',');
    return {
      word: line.slice(0, i).trim(),
      definition: line.slice(i + 1).trim().replace(/^"|"$/g, ''),
    };
  });
}

function probeDuration(mp3: string): number | null {
  if (!existsSync(mp3)) return null;
  const result = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', mp3],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return null;
  const n = parseFloat(result.stdout.trim());
  return Number.isFinite(n) ? Math.round(n) : null;
}

function partRanges(total: number) {
  const fullParts = Math.floor(total / WORDS_PER_PART);
  const remainder = total - fullParts * WORDS_PER_PART;
  // If remainder is small (< half a part), absorb it into the final regular part.
  // Otherwise add a separate final part.
  const ranges: Array<{ start: number; end: number }> = [];
  const partsCount = remainder === 0
    ? fullParts
    : remainder >= WORDS_PER_PART / 2
      ? fullParts + 1
      : fullParts;
  for (let i = 0; i < partsCount; i++) {
    const start = i * WORDS_PER_PART + 1;
    const end = i === partsCount - 1 ? total : (i + 1) * WORDS_PER_PART;
    ranges.push({ start, end });
  }
  return ranges;
}

async function buildLevel(level: Level) {
  const csvPath = join(ROOT, `public/data/${level.id}/words.csv`);
  const sentencesPath = join(ROOT, `public/data/${level.id}/sentences.json`);
  const audioDir = join(ROOT, `public/audio/${level.id}`);
  const outPath = join(ROOT, `src/data/${level.id}.json`);

  if (!existsSync(csvPath)) {
    console.warn(`Skipping ${level.id} — ${csvPath} not found`);
    return;
  }

  const csv = await readFile(csvPath, 'utf8');
  const sentences: Record<string, string> = existsSync(sentencesPath)
    ? JSON.parse(await readFile(sentencesPath, 'utf8'))
    : {};

  const rows = parseCsv(csv);
  const shuffled = seededShuffle(rows, level.seed);
  const words = shuffled.map((row, idx) => ({
    index: idx + 1,
    word: row.word,
    definition: row.definition,
    sentence: sentences[row.word] ?? '',
  }));

  const ranges = partRanges(words.length);
  const parts = ranges.map((r, i) => {
    const partNum = i + 1;
    const mp3 = join(audioDir, `part-${String(partNum).padStart(2, '0')}.mp3`);
    return {
      part: partNum,
      start: r.start,
      end: r.end,
      audio: `/audio/${level.id}/part-${String(partNum).padStart(2, '0')}.mp3`,
      duration: probeDuration(mp3),
    };
  });

  const data = {
    id: level.id,
    title: level.title,
    wordsPerPart: WORDS_PER_PART,
    parts,
    words,
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(data, null, 2) + '\n');

  const missingSentences = words.filter((w) => !w.sentence).length;
  const missingDurations = parts.filter((p) => p.duration === null).length;
  console.log(
    `Wrote ${outPath} — ${words.length} words, ${parts.length} parts` +
      (missingSentences ? ` (${missingSentences} missing sentences)` : '') +
      (missingDurations ? ` (${missingDurations} missing durations)` : ''),
  );
}

for (const level of LEVELS) {
  await buildLevel(level);
}
