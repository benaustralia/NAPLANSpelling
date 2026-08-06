import { lazy, Suspense, type ReactNode } from 'react';
import { ALL_LEVELS } from '@/levels';
import { AUTH_ENABLED } from '@/lib/auth';

// Lazy: @clerk/clerk-react is a meaningful chunk of JS that the majority-anonymous
// audience (no login required to practice) shouldn't pay for on every page load.
const AccountMenu = lazy(() => import('@/components/AccountMenu').then((m) => ({ default: m.AccountMenu })));

export function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <a
      href={href}
      className={
        'text-sm font-medium transition-colors whitespace-nowrap ' +
        (active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')
      }
    >
      {children}
    </a>
  );
}

function NavDivider() {
  return <div className="h-4 w-px bg-border shrink-0" aria-hidden />;
}

export function Shell({ children }: { children: ReactNode }) {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const naplanLevels = ALL_LEVELS.slice(0, 4);
  const bonusLevels = ALL_LEVELS.slice(4);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border/70">
        <div className="mx-auto max-w-5xl px-5 py-5 sm:py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/"
            className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground shrink-0"
          >
            NAPLAN <span className="text-primary">Spelling</span>
          </a>
          <nav className="flex items-center gap-4 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 sm:overflow-visible">
            <div className="flex items-center gap-4 shrink-0">
              {naplanLevels.map((l) => (
                <NavLink key={l.id} href={`/${l.id}/`} active={path.startsWith(`/${l.id}`)}>
                  {l.yearLabel}
                </NavLink>
              ))}
            </div>
            <NavDivider />
            <div className="flex items-center gap-4 shrink-0">
              {bonusLevels.map((l) => (
                <NavLink key={l.id} href={`/${l.id}/`} active={path.startsWith(`/${l.id}`)}>
                  {l.yearLabel}
                </NavLink>
              ))}
            </div>
            <NavDivider />
            <NavLink href="/about/" active={path === '/about'}>
              About
            </NavLink>
            {AUTH_ENABLED && (
              <>
                <NavDivider />
                <Suspense fallback={null}>
                  <AccountMenu path={path} />
                </Suspense>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/70">
        <div className="mx-auto max-w-5xl px-5 py-6 text-xs text-muted-foreground">
          Source papers © ACARA — <a href="/about/" className="underline hover:text-foreground">licence</a>.
        </div>
      </footer>
    </div>
  );
}
