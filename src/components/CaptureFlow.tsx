import { useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MarkResponse } from '@/components/MarkResult';
import { compressImageFile } from '@/lib/image';
import type { LevelId } from '@/levels';

// Shared by the phone capture page (Mark.tsx) and the desktop "upload
// directly" fallback (MarkPanel.tsx) — same request contract, just different
// entry points into the same file input.
export function CaptureFlow({
  levelId,
  part,
  pairingCode,
  onResult,
  capture = true,
  label = 'Take a photo',
  busyLabel = 'Marking…',
}: {
  levelId: LevelId;
  part: number;
  pairingCode?: string | null;
  onResult: (result: MarkResponse) => void;
  capture?: boolean;
  label?: string;
  busyLabel?: string;
}) {
  const { getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'marking' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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
      if (inputRef.current) inputRef.current.value = '';
      setStatus('idle');
      onResult(data as MarkResponse);
    } catch {
      setErrorMessage('Something went wrong — check your connection and try again.');
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        {...(capture ? { capture: 'environment' as const } : {})}
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
        {status === 'marking' ? busyLabel : label}
      </Button>
      {status === 'error' && <p className="text-center text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
}
