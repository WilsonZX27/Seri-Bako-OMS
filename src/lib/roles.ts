export const roleDisplayLabels: Record<string, string> = {
  super_admin: "Super Admin / Owner",
  operations_admin: "Administrator",
  admin: "Administrator",
  manager: "Manager",
  purchasing: "Purchasing",
  finance: "Finance",
  kitchen_staff: "Kitchen",
  kitchen: "Kitchen",
  viewer: "Viewer",
};

export const roleSortOrder: Record<string, number> = {
  super_admin: 0,
  admin: 1,
  operations_admin: 2,
  manager: 3,
  purchasing: 4,
  finance: 5,
  kitchen_staff: 6,
  kitchen: 7,
  viewer: 8,
};

export function getRoleDisplayLabel(roleCode?: string | null, fallback?: string | null) {
  if (!roleCode) return fallback ?? "Viewer";
  return roleDisplayLabels[roleCode] ?? fallback ?? roleCode.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeRoleCode(roleCode?: string | null) {
  if (roleCode === "kitchen") return "kitchen_staff";
  if (roleCode === "admin") return "super_admin";
  return roleCode ?? "viewer";
}

export function isSuperAdminRole(roleCode?: string | null) {
  return roleCode === "super_admin" || roleCode === "admin";
}

export function isAdministratorRole(roleCode?: string | null) {
  return roleCode === "operations_admin";
}

export function isProtectedOwnerAssignableRole(roleCode?: string | null) {
  return roleCode === "super_admin" || roleCode === "admin" || roleCode === "operations_admin";
}

export function canAssignRoleCode(currentRoleCode: string | null | undefined, targetRoleCode: string | null | undefined) {
  if (!targetRoleCode) return false;
  if (isSuperAdminRole(currentRoleCode)) return true;
  if (isAdministratorRole(currentRoleCode)) return !isProtectedOwnerAssignableRole(targetRoleCode);
  return false;
}

export function sortRolesForDisplay<T extends { role_code: string; role_name?: string | null }>(roles: T[]) {
  return [...roles].sort((a, b) => {
    const order = (roleSortOrder[a.role_code] ?? 99) - (roleSortOrder[b.role_code] ?? 99);
    if (order !== 0) return order;
    return getRoleDisplayLabel(a.role_code, a.role_name).localeCompare(getRoleDisplayLabel(b.role_code, b.role_name));
  });
}
