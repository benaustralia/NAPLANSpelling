import { useCallback, useEffect, useState } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CaptureFlow } from '@/components/CaptureFlow';
import { MarkResultView, type MarkResponse } from '@/components/MarkResult';
import { AUTH_ENABLED } from '@/lib/auth';
import type { LevelId } from '@/levels';

// Desktop entry point — see Plan.md "Phase 5 — Desktop integration". Mirrors
// Mark.tsx's phone flow but adds the QR pairing hand-off (create-pairing.mts +
// get-pairing.mts, see Plan.md "Phase 4") alongside a plain upload fallback
// for anyone whose photo is already reachable from the desktop.
const POLL_MS = 2000;

type PairingState =
  | { status: 'loading' }
  | { status: 'ready'; code: string; expiresAt: number }
  | { status: 'expired' }
  | { status: 'error' };

function PairingQR({
  levelId,
  part,
  onResult,
}: {
  levelId: LevelId;
  part: number;
  onResult: (result: MarkResponse) => void;
}) {
  const [pairing, setPairing] = useState<PairingState>({ status: 'loading' });

  const createCode = useCallback(async () => {
    setPairing({ status: 'loading' });
    try {
      const res = await fetch('/.netlify/functions/create-pairing', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ levelId, part }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { code: string; expiresAt: number };
      setPairing({ status: 'ready', code: data.code, expiresAt: data.expiresAt });
    } catch {
      setPairing({ status: 'error' });
    }
  }, [levelId, part]);

  useEffect(() => {
    createCode();
  }, [createCode]);

  useEffect(() => {
    if (pairing.status !== 'ready') return;
    const { code, expiresAt } = pairing;
    const interval = setInterval(async () => {
      if (Date.now() > expiresAt) {
        setPairing({ status: 'expired' });
        return;
      }
      try {
        const res = await fetch(`/.netlify/functions/get-pairing?code=${code}`);
        const data = (await res.json()) as { status: string; result?: MarkResponse };
        if (data.status === 'done' && data.result) {
          onResult(data.result);
        } else if (data.status === 'expired' || data.status === 'not_found') {
          setPairing({ status: 'expired' });
        }
      } catch {
        // Transient network hiccup — the next tick will retry.
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [pairing, onResult]);

  if (pairing.status === 'loading') {
    return <p className="text-center text-sm text-muted-foreground">Getting a code…</p>;
  }
  if (pairing.status === 'error') {
    return (
      <div className="text-center">
        <p className="text-sm text-destructive">Couldn&rsquo;t get a code — try again.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={createCode}>
          Retry
        </Button>
      </div>
    );
  }
  if (pairing.status === 'expired') {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">That code expired.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={createCode}>
          Get a new code
        </Button>
      </div>
    );
  }

  const qrSrc = `/.netlify/functions/pairing-qr?levelId=${levelId}&part=${part}&code=${pairing.code}`;
  return (
    <div className="text-center">
      <img
        src={qrSrc}
        alt={`QR code to open the photo page for ${levelId} part ${part}`}
        width={200}
        height={200}
        className="mx-auto rounded-md border border-border/70 bg-white p-2"
      />
      <p className="mt-3 text-sm text-muted-foreground">Scan with your phone&rsquo;s camera to take the photo</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">code {pairing.code}</p>
      <p className="mt-3 text-sm text-muted-foreground" role="status" aria-live="polite">
        Waiting for a photo…
      </p>
    </div>
  );
}

function MarkPanelSignedIn({ levelId, part }: { levelId: LevelId; part: number }) {
  const [result, setResult] = useState<MarkResponse | null>(null);

  if (result) {
    return <MarkResultView result={result} onRetake={() => setResult(null)} />;
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-6">
          <PairingQR levelId={levelId} part={part} onResult={setResult} />
        </CardContent>
      </Card>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>
      <CaptureFlow
        levelId={levelId}
        part={part}
        capture={false}
        label="Upload a photo from this computer"
        onResult={setResult}
      />
    </div>
  );
}

export function MarkPanel({ levelId, part }: { levelId: LevelId; part: number }) {
  if (!AUTH_ENABLED) {
    return <p className="text-center text-sm text-muted-foreground">AI marking isn&rsquo;t set up yet.</p>;
  }
  return (
    <>
      <SignedOut>
        <p className="text-center text-sm text-muted-foreground">Sign in to mark your answers from a photo.</p>
        <div className="mt-4 flex justify-center">
          <SignInButton mode="modal">
            <Button size="sm">Sign in</Button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <MarkPanelSignedIn levelId={levelId} part={part} />
      </SignedIn>
    </>
  );
}
