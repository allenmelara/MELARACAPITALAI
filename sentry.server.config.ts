import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  // A missing DSN makes the SDK a safe no-op — this file can run in every
  // environment, including local dev with no Sentry project configured yet.
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)
});
