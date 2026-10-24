/** Suppress generic navigation prompts, never event-specific facts. */
export function workspaceNotificationDetail(title: string, message: string | null | undefined) {
  const detail = message?.trim();
  if (!detail) return null;
  const normalized = detail.replace(/[.!]+$/g, "").toLowerCase();
  if (normalized === title.trim().replace(/[.!]+$/g, "").toLowerCase()) return null;
  if (/^(a repair request needs your attention\. open the request for details|review the maintenance queue)$/i.test(normalized)) return null;
  return detail;
}
