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
  const groups = Array.from(
    permissions.reduce((map, permission) => map.set(permission.module, [...(map.get(permission.module) ?? []), permission]), new Map<string, PermissionAccess[]>()),
  );
  const allowed = permissions.filter((permission) => permission.override === "allow").length;
  const denied = permissions.filter((permission) => permission.override === "deny").length;
  const inherited = permissions.length - allowed - denied;
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
          <details key={module} className="border border-[var(--sb-border-soft)]" open={groups.length <= 4}>
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-amber-700)]">
              {module.replaceAll("_", " ")} <span className="font-normal text-muted-foreground">({modulePermissions.length})</span>
            </summary>
            <div className="divide-y border-t border-[var(--sb-border-soft)]">
              {modulePermissions.map((permission) => (
                <div key={permission.id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{permission.description ?? permission.action.replaceAll("_", " ")}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{permission.permission_code}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Role: {permission.roleDefault ? "Allow" : "Deny"} · Effective: <span className={permission.effective ? "text-[var(--sb-success)]" : "text-[var(--sb-danger)]"}>{permission.effective ? "Allow" : "Deny"}</span></p>
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
