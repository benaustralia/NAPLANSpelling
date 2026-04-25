import { getLevel, getYearLabel, type LevelId } from '@/levels';
import { SITE_URL } from '@/lib/site';

/**
 * Standalone print-only page rendered at /<id>/part/<N>/print/.
 *
 * No Shell, no @media print gymnastics — just the answer sheet (page 1)
 * and answer key (page 2) at black-on-white print styling, separated by
 * `page-break-after: always`. This route is what `scripts/build-pdfs.ts`
 * drives Chrome headless against to generate the static PDFs in
 * `public/pdfs/<id>/part-NN.pdf`. Humans can also navigate here directly
 * to preview the printable in-browser before downloading the PDF.
 */
export function PartPrintable({ levelId, part }: { levelId: LevelId; part: number }) {
  const data = getLevel(levelId);
  const partInfo = data.parts.find((p) => p.part === part)!;
  const words = data.words.filter((w) => w.index >= partInfo.start && w.index <= partInfo.end);
  const yearLabel = getYearLabel(levelId);
  const partUrl = `${SITE_URL}/${levelId}/part/${partInfo.part}/`;
  const qrSrc = `/codes/${levelId}/part-${String(partInfo.part).padStart(2, '0')}.svg`;
  const title = `${yearLabel} — Part ${partInfo.part} — Answer sheet`;

  const gridStyle = {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridAutoFlow: 'column' as const,
    gridTemplateRows: `repeat(${Math.ceil(words.length / 2)}, minmax(0, auto))`,
  };

  return (
    <div className="text-black bg-white font-serif">
      <style>{`
        @page { margin: 16mm; }
        html, body { background: white !important; }
      `}</style>
      <section style={{ pageBreakAfter: 'always' }}>
        <Header title={title} url={partUrl} qrSrc={qrSrc} />
        <p className="text-sm text-gray-600 mt-6">
          Name: ______________________________ Date: __________
        </p>
        <ol className="mt-12 grid gap-x-8 gap-y-3" style={gridStyle}>
          {words.map((_, i) => (
            <li key={i} className="flex items-baseline gap-2 py-1">
              <span className="w-8 text-right tabular-nums text-gray-600 text-base">{partInfo.start + i}.</span>
              <span className="flex-1 border-b border-gray-400 h-9" />
            </li>
          ))}
        </ol>
      </section>

      <section>
        <Header title="Answer key" url={partUrl} />
        <ol className="mt-4 grid gap-x-8 gap-y-3 text-sm leading-snug" style={gridStyle}>
          {words.map((w) => (
            <li key={w.index} className="break-inside-avoid">
              <span className="tabular-nums text-gray-600 mr-1">{w.index}.</span>
              <span className="font-semibold text-base">{w.word}</span>
              {w.sentence && <div className="text-gray-600 ml-6">{w.sentence}</div>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Header({
  title,
  url,
  qrSrc,
}: {
  title: string;
  url: string;
  qrSrc?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-3xl font-extrabold">{title}</h1>
      </div>
      {qrSrc && (
        <div className="shrink-0 text-center">
          <img src={qrSrc} alt="" className="w-24 h-24" />
          <a
            href={url}
            className="block font-mono text-[8px] text-gray-600 mt-1 break-all max-w-24 hover:underline"
          >
            {url}
          </a>
        </div>
      )}
    </div>
  );
}

