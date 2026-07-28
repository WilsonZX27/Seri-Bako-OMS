import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/server/observability/logger";

const passwordSetupDestinations = new Set(["/set-password", "/change-password"]);

/**
 * Invitation and password-reset callbacks must never be a general-purpose
 * redirector. Same-origin is necessary to prevent phishing, but it is not
 * sufficient: an attacker could otherwise route an authenticated user to an
 * unrelated internal workflow. Keep the post-exchange destination explicit.
 */
function resolvePasswordSetupDestination(raw: string | null, origin: string) {
  if (!raw) return "/set-password";
  try {
    const candidate = new URL(raw, origin);
    if (
      candidate.origin !== origin
      || !passwordSetupDestinations.has(candidate.pathname)
    ) {
      return "/set-password";
    }
    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return "/set-password";
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = resolvePasswordSetupDestination(requestUrl.searchParams.get("next"), requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(new URL("/set-password?invite=expired", requestUrl.origin));
  }

  try {
    const supabase = await createClient();
    const {
      data: { user: existingUser },
    } = await supabase.auth.getUser();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logServerError(error, { source: "auth.callback.exchange" });
      return NextResponse.redirect(new URL("/set-password?invite=expired", requestUrl.origin));
    }
    const {
      data: { user: invitedUser },
    } = await supabase.auth.getUser();
    const redirectUrl = new URL(next, requestUrl.origin);
    if (
      existingUser?.email
      && invitedUser?.email
      && existingUser.id !== invitedUser.id
      && existingUser.email.toLowerCase() !== invitedUser.email.toLowerCase()
    ) {
      redirectUrl.searchParams.set("previous_email", existingUser.email);
      redirectUrl.searchParams.set("invite_email", invitedUser.email);
    }
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    logServerError(error, { source: "auth.callback" });
    return NextResponse.redirect(new URL("/set-password?invite=expired", requestUrl.origin));
  }
}
