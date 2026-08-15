import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Check, Lightbulb, Play, RotateCcw, X } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getLevel, type LevelId } from '@/levels';
import { AUTH_ENABLED } from '@/lib/auth';

// Lazy for the same reason as Shell's AccountMenu: @clerk/clerk-react
// shouldn't ship to the majority-anonymous audience that never finishes a
// quiz signed in.
const BeeSaveStatus = lazy(() => import('@/components/BeeSaveStatus').then((m) => ({ default: m.BeeSaveStatus })));

type WordResult = { index: number; word: string; typed: string; correct: boolean };

// Matches the real Prime Minister's Spelling Bee's "Try the Bee" timing,
// reverse-engineered from contest-widget-dist.js: a flat 25s per word (never
// cumulative), which only starts once the word's audio finishes playing —
// not on Listen click, not while it's still playing. Replaying the audio or
// viewing a hint does not pause or reset it once started; submitting (by the
// student, or by this timeout firing) stops it outright. See PM-Bee-Plan.md.
const TIME_LIMIT_S = 25;

function normalize(s: string) {
  return s.trim().toLowerCase();
}

// The word appears verbatim in its sentence (build-time content is authored
// and verified that way) — blank it out so kids see the same "___ in a
// sentence" context the real Bee gives, without also giving the answer away.
function blankSentence(sentence: string, word: string) {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return sentence.replace(re, '____');
}

export function BeeQuiz({ levelId, part }: { levelId: LevelId; part: number }) {
  const data = getLevel(levelId);
  const partInfo = data.parts.find((p) => p.part === part)!;
  const words = data.words.filter((w) => w.index >= partInfo.start && w.index <= partInfo.end);
  const nextPart = part < data.parts.length ? part + 1 : null;
  const audioSrc = partInfo.duration != null ? `${partInfo.audio}?v=${partInfo.duration}` : partInfo.audio;

  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<WordResult[]>([]);
  const [remaining, setRemaining] = useState(TIME_LIMIT_S);
  const [timerRunning, setTimerRunning] = useState(false);
  const [heardOnce, setHeardOnce] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const firstPlayDoneRef = useRef(false);
  const timerStartRef = useRef<number | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const done = idx >= words.length;
  const current = !done ? words[idx] : null;

  const questionStarts = partInfo.questionStarts;
  const hasAudio = questionStarts != null && questionStarts.length === words.length;
  const startAt = hasAudio ? questionStarts[idx] : null;
  const endAt = hasAudio && idx < questionStarts.length - 1 ? questionStarts[idx + 1] : partInfo.duration;

  function playWord() {
    if (!audio || startAt == null) return;
    audio.currentTime = startAt;
    audio.play();
  }

  function clearWordTimer() {
    if (tickIntervalRef.current != null) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (autoSubmitTimeoutRef.current != null) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
  }

  function startWordTimer() {
    if (!hasAudio) return;
    timerStartRef.current = Date.now();
    setRemaining(TIME_LIMIT_S);
    setTimerRunning(true);
    tickIntervalRef.current = setInterval(() => {
      const elapsedS = (Date.now() - timerStartRef.current!) / 1000;
      setRemaining(Math.max(0, TIME_LIMIT_S - Math.floor(elapsedS)));
    }, 250);
    autoSubmitTimeoutRef.current = setTimeout(() => submit(true), TIME_LIMIT_S * 1000);
  }

  // New word — reset the per-word timer state. No accumulation across words:
  // every word gets its own fresh 25s, and none of it is "banked".
  useEffect(() => {
    clearWordTimer();
    firstPlayDoneRef.current = false;
    timerStartRef.current = null;
    setRemaining(TIME_LIMIT_S);
    setTimerRunning(false);
    setHeardOnce(false);
    setHintShown(false);
    return () => clearWordTimer();
  }, [idx]);

  useEffect(() => {
    if (!audio || endAt == null) return;
    function onTime() {
      if (audio!.currentTime >= endAt! - 0.05) {
        audio!.pause();
        // Only the word's FIRST completed playback starts the clock — a
        // replay (clicking Listen again) plays the audio again without
        // touching an already-running timer, matching the real Bee. The
        // sentence (word blanked) also only reveals once heard, same as
        // the real Bee — the audio speaks it, so this doesn't hide
        // anything the student hasn't already had access to.
        if (!firstPlayDoneRef.current) {
          firstPlayDoneRef.current = true;
          setHeardOnce(true);
          startWordTimer();
        }
      }
    }
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, [audio, endAt]);

  useEffect(() => {
    if (!done) inputRef.current?.focus();
  }, [idx, done]);

  // Anonymous, best-effort usage analytics — fires for every completed part
  // regardless of sign-in state. No auth header, no PII; see
  // netlify/functions/log-quiz-event.mts and db/schema.sql "quiz_events".
  const loggedRef = useRef(false);
  useEffect(() => {
    if (!done || loggedRef.current) return;
    loggedRef.current = true;
    fetch('/.netlify/functions/log-quiz-event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ levelId, part, answers: results.map((r) => ({ index: r.index, typed: r.typed })) }),
    }).catch(() => {});
  }, [done, results, levelId, part]);

  // auto=true is the 25s timeout firing — that submits whatever's typed (even
  // blank, which just counts as incorrect) rather than requiring an answer.
  function submit(auto = false) {
    if (checked || !current) return;
    if (!auto && value.trim() === '') return;
    clearWordTimer();
    setTimerRunning(false);
    const typed = value.trim();
    const correct = typed !== '' && normalize(typed) === normalize(current.word);
    setResults((r) => [...r, { index: current.index, word: current.word, typed, correct }]);
    setChecked(true);
    audio?.pause();
    requestAnimationFrame(() => nextRef.current?.focus());
  }

  function next() {
    setIdx((i) => i + 1);
    setValue('');
    setChecked(false);
    // Advancing is itself a click/Enter — a real user gesture — so autoplay
    // of the next word's audio is allowed here even though it's programmatic.
    requestAnimationFrame(() => playWord());
  }

  function restart() {
    setIdx(0);
    setResults([]);
    setValue('');
    setChecked(false);
  }

  if (done) {
    const score = results.filter((r) => r.correct).length;
    return (
      <Shell>
        <section className="mx-auto max-w-2xl px-5 pt-8 sm:pt-10 pb-16">
          <div className="flex items-center justify-between text-sm">
            <a href={`/${levelId}/`} className="text-muted-foreground hover:text-foreground">← All parts</a>
            <span className="font-semibold text-foreground">{data.title}</span>
          </div>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl font-extrabold tracking-tight">Results</h1>

          <Card className="mt-6">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="font-display text-5xl font-extrabold tracking-tight">
                {score}/{results.length}
              </p>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent>
              <ul className="divide-y divide-border/70">
                {results.map((r) => (
                  <li key={r.index} className="flex items-center gap-3 py-2.5">
                    {r.correct ? (
                      <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <X className="size-4 shrink-0 text-destructive" aria-hidden />
                    )}
                    <span className="w-7 shrink-0 tabular-nums text-sm text-muted-foreground">{r.index}.</span>
                    <p className={`font-medium ${r.correct ? 'text-foreground' : 'text-destructive'}`}>{r.word}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={restart}>
              <RotateCcw aria-hidden /> Try again
            </Button>
            {nextPart && (
              <Button asChild>
                <a href={`/${levelId}/part/${nextPart}/`}>Next part</a>
              </Button>
            )}
          </div>

          {AUTH_ENABLED && (
            <div className="mt-6">
              <Suspense fallback={null}>
                <BeeSaveStatus
                  levelId={levelId}
                  part={part}
                  answers={results.map((r) => ({ index: r.index, typed: r.typed }))}
                />
              </Suspense>
            </div>
          )}
        </section>
        <audio ref={setAudio} preload="none" src={audioSrc} />
      </Shell>
    );
  }

  const sentenceVisible = heardOnce || !hasAudio;

  return (
    <Shell>
      <section className="mx-auto max-w-2xl px-5 pt-8 sm:pt-10 pb-16">
        <div className="flex items-center justify-between text-sm">
          <a href={`/${levelId}/`} className="text-muted-foreground hover:text-foreground">← All parts</a>
          <span className="font-semibold text-foreground">{data.title}</span>
        </div>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl font-extrabold tracking-tight">Part {partInfo.part}</h1>

        {/* Layout below mirrors the real Prime Minister's Spelling Bee "Try
            the Bee" widget: timer → word progress → answer field → Listen /
            Hint row → sentence → submit — built from our own shadcn/ui
            components (Card, Button, Progress), not their markup. */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            {timerRunning && (
              <div className="flex justify-center mb-4">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold tabular-nums text-white transition-colors ${
                    remaining <= 5 ? 'bg-destructive' : remaining <= 10 ? 'bg-amber-500' : 'bg-foreground/70'
                  }`}
                  role="timer"
                  aria-live="off"
                >
                  00:{String(remaining).padStart(2, '0')}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <span className="shrink-0 text-sm font-semibold text-foreground">
                {/* Absolute corpus numbering, matching the audio's "Number N."
                    and every other level's convention — see CLAUDE.md
                    "Numbering convention". Not part-relative. */}
                Word {current ? current.index : partInfo.end} of {partInfo.end}
              </span>
              <Progress className="flex-1" value={(idx / words.length) * 100} aria-hidden />
            </div>

            <div className="mt-4">
              <input
                ref={inputRef}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={checked}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
                placeholder="Type the word…"
                className="w-full rounded-md border border-input bg-background px-4 py-3 text-center text-xl uppercase tracking-wide outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-70"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button onClick={playWord} disabled={!hasAudio}>
                <Play aria-hidden /> Listen
              </Button>
              <Button variant="outline" onClick={() => setHintShown((v) => !v)} disabled={!current}>
                <Lightbulb aria-hidden /> {hintShown ? 'Hide Hint' : 'Show Hint'}
              </Button>
            </div>
            {!hasAudio && (
              <p className="mt-3 text-center text-xs text-muted-foreground">Audio isn&rsquo;t ready for this part yet.</p>
            )}

            {hintShown && current && (
              <p className="mt-4 text-center text-sm text-muted-foreground">{current.definition}</p>
            )}

            {current && sentenceVisible && (
              <p className="mt-4 text-center text-lg text-foreground">
                {blankSentence(current.sentence, current.word)}
              </p>
            )}

            {checked && current && (
              <div className="mt-4 flex items-center justify-center gap-2 text-lg font-semibold" role="status" aria-live="polite">
                {normalize(value) === normalize(current.word) ? (
                  <span className="flex items-center gap-2 text-emerald-600">
                    <Check className="size-5" aria-hidden /> Correct!
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-destructive">
                    <X className="size-5" aria-hidden /> {current.word}
                  </span>
                )}
              </div>
            )}

            <div className="mt-6">
              {!checked ? (
                <Button className="w-full" size="lg" onClick={() => submit()} disabled={value.trim() === ''}>
                  Check
                </Button>
              ) : (
                <Button ref={nextRef} className="w-full" size="lg" onClick={next}>
                  {idx + 1 >= words.length ? 'See results' : 'Next word'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
      <audio ref={setAudio} preload="none" src={audioSrc} />
    </Shell>
  );
}
