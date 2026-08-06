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
  created_at timestamptz not null default now()
);

create index if not exists mark_attempts_user_id_idx on mark_attempts (user_id);
