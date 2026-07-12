import * as Sentry from "@sentry/nextjs";

type Level = "info" | "warn" | "error";

function write(level: Level, scope: string, error?: unknown) {
  const message = error instanceof Error ? error.message : error !== undefined ? String(error) : undefined;
  const line = JSON.stringify({ level, scope, message, time: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// Logs error type/message and a scope label only — never the request payload,
// since these routes carry user financial data. Also reports to Sentry (a
// no-op if NEXT_PUBLIC_SENTRY_DSN isn't configured) so failures surface
// somewhere other than Vercel's console logs.
export function logError(scope: string, error: unknown) {
  write("error", scope, error);
  Sentry.captureException(error, { tags: { scope } });
}

export function logWarn(scope: string, error?: unknown) {
  write("warn", scope, error);
}
