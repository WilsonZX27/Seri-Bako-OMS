import { sessionVerificationState } from "@/lib/http/session-result";
import { todayInKualaLumpur } from "@/lib/business-date";
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

  const claimsResult = await supabase.auth.getClaims().catch(() => ({ data: null, error: { name: "AuthVerificationUnavailable" } }));
  const { data: claimsData, error: claimsError } = claimsResult;
  if (!claimsData?.claims?.sub && sessionVerificationState(null, claimsError) === "unavailable") {
    return NextResponse.json({ ok: false, message: "Session verification is temporarily unavailable. Please retry; this request was not processed." }, { status: 503 });
  }
  const authUserId = claimsData?.claims?.sub;

  const pathname = request.nextUrl.pathname;
  if (!authUserId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, message: "Your session expired. Sign in again, then retry; no OMS records were changed." }, { status: 401 });
    }
    const decision = resolveAuthRoute({ pathname, authenticated: false, staffStatus: null, mustChangePassword: false, routeProtected: false, routeAllowed: false, firstPermittedRoute: null });
    return decision ? redirectWithCookies(request, response, decision.destination) : response;
  }

  const { data: staff, error: staffError } = await supabase
    .from("staffs")
    .select("id, status, employment_end_date, deleted_at, must_change_password, staff_roles(role_id, is_primary, effective_from, effective_to, roles(role_code))")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (staffError) {
    const unavailable = NextResponse.json({ ok: false, message: "Workspace profile verification is temporarily unavailable. Please retry; this request was not processed." }, { status: 503 });
    response.cookies.getAll().forEach((cookie) => unavailable.cookies.set(cookie));
    return unavailable;
  }

  const staffRecord = staff as unknown as {
    id: string;
    status: string | null;
    employment_end_date?: string | null;
    deleted_at?: string | null;
    must_change_password: boolean | null;
    staff_roles?: Array<{
      role_id: string;
      is_primary: boolean | null;
      effective_from: string | null;
      effective_to: string | null;
      roles: { role_code?: string | null } | Array<{ role_code?: string | null }> | null;
    }>;
  } | null;
  const permissionCodes = getRoutePermissionCodes(pathname);
  let roleCode: string | null = null;
  if (staffRecord?.id) {
    const today = getToday();
    const assignments = (staffRecord.staff_roles ?? []).filter((assignment) => {
      return (!assignment.effective_from || assignment.effective_from <= today)
        && (!assignment.effective_to || assignment.effective_to >= today);
    });
    const assignment = assignments?.find((row) => row.is_primary) ?? assignments?.[0];
    const role = assignment?.roles as { role_code?: string | null } | { role_code?: string | null }[] | null;
    roleCode = Array.isArray(role) ? role[0]?.role_code ?? null : role?.role_code ?? null;
  }
  const allowedRoles = getRouteAllowedRoles(pathname);
  const permissionAllowed = permissionCodes ? await resolveEffectivePermission(supabase, permissionCodes).catch(() => false) : true;
  const routeAllowed = permissionAllowed && (!allowedRoles || (roleCode ? allowedRoles.includes(roleCode as never) : false));
  const needsLanding = pathname === "/login" || pathname === "/change-password" || Boolean(permissionCodes && !routeAllowed);
  let firstPermittedRoute: string | null = null;
  if (staffRecord && !staffError && needsLanding && !staffRecord.must_change_password && staffRecord.status !== "invited") {
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
    staffStatus: staffError ? null : staffRecord?.deleted_at || (staffRecord?.employment_end_date && staffRecord.employment_end_date < todayInKualaLumpur()) ? "disabled" : staffRecord?.status ?? null,
    mustChangePassword: staffRecord?.must_change_password ?? false,
    routeProtected: Boolean(permissionCodes),
    routeAllowed,
    firstPermittedRoute,
  });
  if (decision && pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, message: permissionCodes && !routeAllowed ? "You do not have permission to use this operation." : "Your session is no longer active. Sign in again, then retry." }, { status: permissionCodes && !routeAllowed ? 403 : 401 });
  }
  return decision ? redirectWithCookies(request, response, decision.destination) : response;
}
