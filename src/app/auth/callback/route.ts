import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCurrentAuthUserToStaff } from "@/server/auth/staff-session";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/set-password";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    await syncCurrentAuthUserToStaff();
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
