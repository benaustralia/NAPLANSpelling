// Shared helpers for the netlify/functions/*.mts endpoints. Underscore-prefixed
// files aren't routed as functions by Netlify — see
// https://docs.netlify.com/functions/optional-configuration/#import-a-module.
import { createClerkClient, verifyToken } from '@clerk/backend';
import { neon } from '@neondatabase/serverless';
import { getStore } from '@netlify/blobs';

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Returns the Clerk user id for a valid session token, or null if the request
// is unauthenticated/invalid. Fails closed: if CLERK_SECRET_KEY isn't set yet,
// every request is treated as unauthenticated rather than trusting the caller.
export async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;
  try {
    const payload = await verifyToken(token, { secretKey });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

// Best-effort: a DB hiccup shouldn't stop a student's score from reaching them.
export async function recordAttempt(params: {
  userId: string;
  levelId: string;
  part: number;
  score: number;
  total: number;
}): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  try {
    const sql = neon(connectionString);
    await sql`
      insert into mark_attempts (user_id, level_id, part, score, total)
      values (${params.userId}, ${params.levelId}, ${params.part}, ${params.score}, ${params.total})
    `;
  } catch (err) {
    console.error('recordAttempt failed:', err);
  }
}

// Lazily constructed: CLERK_SECRET_KEY may not be set in every environment
// (see getUserId above), and createClerkClient throws immediately if it's missing.
export function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;
  return createClerkClient({ secretKey });
}

// Best-effort: tells the site owner a family requested access, so they don't
// have to poll the Clerk dashboard. A missing Resend config just skips this —
// the invitation itself (sent by Clerk) is the part that actually matters.
export async function notifyOwner(subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.OWNER_NOTIFY_EMAIL;
  if (!apiKey || !from || !to) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) console.error('notifyOwner failed:', res.status, await res.text());
  } catch (err) {
    console.error('notifyOwner failed:', err);
  }
}

export type Attempt = {
  level_id: string;
  part: number;
  score: number;
  total: number;
  created_at: string;
};

// QR pairing relay — see Plan.md "Phase 4 — QR pairing relay". Ephemeral,
// short-lived codes stored in Netlify Blobs (not Neon: this is session
// handoff state, not progress history, and doesn't need a schema/migration).
const PAIRING_TTL_MS = 10 * 60 * 1000;
// No 0/O/1/I/L — avoids characters that are easy to misread on a phone screen.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

type PairingRecord = {
  levelId: string;
  part: number;
  createdAt: number;
  status: 'pending' | 'done';
  result?: unknown;
};

function pairingStore() {
  return getStore('pairing-codes');
}

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function isExpired(record: PairingRecord): boolean {
  return Date.now() - record.createdAt > PAIRING_TTL_MS;
}

// Retries a handful of times to dodge the (astronomically unlikely, ~30^6
// keyspace) case of colliding with another still-active code.
export async function createPairing(levelId: string, part: number): Promise<{ code: string; expiresAt: number }> {
  const store = pairingStore();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const existing = (await store.get(code, { type: 'json' })) as PairingRecord | null;
    if (existing && !isExpired(existing)) continue;
    const createdAt = Date.now();
    const record: PairingRecord = { levelId, part, createdAt, status: 'pending' };
    await store.setJSON(code, record);
    return { code, expiresAt: createdAt + PAIRING_TTL_MS };
  }
  throw new Error('Could not allocate a pairing code');
}

export type PairingStatus =
  | { status: 'not_found' }
  | { status: 'expired' }
  | { status: 'pending'; levelId: string; part: number }
  | { status: 'done'; levelId: string; part: number; result: unknown };

export async function getPairing(code: string): Promise<PairingStatus> {
  const store = pairingStore();
  const record = (await store.get(code, { type: 'json' })) as PairingRecord | null;
  if (!record) return { status: 'not_found' };
  if (isExpired(record)) return { status: 'expired' };
  if (record.status === 'done') {
    return { status: 'done', levelId: record.levelId, part: record.part, result: record.result };
  }
  return { status: 'pending', levelId: record.levelId, part: record.part };
}

// Best-effort: called after mark-answers has already scored the photo, so a
// blob-store hiccup shouldn't stop the phone from seeing its own result.
export async function completePairing(code: string, levelId: string, part: number, result: unknown): Promise<void> {
  try {
    const store = pairingStore();
    const record = (await store.get(code, { type: 'json' })) as PairingRecord | null;
    if (!record || isExpired(record) || record.levelId !== levelId || record.part !== part) return;
    await store.setJSON(code, { ...record, status: 'done', result });
  } catch (err) {
    console.error('completePairing failed:', err);
  }
}

export async function listAttempts(userId: string): Promise<Attempt[] | null> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  const sql = neon(connectionString);
  const rows = await sql`
    select level_id, part, score, total, created_at
    from mark_attempts
    where user_id = ${userId}
    order by created_at desc
    limit 200
  `;
  return rows as Attempt[];
}
