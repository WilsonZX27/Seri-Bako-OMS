import { Button } from "@/components/ui/button";
import { RecordSection } from "@/components/record-workspace";
import { SelectNative } from "@/components/ui/select-native";
import { SubmitButton } from "@/components/ui/submit-button";

type PermissionAccess = {
  id: string;
  permission_code: string;
  module: string;
  action: string;
  description: string | null;
  roleDefault: boolean;
  override: "allow" | "deny" | null;
  effective: boolean;
};

const moduleLabels: Record<string, string> = { purchase_request: "Purchase Requests", purchase_order: "Purchase Orders", goods_receiving: "Goods Receiving", supplier_invoice: "Supplier Invoices", stock_ledger: "Stock Ledger", stock_transfer: "Stock Transfers", stock_wastage: "Stock Wastage", outlet_daily_record: "Outlet Daily Records" };
const actionLabels: Record<string, string> = { read: "view", view: "view", create: "create", update: "manage", manage: "manage", approve: "approve", delete: "manage", post: "manage", export: "view", import: "manage" };

function friendlyModule(module: string) { return moduleLabels[module] ?? module.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function effectiveLabel(permission: PermissionAccess) { return permission.effective ? `Can ${actionLabels[permission.action] ?? "manage"}` : "Restricted"; }

export function StaffPermissionOverrides({
  permissions,
  canManage,
  protectedRole,
  updateAction,
  resetAction,
}: {
  permissions: PermissionAccess[];
  canManage: boolean;
  protectedRole: boolean;
  updateAction: (formData: FormData) => Promise<void>;
  resetAction: () => Promise<void>;
}) {
  const visiblePermissions = permissions.filter((permission) => !permission.module.toLowerCase().includes("barcode"));
  const normalizeModule = (module: string) => ({ purchase_order: "purchase_orders", purchase_request: "purchase_requests" })[module] ?? module;
  const groups = Array.from(
    visiblePermissions.reduce((map, permission) => {
      const moduleKey = normalizeModule(permission.module);
      return map.set(moduleKey, [...(map.get(moduleKey) ?? []), permission]);
    }, new Map<string, PermissionAccess[]>()),
  );
  const allowed = visiblePermissions.filter((permission) => permission.override === "allow").length;
  const denied = visiblePermissions.filter((permission) => permission.override === "deny").length;
  const inherited = visiblePermissions.length - allowed - denied;
  const disabled = !canManage || protectedRole;

  return (
    <RecordSection title="Permission Overrides" description="Role permissions are defaults. Individual staff overrides may alter effective access.">
      <div className="mb-3 grid grid-cols-3 border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] text-center text-xs">
        <div className="p-2"><strong className="block text-sm text-[var(--sb-text)]">{inherited}</strong>Inherited</div>
        <div className="border-x border-[var(--sb-border-soft)] p-2"><strong className="block text-sm text-[var(--sb-success)]">{allowed}</strong>Allowed</div>
        <div className="p-2"><strong className="block text-sm text-[var(--sb-danger)]">{denied}</strong>Denied</div>
      </div>

      {protectedRole ? <p className="mb-3 border border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] p-2 text-xs text-[var(--sb-warning)]">Super Admin / Owner permissions are protected and cannot be overridden.</p> : null}
      {!canManage ? <p className="mb-3 text-xs text-muted-foreground">You can view effective access but cannot change overrides.</p> : null}

      <form action={updateAction} className="space-y-3">
        {groups.map(([module, modulePermissions]) => (
          <details key={module} className="border border-[var(--sb-border-soft)]">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-amber-700)]">
              {friendlyModule(module)} <span className="font-normal text-muted-foreground">({modulePermissions.length})</span>
            </summary>
            <div className="divide-y border-t border-[var(--sb-border-soft)]">
              {modulePermissions.map((permission) => (
                <div key={permission.id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{permission.description ?? `Can ${actionLabels[permission.action] ?? "manage"}`}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Role default: {permission.roleDefault ? "Can access" : "Restricted"} · Effective: <span className={permission.effective ? "text-[var(--sb-success)]" : "text-[var(--sb-danger)]"}>{effectiveLabel(permission)}</span></p>
                    <details className="mt-1 text-[11px] text-muted-foreground"><summary className="cursor-pointer">Technical details</summary><code className="mt-1 block truncate">{permission.permission_code}</code></details>
                  </div>
                  <SelectNative name={`permission:${permission.id}`} defaultValue={permission.override ?? "inherit"} disabled={disabled} aria-label={`Override ${permission.permission_code}`}>
                    <option value="inherit">Inherit</option>
                    <option value="allow">Allow</option>
                    <option value="deny">Deny</option>
                  </SelectNative>
                </div>
              ))}
            </div>
          </details>
        ))}
        {canManage && !protectedRole ? (
          <div className="flex flex-wrap justify-end gap-2">
            <SubmitButton type="submit" pendingLabel="Saving overrides...">Save overrides</SubmitButton>
          </div>
        ) : null}
      </form>
      {canManage && !protectedRole && (allowed || denied) ? (
        <form action={resetAction} className="mt-2 flex justify-end">
          <Button type="submit" variant="outline">Reset to role defaults</Button>
        </form>
      ) : null}
    </RecordSection>
  );
}
