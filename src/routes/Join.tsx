import { useState, type FormEvent } from 'react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AUTH_ENABLED } from '@/lib/auth';
import { ALL_LEVELS } from '@/levels';

type Status = 'idle' | 'submitting' | 'invited' | 'already_invited' | 'error';

function JoinForm() {
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus('submitting');
    try {
      const res = await fetch('/.netlify/functions/request-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          studentName: form.get('studentName'),
          levelId: form.get('levelId'),
          website: form.get('website'), // honeypot
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { status: Status };
      setStatus(data.status === 'already_invited' ? 'already_invited' : 'invited');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'invited' || status === 'already_invited') {
    return (
      <Card>
        <CardContent>
          <p className="font-medium text-foreground">Check your email</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {status === 'invited'
              ? "We've sent an invite link — click it to create your sign-in and start using AI marking."
              : "You're already invited — look for the invite email (check spam if it's not in your inbox)."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="studentName" className="text-sm font-medium text-foreground">
          Student&rsquo;s name
        </label>
        <Input id="studentName" name="studentName" required maxLength={200} autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Parent/guardian email
        </label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="levelId" className="text-sm font-medium text-foreground">
          Which level? <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <select
          id="levelId"
          name="levelId"
          defaultValue=""
          className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="">Not sure yet</option>
          {ALL_LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.yearLabel}
            </option>
          ))}
        </select>
      </div>
      {/* Honeypot — hidden from real visitors, bots tend to fill every field. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />
      {status === 'error' && (
        <p className="text-sm text-destructive">Something went wrong — please try again in a moment.</p>
      )}
      <Button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : 'Request access'}
      </Button>
    </form>
  );
}

export function Join() {
  return (
    <Shell>
      <section className="mx-auto max-w-md px-5 pt-8 sm:pt-10 pb-10">
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">Get access</h1>
        <p className="mt-4 text-muted-foreground">
          NAPLAN Spelling now supports AI-marked photo scoring: take a photo of a handwritten answer
          sheet and get it marked automatically. This feature needs a free sign-in, by invitation only.
          Enter your details below and we&rsquo;ll email an invite link.
        </p>
        <div className="mt-6">{AUTH_ENABLED ? <JoinForm /> : <p className="text-muted-foreground">Not set up yet.</p>}</div>
      </section>
    </Shell>
  );
}
