// Only exact, reviewed business messages may cross the API boundary.
const allowed = new Set([
  "Comp time decision is not authorised.",
  "Pending comp time entry not found.",
  "A submitter cannot approve their own entry.",
  "A rejection comment is required.",
  "Comp time balance cannot go below zero.",
  "OT claim submission is not authorised.",
  "Attendance result is not available.",
  "Requested OT exceeds the calculated candidate.",
  "Attendance period is locked.",
  "OT claim decision is not authorised.",
]);
export function safeAttendanceError(error: unknown, fallback: string): string {
  const message = typeof error === "object" && error !== null && "message" in error ? error.message : null;
  if (message === "A submitter cannot approve their own entry.") return "You cannot review your own request. Another authorised approver must review it.";
  return typeof message === "string" && allowed.has(message) ? message : fallback;
}

/** Classify failures without exposing SQL text or relying on translated UI prose. */
export function attendanceErrorStatus(error: unknown): number {
  const row = typeof error === "object" && error !== null ? error as { code?: unknown; message?: unknown } : {};
  if (row.code === "42501" || (typeof row.message === "string" && allowed.has(row.message) && row.message.endsWith("not authorised."))) return 403;
  if (["57014", "55P03", "PGRST202", "PGRST205", "42883"].includes(String(row.code)) || String(row.code).startsWith("08")) return 503;
  if (row.code === "P0001" || (typeof row.message === "string" && allowed.has(row.message))) return 409;
  return 500;
}
