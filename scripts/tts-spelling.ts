// Render NAPLAN spelling-test audio with ElevenLabs.
// Per-word format: "Number {n}. {WORD}. {sentence} {WORD}."
// See CLAUDE.md → "Audio rendering with ElevenLabs" for the full rationale.

import { $ } from 'bun';
import { mkdtemp, rm, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID ?? 'sai9UY7iXkRDSsXHR0bZ';
const modelId = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_multilingual_v2';
const speed = Number(process.env.ELEVENLABS_SPEED ?? '0.75');
const pauseOverride = process.env.PAUSE_SECONDS ? Number(process.env.PAUSE_SECONDS) : null;
const force = process.env.FORCE === '1';

const { positionals } = parseArgs({ args: Bun.argv.slice(2), allowPositionals: true });
const [levelId, partArg] = positionals;

if (!apiKey || !levelId) {
  console.error('Usage: ELEVENLABS_API_KEY=... bun run scripts/tts-spelling.ts <levelId> [partNumber]');
  process.exit(1);
}

type Word = { index: number; word: string; sentence: string };
type Part = { part: number; start: number; end: number };
type Level = { id: string; pauseSec: number; parts: Part[]; words: Word[] };

const level: Level = await Bun.file(`src/data/${levelId}.json`).json();
const pauseSec = pauseOverride ?? level.pauseSec;
if (pauseOverride !== null && pauseOverride !== level.pauseSec) {
  console.warn(`WARNING: PAUSE_SECONDS=${pauseOverride} overrides ${levelId}'s locked pauseSec=${level.pauseSec}.`);
}

const audioDir = `public/audio/${levelId}`;
await $`mkdir -p ${audioDir}`.quiet();

// NB: call the ElevenLabs REST endpoint directly with fetch rather than the
// `@elevenlabs/elevenlabs-js` SDK. Under Bun the SDK's streaming convert() hangs
// indefinitely on the first request (100% CPU, no connection established). The
// raw HTTP API works fine. Body keys are snake_case here (vs the SDK's camelCase).
async function tts(text: string, outPath: string) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey!,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${await res.text()}`);
  }
  await Bun.write(outPath, await res.arrayBuffer());
}

async function renderPart(p: Part) {
  const filename = `part-${String(p.part).padStart(2, '0')}.mp3`;
  const outPath = join(audioDir, filename);
  if (existsSync(outPath) && !force) return console.log(`Skip ${filename} (exists; FORCE=1 to re-render)`);

  const tmp = await mkdtemp(join(tmpdir(), `naplan-${levelId}-p${p.part}-`));
  const silence = join(tmp, 'silence.mp3');
  await $`ffmpeg -y -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t ${pauseSec} -ar 44100 -ac 2 -b:a 128k ${silence}`.quiet();

  const words = level.words.filter((w) => w.index >= p.start && w.index <= p.end);
  const segments: string[] = [];
  const t0 = Date.now();
  for (const w of words) {
    const path = join(tmp, `w-${String(w.index).padStart(3, '0')}.mp3`);
    const sent = w.sentence?.trim() || w.word;
    await tts(`Number ${w.index}. ${w.word}. ${sent} ${w.word}.`, path);
    segments.push(path, silence);
  }
  segments.pop();

  const list = join(tmp, 'list.txt');
  await writeFile(list, segments.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  await $`ffmpeg -y -f concat -safe 0 -i ${list} -ar 44100 -ac 2 -b:a 128k ${outPath}`.quiet();
  await rm(tmp, { recursive: true, force: true });

  const sizeKb = (await stat(outPath)).size / 1024;
  console.log(`Wrote ${filename} (${sizeKb.toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)}s, ${words.length} words)`);
}

const parts = partArg ? level.parts.filter((p) => p.part === Number(partArg)) : level.parts;
if (parts.length === 0) {
  console.error(`No matching parts for ${levelId}${partArg ? ` part ${partArg}` : ''}`);
  process.exit(1);
}

console.log(`Rendering ${level.id} (${parts.length} part${parts.length === 1 ? '' : 's'}) voice=${voiceId} model=${modelId} speed=${speed} pause=${pauseSec}s`);
for (const p of parts) await renderPart(p);
console.log('Done. Run `bun run scripts/build-data.ts` to refresh durations.');
