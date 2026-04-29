import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Landing } from '@/routes/Landing';
import { ALL_LEVELS } from '@/levels';
import './index.css';

const ListOverview = lazy(() => import('@/routes/ListOverview').then((m) => ({ default: m.ListOverview })));
const PartPlayer = lazy(() => import('@/routes/PartPlayer').then((m) => ({ default: m.PartPlayer })));
const PartPrintable = lazy(() => import('@/routes/PartPrintable').then((m) => ({ default: m.PartPrintable })));
const About = lazy(() => import('@/routes/About').then((m) => ({ default: m.About })));
const NotFound = lazy(() => import('@/routes/NotFound').then((m) => ({ default: m.NotFound })));

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/' || path === '') return <Landing />;
  if (path === '/about') return <About />;

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
  }

  return <NotFound />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
);
