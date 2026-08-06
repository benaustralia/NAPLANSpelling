import { useEffect, useState } from 'react';
import { SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/clerk-react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AUTH_ENABLED } from '@/lib/auth';
import { getYearLabel, type LevelId } from '@/levels';

type Attempt = {
  level_id: LevelId;
  part: number;
  score: number;
  total: number;
  created_at: string;
};

function AttemptRow({ attempt }: { attempt: Attempt }) {
  const date = new Date(attempt.created_at).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/70 last:border-0">
      <div>
        <p className="font-medium text-foreground">
          {getYearLabel(attempt.level_id)} — Part {attempt.part}
        </p>
        <p className="text-sm text-muted-foreground">{date}</p>
      </div>
      <p className="tabular-nums font-semibold text-foreground">
        {attempt.score}/{attempt.total}
      </p>
    </div>
  );
}

function ProgressList() {
  const { getToken } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      try {
        const res = await fetch('/.netlify/functions/get-progress', {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { attempts: Attempt[] };
        if (!cancelled) {
          setAttempts(data.attempts);
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
  if (status === 'unavailable') {
    return <p className="text-muted-foreground">Couldn&rsquo;t load progress right now — try again shortly.</p>;
  }
  if (!attempts || attempts.length === 0) {
    return <p className="text-muted-foreground">No marked attempts yet.</p>;
  }
  return (
    <Card>
      <CardContent>
        {attempts.map((a, i) => (
          <AttemptRow key={i} attempt={a} />
        ))}
      </CardContent>
    </Card>
  );
}

export function Progress() {
  return (
    <Shell>
      <section className="mx-auto max-w-2xl px-5 pt-8 sm:pt-10 pb-10">
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">My progress</h1>

        {!AUTH_ENABLED ? (
          <p className="mt-4 text-muted-foreground">Progress tracking isn&rsquo;t set up yet.</p>
        ) : (
          <>
            <SignedOut>
              <p className="mt-4 text-muted-foreground">Sign in to see your marking history.</p>
              <div className="mt-6">
                <SignInButton mode="modal">
                  <Button>Sign in</Button>
                </SignInButton>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="mt-6">
                <ProgressList />
              </div>
            </SignedIn>
          </>
        )}
      </section>
    </Shell>
  );
}
