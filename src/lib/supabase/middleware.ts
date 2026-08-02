import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isMockMode } from "@/lib/mock-mode";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import { getRouteAllowedRoles, getRoutePermissionCodes } from "@/server/auth/route-permissions";
import { resolveEffectivePermission } from "@/server/auth/permissions";
import { getAuthLandingRoutes, resolveAuthRoute } from "@/server/auth/route-resolver";
import { isSystemRoleCode } from "@/lib/roles";
import { getToday } from "@/lib/utils";
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

  // Public auth pages must remain renderable even when the local Auth service
  // is still starting. Session refresh and protected-route checks apply after
  // a user has entered the application.
  if (["/login", "/forgot-password", "/auth/callback"].includes(request.nextUrl.pathname)) {
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
    .select("id, status, must_change_password")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const permissionCodes = getRoutePermissionCodes(pathname);
  let roleCode: string | null = null;
  if (staff?.id) {
    const today = getToday();
    const { data: assignments } = await supabase
      .from("staff_roles")
      .select("role_id, is_primary, roles(role_code)")
      .eq("staff_id", staff.id)
      .lte("effective_from", today)
      .or(`effective_to.is.null,effective_to.gte.${today}`);
    const assignment = assignments?.find((row) => row.is_primary) ?? assignments?.[0];
    const role = assignment?.roles as { role_code?: string | null } | { role_code?: string | null }[] | null;
    roleCode = Array.isArray(role) ? role[0]?.role_code ?? null : role?.role_code ?? null;
  }
  const allowedRoles = getRouteAllowedRoles(pathname);
  const permissionAllowed = permissionCodes ? await resolveEffectivePermission(supabase, permissionCodes).catch(() => false) : true;
  const routeAllowed = permissionAllowed && (!allowedRoles || (roleCode ? allowedRoles.includes(roleCode as never) : false));
  const needsLanding = pathname === "/login" || pathname === "/change-password" || Boolean(permissionCodes && !routeAllowed);
  let firstPermittedRoute: string | null = null;
  if (staff && !staffError && needsLanding && !staff.must_change_password && staff.status !== "invited") {
    for (const [route, permissions] of isSystemRoleCode(roleCode) ? getAuthLandingRoutes(roleCode) : []) {
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
