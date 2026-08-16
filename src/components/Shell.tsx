import { lazy, Suspense, type ReactNode } from 'react';
import { Menu, ChevronDown } from 'lucide-react';
import { ALL_LEVELS, type LevelCategory } from '@/levels';
import { AUTH_ENABLED } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from '@/components/ui/sheet';

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

// Groups levels by category, preserving each category's first-appearance order
// in ALL_LEVELS — a new category added there just works.
function groupByCategory() {
  const order: LevelCategory[] = [];
  const groups = new Map<LevelCategory, typeof ALL_LEVELS extends ReadonlyArray<infer T> ? T[] : never>();
  for (const level of ALL_LEVELS) {
    if (!groups.has(level.category)) {
      groups.set(level.category, []);
      order.push(level.category);
    }
    groups.get(level.category)!.push(level);
  }
  return order.map((category) => ({ category, levels: groups.get(category)! }));
}

export function Shell({ children }: { children: ReactNode }) {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const categories = groupByCategory();

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border/70">
        <div className="mx-auto max-w-5xl px-5 py-5 sm:py-6 flex items-center justify-between gap-3">
          <a
            href="/"
            className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground shrink-0"
          >
            NAPLAN Style <span className="text-primary">Spelling</span>
          </a>

          {/* Desktop nav: one dropdown per level category, fixed width regardless
              of how many levels a category holds. */}
          <nav className="hidden sm:flex items-center gap-4">
            {categories.map(({ category, levels }) => {
              const categoryActive = levels.some((l) => path.startsWith(`/${l.id}`));
              return (
                <DropdownMenu key={category}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={
                        'flex items-center gap-1 text-sm font-medium transition-colors outline-none ' +
                        (categoryActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')
                      }
                    >
                      {category}
                      <ChevronDown className="size-3.5" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {levels.map((l) => (
                      <DropdownMenuItem key={l.id} active={path.startsWith(`/${l.id}`)} asChild>
                        <a href={`/${l.id}/`}>{l.yearLabel}</a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
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

          {/* Mobile nav: hamburger opens a drawer with every category expanded. */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle>Menu</SheetTitle>
              <nav className="flex flex-col gap-5 overflow-y-auto">
                {categories.map(({ category, levels }) => (
                  <div key={category} className="flex flex-col gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {category}
                    </div>
                    <div className="flex flex-col gap-3 pl-1">
                      {levels.map((l) => (
                        <NavLink key={l.id} href={`/${l.id}/`} active={path.startsWith(`/${l.id}`)}>
                          {l.yearLabel}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="border-t border-border/70 pt-4 flex flex-col gap-3">
                  <NavLink href="/about/" active={path === '/about'}>
                    About
                  </NavLink>
                  {AUTH_ENABLED && (
                    <Suspense fallback={null}>
                      <AccountMenu path={path} />
                    </Suspense>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
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
