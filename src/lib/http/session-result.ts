/** Presentation only: never grants access or changes Auth state. */
export function sessionVerificationState(user: unknown, error: { name?: string; status?: number; code?: string } | null): "active" | "expired" | "unavailable" {
  if (user) return "active";
  if (!error || error.name === "AuthSessionMissingError" || error.status === 401) return "expired";
  // Auth rejects invalid refresh/session credentials with explicit400 codes.
  // Unknown400/403/network faults remain unavailable, never authenticated.
  if (error.name === "AuthInvalidJwtError" || ["refresh_token_not_found", "refresh_token_already_used", "session_not_found", "session_expired", "bad_jwt", "invalid_jwt"].includes(error.code ?? "")) return "expired";
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
