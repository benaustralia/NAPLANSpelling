import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { CaptureFlow } from '@/components/CaptureFlow';
import { MarkResultView, type MarkResponse } from '@/components/MarkResult';
import { AUTH_ENABLED } from '@/lib/auth';
import { getLevel, getYearLabel, type LevelId } from '@/levels';

function MarkFlow({ levelId, part, pairingCode }: { levelId: LevelId; part: number; pairingCode: string | null }) {
  const [result, setResult] = useState<MarkResponse | null>(null);

  if (result) {
    return <MarkResultView result={result} onRetake={() => setResult(null)} />;
  }
  return <CaptureFlow levelId={levelId} part={part} pairingCode={pairingCode} onResult={setResult} />;
}

export function Mark({ levelId, part }: { levelId: LevelId; part: number }) {
  const data = getLevel(levelId);
  const partInfo = data.parts.find((p) => p.part === part)!;
  const yearLabel = getYearLabel(levelId);
  const pairingCode = new URLSearchParams(window.location.search).get('pair');

  return (
    <Shell>
      <section className="mx-auto max-w-md px-5 pt-8 sm:pt-10 pb-10">
        <p className="text-sm text-muted-foreground">
          {yearLabel} — Part {partInfo.part}
        </p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">Mark my answers</h1>
        <p className="mt-2 text-muted-foreground">
          Words {partInfo.start}–{partInfo.end}. Photograph the handwritten answer sheet and we&rsquo;ll mark it
          automatically.
        </p>

        <div className="mt-6">
          {!AUTH_ENABLED ? (
            <p className="text-muted-foreground">AI marking isn&rsquo;t set up yet.</p>
          ) : (
            <>
              <SignedOut>
                <p className="text-muted-foreground">Sign in to use AI marking.</p>
                <div className="mt-4">
                  <SignInButton mode="modal">
                    <Button>Sign in</Button>
                  </SignInButton>
                </div>
              </SignedOut>
              <SignedIn>
                <MarkFlow levelId={levelId} part={part} pairingCode={pairingCode} />
              </SignedIn>
            </>
          )}
        </div>
      </section>
    </Shell>
  );
}
