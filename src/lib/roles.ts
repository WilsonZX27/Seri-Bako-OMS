export const SYSTEM_ROLE_CODES = ["super_admin", "people_operations", "finance", "manager", "purchasing", "chef", "kitchen", "outlet_supervisor", "outlet_staff"] as const;
export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number];

const COMPANY_WIDE_OPERATIONAL_ROLES: readonly SystemRoleCode[] = ["super_admin", "finance", "manager", "purchasing"];

export const roleDisplayLabels: Record<SystemRoleCode, string> = {
  super_admin: "Super Admin / Owner",
  people_operations: "People Operations",
  finance: "Finance",
  manager: "Manager",
  purchasing: "Purchasing",
  chef: "Chef",
  kitchen: "Kitchen",
  outlet_supervisor: "Outlet Supervisor",
  outlet_staff: "Outlet Staff",
};

export const roleSortOrder: Record<string, number> = {
  super_admin: 0,
  people_operations: 1,
  finance: 2,
  manager: 3,
  purchasing: 4,
  chef: 4.5,
  kitchen: 5,
  outlet_supervisor: 6,
  outlet_staff: 7,
};

export function getRoleDisplayLabel(roleCode?: string | null, fallback?: string | null) {
  if (!roleCode) return fallback ?? "Unassigned";
  return roleDisplayLabels[roleCode as SystemRoleCode] ?? fallback ?? roleCode.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeRoleCode(roleCode?: string | null) {
  if (roleCode === "admin" || roleCode === "operations_admin") return "purchasing";
  if (roleCode === "kitchen_staff") return "kitchen";
  return roleCode ?? null;
}

export function isSuperAdminRole(roleCode?: string | null) {
  return roleCode === "super_admin";
}

export function isProtectedOwnerAssignableRole(roleCode?: string | null) {
  return roleCode === "super_admin";
}

export function canAssignRoleCode(currentRoleCode: string | null | undefined, targetRoleCode: string | null | undefined) {
  if (!targetRoleCode) return false;
  if (isSuperAdminRole(currentRoleCode)) return true;
  if (currentRoleCode === "finance") return !isProtectedOwnerAssignableRole(targetRoleCode);
  return false;
}

export function isSystemRoleCode(roleCode?: string | null): roleCode is SystemRoleCode {
  return SYSTEM_ROLE_CODES.includes(roleCode as SystemRoleCode);
}

export function hasCompanyWideOperationalScope(roleCode?: string | null) {
  return COMPANY_WIDE_OPERATIONAL_ROLES.includes(roleCode as SystemRoleCode);
}

export function sortRolesForDisplay<T extends { role_code: string; role_name?: string | null }>(roles: T[]) {
  const canonical = new Map<SystemRoleCode, T>();
  for (const role of roles) {
    if (isSystemRoleCode(role.role_code) && !canonical.has(role.role_code)) canonical.set(role.role_code, role);
  }
  return [...canonical.values()].sort((a, b) => {
    const order = (roleSortOrder[a.role_code] ?? 99) - (roleSortOrder[b.role_code] ?? 99);
    if (order !== 0) return order;
    return getRoleDisplayLabel(a.role_code, a.role_name).localeCompare(getRoleDisplayLabel(b.role_code, b.role_name));
  });
}
