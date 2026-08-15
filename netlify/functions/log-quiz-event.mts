// Anonymous analytics capture for the Bee typed-quiz category — no auth
// required, no PII, no user_id column on the target table (see db/schema.sql
// "quiz_events"). Fired from src/routes/BeeQuiz.tsx on every quiz completion
// regardless of sign-in state, so word-difficulty / usage patterns can be
// analysed across the site's mostly-anonymous audience. A signed-in student's
// attempt separately gets a mark_attempts row via record-bee-attempt.mts for
// their own personal progress view — that write is independent of this one.

import { computeQuizResults, jsonResponse, logQuizEvent, type QuizAnswer } from './_shared.mts';

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
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

  await logQuizEvent({ levelId, part, ...computed });

  return jsonResponse(200, { ok: true });
}

export default async (req: Request): Promise<Response> => {
  try {
    return await handler(req);
  } catch (err) {
    console.error('log-quiz-event failed:', err);
    return jsonResponse(500, { error: 'internal_error' });
  }
};
