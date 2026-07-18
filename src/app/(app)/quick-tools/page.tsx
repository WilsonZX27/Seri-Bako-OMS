import { redirect } from "next/navigation";
import { getDefaultLandingRoute } from "@/lib/information-architecture";
import { isSystemRoleCode, normalizeRoleCode } from "@/lib/roles";
import { getPermissionMap } from "@/server/auth/permissions";
import { navPermissionCodes } from "@/components/layout/nav-items";
import { getCurrentProfile } from "@/server/queries/common";

export default async function QuickToolsCompatibilityPage() {
  const [profile, permissions] = await Promise.all([getCurrentProfile(), getPermissionMap(navPermissionCodes)]);
  const rawRole = (profile as { role_code?: string; role?: string } | null)?.role_code ?? (profile as { role?: string } | null)?.role;
  const role = normalizeRoleCode(rawRole);
  redirect(isSystemRoleCode(role) ? getDefaultLandingRoute(role, permissions) : "/access-status?reason=no-permitted-route");
}
