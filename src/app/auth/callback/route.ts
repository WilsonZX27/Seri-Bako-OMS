import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");
  const next = nextParam?.startsWith("/") ? nextParam : "/set-password";

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
      console.error(error);
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
    console.error(error);
    return NextResponse.redirect(new URL("/set-password?invite=expired", requestUrl.origin));
  }
}
