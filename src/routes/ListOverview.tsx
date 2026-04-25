import { ArrowRight } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/card';
import { getLevel, getYearLabel, type LevelId } from '@/levels';
import { formatDuration } from '@/lib/format';

export function ListOverview({ levelId }: { levelId: LevelId }) {
  const data = getLevel(levelId);
  const yearLabel = getYearLabel(levelId);

  return (
    <Shell>
      <section className="mx-auto max-w-5xl px-5 pt-8 sm:pt-12 pb-6">
        <p className="text-sm font-medium tracking-widest uppercase text-primary/80">
          {yearLabel}
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
          {data.title}
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Each test reads about 20 words with a {data.pauseSec}-second pause between each question — plenty of time to write the answer on paper. If your child gets stressed, just pause the audio and help them find what number they are up to.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.parts.map((p) => (
            <li key={p.part}>
              <Card asChild className="group gap-3 px-5 py-5 hover:shadow-md hover:border-primary/40 transition">
                <a href={`/${levelId}/part/${p.part}/`}>
                  <div className="flex items-baseline justify-between">
                    <div className="font-display text-3xl font-extrabold tracking-tight">
                      Part {p.part}
                    </div>
                    {p.duration != null && (
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {formatDuration(p.duration)}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Words {p.start}–{p.end}
                  </div>
                  <div className="flex items-center gap-1.5 text-primary font-medium text-sm">
                    Start
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </div>
                </a>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  );
}
