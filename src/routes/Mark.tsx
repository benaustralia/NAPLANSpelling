import { useRef, useState } from 'react';
import { SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/clerk-react';
import { Camera, Check, RotateCcw, X } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AUTH_ENABLED } from '@/lib/auth';
import { compressImageFile } from '@/lib/image';
import { getLevel, getYearLabel, type LevelId } from '@/levels';

type WordResult = { index: number; word: string; transcribed: string | null; correct: boolean };
type MarkResponse = { total: number; score: number; results: WordResult[] };

function ResultView({ result, onRetake }: { result: MarkResponse; onRetake: () => void }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">Score</p>
          <p className="font-display text-5xl font-extrabold tracking-tight">
            {result.score}/{result.total}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <ul className="divide-y divide-border/70">
            {result.results.map((r) => (
              <li key={r.index} className="flex items-center gap-3 py-2.5">
                {r.correct ? (
                  <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <X className="size-4 shrink-0 text-destructive" aria-hidden />
                )}
                <span className="w-7 shrink-0 tabular-nums text-sm text-muted-foreground">{r.index}.</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{r.word}</p>
                  {!r.correct && (
                    <p className="text-sm text-muted-foreground">
                      You wrote: {r.transcribed ?? <span className="italic">blank</span>}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Button variant="outline" className="w-full" onClick={onRetake}>
        <RotateCcw aria-hidden /> Mark another photo
      </Button>
    </div>
  );
}

function CaptureFlow({
  levelId,
  part,
  pairingCode,
}: {
  levelId: LevelId;
  part: number;
  pairingCode: string | null;
}) {
  const { getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'marking' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<MarkResponse | null>(null);

  async function onFileSelected(file: File) {
    setStatus('marking');
    setErrorMessage('');
    try {
      const { base64, mediaType } = await compressImageFile(file);
      const token = await getToken();
      const res = await fetch('/.netlify/functions/mark-answers', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          levelId,
          part,
          imageBase64: base64,
          mediaType,
          ...(pairingCode ? { pairingCode } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(
          res.status === 429
            ? "That's a lot of photos — wait a moment and try again."
            : "Couldn't read that photo clearly — try again with better lighting.",
        );
        setStatus('error');
        return;
      }
      setResult(data as MarkResponse);
      setStatus('idle');
    } catch {
      setErrorMessage('Something went wrong — check your connection and try again.');
      setStatus('error');
    }
  }

  if (result) {
    return (
      <ResultView
        result={result}
        onRetake={() => {
          setResult(null);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      <Button
        size="xl"
        className="w-full"
        disabled={status === 'marking'}
        onClick={() => inputRef.current?.click()}
      >
        <Camera aria-hidden />
        {status === 'marking' ? 'Marking…' : 'Take a photo'}
      </Button>
      {status === 'error' && <p className="text-center text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
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
                <CaptureFlow levelId={levelId} part={part} pairingCode={pairingCode} />
              </SignedIn>
            </>
          )}
        </div>
      </section>
    </Shell>
  );
}
