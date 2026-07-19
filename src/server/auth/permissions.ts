import { isMockMode, mockProfile } from "@/lib/mock-mode";
import { cache } from "react";
import { getRoleDisplayLabel } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const roleDescriptions = {
  super_admin: "Protected system owner with every permission.",
  finance: "Finance reviewer who also manages staff, numbering, imports, and branches without Owner controls.",
  manager: "Branch-scoped approver for operational workflow decisions and branch maintenance.",
  purchasing: "Company-wide purchasing and master-data operator.",
  kitchen: "Central Kitchen operator for assigned branches.",
  outlet_staff: "Outlet worker who confirms received quantities and records wastage for assigned outlets.",
} as const;

export { getRoleDisplayLabel };

const permissionAliases: Record<string, string[]> = {
  "users.manage": ["staffs.create", "staffs.update", "roles.update"],
  "staffs.create": ["staff.invite", "users.manage"],
  "staffs.update": ["staff.manage", "users.manage"],
  "roles.create": ["users.manage"],
  "roles.update": ["users.manage"],
  "settings.manage": ["company.update"],
  "dashboard.view": [],
  "company.update": ["settings.manage"],
  "branches.create": [],
  "branches.update": [],
  "document_sequences.create": [],
  "document_sequences.update": [],
  "staff.invite": ["staffs.create", "staffs.update"],
  "staff.manage": ["staffs.create", "staffs.update"],
  "items.create": [],
  "items.view": ["items.create", "items.update", "items.manage"],
  "items.update": ["items.manage"],
  "items.manage": ["items.create", "items.update"],
  "suppliers.create": [],
  "suppliers.view": ["suppliers.create", "suppliers.update", "suppliers.manage"],
  "suppliers.update": ["suppliers.manage"],
  "supplier_items.create": ["suppliers.manage"],
  "supplier_items.update": ["suppliers.manage"],
  "suppliers.manage": ["suppliers.create", "suppliers.update", "supplier_items.create", "supplier_items.update"],
  "attachments.upload": ["documents.attach"],
  "documents.attach": ["attachments.upload"],
  "imports.run": ["imports.create"],
  "imports.create": ["imports.run"],
  "reports.view": ["documents.read", "inventory.read"],
  "inventory.read": ["stock.view"],
  "stock.view": ["inventory.read", "stock_balance.read", "stock_card.read", "stock_count.read", "stock_transfer.read", "stock_wastage.read", "stock_transactions.read"],
  "stock_balance.read": ["stock_balances.view", "inventory.read"],
  "stock_balances.view": ["stock_balance.read", "inventory.read"],
  "stock_transactions.view": ["stock_transactions.read", "stock_ledger.view"],
  "stock_transactions.read": ["stock_transactions.view", "stock_ledger.view"],
  "stock_ledger.view": ["stock_transactions.read", "stock_transactions.view"],
  "stock_ledger.export": [],
  "low_stock.view": ["stock_balance.read", "stock_balances.view", "pr.create"],
  "stock_count.read": ["stock.view", "inventory.read", "stock_counts.view"],
  "stock_counts.view": ["stock_count.read"],
  "stock_count.create": ["stock_counts.create"],
  "stock_counts.create": ["stock_count.create"],
  "stock_count.submit": ["stock_counts.submit"],
  "stock_counts.submit": ["stock_count.submit"],
  "stock_count.review": ["stock_counts.review"],
  "stock_counts.review": ["stock_count.review"],
  "stock_count.approve": ["stock_counts.approve"],
  "stock_counts.approve": ["stock_count.approve"],
  "stock_count.post": ["stock_counts.post"],
  "stock_counts.post": ["stock_count.post"],
  "stock_transfer.read": ["stock.view", "inventory.read", "stock_transfers.view"],
  "stock_transfers.view": ["stock_transfer.read"],
  "stock_transfer.create": ["stock_transfers.create"],
  "stock_transfers.create": ["stock_transfer.create"],
  "stock_transfer.dispatch": ["stock_transfers.dispatch"],
  "stock_transfers.dispatch": ["stock_transfer.dispatch"],
  "stock_transfer.receive": ["stock_transfers.receive"],
  "stock_transfers.receive": ["stock_transfer.receive"],
  "stock_wastage.read": ["stock.view", "inventory.read", "stock_write_off.view"],
  "stock_write_off.view": ["stock_wastage.read"],
  "stock_wastage.create": ["stock_write_off.create"],
  "stock_write_off.create": ["stock_wastage.create"],
  "stock_wastage.post": ["stock_write_off.post"],
  "stock_write_off.post": ["stock_wastage.post"],
  "purchase_request.read": ["pr.view_branch", "pr.view_all", "purchase_requests.view"],
  "purchase_requests.view": ["purchase_request.read"],
  "purchase_requests.create": ["purchase_request.create", "pr.create"],
  "purchase_requests.submit": ["purchase_request.submit", "pr.submit"],
  "purchase_requests.approve": ["purchase_request.approve", "pr.manager_approve", "pr.admin_review", "pr.purchasing_review", "pr.finance_review"],
  "purchase_order.read": ["po.view", "purchase_orders.view"],
  "purchase_orders.view": ["purchase_order.read", "po.view"],
  "purchase_orders.create": ["purchase_order.create", "po.create"],
  "purchase_orders.approve": ["purchase_order.approve", "po.approve"],
  "goods_receiving.read": ["grn.view", "goods_receivings.view"],
  "goods_receivings.view": ["goods_receiving.read", "grn.view"],
  "goods_receivings.create": ["goods_receiving.create", "grn.create"],
  "goods_receivings.post": ["goods_receiving.post", "grn.post"],
  "documents.view": ["documents.read"],
  "documents.read": ["documents.view"],
  "documents.manage": ["documents.update", "documents.approve", "documents.submit"],
  "pr.create": ["purchase_request.create"],
  "purchase_request.create": ["pr.create"],
  "pr.submit": ["purchase_request.submit"],
  "purchase_request.submit": ["pr.submit"],
  "pr.admin_review": [],
  "pr.purchasing_review": [],
  "pr.finance_review": [],
  "pr.manager_approve": ["purchase_request.approve"],
  "purchase_request.approve": ["pr.manager_approve"],
  "pr.reject": ["purchase_request.reject"],
  "purchase_request.reject": ["pr.reject"],
  "pr.convert_to_po": ["purchase_request.convert"],
  "purchase_request.convert": ["pr.convert_to_po"],
  "pr.cancel": ["purchase_request.cancel", "purchase_request.update"],
  "purchase_request.cancel": ["pr.cancel"],
  "pr.view_all": ["purchase_request.read_all", "documents.read"],
  "pr.view_branch": ["purchase_request.read_branch", "documents.read"],
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
  "purchase_return.read": ["purchase_return.view"],
  "purchase_return.view": ["purchase_return.read", "purchase_returns.view", "documents.read"],
  "purchase_returns.view": ["purchase_return.view"],
  "purchase_returns.create": ["purchase_return.create"],
  "purchase_returns.post": ["purchase_return.post"],
  "purchase_return.create": [],
  "purchase_return.post": ["stock_transactions.create"],
  "purchase_return.cancel": [],
  "supplier_invoice.view": ["supplier_invoices.view", "documents.read"],
  "supplier_invoices.view": ["supplier_invoice.view"],
  "supplier_invoice.create": ["supplier_invoices.create"],
  "supplier_invoices.create": ["supplier_invoice.create"],
  "supplier_invoice.pay": ["supplier_invoices.payment"],
  "supplier_invoices.payment": ["supplier_invoice.pay"],
  "supplier_invoice.approve": [],
  "supplier_invoice.void": [],
  "recipes.view": ["recipes.read"],
  "recipes.read": ["recipes.view"],
  "recipes.approve": [],
  "production.view": ["production_jobs.view"],
  "production_jobs.view": ["production.view"],
  "production.create": ["production_jobs.create"],
  "production_jobs.create": ["production.create"],
  "production.submit": [],
  "production.approve": ["production_jobs.approve"],
  "production_jobs.approve": ["production.approve"],
  "production.post": ["production_jobs.post"],
  "production_jobs.post": ["production.post"],
  "production.cancel": [],
  "production.reject": [],
  "production.override_negative_stock": [],
  "staff.view": ["staffs.create", "staffs.update", "staff.manage"],
  "roles.view": ["roles.create", "roles.update", "users.manage"],
  "roles.manage": ["roles.update", "users.manage"],
};

export const rolePermissionMatrix = {
  super_admin: ["*"],
  finance: ["dashboard.view", "pr.finance_review", "pr.reject", "pr.view_all", "purchase_request.read", "purchase_order.read", "goods_receiving.read", "inventory.read", "stock_count.read", "stock_transfer.read", "stock_wastage.read", "po.view", "grn.view", "purchase_return.view", "items.view", "suppliers.view", "production.view", "recipes.view", "outlet_daily_record.view", "outlet_daily_record.view_all", "supplier_invoice.view", "supplier_invoice.create", "supplier_invoice.pay", "supplier_invoice.approve", "supplier_invoice.void", "documents.view", "reports.view", "stock.view", "stock_transactions.read", "staffs.read", "staffs.create", "staffs.update", "document_sequences.read", "document_sequences.create", "document_sequences.update", "imports.create", "imports.run", "branches.read", "branches.create", "branches.update"],
  manager: ["dashboard.view", "purchase_request.read", "purchase_order.read", "goods_receiving.read", "inventory.read", "stock_count.read", "stock_transfer.read", "stock_wastage.read", "pr.manager_approve", "pr.reject", "pr.view_branch", "po.view", "po.approve", "grn.view", "purchase_return.view", "documents.view", "reports.view", "stock.view", "stock_transactions.read", "attachments.upload", "production.view", "production.approve", "production.reject", "outlet_daily_record.view", "outlet_daily_record.review", "outlet_daily_record.void", "branches.read", "branches.create", "branches.update"],
  purchasing: [
    "dashboard.view",
    "items.create",
    "items.manage",
    "suppliers.create",
    "suppliers.manage",
    "pr.create",
    "pr.submit",
    "pr.admin_review",
    "pr.purchasing_review",
    "pr.reject",
    "po.create",
    "po.submit",
    "po.send",
    "grn.create",
    "purchase_return.view",
    "purchase_return.create",
    "purchase_return.post",
    "purchase_return.cancel",
    "supplier_invoice.view",
    "attachments.upload",
    "imports.run",
    "documents.view",
    "reports.view",
    "stock.view",
    "stock_transactions.read",
    "stock_ledger.export",
    "production.view",
    "branches.read",
  ],
  outlet_staff: ["dashboard.view", "outlet_daily_record.view", "outlet_daily_record.create", "outlet_daily_record.update"],
  kitchen: [
    "dashboard.view",
    "pr.create",
    "pr.submit",
    "pr.cancel",
    "pr.view_branch",
    "grn.create",
    "purchase_return.view",
    "attachments.upload",
    "documents.view",
    "reports.view",
    "production.view",
    "production.create",
    "production.submit",
    "production.cancel",
    "outlet_daily_record.view",
    "outlet_daily_record.create",
    "outlet_daily_record.qty_sent",
  ],
} as const satisfies Record<string, readonly string[]>;

function permissionCandidates(permission: string) {
  return [permission, ...(permissionAliases[permission] ?? [])];
}

function roleAllowsPermission(roleCode: string, permission: string) {
  const grants = rolePermissionMatrix[roleCode as keyof typeof rolePermissionMatrix] as readonly string[] | undefined;
  if (!grants) return false;
  if (grants.includes("*")) return true;
  return permissionCandidates(permission).some((candidate) => grants.includes(candidate));
}

const checkPermission = cache(async (permission: string) => {
  if (isMockMode()) {
    return roleAllowsPermission(mockProfile.role, permission) || permission.endsWith(".read");
  }

  const supabase = await createClient();
  return resolveEffectivePermission(supabase, permission);
});

type PermissionClient = Awaited<ReturnType<typeof createClient>>;

export async function resolveEffectivePermission(supabase: PermissionClient, permissions: string | readonly string[]) {
  const requested = typeof permissions === "string" ? [permissions] : permissions;
  const candidates = Array.from(new Set(requested.flatMap(permissionCandidates)));
  const { data, error } = await supabase.rpc("has_any_permission", { permission_codes: candidates });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function hasPermission(permission: string) {
  return checkPermission(permission);
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
