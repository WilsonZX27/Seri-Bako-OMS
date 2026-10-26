/** Presentation only: never grants access or changes Auth state. */
export function sessionVerificationState(user: unknown, error: { name?: string; status?: number } | null): "active" | "expired" | "unavailable" {
  if (user) return "active";
  if (!error || error.name === "AuthSessionMissingError" || error.status === 401) return "expired";
  return "unavailable";
}

export function isSignInResponse(url: string): boolean {
  try {
    const target = new URL(url);
    return target.pathname === "/login"
      || (target.pathname === "/access-status" && target.searchParams.get("reason") === "idle-timeout");
  } catch {
    return false;
  }
}
