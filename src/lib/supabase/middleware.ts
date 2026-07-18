import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isMockMode } from "@/lib/mock-mode";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import { getRoutePermissionCodes } from "@/server/auth/route-permissions";
import { resolveEffectivePermission } from "@/server/auth/permissions";
import { authLandingRoutes, resolveAuthRoute } from "@/server/auth/route-resolver";
import type { Database } from "@/types/database";

function redirectWithCookies(request: NextRequest, response: NextResponse, destination: string) {
  const url = new URL(destination, request.url);
  if (url.pathname === request.nextUrl.pathname) return response;
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

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
  if (!user) {
    const decision = resolveAuthRoute({ pathname, authenticated: false, staffStatus: null, mustChangePassword: false, routeProtected: false, routeAllowed: false, firstPermittedRoute: null });
    return decision ? redirectWithCookies(request, response, decision.destination) : response;
  }

  const { data: staff, error: staffError } = await supabase
    .from("staffs")
    .select("status, must_change_password")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const permissionCodes = getRoutePermissionCodes(pathname);
  const routeAllowed = permissionCodes ? await resolveEffectivePermission(supabase, permissionCodes).catch(() => false) : true;
  const needsLanding = pathname === "/login" || pathname === "/change-password" || Boolean(permissionCodes && !routeAllowed);
  let firstPermittedRoute: string | null = null;
  if (staff && !staffError && needsLanding && !staff.must_change_password && staff.status !== "invited") {
    for (const [route, permissions] of authLandingRoutes) {
      if (await resolveEffectivePermission(supabase, permissions).catch(() => false)) {
        firstPermittedRoute = route;
        break;
      }
    }
  }

  const decision = resolveAuthRoute({
    pathname,
    authenticated: true,
    staffStatus: staffError ? null : staff?.status ?? null,
    mustChangePassword: staff?.must_change_password ?? false,
    routeProtected: Boolean(permissionCodes),
    routeAllowed,
    firstPermittedRoute,
  });
  return decision ? redirectWithCookies(request, response, decision.destination) : response;
}
