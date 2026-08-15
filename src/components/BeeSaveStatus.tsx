import { useEffect, useRef, useState } from 'react';
import { SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import type { LevelId } from '@/levels';

type Answer = { index: number; typed: string | null };

function Saver({ levelId, part, answers }: { levelId: LevelId; part: number; answers: Answer[] }) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<'saving' | 'saved' | 'error'>('saving');
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch('/.netlify/functions/record-bee-attempt', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ levelId, part, answers }),
        });
        setStatus(res.ok ? 'saved' : 'error');
      } catch {
        setStatus('error');
      }
    })();
  }, [getToken, levelId, part, answers]);

  if (status === 'saving') return <p className="text-center text-xs text-muted-foreground">Saving to your progress…</p>;
  if (status === 'error') {
    return (
      <p className="text-center text-xs text-muted-foreground">
        Couldn&rsquo;t save this attempt — your score above is still correct.
      </p>
    );
  }
  return (
    <p className="text-center text-xs text-muted-foreground">
      Saved — see it on your <a href="/progress/" className="underline hover:text-foreground">progress page</a>.
    </p>
  );
}

// Rendered from BeeQuiz.tsx's results screen. Signed-out students still get
// their full score + tick/cross list — this only controls whether the attempt
// is persisted for the "My progress" / admin roster views.
export function BeeSaveStatus({ levelId, part, answers }: { levelId: LevelId; part: number; answers: Answer[] }) {
  return (
    <>
      <SignedIn>
        <Saver levelId={levelId} part={part} answers={answers} />
      </SignedIn>
      <SignedOut>
        <p className="text-center text-xs text-muted-foreground">
          Sign in to save this attempt and track progress over time.
        </p>
        <div className="mt-2 flex justify-center">
          <SignInButton mode="modal">
            <Button variant="outline" size="sm">Sign in</Button>
          </SignInButton>
        </div>
      </SignedOut>
    </>
  );
}
