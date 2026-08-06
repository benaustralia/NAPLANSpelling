// Photo marking — see Plan.md "Phase 1 — Marking function (backend core)".
// Takes a photo of a handwritten answer sheet + level/part, transcribes it with
// Claude Haiku 4.5 (structured output), and marks it against the known-correct
// spelling in src/data/<level>.json. No AI judgment on correctness — that part
// is plain string comparison.

import Anthropic from '@anthropic-ai/sdk';
import y3 from '../../src/data/y3-lc.json';
import y5 from '../../src/data/y5-lc.json';
import y7 from '../../src/data/y7-lc.json';
import y9 from '../../src/data/y9-lc.json';
import difficult from '../../src/data/difficult-lc.json';
import challenging from '../../src/data/challenging-lc.json';
import { completePairing, getUserId, jsonResponse, recordAttempt } from './_shared.mts';

type Word = { index: number; word: string };
type Part = { part: number; start: number; end: number };
type Level = { id: string; parts: Part[]; words: Word[] };

const LEVELS: Record<string, Level> = {
  'y3-lc': y3,
  'y5-lc': y5,
  'y7-lc': y7,
  'y9-lc': y9,
  'difficult-lc': difficult,
  'challenging-lc': challenging,
};

const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const anthropic = new Anthropic();

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?;:'"]+$/g, '');
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  // AI marking is the site's one paid endpoint — gated behind a signed-in,
  // allowlisted Clerk session. See Plan.md "Phase 2 — Auth + progress storage
  // foundation". Everything else on the site stays login-free.
  const userId = await getUserId(req);
  if (!userId) {
    return jsonResponse(401, { error: 'unauthorized' });
  }

  let body: {
    levelId?: string;
    part?: number;
    imageBase64?: string;
    mediaType?: string;
    pairingCode?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  const { levelId, part, imageBase64, mediaType, pairingCode } = body;

  if (!levelId || typeof levelId !== 'string' || !(levelId in LEVELS)) {
    return jsonResponse(400, {
      error: 'invalid_level',
      message: `levelId must be one of: ${Object.keys(LEVELS).join(', ')}`,
    });
  }
  const level = LEVELS[levelId];

  if (typeof part !== 'number' || !Number.isInteger(part)) {
    return jsonResponse(400, { error: 'invalid_part', message: 'part must be an integer' });
  }
  const partInfo = level.parts.find((p) => p.part === part);
  if (!partInfo) {
    return jsonResponse(400, {
      error: 'invalid_part',
      message: `part ${part} does not exist for level ${levelId}`,
    });
  }

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return jsonResponse(400, { error: 'missing_image' });
  }
  const media = mediaType && ALLOWED_MEDIA_TYPES.has(mediaType) ? mediaType : 'image/jpeg';
  const base64Data = imageBase64.startsWith('data:')
    ? imageBase64.slice(imageBase64.indexOf(',') + 1)
    : imageBase64;

  const expectedWords = level.words.filter((w) => w.index >= partInfo.start && w.index <= partInfo.end);
  const n = expectedWords.length;

  const schema = {
    type: 'object',
    properties: {
      answers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            confident: {
              type: 'boolean',
              description: 'False if the handwriting is unclear or ambiguous, even when a best guess is given in "text".',
            },
          },
          required: ['text', 'confident'],
          additionalProperties: false,
        },
        description: `Exactly ${n} entries, one per numbered question, in ascending order.`,
      },
    },
    required: ['answers'],
    additionalProperties: false,
  };

  const prompt = `This is a photo of a handwritten spelling test answer sheet. It covers questions ${partInfo.start} to ${partInfo.end} (${n} words total), numbered on the page. Transcribe exactly what the student wrote for each numbered answer, in order from question ${partInfo.start} to ${partInfo.end}.

Rules:
- Return exactly ${n} entries in "answers", one per question, in ascending question-number order.
- Transcribe only what is actually written on the page — do not guess or correct spelling.
- If an answer is blank, illegible, or crossed out with nothing else legible written, use null for "text".
- Set "confident" to false whenever the handwriting is unclear or ambiguous — even if you're still providing your best guess in "text". Set it to true only when you're sure of the transcription.
- Ignore the printed question numbers themselves; only transcribe the handwritten answer next to each number.`;

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      output_config: { format: { type: 'json_schema', schema } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: media as 'image/jpeg', data: base64Data } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return jsonResponse(429, { error: 'rate_limited' });
    }
    if (err instanceof Anthropic.APIError) {
      return jsonResponse(502, { error: 'anthropic_api_error', message: err.message });
    }
    throw err;
  }

  if (response.stop_reason === 'refusal') {
    return jsonResponse(502, { error: 'refusal' });
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock) {
    return jsonResponse(502, { error: 'no_text_response' });
  }

  let parsed: { answers: Array<{ text: string | null; confident: boolean }> };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    return jsonResponse(502, { error: 'invalid_model_output' });
  }

  if (!Array.isArray(parsed.answers) || parsed.answers.length !== n) {
    return jsonResponse(422, {
      error: 'transcription_mismatch',
      message: `Expected ${n} answers, model returned ${Array.isArray(parsed.answers) ? parsed.answers.length : 'non-array'}`,
    });
  }

  const transcribed: Array<string | null> = parsed.answers.map((a) => a?.text ?? null);

  // Low-confidence retry — see Plan.md "Phase 6 — Polish". Haiku flags
  // handwriting it wasn't sure about; only those specific questions get a
  // second look from Sonnet 5, keeping the common (high-confidence) case at
  // Haiku's cost. Best-effort: a retry hiccup falls back to Haiku's guess
  // rather than failing the whole request.
  const lowConfidenceIdx = parsed.answers.reduce<number[]>((acc, a, i) => {
    if (a?.confident === false) acc.push(i);
    return acc;
  }, []);

  if (lowConfidenceIdx.length > 0) {
    const retryNumbers = lowConfidenceIdx.map((i) => expectedWords[i].index);
    const retrySchema = {
      type: 'object',
      properties: {
        answers: {
          type: 'array',
          items: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          description: `Exactly ${retryNumbers.length} entries, one per listed question number, in the same order given.`,
        },
      },
      required: ['answers'],
      additionalProperties: false,
    };
    const retryPrompt = `This is the same handwritten spelling test answer sheet. Look very carefully at just these specific question numbers: ${retryNumbers.join(', ')}. Transcribe exactly what the student wrote for each one, in the same order as listed.

Rules:
- Return exactly ${retryNumbers.length} entries in "answers", one per listed question number, in the same order given.
- Transcribe only what is actually written — do not guess or correct spelling.
- If an answer is blank, illegible, or crossed out with nothing else legible written, use null for that entry.`;

    try {
      const retryResponse = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        output_config: { format: { type: 'json_schema', schema: retrySchema } },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: media as 'image/jpeg', data: base64Data } },
              { type: 'text', text: retryPrompt },
            ],
          },
        ],
      });
      const retryText = retryResponse.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
      if (retryResponse.stop_reason !== 'refusal' && retryText) {
        const retryParsed = JSON.parse(retryText.text) as { answers: Array<string | null> };
        if (Array.isArray(retryParsed.answers) && retryParsed.answers.length === retryNumbers.length) {
          lowConfidenceIdx.forEach((idx, j) => {
            transcribed[idx] = retryParsed.answers[j] ?? null;
          });
        }
      }
    } catch (err) {
      console.error('mark-answers sonnet retry failed:', err);
    }
  }

  let score = 0;
  const results = expectedWords.map((w, i) => {
    const t = transcribed[i];
    const correct = t != null && normalize(t) === normalize(w.word);
    if (correct) score++;
    return { index: w.index, word: w.word, transcribed: t, correct };
  });

  await recordAttempt({ userId, levelId, part, score, total: n });

  const payload = { levelId, part, total: n, score, results };

  // QR pairing relay — see Plan.md "Phase 4". If this photo was submitted via
  // a paired desktop session, hand the same result to the desktop's poll.
  if (pairingCode && typeof pairingCode === 'string') {
    await completePairing(pairingCode, levelId, part, payload);
  }

  return jsonResponse(200, payload);
}

export default async (req: Request): Promise<Response> => {
  try {
    return await handler(req);
  } catch (err) {
    console.error('mark-answers failed:', err);
    return jsonResponse(500, { error: 'internal_error' });
  }
};
