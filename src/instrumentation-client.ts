import * as Sentry from "@sentry/nextjs";

// No-ops safely if NEXT_PUBLIC_SENTRY_DSN isn't set yet — sign up at
// sentry.io (free tier), create a Next.js project, and add the DSN to
// .env.local / Vercel env vars to start actually receiving errors.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Error tracking only for now, no performance tracing (separate quota,
  // not something we asked for) — keep this at 0 unless that changes.
  tracesSampleRate: 0,
});
