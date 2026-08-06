// Teacher-only roster: every invited student, cross-referenced with their
// mark_attempts history. Gated on ADMIN_EMAILS (see _shared.mts isAdminEmail) —
// there's exactly one admin (the site owner), not a general permissions system.
import { getClerkClient, getUserId, isAdminEmail, jsonResponse, listAllAttempts, type WordResult } from './_shared.mts';

type RosterAttempt = {
  levelId: string;
  part: number;
  score: number;
  total: number;
  results: WordResult[] | null;
  createdAt: string;
};
type RosterEntry = {
  userId: string;
  name: string;
  email: string | null;
  invitedAt: string;
  lastActiveAt: string | null;
  attempts: RosterAttempt[];
};

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const userId = await getUserId(req);
  if (!userId) {
    return jsonResponse(401, { error: 'unauthorized' });
  }

  const clerkClient = getClerkClient();
  if (!clerkClient) {
    return jsonResponse(503, { error: 'auth_not_configured' });
  }

  const requester = await clerkClient.users.getUser(userId);
  if (!isAdminEmail(requester.primaryEmailAddress?.emailAddress ?? null)) {
    return jsonResponse(403, { error: 'forbidden' });
  }

  const [attempts, userList] = await Promise.all([
    listAllAttempts(),
    clerkClient.users.getUserList({ limit: 500 }),
  ]);
  if (attempts === null) {
    return jsonResponse(503, { error: 'roster_unavailable' });
  }

  const attemptsByUser = new Map<string, RosterAttempt[]>();
  for (const a of attempts) {
    const list = attemptsByUser.get(a.user_id) ?? [];
    list.push({
      levelId: a.level_id,
      part: a.part,
      score: a.score,
      total: a.total,
      results: a.results,
      createdAt: a.created_at,
    });
    attemptsByUser.set(a.user_id, list);
  }

  const roster: RosterEntry[] = userList.data.map((u) => {
    const studentName = typeof u.publicMetadata.studentName === 'string' ? u.publicMetadata.studentName : '';
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return {
      userId: u.id,
      name: studentName || fullName || u.primaryEmailAddress?.emailAddress || 'Unnamed student',
      email: u.primaryEmailAddress?.emailAddress ?? null,
      invitedAt: new Date(u.createdAt).toISOString(),
      lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : null,
      attempts: attemptsByUser.get(u.id) ?? [],
    };
  });

  roster.sort((a, b) => a.name.localeCompare(b.name));

  return jsonResponse(200, { roster });
}

export default async (req: Request): Promise<Response> => {
  try {
    return await handler(req);
  } catch (err) {
    console.error('get-admin-roster failed:', err);
    return jsonResponse(500, { error: 'internal_error' });
  }
};
