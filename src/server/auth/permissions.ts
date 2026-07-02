import { isMockMode, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";

export const roleDescriptions = {
  super_admin: "Full system owner with every permission.",
  operations_admin: "Day-to-day ERP administrator for operational setup and oversight.",
  purchasing: "Purchasing user who verifies PRs, manages suppliers, and sends POs.",
  manager: "Approver for PR and PO workflow decisions.",
  kitchen: "Branch operations user who creates operational requests and stock documents.",
} as const;

const permissionAliases: Record<string, string[]> = {
  "pr.submit": ["purchase_request.submit"],
  "pr.admin_review": ["purchase_request.review"],
  "pr.purchasing_review": ["purchase_request.review"],
  "pr.manager_approve": ["purchase_request.approve"],
  "pr.convert_to_po": ["purchase_request.convert"],
  "po.submit": ["purchase_order.submit"],
  "po.approve": ["purchase_order.approve"],
  "po.send": ["purchase_order.send"],
  "po.receive": ["goods_receiving.create"],
  "grn.post": ["goods_receiving.post"],
  "items.create": [],
  "suppliers.create": [],
  "settings.manage": ["company.update", "branches.update", "locations.update"],
  "users.manage": ["staffs.create", "staffs.update", "roles.update"],
};

function permissionCandidates(permission: string) {
  return [permission, ...(permissionAliases[permission] ?? [])];
}

async function getCurrentRoleCodes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: staff } = await supabase.from("staffs").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!staff?.id) return [];

  const { data } = await supabase.from("staff_roles").select("roles(role_code)").eq("staff_id", staff.id);
  return (data ?? [])
    .map((row) => {
      const role = row.roles as { role_code?: string | null } | { role_code?: string | null }[] | null;
      return Array.isArray(role) ? role[0]?.role_code : role?.role_code;
    })
    .filter((roleCode): roleCode is string => Boolean(roleCode));
}

export async function hasPermission(permission: string) {
  if (isMockMode()) {
    return ["admin", "super_admin", "operations_admin"].includes(mockProfile.role) || permission.endsWith(".read");
  }

  const supabase = await createClient();
  const roleCodes = await getCurrentRoleCodes();
  if (roleCodes.some((roleCode) => ["admin", "super_admin"].includes(roleCode))) return true;

  for (const candidate of permissionCandidates(permission)) {
    const { data, error } = await supabase.rpc("has_permission", { permission: candidate });
    if (!error && Boolean(data)) return true;
  }
  return false;
}

export async function getPermissionMap(permissions: string[]) {
  const entries = await Promise.all(permissions.map(async (permission) => [permission, await hasPermission(permission)] as const));
  return Object.fromEntries(entries) as Record<string, boolean>;
}

export async function requirePermission(permission: string) {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    throw new Error(`Missing permission: ${permission}`);
  }
}
