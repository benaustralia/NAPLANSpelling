// Persists a Spelling Bee typed-quiz attempt for a signed-in student — see
// src/routes/BeeQuiz.tsx and src/components/BeeSaveStatus.tsx. Unlike
// mark-answers.mts (photo + Claude transcription), the student already typed
// each answer directly, so there's no AI step — computeQuizResults()
// re-checks the submitted answers against the known-correct spelling
// server-side and stores the same shape into the same mark_attempts table, so
// Progress.tsx and the admin roster (get-admin-roster.mts / Admin.tsx) pick
// these up for free. See also log-quiz-event.mts, the anonymous counterpart
// that writes the same computed result but with no user_id, for every quiz
// completion regardless of sign-in state.

import { computeQuizResults, getUserId, jsonResponse, recordAttempt, type QuizAnswer } from './_shared.mts';

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const userId = await getUserId(req);
  if (!userId) {
    return jsonResponse(401, { error: 'unauthorized' });
  }

  let body: { levelId?: string; part?: number; answers?: QuizAnswer[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  const { levelId, part, answers } = body;
  if (!levelId || typeof levelId !== 'string' || typeof part !== 'number' || !Array.isArray(answers)) {
    return jsonResponse(400, { error: 'invalid_request' });
  }

  const computed = computeQuizResults(levelId, part, answers);
  if (!computed) {
    return jsonResponse(400, { error: 'invalid_level_or_part' });
  }
  const { score, total, results } = computed;

  await recordAttempt({ userId, levelId, part, score, total, results });

  return jsonResponse(200, { levelId, part, score, total, results });
}

export default async (req: Request): Promise<Response> => {
  try {
    return await handler(req);
  } catch (err) {
    console.error('record-bee-attempt failed:', err);
    return jsonResponse(500, { error: 'internal_error' });
  }
};
