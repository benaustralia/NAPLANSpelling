// Read-only history for the signed-in student — see Plan.md "Phase 2 — Auth +
// progress storage foundation". Powers src/routes/Progress.tsx.
import { getUserId, jsonResponse, listAttempts } from './_shared.mts';

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const userId = await getUserId(req);
  if (!userId) {
    return jsonResponse(401, { error: 'unauthorized' });
  }

  const attempts = await listAttempts(userId);
  if (attempts === null) {
    return jsonResponse(503, { error: 'progress_unavailable' });
  }

  return jsonResponse(200, { attempts });
}

export default async (req: Request): Promise<Response> => {
  try {
    return await handler(req);
  } catch (err) {
    console.error('get-progress failed:', err);
    return jsonResponse(500, { error: 'internal_error' });
  }
};
