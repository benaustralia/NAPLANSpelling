import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FileDown, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Progress } from '@/components/ui/progress';
import { getLevel, type LevelId } from '@/levels';
import { formatDuration } from '@/lib/format';

// If the kid is more than this many seconds into the current word's audio,
// the prev button replays the current word instead of jumping back one
// (iPod / Spotify convention).
const REPLAY_THRESHOLD_SEC = 1.5;

function findCurrentIdx(starts: number[] | null | undefined, time: number) {
  if (!starts) return 0;
  for (let i = starts.length - 1; i >= 0; i--) if (time >= starts[i]) return i;
  return 0;
}

export function PartPlayer({ levelId, part }: { levelId: LevelId; part: number }) {
  const data = getLevel(levelId);
  const partInfo = data.parts.find((p) => p.part === part)!;
  const words = data.words.filter((w) => w.index >= partInfo.start && w.index <= partInfo.end);
  const prevPart = part > 1 ? part - 1 : null;
  const nextPart = part < data.parts.length ? part + 1 : null;
  const audioSrc = partInfo.duration != null ? `${partInfo.audio}?v=${partInfo.duration}` : partInfo.audio;
  const wordRange = `Words ${partInfo.start}–${partInfo.end}`;
  const durationLabel = partInfo.duration != null ? formatDuration(partInfo.duration) : null;

  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    if (!audio) return;
    const sync = () => {
      setTime(audio.currentTime);
      setPaused(audio.paused);
    };
    const events = ['timeupdate', 'seeked', 'play', 'pause', 'ended'];
    events.forEach((e) => audio.addEventListener(e, sync));
    sync();
    return () => events.forEach((e) => audio.removeEventListener(e, sync));
  }, [audio]);

  const questionStarts = partInfo.questionStarts;
  const totalQuestions = questionStarts?.length ?? words.length;
  const hasNav = questionStarts != null && questionStarts.length === words.length;

  const currentIdx = findCurrentIdx(questionStarts, time);
  const nextStart = hasNav && currentIdx < questionStarts.length - 1 ? questionStarts[currentIdx + 1] : null;
  const remainingInGap = nextStart != null ? nextStart - time : 0;
  const inGap = !paused && remainingInGap > 0 && remainingInGap < data.pauseSec;
  const gapProgress = inGap ? (remainingInGap / data.pauseSec) * 100 : 0;

  function togglePlay() {
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }

  function seekTo(t: number) {
    if (audio) audio.currentTime = Math.max(0, t);
  }

  function goPrev() {
    if (!hasNav || !audio) return;
    const elapsed = audio.currentTime - questionStarts[currentIdx];
    const target = elapsed > REPLAY_THRESHOLD_SEC || currentIdx === 0
      ? questionStarts[currentIdx]
      : questionStarts[currentIdx - 1];
    seekTo(target);
  }

  function goNext() {
    if (!hasNav || currentIdx >= questionStarts.length - 1) return;
    seekTo(questionStarts[currentIdx + 1]);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowLeft' && hasNav) { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight' && hasNav) { e.preventDefault(); goNext(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const playing = !paused;

  return (
    <Shell>
      <section className="mx-auto max-w-3xl px-5 pt-8 sm:pt-10 pb-6">
        <div className="flex items-center justify-between text-sm">
          <a href={`/${levelId}/`} className="text-muted-foreground hover:text-foreground">← All parts</a>
          <span className="font-semibold text-foreground">{data.title}</span>
        </div>
        <h1 className="mt-3 font-display text-5xl sm:text-6xl font-extrabold tracking-tight">Part {partInfo.part}</h1>
        <p className="mt-2 text-muted-foreground">
          {wordRange}
          {durationLabel && <>{' | '}<span className="tabular-nums">{durationLabel}</span></>}
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <Button variant="outline" size="icon-xl" onClick={goPrev} disabled={!hasNav} aria-label="Previous word">
                <SkipBack aria-hidden />
              </Button>
              <Button
                size="xl"
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
                className={`min-w-32 ${paused && time === 0 ? 'animate-pulse' : ''}`}
              >
                {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
                {playing ? 'Pause' : 'Play'}
              </Button>
              <Button variant="outline" size="icon-xl" onClick={goNext} disabled={!hasNav || currentIdx >= totalQuestions - 1} aria-label="Next word">
                <SkipForward aria-hidden />
              </Button>
            </div>

            <div className="mt-5 text-center" role="status" aria-live="polite">
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <p>
                  {hasNav ? (
                    <>Word{' '}
                      <span className="tabular-nums font-semibold text-foreground">{partInfo.start + currentIdx}</span>
                      {' '}of {partInfo.start + totalQuestions - 1}
                    </>
                  ) : <>{wordRange}</>}
                </p>
                <CircularProgress
                  value={gapProgress}
                  size={20}
                  strokeWidth={3}
                  aria-hidden
                  className={`transition-opacity duration-200 ${inGap ? 'opacity-100' : 'opacity-0'}`}
                />
              </div>
              {hasNav && <Progress className="mt-3 mx-auto max-w-md" value={((currentIdx + 1) / totalQuestions) * 100} aria-hidden />}
            </div>

            <audio ref={setAudio} preload="none" src={audioSrc}>
              Sorry, your browser can&rsquo;t play audio. <a href={audioSrc}>Download the MP3.</a>
            </audio>
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-3 items-center gap-3">
          <div className="justify-self-start">
            {prevPart && (
              <Button asChild variant="outline" size="sm">
                <a href={`/${levelId}/part/${prevPart}/`}><ChevronLeft aria-hidden /> Part {prevPart}</a>
              </Button>
            )}
          </div>
          <div className="justify-self-center">
            <Button asChild variant="secondary">
              <a href={`/pdfs/${levelId}/part-${String(partInfo.part).padStart(2, '0')}.pdf`} target="_blank" rel="noopener">
                <FileDown aria-hidden /> Worksheet
              </a>
            </Button>
          </div>
          <div className="justify-self-end">
            {nextPart && (
              <Button asChild variant="outline" size="sm">
                <a href={`/${levelId}/part/${nextPart}/`}>Part {nextPart} <ChevronRight aria-hidden /></a>
              </Button>
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}
