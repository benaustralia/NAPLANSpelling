// Clerk is optional at the infra level: until VITE_CLERK_PUBLISHABLE_KEY is set
// (locally or in Netlify), the app renders without it rather than crashing —
// see Plan.md "Phase 2 — Auth + progress storage foundation".
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
export const AUTH_ENABLED = Boolean(CLERK_PUBLISHABLE_KEY);
