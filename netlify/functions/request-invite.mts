// Self-service onboarding — see Plan.md "Phase 2 — Auth + progress storage
// foundation". A family submits their email on the public /join/ page; this
// creates a Clerk invitation directly (Clerk sends the actual sign-up email
// itself, so there's no separate email template to maintain here) and,
// best-effort, pings the site owner so they don't have to watch the Clerk
// dashboard for signups.
//
// Public and unauthenticated by design (that's the whole point — nobody has
// an account yet). The honeypot field is the only spam defense; a real CAPTCHA
// would be overkill for a link shared privately with ~25 families.

import { isClerkAPIResponseError } from '@clerk/backend/errors';
import { getClerkClient, jsonResponse, notifyOwner } from './_shared.mts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  let body: { email?: string; studentName?: string; levelId?: string; website?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  // Honeypot: real visitors never fill this hidden field in. Pretend success
  // so bots don't learn to skip it.
  if (body.website) {
    return jsonResponse(200, { status: 'invited' });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const studentName = typeof body.studentName === 'string' ? body.studentName.trim().slice(0, 200) : '';
  const levelId = typeof body.levelId === 'string' ? body.levelId.trim().slice(0, 50) : '';

  if (!EMAIL_RE.test(email)) {
    return jsonResponse(400, { error: 'invalid_email' });
  }

  const clerkClient = getClerkClient();
  if (!clerkClient) {
    return jsonResponse(503, { error: 'auth_not_configured' });
  }

  try {
    await clerkClient.invitations.createInvitation({ emailAddress: email, notify: true });
  } catch (err) {
    if (isClerkAPIResponseError(err)) {
      // Most likely "already invited" / "already a user" — that's a fine
      // outcome from the family's point of view, so tell them what to do
      // next rather than surfacing an error.
      return jsonResponse(200, { status: 'already_invited' });
    }
    throw err;
  }

  await notifyOwner(
    'NAPLAN Spelling — new access request',
    `${studentName || '(no name given)'} <${email}> requested access${levelId ? ` (level: ${levelId})` : ''}.`,
  );

  return jsonResponse(200, { status: 'invited' });
}

export default async (req: Request): Promise<Response> => {
  try {
    return await handler(req);
  } catch (err) {
    console.error('request-invite failed:', err);
    return jsonResponse(500, { error: 'internal_error' });
  }
};
