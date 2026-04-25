import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Landing } from '@/routes/Landing';
import { ListOverview } from '@/routes/ListOverview';
import { PartPlayer } from '@/routes/PartPlayer';
import { About } from '@/routes/About';
import { NotFound } from '@/routes/NotFound';
import { ALL_LEVELS } from '@/levels';
import './index.css';

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/' || path === '') return <Landing />;
  if (path === '/about') return <About />;

  for (const { id, data } of ALL_LEVELS) {
    if (path === `/${id}`) return <ListOverview levelId={id} />;
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
    <App />
  </StrictMode>,
);
