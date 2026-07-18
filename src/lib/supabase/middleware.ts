import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isMockMode } from "@/lib/mock-mode";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import { getRoutePermissionCodes } from "@/server/auth/route-permissions";
import { resolveEffectivePermission } from "@/server/auth/permissions";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  if (isMockMode()) {
    return NextResponse.next({ request });
  }

  const { url, publishableKey } = requireSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const publicPrefixes = ["/login", "/auth/callback", "/set-password", "/forgot-password"];
  const passwordChangePrefixes = ["/change-password", "/logout"];
  const isPublicRoute = publicPrefixes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const isPasswordChangeRoute = passwordChangePrefixes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!user) {
    if (!isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(url);
    }

    return response;
  }

  const { data: staff } = await supabase
    .from("staffs")
    .select("status, must_change_password")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (staff && ["disabled", "inactive", "archived"].includes(staff.status)) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "Your staff account is disabled. Please contact admin.");
    return NextResponse.redirect(url);
  }

  if (staff?.status === "invited" && !isPublicRoute && !isPasswordChangeRoute) {
    const url = request.nextUrl.clone();
    url.pathname = staff.must_change_password ? "/change-password" : "/set-password";
    return NextResponse.redirect(url);
  }

  if (staff?.must_change_password && !isPasswordChangeRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/change-password";
    return NextResponse.redirect(url);
  }

  const permissionCodes = getRoutePermissionCodes(pathname);
  if (permissionCodes) {
    const allowed = await resolveEffectivePermission(supabase, permissionCodes).catch(() => false);
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("error", "You do not have permission to open that workspace.");
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = staff?.must_change_password ? "/change-password" : staff?.status === "invited" ? "/set-password" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
