import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileDown, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getLevel, type LevelId } from '@/levels';
import { formatDuration } from '@/lib/format';

// If the kid is more than this many seconds into the current word's audio,
// the prev button replays the current word instead of jumping back one.
// iPod / Spotify convention.
const REPLAY_THRESHOLD_SEC = 1.5;

export function PartPlayer({ levelId, part }: { levelId: LevelId; part: number }) {
  const data = getLevel(levelId);
  const partInfo = data.parts.find((p) => p.part === part)!;
  const words = data.words.filter((w) => w.index >= partInfo.start && w.index <= partInfo.end);
  const prevPart = part > 1 ? part - 1 : null;
  const nextPart = part < data.parts.length ? part + 1 : null;
  const audioSrc = partInfo.duration != null ? `${partInfo.audio}?v=${partInfo.duration}` : partInfo.audio;
  const wordRange = `Words ${partInfo.start}–${partInfo.end}`;
  const durationLabel = partInfo.duration != null ? formatDuration(partInfo.duration) : null;

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  const questionStarts = partInfo.questionStarts;
  const totalQuestions = questionStarts?.length ?? words.length;
  const hasNav = questionStarts != null && questionStarts.length === words.length;

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  }

  function seekTo(t: number) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, t);
  }

  function goPrev() {
    if (!hasNav) return;
    const a = audioRef.current;
    if (!a) return;
    const idx = currentIdx;
    const elapsedInQuestion = a.currentTime - questionStarts[idx];
    if (elapsedInQuestion > REPLAY_THRESHOLD_SEC || idx === 0) {
      seekTo(questionStarts[idx]);
    } else {
      seekTo(questionStarts[idx - 1]);
    }
  }

  function goNext() {
    if (!hasNav) return;
    if (currentIdx >= questionStarts.length - 1) return;
    seekTo(questionStarts[currentIdx + 1]);
  }

  // Keep currentIdx in sync with audio time.
  useEffect(() => {
    if (!hasNav) return;
    const a = audioRef.current;
    if (!a) return;
    function update() {
      if (!a) return;
      const t = a.currentTime;
      let idx = 0;
      for (let i = questionStarts!.length - 1; i >= 0; i--) {
        if (t >= questionStarts![i]) { idx = i; break; }
      }
      setCurrentIdx(idx);
    }
    function onPlay() { setPlaying(true); }
    function onPause() { setPlaying(false); }
    a.addEventListener('timeupdate', update);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onPause);
    return () => {
      a.removeEventListener('timeupdate', update);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onPause);
    };
  }, [hasNav, questionStarts]);

  // Keyboard shortcuts: Space = play/pause, ←/→ = prev/next word.
  // Skipped when focus is in a button (so Space still activates the focused
  // button via its own handler) or any input/textarea.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowLeft' && hasNav) { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight' && hasNav) { e.preventDefault(); goNext(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Shell>
      <section className="mx-auto max-w-3xl px-5 pt-8 sm:pt-10 pb-6">
        <div className="flex items-center justify-between text-sm">
          <a href={`/${levelId}/`} className="text-muted-foreground hover:text-foreground">
            ← All parts
          </a>
          <span className="text-muted-foreground">{data.title}</span>
        </div>

        <h1 className="mt-3 font-display text-5xl sm:text-6xl font-extrabold tracking-tight">
          Part {partInfo.part}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {wordRange}
          {durationLabel && (
            <>
              {' | '}
              <span className="tabular-nums">{durationLabel}</span>
            </>
          )}
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl font-bold">Listen</CardTitle>
            <CardDescription>
              Write each answer on your answer sheet, numbered {partInfo.start} to {partInfo.end}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <Button
                variant="outline"
                size="icon-xl"
                onClick={goPrev}
                disabled={!hasNav}
                aria-label="Previous word"
              >
                <SkipBack aria-hidden />
              </Button>
              <Button
                size="xl"
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
                className="min-w-32"
              >
                {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
                {playing ? 'Pause' : 'Play'}
              </Button>
              <Button
                variant="outline"
                size="icon-xl"
                onClick={goNext}
                disabled={!hasNav || currentIdx >= totalQuestions - 1}
                aria-label="Next word"
              >
                <SkipForward aria-hidden />
              </Button>
            </div>

            <div className="mt-5 text-center" role="status" aria-live="polite">
              <p className="text-sm text-muted-foreground">
                {hasNav ? (
                  <>
                    Word{' '}
                    <span className="tabular-nums font-semibold text-foreground">
                      {partInfo.start + currentIdx}
                    </span>{' '}
                    of {partInfo.start + totalQuestions - 1}
                  </>
                ) : (
                  <>{wordRange}</>
                )}
              </p>
              {hasNav && (
                <Progress
                  className="mt-3 mx-auto max-w-md"
                  value={((currentIdx + 1) / totalQuestions) * 100}
                  aria-hidden
                />
              )}
            </div>

            <audio ref={audioRef} preload="none" src={audioSrc}>
              Sorry, your browser can&rsquo;t play audio. <a href={audioSrc}>Download the MP3.</a>
            </audio>
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-3 items-center gap-3">
          <div className="justify-self-start">
            {prevPart && (
              <Button asChild variant="outline" size="sm">
                <a href={`/${levelId}/part/${prevPart}/`}>
                  <ChevronLeft aria-hidden /> Part {prevPart}
                </a>
              </Button>
            )}
          </div>
          <div className="justify-self-center">
            <Button asChild variant="secondary">
              <a
                href={`/pdfs/${levelId}/part-${String(partInfo.part).padStart(2, '0')}.pdf`}
                target="_blank"
                rel="noopener"
              >
                <FileDown aria-hidden /> Worksheet
              </a>
            </Button>
          </div>
          <div className="justify-self-end">
            {nextPart && (
              <Button asChild variant="outline" size="sm">
                <a href={`/${levelId}/part/${nextPart}/`}>
                  Part {nextPart} <ChevronRight aria-hidden />
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

    </Shell>
  );
}
