type Level = "info" | "warn" | "error";

function write(level: Level, scope: string, error?: unknown) {
  const message = error instanceof Error ? error.message : error !== undefined ? String(error) : undefined;
  const line = JSON.stringify({ level, scope, message, time: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// Logs error type/message and a scope label only — never the request payload,
// since these routes carry user financial data.
export function logError(scope: string, error: unknown) {
  write("error", scope, error);
}

export function logWarn(scope: string, error?: unknown) {
  write("warn", scope, error);
}
