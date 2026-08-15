# Prime Minister's Spelling Bee — new category build plan

**Goal:** add a new category to NAPLANSpelling for the Prime Minister's Spelling Bee,
with one level per Bee reading level (Green / Orange / Red), each backed by an
expanded word list in the same lexical range as the official demo samples below.
Ship fast: reuse the existing dictation-level pipeline first; a timed "Bee mode"
player is a later enhancement, NOT part of the initial ship.

**Context/urgency:** the 2026 School Round closes Fri 21 Aug 2026. The student being
tutored can use the official demo now; this category is for ongoing/next-year prep,
but get it live ASAP.

## The competition (verified 2026-08-15)

- Prime Minister's Spelling Bee, https://www.spelling-bee.com.au/ — free online
  competition run via KidsNews for Years 3–8.
- Levels: **Green = Years 3–4, Orange = Years 5–6, Red = Years 7–8** (teachers may
  move a student up a level).
- Sitting format: 30 words randomly served from the level's word bank. For each word:
  student clicks **Listen** → audio says the word **twice** and uses it **in a
  sentence**; the sentence is also displayed on screen with the word blanked
  (e.g. "Hang your bag on your ____, please."). When audio ends, a **25-second
  countdown** starts. Student **types** the word (shown uppercase) and submits with
  Enter. Audio can be replayed; a **Show Hint** button reveals definition, word
  origin, part of speech, and homophone yes/no — but the timer keeps running.
- Each 30-word run ramps easy → hard; the last ~10 words are where runs are won.
- Public demo ("Try the Bee"): https://www.spelling-bee.com.au/try-the-bee/?ttb-level=green
  (also `orange`, `red`; append `&skip-tutorial`). NOTE: site 403s server-side
  fetch (Cloudflare) — use a real browser if it needs re-checking.

## Official demo word banks (extracted from the demo page 2026-08-15)

Each demo serves a fixed 30-word bank per level, base64-encoded in the page's
`window.contest_words` (fields: word_given, sentence, definition, etym,
part_of_speech, homophone, embedded MP3 audio). Decoded words, in the demo's
easy→hard ramp order:

**Green (Y3–4):** hook, snag, zero, alarm, lava, area, china, clear, crate, dance,
drive, shell, booklet, bubble, honest, pagan, popcorn, wooded, unicorn, livid,
surge, absurd, floret, immune, midpoint, exotic, warlock, galore, vacuum, rhythm

**Orange (Y5–6):** ample, crawl, maple, scrawl, ballot, sapling, yolk, instant,
capture, profess, alibi, chimney, kindling, sadden, tinsel, bizarre, marron,
stadium, cashier, kilometre, smitten, brocade, normally, scrutiny, battalion,
expedite, parliament, southerly, wheedle, cupidity

**Red (Y7–8):** doleful, quell, vibrate, doldrums, interim, consecutive, endemic,
imitation, solstice, epitome, unreliable, cerebral, concussion, disengage, escapee,
nucleus, propeller, syndicate, azalea, noticeable, hereditary, didactic, oblique,
effeminate, noxious, glockenspiel, presentiment, chrysanthemum, paraphernalia,
caballero

Captured Green sentences (first 14; rest not captured):
hook="Hang your bag on your ____, please." · snag="We have hit a ____ with our
project." · zero="Ten minus ten is ____." · alarm="I don't want to cause ____ but
the storm is about to hit us." · lava="The volcano erupted and ____ spilled into
the ocean." · area="The ____ around our house is full of wildlife." · china="He
packed the ____ plates away carefully." · clear="I had to ____ the table so we
could eat." · crate="A ____ of bananas was delivered today." · dance="The beat of
the music made me want to ____." · drive="Dad was excited to ____ the new car." ·
shell="She cracked the ____ of the nut" · booklet="I was handed a ____ at the
information night." · bubble="I saw a ____ in the soapy water."

## Lexical register — how Bee lists differ from this site's NAPLAN corpora

NAPLAN corpora here = words students commonly MISSPELL in writing (orthographic
traps). Bee lists ramp into low-frequency VOCABULARY (has the student met the word
at all): Green ends on floret/warlock/rhythm; Orange on wheedle/cupidity/brocade;
Red on glockenspiel/presentiment/caballero/paraphernalia. Expansion lists must
match this register per level — common words with a spelling catch early in the
list, rare/loan/etymology-rich words late. Australian spellings throughout
(kilometre, metre, -our, -ise). Note Australiana entries (marron = WA freshwater
crayfish) — include some.

## Word-list expansion sources (for growing each level well beyond 30)

- The three demo banks above are the calibration anchors.
- **NSW Premier's Spelling Bee training word lists** — publicly published by the
  NSW Arts Unit (artsunit.nsw.edu.au, "NSW Premier's Spelling Bee"), Junior
  (Y3–4)/Senior (Y5–6 + Y7–8?) lists; closest public analogue in register and also
  Australian. Fetch and mine these first.
- PM's Bee Resource Hub (spelling-bee.com.au/resource-hub/) — practice words +
  2025/2026 commemorative posters containing words from all three levels (browser
  needed, Cloudflare).
- Scripps consolidated word lists / "Words of the Champions" (adjust to Australian
  spelling) for the hard tails.
- ACARA / school spelling scope-and-sequence lists for the easy front ends.
- This repo's own difficult-lc + challenging-lc lists overlap the Bee Red
  middle range — cross-check to avoid duplicating across categories if desired.
- Target size: comparable to existing levels (≈200+ words per level), each word
  with a dictation sentence.

## Decision (2026-08-15): typed self-check player, not print sheets

Originally planned to reuse the existing dictation + paper/photo-marking pipeline
as-is and defer a "Bee mode" player entirely. **Superseded**: the category instead
ships with its own typed, self-marking player (`src/routes/BeeQuiz.tsx`) —
Listen → type the word → Enter to check → instant tick/cross → next word — much
closer to the real Bee experience, and it needed less net work than it sounds
because it removes the print-sheet/PDF and photo-marking scope entirely while
reusing the existing per-word audio-timestamp infrastructure as-is.

- MVP shipped: Listen button (seeks the part MP3 to the word's `questionStarts`
  timestamp, auto-pauses at the next word's start), sentence shown with the word
  blanked, text input with Enter-to-submit, instant correct/incorrect feedback,
  auto-advancing "Next word" button (keyboard-focused so Enter keeps the flow
  going), and an end-of-part results screen: score + a tick/cross list of every
  word, **incorrect words shown in red text** (mirrors `MarkResult.tsx`'s visual
  language from the photo-marking feature).
- Deliberately NOT built (still deferred, add later only if wanted): the exact
  25-second countdown timer, and the hint panel (definition/etymology/part of
  speech/homophone reveal).
- No print sheets, no PDFs, no photo-marking ("Mark my answers") for this
  category — routing in `src/main.tsx` gates those routes to `interaction:
  'dictation'` levels only; Bee levels are `interaction: 'typed'`.
- `src/levels.ts` gained a `category` field (nav grouping) and `interaction`
  field (`'dictation' | 'typed'`) per level — see `src/components/Shell.tsx`
  (dropdown-per-category nav, rebuilt the same day for the same reason: too many
  levels for a flat link row).

## How the levels were added (existing pipeline, still applies for content)

1. Word CSVs (alphabetical) + sentences per word — done, see "Status" below.
2. Registered in `scripts/build-data.ts` with fresh seeds (never reuse):
   Bee Green = 234567 (pauseSec 7.5), Bee Orange = 345678 (pauseSec 7.5),
   Bee Red = 456789 (pauseSec 5.5). Both fields are **immutable once audio is
   rendered** — see CLAUDE.md.
3. TTS render via `scripts/tts-spelling.ts` (ElevenLabs) — still uses the
   existing "Number {n}. {WORD}. {sentence} {WORD}." format unchanged; **not yet
   run** — costs real ElevenLabs quota (~693 words across the three levels), so
   confirm with the user before rendering. Test one part first per CLAUDE.md's
   quota-awareness note.
4. `src/levels.ts` `ALL_LEVELS` registered (ids `bee-green-lc`, `bee-orange-lc`,
   `bee-red-lc`; yearLabel "Bee Green (Y3–4)" etc; category `'Spelling Bee'`;
   interaction `'typed'`) — done. Landing page CTAs + About page affiliation
   note — done.
5. Branding: About page now states the category is independently produced and
   not affiliated with/endorsed by the Prime Minister's Spelling Bee; landing
   page repeats a short version under the CTA row.

## The real Bee's 25s timer mechanic (reverse-engineered 2026-08-15)

Read directly out of `contest-widget-dist.js` (the actual widget bundle, fetched
and read in a real browser — see "verified 2026-08-15" note above; DevTools'
`Sources` panel is not accessible via automation, so this was done by fetching
the script text via page-context `fetch()` and grepping/slicing it) plus the
inline per-page `<script>` blocks. This is what `BeeQuiz.tsx`'s timer now mirrors:

- **Fixed 25.000s per word, never cumulative.** `time_to_complete_word_s = 25` /
  `time_to_complete_word_ms = 25000` are flat constants set once in the page's
  inline script — there is no growing/banked pool across the 30-word run.
- **The clock does not start until the word's audio finishes playing** — not on
  Listen click, not while it's playing. `set_page_element_timeouts(word,
  first_time)` schedules `enable_fields()` via `window.setTimeout(...,
  word['audio_file_length_ms'])` — i.e. a timeout equal to the clip's own
  duration. `enable_fields()` unlocks the input/submit/hint controls **and**
  calls `start_timer_countdown()`, which sets `timer_start = Date.now()` and
  begins the real countdown (a 1s UI-tick `setInterval` plus a hard
  `setTimeout` auto-submit at exactly 25s).
- **Replaying the audio does not restart or pause the timer once running.**
  On a second-or-later Listen click (`!first_time`), the scheduled timeout
  only re-enables the Listen button after the clip's length — it never calls
  `enable_fields()`/`start_timer_countdown()` again. The already-running clock
  (if any) just keeps ticking underneath the replay.
- **`pause_timer_countdown()` is real but unrelated to normal play** — its
  only call sites are inside a "slow device" performance-warning modal. There
  is no code path that pauses the clock for viewing a hint.
- **Submitting stops it outright, not "pauses" it.** `sb_end_timed_word_attempt()`
  (called first thing inside the submit handler, whether triggered by the
  student or by the 25s auto-submit itself) does
  `clearInterval(timer_interval); clearTimeout(auto_submit_timeout)`. The next
  word then loads and plays its own audio with the fields still locked and
  zero timer running, until that word's own `enable_fields()` fires. This is
  exactly the "pause between submitting and the next word's audio" the user
  noticed empirically before the source was read.

`BeeQuiz.tsx` implements this with its own state: `firstPlayDoneRef` (per-word,
gates whether the next audio-finish event may start the clock),
`timerStartRef`/`Date.now()`-based `setInterval` + `setTimeout` pair mirroring
`timer_interval`/`auto_submit_timeout`, and a full reset (`clearWordTimer()`)
on every word change so nothing carries over. Auto-submit-on-timeout submits
whatever's typed (even blank) as an attempt, same as the real Bee.

## Built 2026-08-15 (later in the same session)

- **25s countdown timer**, per the mechanic above. Timer pill shows `00:SS`,
  amber ≤10s, red ≤5s (mirrors the real widget's `hurry-up-orange`/
  `hurry-up-red` classes). Auto-submits at 0.
- **Show Hint** button — lighter-weight than the real Bee's hint panel: reveals
  only the word's existing `definition` field (which we already have for every
  word). Etymology / part-of-speech / homophone yes-no are **still deferred** —
  we don't have that data for any of the 693 words, and authoring it is a real
  content task, not a quick add. Showing/hiding the hint does not touch the
  timer (matches the real Bee — see above).
- **Sentence reveal gated on having listened once** (`heardOnce` state) — the
  blanked sentence stays hidden until the word's audio has played through at
  least once, same as the real Bee. Falls back to always-visible when a part
  has no audio yet (`!hasAudio`), so the level stays usable for content review
  before TTS is rendered.
- **Layout rearranged to match the real "Try the Bee" widget's structure**
  (still our own shadcn/ui `Card`/`Button`/`Progress`, not their markup/CSS):
  timer pill → "Word N of M" + progress bar (one row) → answer input → Listen
  + Show Hint (side-by-side row) → hint text → sentence → correct/incorrect
  feedback → full-width Check/Next button.
- **Signed-in progress persistence** — `netlify/functions/record-bee-attempt.mts`
  re-checks submitted answers server-side (never trusts a client-computed
  score) and writes into the *existing* `mark_attempts` table via the
  already-shared `recordAttempt()` helper, so `Progress.tsx` and the admin
  roster (`Admin.tsx`/`get-admin-roster.mts`) pick up Bee attempts automatically
  — no new UI needed. Triggered from `BeeQuiz.tsx`'s results screen via the
  lazy-loaded `BeeSaveStatus.tsx` (keeps `@clerk/clerk-react` out of the
  anonymous bundle, same pattern as `Shell.tsx`'s `AccountMenu`).
- **Anonymous usage analytics** — a deliberately separate, PII-free path:
  `netlify/functions/log-quiz-event.mts` writes to a **new** `quiz_events`
  table (`db/schema.sql` — no `user_id` column, ever) for *every* quiz
  completion regardless of sign-in state, so word-difficulty/usage patterns can
  be analysed across the mostly-anonymous audience. Fired unconditionally from
  `BeeQuiz.tsx` (no auth header at all — plain `fetch`, no Clerk import).
  Both endpoints share `computeQuizResults()` in `netlify/functions/_shared.mts`
  so the scoring logic isn't duplicated.
- Admin roster's "N scan(s)" label generalised to "N attempt(s)" in
  `Admin.tsx` since attempts are no longer only photo scans.
- **Fixed a numbering-convention violation caught on self-review**: the
  on-screen "Word N of M" counter initially showed a part-relative position
  ("Word 1 of 20" on every part) while the audio speaks the absolute corpus
  number ("Number 21" for part 2's first word) — violating CLAUDE.md's
  "Numbering convention" rule that every surface must agree. Fixed to show
  `current.index`/`partInfo.end` (absolute), matching `PartPlayer.tsx`'s
  convention. The results-list numbering was already correct (built from
  `current.index` from the start).

## Known gotchas from this session

- **ElevenLabs "API key ID used as API key" error**: the value that had been
  saved into `.env.local`'s `ELEVENLABS_API_KEY` was actually the **Key ID**
  (the identifier shown next to a key row in the ElevenLabs dashboard), not
  the real secret — which only starts with `sk_` and is only ever shown once,
  at creation/rotation time. The fix was simply re-copying the correct `sk_...`
  value. If this error recurs, check `ELEVENLABS_API_KEY` starts with `sk_`
  before assuming it's a code problem.
- **Audio playback can't be verified through claude-in-chrome browser
  automation** in this environment — even long-working, known-good audio
  (Y3's existing MP3s) gets stuck at `readyState: 0` / `networkState: 2`
  (loading, never resolving) when driven through the automated tab, while
  `curl` fetches the same file instantly and `ffprobe`/`silencedetect` confirm
  the file itself is correct. Treat this as a tooling limitation, not a bug —
  verify rendered audio via `ffprobe` (duration) + `silencedetect`
  (`questionStarts` word count) instead of trying to watch/hear it play in an
  automated tab. A human listening in a real, non-automated browser tab is
  still the right way to actually confirm audio *sounds* right.
- **`resize_window` doesn't reliably shrink the automated browser below
  roughly desktop width** in this environment (requests for e.g. 390×844
  rendered no narrower than ~1189px wide) — don't rely on it alone to verify
  mobile-breakpoint CSS; the "hidden sm:flex" / "sm:hidden" Tailwind pattern
  used in `Shell.tsx`'s nav is standard/well-tested, so it was shipped on code
  review rather than a confirmed narrow screenshot.

## Later (still deferred)

- Full hint panel content (etymology, part of speech, homophone yes/no) — the
  Show Hint button currently only shows the existing `definition` field.
- Porting the category to NaplanStylePhoenix (naplanstyle.com) if wanted.

## Status

- [x] Research competition + demo mechanics; extract demo word banks (this file)
- [x] Compile expanded Green/Orange/Red lists + sentences (215/250/228 words,
      frequency-band-matched to the official demo sample per level)
- [x] Register levels (seeds, pauseSec), build data
- [x] Build typed self-check player (`BeeQuiz.tsx`) + nav/routing/landing/about
- [x] Build 25s countdown timer (matches real Bee mechanic, see above) + Show
      Hint (definition-only) + layout rearranged to match the real widget
- [x] Signed-in progress persistence (`record-bee-attempt.mts` → existing
      `mark_attempts` table) + anonymous analytics (`log-quiz-event.mts` → new
      `quiz_events` table)
- [ ] **Apply the DB migration** — `db/schema.sql`'s new `quiz_events` table
      (and its index) has NOT been run against the live Neon database yet. Both
      write paths are best-effort/try-caught, so the site won't break without
      it — Bee attempts just silently won't persist until it's run. Run
      `psql "$DATABASE_URL" -f db/schema.sql` (or paste the new `quiz_events`
      block into the Neon SQL editor) once.
- [~] **TTS render audio** — `ELEVENLABS_API_KEY` was fixed (see "Known
      gotchas"). One test render done and verified: `bee-green-lc` part 1 (20
      words) — `ffprobe` confirms correct duration (286s), `silencedetect`
      found exactly 20 word-start timestamps evenly spaced. The other 32 parts
      across all three levels (~673 more words) are **not yet rendered** —
      costs real ElevenLabs quota, run `bun run scripts/tts-spelling.ts
      bee-green-lc && bun run scripts/tts-spelling.ts bee-orange-lc && bun run
      scripts/tts-spelling.ts bee-red-lc` (each without a part number renders
      every missing part for that level), then `bun run scripts/build-data.ts`
      to refresh durations/`questionStarts`.
- [ ] Deploy (Netlify) — code for everything above is committed/pushed to
      `main` as of this session, but the DB migration (above) still needs
      running, and most parts still show "Audio isn't ready" until the full
      TTS render runs.
