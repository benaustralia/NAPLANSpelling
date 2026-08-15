import { useEffect, useState } from 'react';
import { SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/clerk-react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AUTH_ENABLED } from '@/lib/auth';
import { getYearLabel, type LevelId } from '@/levels';

type WordResult = { index: number; word: string; transcribed: string | null; correct: boolean };
type RosterAttempt = {
  levelId: LevelId;
  part: number;
  score: number;
  total: number;
  results: WordResult[] | null;
  createdAt: string;
};
type RosterEntry = {
  userId: string;
  name: string;
  email: string | null;
  invitedAt: string;
  lastActiveAt: string | null;
  attempts: RosterAttempt[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function StudentCard({ student }: { student: RosterEntry }) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-medium text-foreground">{student.name}</p>
          <p className="text-sm text-muted-foreground">
            {student.attempts.length} attempt{student.attempts.length === 1 ? '' : 's'}
          </p>
        </div>
        {student.email && <p className="text-sm text-muted-foreground">{student.email}</p>}
        <p className="mt-1 text-xs text-muted-foreground">
          Invited {formatDate(student.invitedAt)}
          {student.lastActiveAt ? ` · last active ${formatDate(student.lastActiveAt)}` : ' · never signed in'}
        </p>
        {student.attempts.length > 0 && (
          <div className="mt-3 border-t border-border/70 pt-3">
            {student.attempts.map((a, i) => {
              const missed = a.results?.filter((r) => !r.correct) ?? [];
              return (
                <div key={i} className="py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">
                      {getYearLabel(a.levelId)} — Part {a.part}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground">{formatDate(a.createdAt)}</span>
                      <span className="tabular-nums font-semibold text-foreground">
                        {a.score}/{a.total}
                      </span>
                    </span>
                  </div>
                  {missed.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Missed: {missed.map((m) => `${m.word}${m.transcribed ? ` (wrote "${m.transcribed}")` : ' (blank)'}`).join(', ')}
                    </p>
                  )}
                  {a.results === null && a.score < a.total && (
                    <p className="mt-0.5 text-xs text-muted-foreground">No per-word detail for this attempt.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Roster() {
  const { getToken } = useAuth();
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'forbidden' | 'unavailable'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      try {
        const res = await fetch('/.netlify/functions/get-admin-roster', {
          headers: { authorization: `Bearer ${token}` },
        });
        if (res.status === 403) {
          if (!cancelled) setStatus('forbidden');
          return;
        }
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { roster: RosterEntry[] };
        if (!cancelled) {
          setRoster(data.roster);
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  if (status === 'loading') {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (status === 'forbidden') {
    return <p className="text-muted-foreground">You don&rsquo;t have access to this page.</p>;
  }
  if (status === 'unavailable') {
    return <p className="text-muted-foreground">Couldn&rsquo;t load the roster right now — try again shortly.</p>;
  }
  if (!roster || roster.length === 0) {
    return <p className="text-muted-foreground">No invited students yet.</p>;
  }
  return (
    <div className="space-y-4">
      {roster.map((s) => (
        <StudentCard key={s.userId} student={s} />
      ))}
    </div>
  );
}

export function Admin() {
  return (
    <Shell>
      <section className="mx-auto max-w-2xl px-5 pt-8 sm:pt-10 pb-10">
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">Students</h1>

        {!AUTH_ENABLED ? (
          <p className="mt-4 text-muted-foreground">Not set up yet.</p>
        ) : (
          <>
            <SignedOut>
              <p className="mt-4 text-muted-foreground">Sign in to view the student roster.</p>
              <div className="mt-6">
                <SignInButton mode="modal">
                  <Button>Sign in</Button>
                </SignInButton>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="mt-6">
                <Roster />
              </div>
            </SignedIn>
          </>
        )}
      </section>
    </Shell>
  );
}
