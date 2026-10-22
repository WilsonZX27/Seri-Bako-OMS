export const sessionActivityStorageKey = "oms-session-last-activity-v1";
export const sessionWarningAfterMs = 25 * 60 * 1000;
export const sessionLogoutAfterMs = 30 * 60 * 1000;
const allowedClockSkewMs = 5_000;

/** Accept only recent timestamps from another same-origin tab. */
export function parseSharedSessionActivity(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const timestamp = Number(value);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) return null;
  if (timestamp > now + allowedClockSkewMs || now - timestamp >= sessionLogoutAfterMs) return null;
  return timestamp;
}
