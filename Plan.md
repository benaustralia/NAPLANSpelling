# Photo marking — build plan

Goal: let a student's handwritten spelling answers get marked from a photo, without
turning this into a NAPLAN-style typed test simulator (deliberately ruled out — see
Decisions below).

## Decisions

- **Primary flow is desktop + phone handoff, not "upload a file."** The student takes
  the test on a desktop; the photo of the paper answer sheet is taken on a phone
  (usually a parent's, not necessarily the student's own device). Relying on cloud
  photo sync between the two devices is too slow/fiddly to be the default path, even
  when it's technically the same person's devices.
- **QR code, not a native app.** Desktop shows a QR code + short pairing code linking
  to a plain mobile web page on this same site. No app install, no App Store, no
  separate codebase — a camera-capable file input in a normal mobile browser does the
  job.
- **Keep a plain "upload directly" fallback** on the same desktop screen, for anyone
  who already has the photo reachable from the desktop (synced, emailed to self, etc).
  Free to include — reuses the same marking function.
- **Marking is OCR + deterministic string match, not AI judgment.** The correct
  spelling for every word already lives in the site's existing data
  (`public/data/<level>/words.csv` → built JSON). The model's only job is transcribing
  what's handwritten; comparing transcription to the known-correct word is plain code.
- **Runtime OCR model: Claude Haiku 4.5** (`claude-haiku-4-5`). Confirmed vision-capable,
  standard resolution tier (1568 visual-token cap regardless of photo size). Estimated
  cost ≈ **$0.003/photo** (image + short prompt + ~20-word structured JSON output) —
  roughly 10× cheaper than Sonnet 5 or Opus 5 for this task, which is well inside
  Haiku's tier (simple, well-defined extraction, not deep reasoning). Use
  `output_config.format` (structured outputs) to get a clean JSON array back instead of
  parsing prose.
- **This is the site's first backend dependency.** Everything else is a static
  Netlify deploy (100GB bandwidth / 300 build min, legacy free tier, confirmed via
  `netlify api getSite`). The marking function is the one endpoint with a real
  per-call cost.
- **AI marking requires login; the rest of the site stays anonymous.** Login is
  opt-in, not required to use the site at all — audio practice, PDFs, everything
  that exists today stays open to anyone. But the photo-marking flow specifically is
  gated behind a signed-in session, both because it's the one endpoint with a real
  per-call cost (this doubles as the abuse guard that was going to be Phase 5) and
  because progress tracking only makes sense tied to an account.
- **Auth: Clerk, restricted to a whitelist.** Chosen over a custom passcode
  scheme because it's a known quantity (session handling, sign-in UI components)
  and over Neon Auth because it isn't actually simpler, just a different vendor
  tightly coupled to Neon's database.
- **Whitelist mechanism: Restricted mode + manual invites, not Allowlist.**
  Clerk's pattern-matched email Allowlist is a **paid Pro feature** — discovered
  when actually configuring it, not before. Free **Restricted mode** does the
  same job for this use case: public sign-up is fully disabled, and only
  students invited one-by-one (or created manually) via the Clerk dashboard can
  get in. Costs a manual invite step per student instead of pasting a list, but
  zero ongoing cost.
- **Sign-in methods: email, Google, and Microsoft, all three.** Considered
  going social-only (Google/Microsoft) to simplify for kids, but kept email as
  a fallback for any student without one of those accounts. Note either way:
  Clerk ends up storing the student's email regardless of which method they
  sign in with (it's how the invite-matching works) — the method choice
  doesn't change *whether* Clerk holds student PII, only how they prove it's
  them. If avoiding a third party ever holding student emails becomes the
  priority, that's what the passcode alternative above would have avoided —
  a bigger swap at this point, not a setting.
- **Progress storage: Neon Postgres, the user's own account** — not Netlify's
  built-in Neon marketplace extension, so it stays under the user's own Neon
  billing/management rather than Netlify's. Netlify Functions talk to it via
  `@neondatabase/serverless` (HTTP-based driver, no persistent connection pool to
  manage from a serverless function).
- **Progress record shape stays minimal**: one row per marked attempt —
  `user_id, level_id, part, score, total, created_at`. No streaks/badges/manual
  self-report; if that's wanted later it's an additive schema change, not a
  redesign.

## Phases

Each phase leaves the repo in a working, non-broken state — nothing half-wired across
phase boundaries. Build one, stop, review, move on.

- [x] **Phase 1 — Marking function (backend core)**
  Netlify Function: takes a photo + level/part identifier, calls Haiku 4.5 with
  structured output to transcribe ~20 words, compares each against the known-correct
  spelling, returns a score + per-word result as JSON. No UI yet — testable directly
  with `curl` / a sample image.
  *Build at: default model, high effort.* Real judgment calls: prompt design for
  accurate transcription, structured-output schema, error handling, matching logic.

- [x] **Phase 2 — Auth + progress storage foundation**
  Clerk wired into the React app (allowlist-restricted sign-in, opt-in — the rest of
  the site stays reachable without an account). A Neon Postgres schema for mark
  attempts. `mark-answers` updated to require a valid Clerk session and to write an
  attempt record after scoring (best-effort — a DB hiccup shouldn't block the score
  reaching the student). A minimal `/progress/` page reading that history back. No
  camera UI yet — this is the plumbing everything else gates on.
  *Build at: default model, high effort.* Real judgment calls: token verification in
  a Netlify Function, graceful degradation before Clerk/Neon env vars exist,
  best-effort vs. fatal error handling for the DB write.

  **Progress so far:**
  - [x] Code written: `src/lib/auth.ts`, `ClerkProvider` wired into `main.tsx`
    (dynamically imported, only when configured), `AccountMenu.tsx` (lazy chunk,
    keeps Clerk's SDK weight off anonymous page loads), `netlify/functions/_shared.mts`,
    `mark-answers.mts` gated on a valid session, `get-progress.mts`,
    `src/routes/Progress.tsx`, `db/schema.sql`.
  - [x] Clerk application created ("NAPLAN Spelling", Development instance).
    Publishable + secret key are in `.env.local` (secret key went from the
    Clerk dashboard's clipboard copy straight into the file — never displayed).
  - [x] Restricted mode enabled (free) — sign-up disabled site-wide until invited.
  - [x] Sign-in methods enabled: Email, Google, Microsoft (all via Clerk's shared
    dev-only OAuth credentials — fine for now, production needs custom credentials,
    see below).
  - [x] Neon: project `naplan-spelling` created (`neonctl`, org `Ben`), `db/schema.sql`
    run against it, pooled `DATABASE_URL` set in `.env.local`. Insert/select
    round-trip verified directly with `psql`.
  - [x] Self-service onboarding, built in place of manual one-by-one Clerk-dashboard
    invites (25 families expected): public `/join/` page (name + email + optional
    level) → `netlify/functions/request-invite.mts` → `clerkClient.invitations.
    createInvitation({ notify: true })` (Clerk sends the actual invite email) →
    best-effort owner notification via Resend (`notifyOwner` in `_shared.mts`,
    no-ops until `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `OWNER_NOTIFY_EMAIL` are
    set). Honeypot field is the only spam defense — proportionate for a link
    shared privately, not a public CAPTCHA-worthy surface. Verified end-to-end
    against the real Clerk Development instance (invite created, duplicate
    detected, honeypot short-circuits, test invitation revoked after).
  - [ ] Resend not yet set up — `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/
    `OWNER_NOTIFY_EMAIL` are blank in `.env.local`. Not blocking: invites still
    get created and emailed by Clerk without it, you just don't get a copy.
  - [ ] Nobody's actually been sent the `/join/` link yet — onboarding hasn't
    started for the 25 families.
  - [ ] **Clerk Production promotion — in progress (started 2026-08-06).**
    Everything below is on Clerk's Production instance now, separate from the
    Development instance/keys used everywhere above.
    - [x] **Custom domain**: site now lives at `spelling.naplanstyle.com`
      (Netlify primary custom domain, Let's Encrypt cert live). Context: Ben is
      building a broader "NAPLAN Style" product at `naplanstyle.com` — a
      **separate Next.js app on Vercel with its own separate Clerk
      application**, not this one, no shared login. DNS for `naplanstyle.com`
      is on **AWS Route 53** (registrar: Amazon Registrar), not Cloudflare —
      Ben adds records manually via the Route 53 console (no AWS CLI/API
      access configured for Claude in this environment; a scoped IAM key was
      discussed but judged not worth the setup friction mid-task). `SITE_URL`
      (`src/lib/site.ts`) and the QR/sitemap generator scripts now default to
      `spelling.naplanstyle.com`; `naplan-spelling.netlify.app` keeps serving
      directly with no redirect, so existing printed QR codes/PDFs referencing
      it still work — see CLAUDE.md's "Custom domain" note for the full
      troubleshooting history (stuck-certificate bug, fixed by removing and
      re-adding the domain in Netlify).
    - [x] **Production instance created**, cloned from Development's
      auth/theme settings. Domain entered as `spelling.naplanstyle.com` and
      explicitly set as a **"Secondary application"** (not primary) — Clerk's
      own domain-setup UI asks this because it detected the root domain
      `naplanstyle.com`. "Primary" would have claimed `clerk.naplanstyle.com` +
      `@naplanstyle.com`, which collides with `naplanstyle.com`'s own separate
      Clerk app. "Secondary" scopes everything under our subdomain instead
      (`clerk.spelling.naplanstyle.com`, `@spelling.naplanstyle.com`) — zero
      collision risk. Confirmed directly in Clerk's own UI copy that a
      subdomain is explicitly supported as the production domain ("Include the
      subdomain, if applicable").
    - [x] **DNS verified**: all 5 required CNAMEs added to the `naplanstyle.com`
      Route 53 zone and confirmed by Clerk (`clerk.spelling`, `accounts.spelling`,
      `clkmail.spelling`, `clk._domainkey.spelling`, `clk2._domainkey.spelling`,
      all pointing at `*.clerk.services`/`*.0gcj8v7tcpn8.clerk.services` hosts —
      see Clerk dashboard → Configure → Domains for exact current values if
      re-verifying). SSL certs for the Frontend API and Account Portal were
      issuing as of 2026-08-06 (Clerk's own estimate: minutes, up to 24h).
    - [x] **Google OAuth production credentials** — done (2026-08-06), via
      Claude in Chrome browser automation (Ben's explicit call — the
      "don't relay secrets through chat" caution below was written before
      that option was on the table; automation still put the Client Secret
      through the tool-result transcript once, unavoidable when copy-paste
      between two browser tabs is screenshot-driven). New GCP project
      `naplan-spelling` (org: none, billing: Main Billing), OAuth consent
      screen created (External audience, support email bahinton@gmail.com),
      OAuth 2.0 Web application Client ID "Clerk Production" created with
      Authorized Redirect URI `https://clerk.spelling.naplanstyle.com/v1/oauth_callback`
      (verified exact match against what Clerk's own Google SSO page
      expects). Client ID + Secret pasted into Clerk Production → Configure →
      SSO connections → Google via clipboard copy/paste (not retyped/echoed
      in chat) — connection now shows **Enabled**. Consent screen's
      publishing status was flipped from default "Testing" (100-user cap,
      sign-in restricted to explicitly added test users) to **"In
      production"** — required for the 25 families to sign in without being
      added as test users individually; no Google verification review was
      needed since only default openid/email/profile scopes are requested.
    - [x] **Microsoft OAuth production credentials** — done (2026-08-06),
      same automation pattern as Google above. Ben didn't have an existing
      Azure account — signed up free with a personal Microsoft account
      (`freyamedia@outlook.com`), which auto-provisions a free default Entra
      ID tenant with no subscription/billing needed (App registrations are
      part of the Entra ID Free tier). App registration "NAPLAN Spelling"
      created in Azure Portal (`portal.azure.com`) under that default
      directory: **Web** platform, redirect URI
      `https://clerk.spelling.naplanstyle.com/v1/oauth_callback` (matched
      exactly against what Clerk's Microsoft SSO page expects — same URI as
      Google, just a different provider), account type **"Any Entra ID
      Tenant + Personal Microsoft accounts"** (multitenant + personal, so
      any student can sign in — not limited to this one directory).
      Application (client) ID `c43f0454-468a-46df-8e6f-0f7dc8046eb9`. Client
      secret created (description "Clerk Production", 24-month max expiry →
      **2028-08-05** — note this in a calendar/reminder somewhere, Microsoft
      client secrets don't auto-renew and Clerk's own UI flags this).
      Client ID + secret pasted into Clerk Production → Configure → SSO
      connections → Microsoft (secret via clipboard copy/paste, not
      retyped; Client ID typed directly since it's not sensitive) —
      connection now shows **Enabled**. **Known caveat, not fixed**: Azure
      shows "End users cannot grant consent to newly registered multitenant
      apps without verified publishers" — this can block sign-in for users
      on *organizational* Microsoft accounts (school/work Microsoft 365
      tenants with strict admin consent policies) until the app's publisher
      is verified via Microsoft Partner Network. Personal Microsoft accounts
      (outlook.com/hotmail.com/Xbox/Skype) are unaffected. Not pursued now
      since it's a bigger side quest (business verification); revisit only
      if a family actually hits it.
    - [ ] **Production publishable/secret keys not yet swapped into
      Netlify** — the live site is still running against the Development
      Clerk instance's keys. Don't swap until OAuth is configured (Production
      Google/Microsoft sign-in won't work without it, and email/password
      still works fine on Development in the meantime so there's no rush).
    - [ ] **Restricted mode + re-invite the 25 families under Production** —
      not started. Production has its own separate user/invite list from
      Development; nobody currently invited under Development carries over
      automatically.

- [x] **Phase 3 — Mobile capture page** (was Phase 2)
  New route `/mark/{levelId}/part/{part}/` (chosen over a literal `/mark/{code}/` —
  there's no pairing relay yet to resolve an opaque code against, so the page is
  addressed the same way every other level/part route is; Phase 4's QR can point
  straight at this URL, or wrap it behind a short code if that's still wanted once
  the relay exists). Bare mobile-first page (`src/routes/Mark.tsx`): camera-capture
  file input (`capture="environment"`), client-side downscale/re-encode to JPEG
  before upload (`src/lib/image.ts` — phone photos are several MB raw, well past
  what's sane to ship to a Netlify Function, and Haiku only sees ~1568 tokens'
  worth of the image regardless), calls `mark-answers` directly, renders a
  score + per-word right/wrong breakdown. Gated on Phase 2's auth via
  `SignedIn`/`SignedOut` (same pattern as `/progress/`).
  *Build at: default model, medium-high effort.* Mostly UI wiring against an
  already-defined contract, matched to the site's existing visual language.

  **Verified:** `bun run typecheck` and `bun run build` clean; `netlify dev`
  smoke-tested the backend path directly (honeypot short-circuit, invalid-email
  rejection, real Clerk invitation created and revoked afterward, confirmed via
  `psql` DB round-trip on `mark_attempts`). **Not verified:** an actual signed-in
  click-through of `/mark/{levelId}/part/{part}/` in a browser — that needs a real
  Clerk sign-in (password or Google/Microsoft OAuth), and creating an account /
  entering a password isn't something I'll do even against a throwaway dev
  instance. **You'll need to click through this one yourself**: visit
  `/join/`, invite your own email, accept the invite, then open
  `/mark/y3-lc/part/1/` and try a photo end to end.

- [x] **Phase 4 — QR pairing relay** (was Phase 3)
  Reused Phase 3's existing `/mark/{levelId}/part/{part}/` route (per the note left
  there) rather than introducing a separate `/mark/{code}/` resolver — the QR just
  points at the same route plus `?pair={code}`. `netlify/functions/create-pairing.mts`
  (no auth — free, no PII) mints a 6-char code (unambiguous alphabet, no 0/O/1/I/L)
  in Netlify Blobs (`pairing-codes` store), 10-minute app-level expiry, small retry
  loop on collision. `get-pairing.mts` is what desktop will poll. `mark-answers.mts`
  now accepts an optional `pairingCode` and best-effort writes its result to that
  code's record (mirrors `recordAttempt`'s best-effort pattern) after verifying
  levelId/part match and the code hasn't expired. `Mark.tsx` reads `?pair=` from the
  URL and passes it through on submit. Added `@netlify/blobs` as a dependency.
  *Build at: default model, high effort.* Trickiest architectural piece — code
  entropy/collision avoidance, expiry, polling protocol, concurrency.

  **Verified:** `bun run typecheck` and `bun run build` clean; `netlify dev`
  smoke-tested directly — `create-pairing` returns a code, `get-pairing` correctly
  reports `pending` for a fresh code and `not_found` for an unknown one, confirmed
  the blob actually persists under `.netlify/blobs-serve` (gitignored, local-only).
  `mark-answers` still 401s without a Clerk session as before (unaffected by the
  pairing changes). **Not verified:** the `completePairing` write path itself
  (needs a real signed-in photo submission, same limitation as Phase 3 — not
  something to fake even against a dev instance) and no QR/polling UI exists yet
  to click through — both belong to Phase 5.

- [x] **Phase 5 — Desktop integration** (was Phase 4)
  Wire into the actual product: "Mark my answers" entry point on the part player, the
  QR/code display, polling + result rendering, plus the plain "or upload directly"
  fallback input on the same screen.
  *Build at: default model, medium-high effort.* Design-system-consistent UI work,
  same bar as the header/water-level polish already done.

  **Built:** `PartPlayer.tsx` gets a "Mark my answers" button (lazy-loads
  `MarkPanel.tsx` on click, so the far more common audio-only page load doesn't pay
  for the capture/QR/Clerk code path — same pattern as `Shell.tsx`'s `AccountMenu`
  split). `MarkPanel.tsx` shows a QR code (new `pairing-qr.mts` function, `qrcode`
  npm package rendering SVG server-side so no QR library ships to the client)
  alongside the pairing code as text, polls `get-pairing.mts` every 2s, and renders
  the shared result view once status flips to `done`. Below that, a plain "upload a
  photo from this computer" fallback reuses the same `mark-answers` call with no
  pairing code. Extracted `Mark.tsx`'s inline capture button and result list into
  `src/components/CaptureFlow.tsx` and `src/components/MarkResult.tsx` so both the
  phone page and the new desktop panel share one contract instead of drifting.
  *Build at: default model, medium-high effort.*

  **Verified:** `bun run typecheck` and `bun run build` clean (`MarkPanel` and
  `MarkResult` land in their own lazy chunks, confirmed in the build output).
  `netlify dev` smoke-tested directly: `create-pairing` → `pairing-qr` (200,
  `image/svg+xml`, confirmed the SVG actually renders) → `get-pairing` (`pending`)
  round-trip works, `pairing-qr` 400s on missing params, `mark-answers` still 401s
  without a session (unaffected by the refactor), `/y3-lc/part/1/` still 200s.
  **Not verified:** an actual signed-in click-through (open a part page, click "Mark
  my answers", scan the QR on a phone, submit a real photo, watch the desktop panel
  pick up the result) — same login-creation limitation noted in Phases 3–4. **You'll
  need to click through this one yourself.**

- [x] **Phase 6 — Polish (optional, defer freely)** (was Phase 5, trimmed)
  If handwriting proves messy in testing, a low-confidence retry path escalating
  just those words to Sonnet 5. (The abuse-guard item that used to live here is
  already covered by Phase 2's login requirement.)
  *Build at: default model, medium effort.* Lower stakes, can sit indefinitely without
  blocking anything.

  **Built:** Haiku's structured-output schema now returns `{ text, confident }`
  per answer instead of a bare string, with the prompt instructing it to set
  `confident: false` whenever the handwriting is ambiguous — even if it's still
  giving a best guess. Any indices flagged low-confidence trigger one extra
  Sonnet 5 call against the same photo, asking only about those specific
  question numbers (not a full re-transcription), and its answers overwrite
  Haiku's for just those indices. Best-effort: a retry failure (rate limit,
  parse mismatch) falls back to Haiku's original guess rather than failing the
  request — same pattern as `recordAttempt`/`completePairing` elsewhere in this
  function. The common, high-confidence case pays zero extra cost; the retry
  only fires on genuinely messy handwriting.
  *Build at: default model, medium effort.*

  **Verified:** `bun run typecheck` and `bun run build` clean; `netlify dev`
  confirmed the function loads with no syntax errors and still 401s without a
  session. **Not verified:** an actual low-confidence photo triggering the
  Sonnet retry end-to-end — that needs a real messy-handwriting photo through
  the signed-in flow, same limitation as the phases above.

## Reference: domain registrar

Not blocking any phase above — do whenever. Recommendation: **Cloudflare
Registrar** over Amazon Route 53 (bundles in a $0.50/mo hosted-zone charge even
unused, mixes billing into AWS) or Netlify's own domain purchase flow (not
competitively priced). Cloudflare sells at wholesale cost with no renewal
markup; Netlify stays the host, DNS just points at it.

## Reference: cost comparison (per photo, image + prompt + ~20-word output)

| Model | Tier / cap | Cost/photo |
|---|---|---|
| **Haiku 4.5** (chosen) | standard, 1568 tok | ~$0.003 |
| Sonnet 5 | high-res, 4784 tok | ~$0.02–0.03 |
| Opus 5 | high-res, 4784 tok | ~$0.03–0.04 |
