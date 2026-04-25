import type { ReactNode } from 'react';
import { ALL_LEVELS } from '@/levels';
import { Button } from '@/components/ui/button';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header>
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center justify-between">
          <a
            href="/"
            className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-foreground"
          >
            NAPLAN <span className="text-primary">Spelling</span>
          </a>
          <nav className="flex items-center gap-1">
            {ALL_LEVELS.map((l) => (
              <Button key={l.id} asChild variant="ghost" size="sm">
                <a href={`/${l.id}/`}>{l.yearLabel}</a>
              </Button>
            ))}
            <Button asChild variant="ghost" size="sm">
              <a href="/about/">About</a>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer>
        <div className="mx-auto max-w-5xl px-5 py-6 text-xs text-muted-foreground">
          Source papers © ACARA — <a href="/about/" className="underline hover:text-foreground">licence</a>.
        </div>
      </footer>
    </div>
  );
}
