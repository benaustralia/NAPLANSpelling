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
  /** Silent gap (seconds) inserted between dictated items by tts-spelling.ts.
   *  IMMUTABLE once audio is rendered — changing it without re-rendering makes
   *  the value disagree with the actual MP3s, and re-rendering costs ElevenLabs
   *  quota. Tiers (see CLAUDE.md): Tier 1 (Y3/Y5) = 7.5, Tier 2 (Y7/Y9) = 5.5. */
  pauseSec: number;
};

const LEVELS: Level[] = [
  { id: 'y3-lc', title: 'Year 3 Language Conventions', seed: 30303, pauseSec: 7.5 },
  { id: 'y5-lc', title: 'Year 5 Language Conventions', seed: 50505, pauseSec: 7.5 },
  { id: 'y7-lc', title: 'Year 7 Language Conventions', seed: 70707, pauseSec: 5.5 },
  { id: 'y9-lc', title: 'Year 9 Language Conventions', seed: 90909, pauseSec: 5.5 },
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

/** Detect where each spoken word starts in a part MP3 by finding the silent
 *  gaps between items (silencedetect=noise=-30dB:d=2). Returns one timestamp
 *  per word — word 1 starts at t=0, word N+1 starts at the silence_end of the
 *  N-th detected gap. Returns null on any mismatch so the player can fall
 *  back to disabling the prev/next buttons rather than seeking to a wrong
 *  offset. The ~0.5s of speech tail-off after each word is included in the
 *  detected silence, which is fine — it just means "next word" snaps to the
 *  start of the next spoken sound, not the geometric end of the silence. */
function detectQuestionStarts(mp3: string, expected: number): number[] | null {
  if (!existsSync(mp3)) return null;
  const result = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', mp3, '-af', 'silencedetect=noise=-30dB:d=2', '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return null;
  const ends = [...result.stderr.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  const starts = [0, ...ends].map((n) => Number(n.toFixed(3)));
  return starts.length === expected ? starts : null;
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
    const wordCount = r.end - r.start + 1;
    const questionStarts = detectQuestionStarts(mp3, wordCount);
    return {
      part: partNum,
      start: r.start,
      end: r.end,
      audio: `/audio/${level.id}/part-${String(partNum).padStart(2, '0')}.mp3`,
      duration: probeDuration(mp3),
      questionStarts,
    };
  });

  const data = {
    id: level.id,
    title: level.title,
    wordsPerPart: WORDS_PER_PART,
    pauseSec: level.pauseSec,
    parts,
    words,
  };

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(data, null, 2) + '\n');

  const missingSentences = words.filter((w) => !w.sentence).length;
  const missingDurations = parts.filter((p) => p.duration === null).length;
  const missingQuestionStarts = parts.filter((p) => p.questionStarts === null).length;
  console.log(
    `Wrote ${outPath} — ${words.length} words, ${parts.length} parts` +
      (missingSentences ? ` (${missingSentences} missing sentences)` : '') +
      (missingDurations ? ` (${missingDurations} missing durations)` : '') +
      (missingQuestionStarts ? ` (${missingQuestionStarts} parts: silencedetect mismatch — prev/next disabled)` : ''),
  );
}

for (const level of LEVELS) {
  await buildLevel(level);
}
