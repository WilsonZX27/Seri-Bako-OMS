import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCurrentAuthUserToStaff } from "@/server/auth/staff-session";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");
  const next = nextParam?.startsWith("/") ? nextParam : "/set-password";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=invalid_or_expired_link", requestUrl.origin));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error(error);
      return NextResponse.redirect(new URL("/login?error=invalid_or_expired_link", requestUrl.origin));
    }
    await syncCurrentAuthUserToStaff();
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/login?error=invalid_or_expired_link", requestUrl.origin));
  }
}
