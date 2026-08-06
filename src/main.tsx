import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Landing } from '@/routes/Landing';
import { ALL_LEVELS } from '@/levels';
import { AUTH_ENABLED, CLERK_PUBLISHABLE_KEY } from '@/lib/auth';
import './index.css';

const ListOverview = lazy(() => import('@/routes/ListOverview').then((m) => ({ default: m.ListOverview })));
const PartPlayer = lazy(() => import('@/routes/PartPlayer').then((m) => ({ default: m.PartPlayer })));
const PartPrintable = lazy(() => import('@/routes/PartPrintable').then((m) => ({ default: m.PartPrintable })));
const About = lazy(() => import('@/routes/About').then((m) => ({ default: m.About })));
const Progress = lazy(() => import('@/routes/Progress').then((m) => ({ default: m.Progress })));
const Join = lazy(() => import('@/routes/Join').then((m) => ({ default: m.Join })));
const Mark = lazy(() => import('@/routes/Mark').then((m) => ({ default: m.Mark })));
const NotFound = lazy(() => import('@/routes/NotFound').then((m) => ({ default: m.NotFound })));

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/' || path === '') return <Landing />;
  if (path === '/about') return <About />;
  if (path === '/progress') return <Progress />;
  if (path === '/join') return <Join />;

  for (const { id, data } of ALL_LEVELS) {
    if (path === `/${id}`) return <ListOverview levelId={id} />;
    const printMatch = path.match(new RegExp(`^/${id}/part/(\\d+)/print$`));
    if (printMatch) {
      const n = Number(printMatch[1]);
      if (Number.isInteger(n) && n >= 1 && n <= data.parts.length) {
        return <PartPrintable levelId={id} part={n} />;
      }
    }
    const m = path.match(new RegExp(`^/${id}/part/(\\d+)$`));
    if (m) {
      const n = Number(m[1]);
      if (Number.isInteger(n) && n >= 1 && n <= data.parts.length) {
        return <PartPlayer levelId={id} part={n} />;
      }
    }
    const markMatch = path.match(new RegExp(`^/mark/${id}/part/(\\d+)$`));
    if (markMatch) {
      const n = Number(markMatch[1]);
      if (Number.isInteger(n) && n >= 1 && n <= data.parts.length) {
        return <Mark levelId={id} part={n} />;
      }
    }
  }

  return <NotFound />;
}

const routedApp = (
  <Suspense fallback={null}>
    <App />
  </Suspense>
);

const root = createRoot(document.getElementById('root')!);

// Dynamic import: @clerk/clerk-react shouldn't ship in the entry chunk for the
// majority-anonymous audience, and isn't needed at all until Clerk is configured.
if (AUTH_ENABLED) {
  import('@clerk/clerk-react').then(({ ClerkProvider }) => {
    root.render(
      <StrictMode>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY!}>{routedApp}</ClerkProvider>
      </StrictMode>,
    );
  });
} else {
  root.render(<StrictMode>{routedApp}</StrictMode>);
}
