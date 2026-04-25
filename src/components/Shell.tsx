import type { ReactNode } from 'react';
import { ALL_LEVELS } from '@/levels';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="no-print">
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center justify-between">
          <a
            href="/"
            className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-foreground"
          >
            NAPLAN <span className="text-primary">Spelling</span>
          </a>
          <nav className="flex items-center gap-1 text-sm">
            {ALL_LEVELS.map((l) => (
              <a
                key={l.id}
                href={`/${l.id}/`}
                className="px-3 py-1.5 rounded-md hover:bg-secondary text-foreground/80 hover:text-foreground transition"
              >
                {l.yearLabel}
              </a>
            ))}
            <a
              href="/about/"
              className="px-3 py-1.5 rounded-md hover:bg-secondary text-foreground/80 hover:text-foreground transition"
            >
              About
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="no-print">
        <div className="mx-auto max-w-5xl px-5 py-6 text-xs text-muted-foreground">
          Source papers © ACARA — <a href="/about/" className="underline hover:text-foreground">licence</a>.
        </div>
      </footer>
    </div>
  );
}
