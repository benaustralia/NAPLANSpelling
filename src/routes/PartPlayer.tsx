import { useRef, useState } from 'react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { getLevel, getYearLabel, type Level, type LevelId } from '@/levels';
import { formatDuration } from '@/lib/format';
import { SITE_URL } from '@/lib/site';

type PartInfo = Level['parts'][number];
type Word = Level['words'][number];

export function PartPlayer({ levelId, part }: { levelId: LevelId; part: number }) {
  const data = getLevel(levelId);
  const partInfo = data.parts.find((p) => p.part === part)!;
  const words = data.words.filter((w) => w.index >= partInfo.start && w.index <= partInfo.end);
  const prevPart = part > 1 ? part - 1 : null;
  const nextPart = part < data.parts.length ? part + 1 : null;
  const yearLabel = getYearLabel(levelId);
  const audioSrc = partInfo.duration != null ? `${partInfo.audio}?v=${partInfo.duration}` : partInfo.audio;
  const partUrl = `${SITE_URL}/${levelId}/part/${partInfo.part}/`;
  const wordRange = `Words ${partInfo.start}–${partInfo.end}`;
  const durationLabel = partInfo.duration != null ? formatDuration(partInfo.duration) : null;

  const audioRef = useRef<HTMLAudioElement>(null);
  const [reveal, setReveal] = useState(false);

  return (
    <Shell>
      <section className="mx-auto max-w-3xl px-5 pt-8 sm:pt-10 pb-6">
        <div className="flex items-center justify-between text-sm no-print">
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

      <section className="mx-auto max-w-3xl px-5 pb-8 no-print">
        <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-2xl font-bold">Listen</h2>
              <p className="text-sm text-muted-foreground">
                Write each answer on your answer sheet, numbered {partInfo.start} to {partInfo.end}.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => {
                const a = audioRef.current;
                if (!a) return;
                if (a.paused) a.play();
                else a.pause();
              }}
              className="min-w-32"
            >
              Play / Pause
            </Button>
          </div>
          <audio
            ref={audioRef}
            controls
            preload="none"
            src={audioSrc}
            className="mt-5 w-full"
          >
            Sorry, your browser can&rsquo;t play audio. <a href={audioSrc}>Download the MP3.</a>
          </audio>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant={reveal ? 'secondary' : 'default'}
            onClick={() => setReveal((v) => !v)}
          >
            {reveal ? 'Hide answers' : 'Reveal answers'}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print answer sheet
          </Button>
          <span className="text-xs text-muted-foreground">
            Tip: in the print dialog, turn off &ldquo;Headers and footers&rdquo; for the cleanest page.
          </span>
          <div className="ml-auto flex items-center gap-2 text-sm">
            {prevPart && (
              <a
                href={`/${levelId}/part/${prevPart}/`}
                className="px-3 py-1.5 rounded-md border hover:bg-secondary"
              >
                ← Part {prevPart}
              </a>
            )}
            {nextPart && (
              <a
                href={`/${levelId}/part/${nextPart}/`}
                className="px-3 py-1.5 rounded-md border hover:bg-secondary"
              >
                Part {nextPart} →
              </a>
            )}
          </div>
        </div>
      </section>

      {reveal && (
        <section className="mx-auto max-w-3xl px-5 pb-12 no-print">
          <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
            <h2 className="font-display text-2xl font-bold">Answers</h2>
            <p className="text-sm text-muted-foreground">
              Tick the ones you got right on your paper answer sheet. Sentences are shown for context.
            </p>
            <ol className="mt-4 sm:columns-2 sm:gap-x-6">
              {words.map((w) => (
                <li key={w.index} className="flex gap-3 text-sm py-1.5 break-inside-avoid">
                  <span className="w-8 shrink-0 tabular-nums text-muted-foreground">
                    {w.index}.
                  </span>
                  <div>
                    <div className="font-semibold text-foreground">{w.word}</div>
                    {w.sentence && (
                      <div className="text-muted-foreground">{w.sentence}</div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <PrintSheet
        words={words}
        partInfo={partInfo}
        title={`${yearLabel} — Part ${partInfo.part}`}
        wordRange={wordRange}
        durationLabel={durationLabel}
        url={partUrl}
        qrSrc={`/codes/${levelId}/part-${String(partInfo.part).padStart(2, '0')}.svg`}
      />
    </Shell>
  );
}

function PrintHeader({
  title,
  wordRange,
  durationLabel,
  url,
  qrSrc,
}: {
  title: string;
  wordRange: string;
  durationLabel: string | null;
  url: string;
  qrSrc: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-3xl font-extrabold">{title}</h1>
        <p className="text-xs text-gray-600 mt-1">
          {wordRange}
          {durationLabel && <> | <span className="tabular-nums">{durationLabel}</span></>}
        </p>
        <p className="text-sm font-semibold mt-2 break-all">
          Audio: <span className="font-mono">{url}</span>
        </p>
      </div>
      <div className="shrink-0 text-center">
        <img src={qrSrc} alt="" className="w-24 h-24" />
        <p className="font-mono text-[8px] text-gray-600 mt-1 break-all max-w-24">{url}</p>
      </div>
    </div>
  );
}

function PrintSheet({
  words,
  partInfo,
  title,
  wordRange,
  durationLabel,
  url,
  qrSrc,
}: {
  words: Word[];
  partInfo: PartInfo;
  title: string;
  wordRange: string;
  durationLabel: string | null;
  url: string;
  qrSrc: string;
}) {
  const gridStyle = {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridAutoFlow: 'column' as const,
    gridTemplateRows: `repeat(${Math.ceil(words.length / 2)}, minmax(0, auto))`,
  };
  return (
    <div className="print-only text-black">
      <section style={{ pageBreakAfter: 'always' }}>
        <PrintHeader title={title} wordRange={wordRange} durationLabel={durationLabel} url={url} qrSrc={qrSrc} />
        <p className="text-xs text-gray-600 mt-4">
          Name: ______________________________ Date: __________
        </p>
        <ol className="mt-4 grid gap-x-8 gap-y-1" style={gridStyle}>
          {words.map((_, i) => (
            <li key={i} className="flex items-baseline gap-2 py-1">
              <span className="w-7 text-right tabular-nums text-gray-600 text-sm">{partInfo.start + i}.</span>
              <span className="flex-1 border-b border-gray-400 h-5" />
            </li>
          ))}
        </ol>
      </section>

      <section>
        <PrintHeader title={`${title} — Answer Sheet`} wordRange={wordRange} durationLabel={durationLabel} url={url} qrSrc={qrSrc} />
        <ol className="mt-4 grid gap-x-8 gap-y-2 text-xs leading-snug" style={gridStyle}>
          {words.map((w) => (
            <li key={w.index} className="break-inside-avoid">
              <span className="tabular-nums text-gray-600 mr-1">{w.index}.</span>
              <span className="font-semibold">{w.word}</span>
              {w.sentence && <div className="text-gray-600 ml-6">{w.sentence}</div>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
