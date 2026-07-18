export const authLandingRoutes = [
  ["/dashboard", ["dashboard.view"]],
  ["/production/jobs", ["production.view"]],
  ["/outlet-daily-records", ["outlet_daily_record.view"]],
  ["/purchase-requests", ["purchase_request.read"]],
  ["/purchase-orders", ["purchase_order.read"]],
  ["/goods-receivings", ["goods_receiving.read"]],
  ["/supplier-invoices", ["supplier_invoice.view"]],
  ["/items", ["items.view"]],
  ["/stock-balance", ["stock_balance.read"]],
  ["/reports", ["reports.view"]],
  ["/company", ["company.read"]],
  ["/branches", ["branches.read"]],
  ["/staffs", ["staffs.read"]],
  ["/roles", ["roles.read"]],
] as const;

const publicPrefixes = ["/login", "/auth/callback", "/set-password", "/forgot-password", "/access-status"];
const inactiveStatuses = new Set(["disabled", "inactive", "archived"]);

export type AuthRouteState = {
  pathname: string;
  authenticated: boolean;
  staffStatus: string | null;
  mustChangePassword: boolean;
  routeProtected: boolean;
  routeAllowed: boolean;
  firstPermittedRoute: string | null;
};

export type AuthRouteDecision = { destination: string; reason: string } | null;

export function isPublicAuthRoute(pathname: string) {
  return publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function landingPage(state: AuthRouteState) {
  if (!state.firstPermittedRoute || state.firstPermittedRoute === state.pathname) {
    return "/access-status?reason=no-permitted-route";
  }
  return state.firstPermittedRoute;
}

export function resolveAuthRoute(state: AuthRouteState): AuthRouteDecision {
  const isPublic = isPublicAuthRoute(state.pathname);

  if (!state.authenticated) {
    return isPublic ? null : { destination: `/login?redirectedFrom=${encodeURIComponent(state.pathname)}`, reason: "signed-out" };
  }
  if (state.pathname === "/access-status") return null;
  if (!state.staffStatus) return { destination: "/access-status?reason=missing-profile", reason: "missing-profile" };
  if (inactiveStatuses.has(state.staffStatus)) return { destination: "/access-status?reason=inactive", reason: "inactive" };
  if (state.mustChangePassword) {
    return state.pathname === "/change-password" ? null : { destination: "/change-password", reason: "password-change-required" };
  }
  if (state.staffStatus === "invited") {
    return state.pathname === "/set-password" ? null : { destination: "/set-password", reason: "invitation-pending" };
  }
  if (state.pathname === "/login" || state.pathname === "/change-password") {
    return { destination: landingPage(state), reason: "authenticated-landing" };
  }
  if (state.routeProtected && !state.routeAllowed) {
    return { destination: landingPage(state), reason: "route-not-permitted" };
  }
  return null;
}
