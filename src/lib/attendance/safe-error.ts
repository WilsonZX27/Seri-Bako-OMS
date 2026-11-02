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
