"use client";

import { useMemo, useState } from "react";
import { RecordSection } from "@/components/record-workspace";
import { FormPendingBridge, SubmitButton } from "@/components/ui/submit-button";

type PermissionAccess = { id: string; permission_code: string; module: string; action: string; description: string | null; roleDefault: boolean; override: "allow" | "deny" | null; effective: boolean };
type OverrideValue = "inherit" | "allow" | "deny";
const categoryOrder = ["Operations", "Procurement", "Inventory", "People & Attendance", "Compliance", "Analytics", "Administration", "Other"] as const;
const categories: Record<string, (typeof categoryOrder)[number]> = {
  outlet_daily_record: "Operations", production: "Operations", goods_receiving: "Operations",
  purchase_request: "Procurement", purchase_requests: "Procurement", purchase_order: "Procurement", purchase_orders: "Procurement", supplier_invoice: "Procurement", suppliers: "Procurement", procurement: "Procurement",
  inventory: "Inventory", items: "Inventory", stock_ledger: "Inventory", stock_transfer: "Inventory", stock_wastage: "Inventory", stock_count: "Inventory", uom: "Inventory",
  people: "People & Attendance", attendance: "People & Attendance", branches: "People & Attendance", schedule: "People & Attendance",
  compliance: "Compliance", outlet_compliance: "Compliance", dashboard: "Analytics", analytics: "Analytics", reports: "Analytics",
  company: "Administration", documents: "Administration", document_sequences: "Administration", imports: "Administration", roles: "Administration", users: "Administration",
};
const actionLabels: Record<string, string> = { read: "View", view: "View", create: "Create", update: "Manage", manage: "Manage", approve: "Approve", delete: "Manage", post: "Post", export: "Export", import: "Import" };
function categoryFor(permission: PermissionAccess) { return categories[permission.module] ?? "Other"; }
function permissionName(permission: PermissionAccess) { return permission.description ?? `${actionLabels[permission.action] ?? "Manage"} ${permission.module.replaceAll("_", " ")}`; }

export function StaffPermissionOverrides({ permissions, canManage, protectedRole, updateAction, resetAction }: { permissions: PermissionAccess[]; canManage: boolean; protectedRole: boolean; updateAction: (formData: FormData) => Promise<void>; resetAction: () => Promise<void> }) {
  const grouped = useMemo(() => categoryOrder.map((name) => ({ name, permissions: permissions.filter((permission) => categoryFor(permission) === name) })).filter((group) => group.permissions.length), [permissions]);
  const [activeCategory, setActiveCategory] = useState(grouped[0]?.name ?? "Operations");
  const [overrides, setOverrides] = useState<Record<string, OverrideValue>>(() => Object.fromEntries(permissions.map((permission) => [permission.id, permission.override ?? "inherit"])));
  const disabled = !canManage || protectedRole;
  const activePermissions = grouped.find((group) => group.name === activeCategory)?.permissions ?? [];
  const effectiveCount = permissions.filter((permission) => { const value = overrides[permission.id] ?? "inherit"; return value === "allow" || (value === "inherit" && permission.roleDefault); }).length;
  const overrideCount = Object.values(overrides).filter((value) => value !== "inherit").length;
  const setEffective = (permission: PermissionAccess, enabled: boolean) => setOverrides((current) => ({ ...current, [permission.id]: enabled === permission.roleDefault ? "inherit" : enabled ? "allow" : "deny" }));
  const resetCategory = () => setOverrides((current) => ({ ...current, ...Object.fromEntries(activePermissions.map((permission) => [permission.id, "inherit"])) }));

  return (
    <RecordSection
      title="Permission Settings"
      description="Access follows the role by default. Switch only the exceptions this staff member needs."
      action={
        canManage && !protectedRole ? (
          <SubmitButton
            type="submit"
            form="staff-permissions-form"
            pendingLabel="Saving permissions..."
          >
            Save permissions
          </SubmitButton>
        ) : null
      }
    >
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2 rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] px-3 py-2 text-xs">
        <span><strong className="mr-1 text-sm text-[var(--sb-text)]">{effectiveCount}</strong>Effective access</span>
        <span><strong className="mr-1 text-sm text-[var(--sb-text)]">{overrideCount}</strong>Overrides</span>
      </div>
      {protectedRole ? <p className="mb-3 rounded-[var(--sb-radius-control)] border border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] p-2 text-xs text-[var(--sb-warning)]">Super Admin / Owner permissions are protected and cannot be overridden.</p> : null}
      {!canManage ? <p className="mb-3 text-xs text-muted-foreground">You can view effective access but cannot change it.</p> : null}
      <details className="rounded-lg border border-[var(--sb-border-soft)] px-3 py-2"><summary className="cursor-pointer text-xs font-medium">Permissions by category</summary><form id="staff-permissions-form" action={updateAction} className="mt-3 space-y-3"><FormPendingBridge formId="staff-permissions-form" />
        {permissions.map((permission) => <input key={permission.id} type="hidden" name={`permission:${permission.id}`} value={overrides[permission.id] ?? "inherit"} />)}
        <div className="grid items-start gap-3 md:grid-cols-[11rem_minmax(0,1fr)]">
          <nav aria-label="Permission categories" className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
            {grouped.map((group) => <button key={group.name} type="button" onClick={() => setActiveCategory(group.name)} aria-current={activeCategory === group.name ? "page" : undefined} className={`shrink-0 rounded-[var(--sb-radius-control)] px-3 py-2 text-left text-xs font-semibold transition-colors ${activeCategory === group.name ? "bg-[var(--sb-green-900)] text-white" : "bg-[var(--sb-surface-muted)] text-[var(--sb-text)] hover:bg-[var(--sb-green-50)]"}`}>{group.name} <span className="opacity-70">{group.permissions.length}</span></button>)}
          </nav>
          <div className="overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--sb-border-soft)] px-3 py-2"><h3 className="text-sm font-semibold">{activeCategory}</h3>{!disabled ? <button type="button" onClick={resetCategory} className="text-xs font-semibold text-[var(--sb-green-800)] hover:underline">Reset category</button> : null}</div>
            <div className="divide-y divide-[var(--sb-border-soft)]">
              {activePermissions.map((permission) => {
                const override = overrides[permission.id] ?? "inherit";
                const effective = override === "allow" || (override === "inherit" && permission.roleDefault);
                return <div key={permission.id} className="flex min-h-14 items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0"><p className="text-xs font-medium text-[var(--sb-text)]">{permissionName(permission)}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${override === "inherit" ? "bg-[var(--sb-surface-muted)] text-muted-foreground" : "bg-[var(--sb-green-50)] text-[var(--sb-green-800)]"}`}>{override === "inherit" ? "Role default" : "Override"}</span></div>
                  <button type="button" role="switch" aria-checked={effective} aria-label={`${permissionName(permission)} ${effective ? "on" : "off"}`} disabled={disabled} onClick={() => setEffective(permission, !effective)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-[background-color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${effective ? "border-[var(--sb-green-700)] bg-[var(--sb-green-700)]" : "border-[#c7c7cc] bg-[#e9e9eb]"}`}><span className={`absolute left-0.5 top-0.5 h-[1.125rem] w-[1.125rem] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.28)] transition-transform duration-200 ${effective ? "translate-x-5" : "translate-x-0"}`} /></button>
                </div>;
              })}
            </div>
          </div>
        </div>
      </form></details>
      {canManage && !protectedRole && overrideCount ? <form action={resetAction} className="mt-2 flex justify-end"><SubmitButton type="submit" variant="outline" pendingLabel="Resetting...">Reset all overrides</SubmitButton></form> : null}
    </RecordSection>
  );
}
