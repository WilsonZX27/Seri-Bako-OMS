import { isMockMode, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";

export const roleDescriptions = {
  super_admin: "Full system owner with every permission.",
  operations_admin: "Day-to-day ERP administrator for operational setup and oversight.",
  purchasing: "Purchasing user who verifies PRs, manages suppliers, and sends POs.",
  manager: "Approver for PR and PO workflow decisions.",
  kitchen_staff: "Branch operations user who creates operational requests and stock documents.",
  admin: "Legacy full system owner role. Prefer super_admin for new assignments.",
  kitchen: "Legacy kitchen role. Prefer kitchen_staff for new assignments.",
} as const;

const permissionAliases: Record<string, string[]> = {
  "users.manage": ["staffs.create", "staffs.update", "roles.update"],
  "staffs.create": ["staff.invite", "users.manage"],
  "staffs.update": ["staff.manage", "users.manage"],
  "roles.create": ["users.manage"],
  "roles.update": ["users.manage"],
  "settings.manage": ["company.update", "branches.update", "locations.update", "document_sequences.update"],
  "company.update": ["settings.manage"],
  "branches.create": ["settings.manage"],
  "branches.update": ["settings.manage"],
  "locations.create": ["settings.manage"],
  "locations.update": ["settings.manage"],
  "document_sequences.create": ["settings.manage"],
  "document_sequences.update": ["settings.manage"],
  "staff.invite": ["staffs.create", "staffs.update"],
  "staff.manage": ["staffs.create", "staffs.update"],
  "items.create": [],
  "items.update": ["items.manage"],
  "items.manage": ["items.create", "items.update"],
  "suppliers.create": [],
  "suppliers.update": ["suppliers.manage"],
  "supplier_items.create": ["suppliers.manage"],
  "supplier_items.update": ["suppliers.manage"],
  "suppliers.manage": ["suppliers.create", "suppliers.update", "supplier_items.create", "supplier_items.update"],
  "attachments.upload": ["documents.attach"],
  "documents.attach": ["attachments.upload"],
  "imports.run": ["imports.create"],
  "imports.create": ["imports.run"],
  "reports.view": ["documents.read", "inventory.read"],
  "documents.view": ["documents.read"],
  "documents.read": ["documents.view"],
  "documents.manage": ["documents.update", "documents.approve", "documents.submit"],
  "pr.create": ["purchase_request.create"],
  "purchase_request.create": ["pr.create"],
  "pr.submit": ["purchase_request.submit"],
  "purchase_request.submit": ["pr.submit"],
  "pr.admin_review": ["purchase_request.review"],
  "pr.purchasing_review": ["purchase_request.review"],
  "pr.manager_approve": ["purchase_request.approve"],
  "purchase_request.approve": ["pr.manager_approve"],
  "pr.convert_to_po": ["purchase_request.convert"],
  "purchase_request.convert": ["pr.convert_to_po"],
  "po.create": ["purchase_order.create"],
  "purchase_order.create": ["po.create"],
  "po.submit": ["purchase_order.submit"],
  "purchase_order.submit": ["po.submit"],
  "po.approve": ["purchase_order.approve"],
  "purchase_order.approve": ["po.approve"],
  "po.send": ["purchase_order.send"],
  "purchase_order.send": ["po.send"],
  "po.receive": ["goods_receiving.create"],
  "grn.create": ["goods_receiving.create"],
  "goods_receiving.create": ["grn.create", "po.receive"],
  "grn.post": ["goods_receiving.post"],
  "goods_receiving.post": ["grn.post"],
};

export const rolePermissionMatrix = {
  super_admin: ["*"],
  operations_admin: [
    "settings.manage",
    "staff.invite",
    "staff.manage",
    "users.manage",
    "items.create",
    "items.manage",
    "suppliers.create",
    "suppliers.manage",
    "pr.create",
    "pr.submit",
    "pr.admin_review",
    "po.create",
    "grn.create",
    "attachments.upload",
    "imports.run",
    "documents.view",
    "reports.view",
  ],
  purchasing: [
    "items.create",
    "items.manage",
    "suppliers.create",
    "suppliers.manage",
    "pr.create",
    "pr.submit",
    "pr.purchasing_review",
    "po.create",
    "po.submit",
    "po.send",
    "grn.create",
    "attachments.upload",
    "imports.run",
    "documents.view",
    "reports.view",
  ],
  manager: [
    "pr.manager_approve",
    "po.approve",
    "documents.view",
    "reports.view",
    "attachments.upload",
  ],
  kitchen_staff: [
    "pr.create",
    "pr.submit",
    "grn.create",
    "attachments.upload",
    "documents.view",
    "reports.view",
  ],
  admin: ["*"],
  kitchen: [
    "pr.create",
    "pr.submit",
    "grn.create",
    "attachments.upload",
    "documents.view",
    "reports.view",
  ],
} as const satisfies Record<string, readonly string[]>;

const roleAliases: Record<string, keyof typeof rolePermissionMatrix> = {
  kitchen: "kitchen_staff",
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

function roleAllowsPermission(roleCode: string, permission: string) {
  const normalizedRole = roleAliases[roleCode] ?? roleCode;
  const grants = rolePermissionMatrix[normalizedRole as keyof typeof rolePermissionMatrix] as readonly string[] | undefined;
  if (!grants) return false;
  if (grants.includes("*")) return true;
  return permissionCandidates(permission).some((candidate) => grants.includes(candidate));
}

export async function hasPermission(permission: string) {
  if (isMockMode()) {
    return roleAllowsPermission(mockProfile.role, permission) || permission.endsWith(".read");
  }

  const supabase = await createClient();
  const roleCodes = await getCurrentRoleCodes();
  if (roleCodes.some((roleCode) => roleAllowsPermission(roleCode, permission))) return true;

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
