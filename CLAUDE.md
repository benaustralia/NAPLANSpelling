# NAPLANSpelling — project brief for Claude

A small, fast, no-login practice site for NAPLAN Language Conventions spelling
words. Vite + React 19 + Tailwind 4, packaged with Bun, deployed to Netlify.
Ships Year 3, 5, 7 and 9 corpora drawn from publicly released ACARA NAPLAN
test papers (paper era: 2008–2016), plus two harder levels — Difficult and
Challenging — sourced from the ACARA NAPLAN Writing Marking Guide for
students who've outgrown the Year 9 list (see "Source" sections below), plus
a Prime Minister's Spelling Bee practice category (Green/Orange/Red) with its
own typed self-check player — see **`PM-Bee-Plan.md`** for that category's
full build history, including a reverse-engineered spec of the real Bee's 25s
timer mechanic.

**Check `Plan.md` at repo root for active/in-progress work** (e.g. the
Clerk Production promotion) before assuming a fresh conversation has full
context — it tracks phase-by-phase progress and open items that don't
live anywhere else. **Check `PM-Bee-Plan.md`** specifically for the Spelling
Bee category — `Plan.md` just points to it.

**Two structurally different interaction models live on this one site —
don't assume a feature that applies to one applies to both:**
| | Dictation levels (Y3/Y5/Y7/Y9, Difficult, Challenging) | Bee levels (Green/Orange/Red) |
|---|---|---|
| `interaction` (`src/levels.ts`) | `'dictation'` | `'typed'` |
| Player | `PartPlayer.tsx` — plays a whole part, prev/next/play transport | `BeeQuiz.tsx` — one word at a time, Listen → type → check |
| Answering | Student writes on paper (or types nothing — the site never sees an answer) | Student types into the page; marked instantly, client-recomputed server-side |
| Marking | Self-check via "Reveal answers", or AI photo-marking (`MarkPanel.tsx`, Claude Haiku) | Plain string comparison — no AI involved |
| Time pressure | None | Real 25s-per-word countdown, reverse-engineered from the actual Bee (see `PM-Bee-Plan.md`) |
| Printable sheet / PDF | Yes, pre-generated (`public/pdfs/`) | None — doesn't exist for this category |
| Progress persistence | Only via photo-marking attempts | Every attempt (signed-in *and* anonymous) |

This isn't "one more level with a different skin" — it's two different
products sharing a nav and a word-list pipeline. A request that implicitly
assumes one model ("add photo-marking to Bee", "give Y3 instant per-word
feedback like Bee") needs a deliberate design decision, not just wiring —
check `PM-Bee-Plan.md`'s "Decision" section for why Bee forked away from the
dictation model in the first place before building toward either direction.

URL structure (static, hash-free, no trailing-slash quirks):
- `/`                     — landing page with level CTAs (Y3 / Y5 / Y7 / Y9 / Difficult / Challenging / Bee)
- `/about/`               — copyright + methodology
- `/y3-lc/`               — Year 3 LC overview (list of 11 parts)
- `/y3-lc/part/N/`        — Year 3 LC test player for part N (1–11)
- `/y5-lc/`               — Year 5 LC overview (list of 11 parts)
- `/y5-lc/part/N/`        — Year 5 LC test player for part N (1–11)
- `/y7-lc/`               — Year 7 LC overview (list of 11 parts)
- `/y7-lc/part/N/`        — Year 7 LC test player for part N (1–11)
- `/y9-lc/`               — Year 9 LC overview (list of 11 parts)
- `/y9-lc/part/N/`        — Year 9 LC test player for part N (1–11)
- `/difficult-lc/`          — Difficult overview (list of 17 parts)
- `/difficult-lc/part/N/`   — Difficult test player for part N (1–17)
- `/challenging-lc/`        — Challenging overview (list of 10 parts)
- `/challenging-lc/part/N/` — Challenging test player for part N (1–10)
- `/bee-green-lc/`, `/bee-orange-lc/`, `/bee-red-lc/` — Spelling Bee level
  overviews (Green/Orange/Red, 11/13/11 parts respectively)
- `/bee-{green,orange,red}-lc/part/N/` — typed self-check quiz for part N
  (`src/routes/BeeQuiz.tsx`, not `PartPlayer.tsx` — see "Component map" and
  `PM-Bee-Plan.md`). No print/photo-marking routes exist for these levels.

Routing is hand-rolled in `src/main.tsx` against `window.location.pathname`
and a single `ALL_LEVELS` source of truth from `src/levels.ts`. Each level
entry carries an `interaction: 'dictation' | 'typed'` field that decides which
player component + which routes (print, photo-marking) apply, and a
`category` field that drives the nav grouping (see "Component map").

## ## Word ordering (seeded shuffle)

Source CSVs are alphabetical for editorial sanity, but the runtime word
order is a per-level seeded Fisher-Yates shuffle (Mulberry32 PRNG) applied
in `scripts/build-data.ts`. Why: an alphabetical test trains pattern-
matching ("part 1 = a-words") instead of recall.

**The seed is immutable per level once any audio is rendered.** Changing
the seed silently re-maps words to different positions in the audio MP3s,
which breaks every existing audio file. Current seeds: Y3 = 30303, Y5 =
50505, Y7 = 70707, Y9 = 90909, Difficult = 111222, Challenging = 333444,
Bee Green = 234567, Bee Orange = 345678, Bee Red = 456789.
Add new levels with fresh arbitrary seeds — never reuse or change an
existing one.

## Pause timing tiers (per-level `pauseSec`)

Each level in `scripts/build-data.ts` carries a `pauseSec` field — the
length of the silent gap inserted between dictated items by
`scripts/tts-spelling.ts`. **`pauseSec` is immutable once audio for the
level is rendered** (same rule as `seed`): changing it desynchronises the
declared gap from the actual MP3s, and re-rendering costs ElevenLabs
quota.

Tiers, derived from Australian handwriting-speed evidence (Ziviani &
Watson-Will 1998) plus real student feedback on Y3 audio:

| Tier | Levels | `pauseSec` | Rationale |
|------|--------|-----------|-----------|
| 0 (future) | Y2-bridge / learning support | 9.0–10.0 | Y2 LPM ~30% slower than Y3 |
| 1 | Y3, Y5 | **7.5** | Matches existing Y3/Y5 audio; comfortable for Y3 mean writer, mildly generous for Y5 |
| 2 | Y7, Y9, Difficult, Challenging | **5.5** | Y7/Y9 LPM 2–2.5× Y3, longer words partly offset; splits Y7/Y9 fairly. Difficult/Challenging students are at least as fast as Y9 writers, so they join the same tier rather than getting a new one |

The three Bee levels reuse these same tier values by Y-level analogue (Green
Y3–4 → tier 1's 7.5, Orange Y5–6 → tier 1's 7.5, Red Y7–8 → tier 2's 5.5), but
for a different reason: `BeeQuiz.tsx` has no paper-writing step at all (typed,
self-marked), so `pauseSec` there only needs to be long enough for
`build-data.ts`'s `silencedetect` to reliably find the gap between words — the
handwriting-pace rationale above doesn't apply to Bee.

Within-tier variance between students (~30%) is expected — the per-
question prev/next buttons (see "Future feature ideas") are the right
place to absorb that, not a finer tier split.

`scripts/tts-spelling.ts` reads `pauseSec` from the level's built JSON
(`src/data/<id>.json`). The legacy `PAUSE_SECONDS` env var still works as
an ad-hoc override for experiments but emits a warning when it disagrees
with the locked level value — never use it to render a published corpus.

**Rendering Y7/Y9 in future**: just add the entries to the `LEVELS` table
in `scripts/build-data.ts` with `pauseSec: 5.5` (Tier 2). The render
script picks it up automatically from the built JSON and the warning
system protects against accidental env-driven mismatches — no env flag
gymnastics required.

## Numbering convention

Absolute (corpus-wide) numbering, **not** within-part. Part 2 of a 210-word
test contains words 21–40 and the audio says "Number 21" through "Number
40". This must agree across:
- audio (`scripts/tts-spelling.ts` uses `w.index` from the JSON)
- on-screen "Listen" copy in `PartPlayer.tsx`
- on-screen "Reveal answers" list (uses `w.index`)
- printable question sheet (uses `partInfo.start + i`)
- printable answer sheet (uses `w.index`)

If you change one, change all five. Mismatched numbering is the most
common source of confusion ("the audio says 21 but my sheet says 1").

Bee levels (`interaction: 'typed'`) have no print sheet, but the same rule
applies to their two surfaces: audio (unchanged — still `w.index`) and
`BeeQuiz.tsx`'s "Word N of M" counter + results-list numbers, both of which
use `current.index`/`r.index` (absolute), never a part-relative position.
This was wrong on first ship (showed "Word 1 of 20" every part instead of
"Word 21 of 40" for part 2) and got fixed the same day — a reminder this
convention is easy to violate by accident in a brand new component.

## Per-level data flow

For each level (id format `y{year}-lc` for NAPLAN year levels, or a short
difficulty slug like `difficult-lc` / `challenging-lc` for levels above
Year 9 that aren't tied to a NAPLAN year):

1. `public/data/<id>/words.csv` — `word,definition` (header row); one entry
   per spelling word in the order they should be tested. Definitions are
   short, age-appropriate (Y5 slightly more sophisticated than Y3).
2. `public/data/<id>/sentences.json` — `{ word: "illustrative sentence" }`,
   one short sentence per word that uses the word naturally. Used in the
   audio script and in the on-screen / printed answer sheet.
3. `public/audio/<id>/part-NN.mp3` — pre-rendered audio for each part
   (~5 minutes each, 20 words per part with the final part absorbing any
   remainder if the surplus is less than half a part).
4. `src/data/<id>.json` — built artefact merging the CSV, sentences and
   ffprobe-measured audio durations. Generated by `scripts/build-data.ts`.
5. `src/data/<id>.d.ts` — TypeScript declaration so `import data from
   '@/data/<id>.json'` is typed.

Adding a new level (e.g. `y7-lc`):
- Drop the CSV + sentences.json under `public/data/y7-lc/`.
- Add `'y7-lc'` to the `LEVELS` array in `scripts/build-data.ts` with a
  fresh `seed` and the tier-appropriate `pauseSec` (Y7/Y9 = 5.5, see
  "Pause timing tiers"). Both fields become immutable the moment audio
  is rendered, so pick deliberately.
- Add a `<id>.d.ts` mirror of the existing ones.
- Import + register in `src/levels.ts` (`ALL_LEVELS` and `LEVELS` map).
- Run `bun run scripts/build-data.ts` first (so the level JSON exists
  with its `pauseSec`), then `bun run scripts/tts-spelling.ts y7-lc`,
  then `bun run scripts/build-data.ts` again to refresh durations.

## Source: ACARA NAPLAN past-paper answer keys

All publicly released paper-era LC answer keys (2008–2016) live on the ACARA
blob under a stable URL pattern:

```
https://acaraweb.blob.core.windows.net/acaraweb/docs/default-source/
  assessment-and-reporting-publications/naplan-{YYYY}-yr-{3|5|7|9}-paper-test-answers.pdf
```

The Year 5/7/9 sets (9 PDFs each) have been downloaded into
`source-pdfs/y{5,7,9}/`. The spelling answers live in the right-hand
"Language Conventions" column of those PDFs, questions 1–25. Questions
beyond 25 are grammar/punctuation multiple-choice (a/b/c/d) and are not
spelling.

Dedupe counts per level (225 occurrences each across 9 years):
- Year 5: **222** unique spelling words (3 repeats: `climb`, `shoulder`, `nursery`)
- Year 7: **224** unique (1 repeat)
- Year 9: **224** unique (1 repeat)

`scripts/extract-spelling.ts` parses the LC column from `pdftotext -layout`
output (handles multi-line wraps that occur when an answer is too long for
the column). `scripts/dedupe-y79.ts` produces the alphabetised word lists
that became `public/data/y{7,9}-lc/words.csv`.

## Source: ACARA NAPLAN Writing Marking Guide (Difficult / Challenging)

Unlike Y3/Y5/Y7/Y9, the `difficult-lc` and `challenging-lc` word lists are
**not** drawn from the past-paper LC answer keys above — there is no NAPLAN
year level beyond 9 to source from. Instead they come from the ACARA NAPLAN
Writing Marking Guide, a separate ACARA publication, supplied directly as
`spelling-lists/difficult.csv` and `spelling-lists/challenging.csv` (334 and
197 words respectively). Definitions and illustrative sentences for both
lists were authored to match the site's existing style (short, natural,
kid-friendly for Difficult; genuinely advanced but still concrete for
Challenging) rather than extracted from the source PDF, since the Writing
Marking Guide doesn't provide definitions or example sentences.

## Audio rendering with ElevenLabs

`scripts/tts-spelling.ts` renders test audio from the `src/data/<id>.json`
artefact. Reads `ELEVENLABS_API_KEY` (and optional overrides) from `.env`.

Per-word format spoken in audio:
```
Number {n}. {WORD}. {sentence} {WORD}.
```

**Key implementation detail**: each word renders as its own ElevenLabs API
request and then ffmpeg concatenates the segments with a 7.5-second silence
track between them. ElevenLabs SSML `<break>` tags do **not** reliably
produce 5+ second pauses — `eleven_multilingual_v2` caps breaks at ~3s and
`eleven_v3` produces only ~1.8s gaps from a `<break time="5.0s"/>` tag. The
existing Y3 audio shows perfectly consistent 7.5s silence regions, which is
only achievable via ffmpeg silence concatenation. Do not "simplify" the
script back to inline SSML breaks.

Defaults (overridable via env):
- `ELEVENLABS_VOICE_ID` — `sai9UY7iXkRDSsXHR0bZ` ("Ben" — youthful adult
  Australian male, Educational category in the voice library). Set in `.env`.
- `ELEVENLABS_MODEL_ID` — `eleven_multilingual_v2`. **Do not switch to
  `eleven_v3`** for Australian community voices like Ben — v3 has a
  restricted voice catalogue and silently substitutes its closest pre-built
  match (which is American-accented for AU community voices). v2 has the full
  shared-voices library and renders the actual selected voice.
- `ELEVENLABS_SPEED` — `0.75` (set via `voice_settings.speed`, not ffmpeg
  post-processing — the playback rate is baked into the rendered MP3 so the
  `<audio>` element plays at native speed)
- `PAUSE_SECONDS` — **legacy override**. The canonical source is the
  level's `pauseSec` field in `scripts/build-data.ts`. Setting this env
  forces a different gap and emits a warning; only use for one-off
  experiments, never to render a published corpus. See "Pause timing
  tiers" above.

Usage:
```bash
bun run scripts/tts-spelling.ts y5-lc        # render every missing part
bun run scripts/tts-spelling.ts y5-lc 3      # render only part 3
FORCE=1 bun run scripts/tts-spelling.ts y5-lc 3   # re-render even if file exists
```

After rendering, run `bun run scripts/build-data.ts` to refresh durations
in the built JSON artefacts (durations are ffprobe-measured and shown in
the part list / player UI).

**Quota awareness**: ElevenLabs charges per character of input text. A full
Y5 render is ~13k characters across 222 individual API calls. Test on a
single part first (`tts-spelling.ts y5-lc 1`) before committing to a full
render.

**"API key ID used as API key" error (seen 2026-08-15)**: if `tts-spelling.ts`
fails with ElevenLabs returning `authentication_error` /
`api_key_id_used_as_api_key`, the value saved in `ELEVENLABS_API_KEY` is the
**Key ID** (the identifier shown next to a key row in the dashboard), not the
actual secret — which only starts with `sk_` and is only ever displayed once,
at creation/rotation time. Go back to the ElevenLabs dashboard, regenerate or
reveal the key, and copy the `sk_...` value specifically, not the ID next to
it. A quick local check without printing the secret:
`node -e 'const v=require("fs").readFileSync(".env.local","utf8").match(/^ELEVENLABS_API_KEY=(.*)$/m)[1].trim();console.log(v.startsWith("sk_"))'`
— a correct key starts `sk_`, an ID doesn't.

## Build, dev, deploy

```bash
bun install
bun run dev           # vite + auto-builds data; http://localhost:5173/
bun run typecheck     # tsc -b --noEmit
bun run build         # tsc + vite build + inline-css; outputs to dist/
bun run qrcodes       # regenerates QR codes for printable hand-out
```

Deploys to Netlify on push to `main` (see `netlify.toml` for the build
command/publish dir). The public URL is `https://spelling.naplanstyle.com/`
(a subdomain of the "NAPLAN Style" umbrella site at naplanstyle.com — see
"Custom domain" below). `https://naplan-spelling.netlify.app/` 301-redirects
to the custom domain (see `netlify.toml`, added 2026-08-09) — old printed
QR codes/PDFs referencing the netlify.app URL still work since the redirect
preserves the path. This wasn't always true: the netlify.app URL used to
serve directly with no redirect, which was harmless while Clerk ran on its
Development instance but started blank-screening Clerk-gated features (e.g.
"Mark my answers") once Clerk was promoted to Production, because Clerk
Production keys are domain-locked to `spelling.naplanstyle.com` and reject
requests from any other origin.

**Repo linkage (as of 2026-08-05)**: the Netlify site (`naplan-spelling`) is
linked to `github.com/benaustralia/NAPLANSpelling` via the Netlify GitHub
App, with auto-publishing on for `main`. This wasn't always true — the site
was originally deployed via manual `Netlify Drop`/CLI uploads with no Git
connection at all (`build_settings: {}`, no webhook), so pushes silently
didn't deploy for several commits until this was fixed. If deploys ever go
stale again, check `netlify api getSite --data '{"site_id": "<id>"}'` for an
empty `build_settings` object, or run `netlify sites:list` and check whether
`naplan-spelling` is missing the `repo:` line that every other linked site
shows — that's the tell. The fix requires the Netlify GitHub App to have
access to this repo (GitHub → Settings → Applications → Installed GitHub
Apps → Netlify → Configure → add the repo under "Only select
repositories"), then re-linking from the Netlify dashboard (Project
configuration → Build & deploy → Link repository).

**Custom domain (as of 2026-08-06)**: `spelling.naplanstyle.com` is set as
the Netlify site's primary custom domain (Let's Encrypt cert provisioned).
`naplanstyle.com` itself is a separate, broader "NAPLAN Style" product
hosted on **Vercel**, with its own **separate Clerk application** — not
this site, not the same login. DNS for `naplanstyle.com` lives on **AWS
Route 53** (registrar: Amazon Registrar), not Netlify DNS or Cloudflare —
the subdomain is a plain CNAME record (`spelling` → `naplan-spelling.
netlify.app`) added there. If HTTPS ever needs re-provisioning and Netlify
returns `"certificate parameter is required when updating an existing
certificate"`, that's a stuck cert state — remove the custom domain from
Netlify's Domain management and re-add it fresh (DNS doesn't need
touching, only the Netlify-side domain record).

## Build scripts

- `scripts/build-data.ts` — reads the per-level CSV + sentences.json,
  probes audio durations with ffprobe, runs silencedetect to bake the
  per-part `questionStarts` array, writes `src/data/<id>.json`. Runs
  during `dev` and `build` via `prebuild`. Generalised to iterate over
  the `LEVELS` array — add new levels there.
- `scripts/build-qrcodes.ts` — uses `bunx qrcode` to render an SVG QR for
  every level overview + every part, plus a printable contact-sheet. Output
  goes to `public/codes/<level-id>/`.
- `scripts/build-pdfs.ts` — see "Printable PDFs" below.
- `scripts/inline-css.ts` — post-build step that inlines the Tailwind CSS
  bundle into `index.html`, removing the separate `.css` HTTP request.
- `scripts/tts-spelling.ts` — see "Audio rendering" above.
- `scripts/extract-spelling.ts` + `scripts/dedupe-y79.ts` — provenance
  scripts used to build the Y7/Y9 corpora from `source-pdfs/y{7,9}/`.
  Not part of the regular build pipeline — only re-run if the source
  PDFs are updated.

## Printable PDFs

Each part page has a "Download answer sheet" button that links to a
pre-generated PDF at `/pdfs/<levelId>/part-NN.pdf`. Two pages per PDF —
the blank answer sheet (page 1) and the answer key (page 2). Generated
once per content change and committed alongside the MP3s. **Not** part
of the regular `bun run build` chain (would add ~2 minutes on every
build for output that almost never changes).

### Why static and not on-the-fly

PDFs are deterministic from the level data, which is locked the moment
audio is rendered (immutable seed + immutable pauseSec). They never
need per-user customisation. Pre-generating once and serving as static
files beats:

- **Browser `window.print()`** — Chrome injects URL/date/page-number into
  the page margins and ignores `@page { @top-left { content: '' } }`. The
  only cross-browser-clean way to suppress them is `@page { margin: 0 }`,
  which sacrifices natural margins.
- **Server-side PDF generation** — Puppeteer in a Netlify Function would
  add ~80 MB cold-start, runtime cost, and complexity, for output that's
  identical for every user.

### How to regenerate

PDFs need to be regenerated whenever the printable content changes —
realistically that means whenever audio is re-rendered for a level (since
the part list, durations, etc. could shift), or when `PartPlayer`'s print
layout itself is edited. Single command:

```bash
# 1. In one terminal, start the dev server (PDFs are generated against the
#    live React app, so it must be serving):
bun run dev

# 2. In another terminal:
bun run pdfs           # regenerates all 44 PDFs across all 4 levels (~2 min)
```

`scripts/build-pdfs.ts` drives Chrome headless via the macOS system
binary at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
— zero npm dep, no Puppeteer install. The `--no-pdf-header-footer` flag
suppresses Chrome's URL/date/page-number injection, so the PDFs are
clean. Output: `public/pdfs/<levelId>/part-NN.pdf`.

To regenerate just one level (e.g. after re-rendering Y7 audio at a
different pauseSec), edit the `LEVELS` array near the top of
`scripts/build-pdfs.ts` to a single entry and re-run, or just accept the
~2-minute full pass — it's fast enough that targeted regen is rarely
worth the bother.

### Other notes

- The print-only DOM (`PrintHeader`, `PrintSheet` in `PartPlayer.tsx`)
  and the `@media print` block in `src/index.css` still exist as a
  fallback for users who hit `Ctrl+P` from the browser. They could be
  removed for ~100 lines of dead code, but the cost is essentially zero
  to keep them.
- PDFs are committed to the repo (~5 MB across 44 files). Same convention
  as the rendered MP3s — stable build outputs that cost real time/quota
  to produce, so they live in version control rather than being
  regenerated on every CI build.
- The on-screen flow does NOT use the print path at all. The button
  links directly at `/pdfs/<levelId>/part-NN.pdf` with `target="_blank"`,
  so kids open the PDF in a new tab and print from there.

## Component map

- `src/components/Shell.tsx` — global header + footer (ACARA copyright link).
  Wraps every page. Nav groups levels by `category` (from `ALL_LEVELS`) into
  a dropdown per category on desktop (`src/components/ui/dropdown-menu.tsx`)
  and a hamburger-triggered drawer on mobile (`src/components/ui/sheet.tsx`)
  — rebuilt 2026-08-15 when the Bee category pushed the level count past what
  a flat link row could hold; both are thin shadcn-style wrappers around the
  `radix-ui` package already in deps, not new dependencies.
- `src/components/ui/button.tsx` — shadcn-style Button.
- `src/routes/Landing.tsx` — front page. Eyebrow text "For Year 3&5
  students" (uppercase via Tailwind `uppercase`), two side-by-side CTA
  buttons, plus a Bee CTA row with an affiliation disclaimer underneath.
- `src/routes/ListOverview.tsx` — overview grid for one level. Takes
  `levelId` prop. Subtitle copy branches on `getInteraction(levelId)` —
  dictation levels get the "write on paper" blurb, typed (Bee) levels get a
  "listen, type, instant tick/cross" blurb instead.
- `src/routes/PartPlayer.tsx` — `<audio>` player + reveal answers + print
  sheet, for `interaction: 'dictation'` levels only. Takes `levelId` and
  `part` props. Print layout is gated by `print-only` / `no-print` Tailwind
  utility classes (defined in `src/index.css`).
- `src/routes/BeeQuiz.tsx` — typed self-check quiz player for
  `interaction: 'typed'` (Bee) levels. Listen → type → Enter/Check → instant
  tick/cross → next word → end-of-part results screen (score + full tick/cross
  list, incorrect words in red). Implements the real Bee's 25s-per-word timer
  (starts only once that word's audio finishes, never cumulative — see
  `PM-Bee-Plan.md` for the reverse-engineered spec) and a definition-only
  "Show Hint". No print/photo-marking UI. Fires
  `netlify/functions/log-quiz-event.mts` (anonymous analytics) on every
  completion, and lazy-loads `src/components/BeeSaveStatus.tsx` (Clerk-gated
  personal progress save via `netlify/functions/record-bee-attempt.mts`) on
  the results screen only when `AUTH_ENABLED`.
- `src/components/BeeSaveStatus.tsx` — lazy-loaded from `BeeQuiz.tsx`'s
  results screen; same "keep `@clerk/clerk-react` out of the anonymous bundle"
  pattern as `Shell.tsx`'s `AccountMenu`.
- `src/routes/About.tsx` — methodology + ACARA copyright statement + Bee
  category affiliation disclaimer.
- `src/routes/NotFound.tsx` — 404.

## Conventions to keep

- Y3 sentence style is the gold standard: short, concrete, kid-friendly,
  uses the word naturally. Y5 sentences are similar but tolerate slightly
  more nuance.
- Every word in `words.csv` must have a matching entry in `sentences.json`.
  `build-data.ts` will warn on mismatches; aim for zero warnings.
- Don't pad the corpus to round numbers — keep it accurate to source.
  `build-data.ts` distributes parts as 20-word chunks with the final part
  absorbing the remainder when remainder < 10. Otherwise it adds an extra
  short final part.
- Don't try to make audio pauses with SSML. See "Audio rendering" above —
  it's been tried; it doesn't work.
- Print sheet uses two columns; keep page break logic in the
  `PrintSheet` component when editing `PartPlayer.tsx`.

## Implemented features (formerly "future ideas")

### Per-question scrubbing in the audio player ✓

`scripts/build-data.ts` runs `silencedetect=noise=-30dB:d=2` against each
part's MP3 and bakes a `questionStarts: number[]` array into the level
JSON (one timestamp per word — word 1 at t=0, word N+1 at the silence_end
of gap N). Mismatch (e.g. silencedetect returns the wrong count) returns
`null` and the player gracefully disables prev/next instead of seeking
wrong.

`PartPlayer.tsx` renders three custom transport buttons (⏮ Prev / ▶ Play /
⏭ Next, lucide icons) plus a `<Progress>` bar and "Word N of M" readout.
Native `<audio controls>` is hidden — the three buttons are the only
seek mechanism. Keyboard: `Space` / `←` / `→`. Prev replays the current
word if >1.5s into it, else jumps back one (iPod convention).

### Per-level pause tuning ✓

Each level entry in `scripts/build-data.ts` carries a `pauseSec` field
which `tts-spelling.ts` reads from the built JSON. See "Pause timing
tiers" above for the locked values. Within-tier student variance is the
prev/next buttons' job, not the tier system's.

## ACARA copyright

NAPLAN test materials are © ACARA. The site is an independent study aid —
not endorsed by ACARA. The `About` page links to the current ACARA
copyright statement. Don't redistribute the source PDFs (they're
gitignored under `source-pdfs/`).
