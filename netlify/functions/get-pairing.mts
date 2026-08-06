// QR pairing relay — see Plan.md "Phase 4 — QR pairing relay". Desktop polls
// this with the code it got from create-pairing.mts until status is "done".

import { getPairing, jsonResponse } from './_shared.mts';

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const code = new URL(req.url).searchParams.get('code');
  if (!code) {
    return jsonResponse(400, { error: 'missing_code' });
  }

  const status = await getPairing(code);
  return jsonResponse(200, status);
}

export default async (req: Request): Promise<Response> => {
  try {
    return await handler(req);
  } catch (err) {
    console.error('get-pairing failed:', err);
    return jsonResponse(500, { error: 'internal_error' });
  }
};
