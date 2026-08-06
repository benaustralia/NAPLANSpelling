import { Check, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export type WordResult = { index: number; word: string; transcribed: string | null; correct: boolean };
export type MarkResponse = { total: number; score: number; results: WordResult[] };

export function MarkResultView({ result, onRetake }: { result: MarkResponse; onRetake: () => void }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">Score</p>
          <p className="font-display text-5xl font-extrabold tracking-tight">
            {result.score}/{result.total}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <ul className="divide-y divide-border/70">
            {result.results.map((r) => (
              <li key={r.index} className="flex items-center gap-3 py-2.5">
                {r.correct ? (
                  <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <X className="size-4 shrink-0 text-destructive" aria-hidden />
                )}
                <span className="w-7 shrink-0 tabular-nums text-sm text-muted-foreground">{r.index}.</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{r.word}</p>
                  {!r.correct && (
                    <p className="text-sm text-muted-foreground">
                      You wrote: {r.transcribed ?? <span className="italic">blank</span>}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Button variant="outline" className="w-full" onClick={onRetake}>
        <RotateCcw aria-hidden /> Mark another photo
      </Button>
    </div>
  );
}
