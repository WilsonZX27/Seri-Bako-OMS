type LogContext = { requestId?: string; actorId?: string | null; companyId?: string | null; source?: string };

function redact(value: unknown): unknown {
  if (value instanceof Error) return { name: value.name, message: value.message.slice(0, 240) };
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => /password|token|secret|authorization|cookie|formdata|attachment_url/i.test(key) ? [key, "[REDACTED]"] : [key, redact(item)]));
  }
  return typeof value === "string" ? value.slice(0, 240) : value;
}

export function logServerError(error: unknown, context: LogContext = {}) {
  console.error(JSON.stringify({ level: "error", timestamp: new Date().toISOString(), ...context, error: redact(error) }));
}
