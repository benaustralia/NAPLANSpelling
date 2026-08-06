// QR pairing relay — see Plan.md "Phase 4 — QR pairing relay". Desktop calls
// this to get a short-lived code; the phone submits its result against the
// same code (see mark-answers.mts) and the desktop polls get-pairing.mts.
// No auth required — creating a code costs nothing and carries no PII; the
// actual marking call is where the paid/gated work happens.

import { createPairing, jsonResponse } from './_shared.mts';

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  let body: { levelId?: string; part?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  const { levelId, part } = body;
  if (!levelId || typeof levelId !== 'string') {
    return jsonResponse(400, { error: 'invalid_level' });
  }
  if (typeof part !== 'number' || !Number.isInteger(part) || part < 1) {
    return jsonResponse(400, { error: 'invalid_part' });
  }

  const { code, expiresAt } = await createPairing(levelId, part);
  return jsonResponse(200, { code, expiresAt });
}

export default async (req: Request): Promise<Response> => {
  try {
    return await handler(req);
  } catch (err) {
    console.error('create-pairing failed:', err);
    return jsonResponse(500, { error: 'internal_error' });
  }
};
