export const sessionExpiredEventName = "oms:session-expired";

export type SessionExpiredEvent = CustomEvent<{ returnTo: string | null }>;

const blockedReturnPrefixes = ["/login", "/auth", "/api", "/access-status", "/change-password", "/set-password", "/forgot-password"];

export function getSafeReturnPath(value: unknown, origin = "https://oms.invalid"): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) return null;
  if (!value.startsWith("/") || value.startsWith("//") || /[\\?#\u0000-\u001f\u007f]/.test(value)) return null;
  if (/%(?:2f|5c)/i.test(value)) return null;

  let base: URL;
  let target: URL;
  try {
    base = new URL(origin);
    target = new URL(value, base);
  } catch {
    return null;
  }
  if (target.origin !== base.origin || target.username || target.password || target.search || target.hash) return null;
  const path = target.pathname;
  if (blockedReturnPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null;
  return path;
}

export function buildLoginHref(returnTo: unknown): string {
  const safePath = getSafeReturnPath(returnTo);
  return safePath ? `/login?returnTo=${encodeURIComponent(safePath)}` : "/login";
}

export function chooseSessionReturnPath(current: string | null, candidate: string | null): string {
  return current || candidate || "";
}

export function canReturnToRoute(
  role: string,
  allowedRoles: readonly string[] | null,
  permissionCodes: readonly string[] | null,
  hasPermission: boolean,
): boolean {
  const routeIsKnown = allowedRoles !== null || permissionCodes !== null;
  return routeIsKnown
    && (!allowedRoles || allowedRoles.includes(role))
    && (!permissionCodes || hasPermission);
}

export function dispatchSessionExpired(returnTo: unknown = null): void {
  if (typeof window === "undefined") return;
  const safePath = getSafeReturnPath(returnTo, window.location.origin);
  window.dispatchEvent(new CustomEvent(sessionExpiredEventName, { detail: { returnTo: safePath } }));
}
