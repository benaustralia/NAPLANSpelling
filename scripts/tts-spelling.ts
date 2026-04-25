/**
 * Render NAPLAN spelling-test audio with ElevenLabs.
 *
 * Format per word: "Number {n}. {WORD}. {sentence} {WORD}."
 * Each word is rendered as its own ElevenLabs request, then concatenated with
 * ffmpeg using a fixed-length silence segment between entries. (ElevenLabs
 * SSML <break> tags don't reliably produce pauses longer than ~2-3s in any
 * current model — the Y3 audio uses ~7.5s ffmpeg-spliced pauses for that
 * reason.)
 *
 * Voice: Ben (Australian male, young), default model: eleven_multilingual_v2.
 * Note: do NOT switch to eleven_v3 for community voices — v3 silently
 * substitutes its closest American-accented pre-built voice.
 * Speed 0.75x is set via voice settings (not ffmpeg post-processing).
 *
 * Pause length comes from the level's `pauseSec` (locked per-level in
 * scripts/build-data.ts LEVELS table — immutable once audio is rendered).
 * The PAUSE_SECONDS env var is honoured for ad-hoc experiments only and
 * emits a warning when it overrides the locked value.
 *
 * Usage:  ELEVENLABS_API_KEY=... bun run scripts/tts-spelling.ts <levelId> [partNumber]
 *   bun run scripts/tts-spelling.ts y5-lc          # render every missing part
 *   bun run scripts/tts-spelling.ts y5-lc 3        # render only part 3
 *   FORCE=1 bun run scripts/tts-spelling.ts y5-lc  # re-render even if file exists
 */

import { readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'sai9UY7iXkRDSsXHR0bZ'; // Ben — AU male, young
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_multilingual_v2';
const SPEED = Number(process.env.ELEVENLABS_SPEED ?? '0.75');
const PAUSE_SECONDS_ENV = process.env.PAUSE_SECONDS ? Number(process.env.PAUSE_SECONDS) : null;
const FORCE = process.env.FORCE === '1';

const ROOT = process.cwd();

if (!API_KEY) {
  console.error('Missing ELEVENLABS_API_KEY (set it in .env or your shell).');
  process.exit(1);
}

const [, , levelId, partArg] = process.argv;
if (!levelId) {
  console.error('Usage: bun run scripts/tts-spelling.ts <levelId> [partNumber]');
  process.exit(1);
}

const dataPath = join(ROOT, `src/data/${levelId}.json`);
if (!existsSync(dataPath)) {
  console.error(`No level data at ${dataPath}`);
  process.exit(1);
}

type Word = { index: number; word: string; sentence: string };
type Part = { part: number; start: number; end: number; audio: string };
type Level = { id: string; title: string; pauseSec: number; parts: Part[]; words: Word[] };

const level: Level = JSON.parse(await readFile(dataPath, 'utf8'));
const audioDir = join(ROOT, `public/audio/${levelId}`);
await mkdir(audioDir, { recursive: true });

// Per-level pauseSec is the canonical source (locked in scripts/build-data.ts
// LEVELS table and immutable once audio is rendered). PAUSE_SECONDS env is
// only honoured for ad-hoc experimentation — warn loudly if it disagrees so
// nobody silently re-renders a corpus at the wrong gap.
const PAUSE_SECONDS = PAUSE_SECONDS_ENV ?? level.pauseSec;
if (PAUSE_SECONDS_ENV !== null && PAUSE_SECONDS_ENV !== level.pauseSec) {
  console.warn(
    `WARNING: PAUSE_SECONDS=${PAUSE_SECONDS_ENV} overrides ${levelId}'s locked pauseSec=${level.pauseSec}. ` +
      `Audio rendered at this pause will disagree with the corpus default.`,
  );
}

function entryText(w: Word): string {
  // Absolute numbering across the whole corpus, matching the print sheet
  // and the on-screen "Listen" instruction (e.g. "numbered 21 to 40").
  const sent = w.sentence?.trim() || w.word;
  return `Number ${w.index}. ${w.word}. ${sent} ${w.word}.`;
}

async function ttsToFile(text: string, outPath: string): Promise<void> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
  const body = {
    text,
    model_id: MODEL_ID,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
      speed: SPEED,
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY!,
      'content-type': 'application/json',
      accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
}

function makeSilence(seconds: number, outPath: string) {
  const r = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-f', 'lavfi',
      '-i', `anullsrc=channel_layout=stereo:sample_rate=44100`,
      '-t', String(seconds),
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '128k',
      outPath,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  if (r.status !== 0) throw new Error(`ffmpeg silence failed: ${r.stderr.toString()}`);
}

async function concatMp3(inputs: string[], outPath: string): Promise<void> {
  const listPath = join(tmpdir(), `concat-${Date.now()}.txt`);
  const lines = inputs.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  await writeFile(listPath, lines + '\n');
  const r = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '128k',
      outPath,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  if (r.status !== 0) throw new Error(`ffmpeg concat failed: ${r.stderr.toString()}`);
}

async function renderPart(part: Part): Promise<void> {
  const filename = `part-${String(part.part).padStart(2, '0')}.mp3`;
  const outPath = join(audioDir, filename);
  if (existsSync(outPath) && !FORCE) {
    console.log(`Skip ${filename} (exists; set FORCE=1 to re-render)`);
    return;
  }
  const words = level.words.filter((w) => w.index >= part.start && w.index <= part.end);

  const tmp = join(tmpdir(), `naplan-${levelId}-p${part.part}-${Date.now()}`);
  await mkdir(tmp, { recursive: true });
  const silencePath = join(tmp, 'silence.mp3');
  makeSilence(PAUSE_SECONDS, silencePath);

  const t0 = Date.now();
  const segmentPaths: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const wordPath = join(tmp, `w-${String(w.index).padStart(3, '0')}.mp3`);
    await ttsToFile(entryText(w), wordPath);
    segmentPaths.push(wordPath);
    if (i < words.length - 1) segmentPaths.push(silencePath);
  }
  await concatMp3(segmentPaths, outPath);
  await rm(tmp, { recursive: true, force: true });

  const ms = Date.now() - t0;
  const sizeKb = (await stat(outPath)).size / 1024;
  console.log(
    `Wrote ${filename} (${sizeKb.toFixed(0)} KB, ${(ms / 1000).toFixed(1)}s API+concat, ${words.length} words)`,
  );
}

const targetParts = partArg
  ? level.parts.filter((p) => p.part === Number(partArg))
  : level.parts;

if (targetParts.length === 0) {
  console.error(`No matching parts for ${levelId}${partArg ? ` part ${partArg}` : ''}`);
  process.exit(1);
}

console.log(
  `Rendering ${level.id} (${targetParts.length} part${targetParts.length === 1 ? '' : 's'}) ` +
    `via voice ${VOICE_ID} model ${MODEL_ID} speed ${SPEED} pause ${PAUSE_SECONDS}s`,
);

for (const part of targetParts) {
  await renderPart(part);
}

console.log('Done. Run `bun run scripts/build-data.ts` to refresh durations.');
