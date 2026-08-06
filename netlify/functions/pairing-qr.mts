// QR pairing relay — see Plan.md "Phase 5 — Desktop integration". Renders the
// pairing URL (same route Mark.tsx already reads ?pair= from) as an SVG QR
// code server-side, so the client bundle doesn't need to ship a QR library.
// No auth, no blob lookup: this just encodes a URL, the same trust level as
// create-pairing.mts minting the code in the first place.

import QRCode from 'qrcode';
import { SITE_URL } from '../../src/lib/site.ts';
import { jsonResponse } from './_shared.mts';

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const params = new URL(req.url).searchParams;
  const levelId = params.get('levelId');
  const part = params.get('part');
  const code = params.get('code');
  if (!levelId || !part || !code) {
    return jsonResponse(400, { error: 'missing_params' });
  }

  const target = `${SITE_URL}/mark/${levelId}/part/${part}/?pair=${code}`;
  const svg = await QRCode.toString(target, { type: 'svg', errorCorrectionLevel: 'H', margin: 1 });

  return new Response(svg, {
    status: 200,
    headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' },
  });
}

export default async (req: Request): Promise<Response> => {
  try {
    return await handler(req);
  } catch (err) {
    console.error('pairing-qr failed:', err);
    return jsonResponse(500, { error: 'internal_error' });
  }
};
