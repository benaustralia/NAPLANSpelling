-- Progress tracking storage — see Plan.md "Phase 2 — Auth + progress storage
-- foundation". Run this once against your own Neon database (Neon SQL editor,
-- or `psql "$DATABASE_URL" -f db/schema.sql`). Not run automatically by any
-- build step — there's no migration framework here, just this one table.

create table if not exists mark_attempts (
  id bigint generated always as identity primary key,
  user_id text not null,
  level_id text not null,
  part integer not null,
  score integer not null,
  total integer not null,
  -- Per-word breakdown: [{ index, word, transcribed, correct }, ...]. Nullable —
  -- rows written before this column existed have no per-word detail, only the
  -- score. Added 2026-08-06 so the admin roster (get-admin-roster.mts) can show
  -- which words a student actually missed, not just a score.
  results jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mark_attempts_user_id_idx on mark_attempts (user_id);

-- Idempotent for existing databases created before the results column existed.
alter table mark_attempts add column if not exists results jsonb;

-- Anonymous quiz analytics — see src/routes/BeeQuiz.tsx and
-- netlify/functions/log-quiz-event.mts. Deliberately separate from
-- mark_attempts: this table has NO user_id and never will — it exists purely
-- so word-difficulty / usage patterns can be analysed across the site's
-- mostly-anonymous audience, not to identify anyone. Written for every quiz
-- completion regardless of sign-in state (a signed-in student's attempt also
-- gets a mark_attempts row via record-bee-attempt.mts for their personal
-- progress view; this table is the separate, identity-free analytics stream).
create table if not exists quiz_events (
  id bigint generated always as identity primary key,
  level_id text not null,
  part integer not null,
  score integer not null,
  total integer not null,
  results jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quiz_events_level_id_idx on quiz_events (level_id);
