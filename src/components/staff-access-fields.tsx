"use client";

import { useEffect, useMemo, useState } from "react";
import { Field } from "@/components/ui/field";
import { SelectControl } from "@/components/ui/select-control";

type Branch = {
  id: string;
  branch_name: string;
  branch_type: "central_kitchen" | "outlet" | "event_booth" | "office" | "other";
};

type Role = { id: string; role_code: string; role_name: string };

type Access = {
  roleId?: string | null;
  defaultBranchId?: string | null;
  branchIds?: string[];
};

function eligibleBranches(branches: Branch[], roleCode: string | undefined) {
  if (roleCode === "kitchen") return branches.filter((branch) => branch.branch_type === "central_kitchen");
  if (roleCode === "outlet_staff") return branches.filter((branch) => branch.branch_type === "outlet");
  return branches;
}

export function StaffAccessFields({ branches, roles, access }: { branches: Branch[]; roles: Role[]; access?: Access }) {
  const [roleId, setRoleId] = useState(access?.roleId ?? roles[0]?.id ?? "");
  const roleCode = roles.find((role) => role.id === roleId)?.role_code;
  const availableBranches = useMemo(() => eligibleBranches(branches, roleCode), [branches, roleCode]);
  const [defaultBranchId, setDefaultBranchId] = useState(access?.defaultBranchId ?? availableBranches[0]?.id ?? "");
  const [branchIds, setBranchIds] = useState(() => access?.branchIds?.length ? access.branchIds : (defaultBranchId ? [defaultBranchId] : []));

  useEffect(() => {
    const availableIds = new Set(availableBranches.map((branch) => branch.id));
    const nextDefault = availableIds.has(defaultBranchId) ? defaultBranchId : (availableBranches[0]?.id ?? "");
    setDefaultBranchId(nextDefault);
    setBranchIds((current) => {
      const eligible = current.filter((id) => availableIds.has(id));
      return nextDefault && !eligible.includes(nextDefault) ? [...eligible, nextDefault] : eligible;
    });
  }, [availableBranches, defaultBranchId]);

  const branchHelp = roleCode === "kitchen"
    ? "Kitchen staff can be assigned only to Central Kitchen branches."
    : roleCode === "outlet_staff"
      ? "Outlet staff can be assigned only to Outlet branches."
      : "Select the operating branches this staff member may access.";

  function toggleBranch(id: string, checked: boolean) {
    setBranchIds((current) => checked ? [...new Set([...current, id])] : current.filter((branchId) => branchId !== id || branchId === defaultBranchId));
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Role" required>
        <SelectControl name="role_id" value={roleId} onValueChange={setRoleId} options={roles.map((role) => ({ value: role.id, label: role.role_name }))} ariaLabel="Role" required className="form-control-compact" />
      </Field>
      <Field label="Default Branch" required>
        <SelectControl name="default_branch_id" value={defaultBranchId} onValueChange={setDefaultBranchId} options={availableBranches.map((branch) => ({ value: branch.id, label: branch.branch_name }))} ariaLabel="Default Branch" required disabled={!availableBranches.length} className="form-control-compact" />
      </Field>
      <div className="md:col-span-2">
        <Field label="Accessible Branches" required>
          <p className="mb-2 text-xs text-muted-foreground">{branchHelp}</p>
          {availableBranches.length ? (
            <div className="grid gap-2 rounded-[2px] border p-3 md:grid-cols-2">
              {availableBranches.map((branch) => {
                const isDefault = branch.id === defaultBranchId;
                return (
                  <label key={branch.id} className="flex min-h-10 items-center gap-2 text-sm">
                    {isDefault ? <input type="hidden" name="accessible_branch_ids" value={branch.id} /> : null}
                    <input
                      type="checkbox"
                      name={isDefault ? undefined : "accessible_branch_ids"}
                      value={branch.id}
                      checked={branchIds.includes(branch.id)}
                      disabled={isDefault}
                      onChange={(event) => toggleBranch(branch.id, event.target.checked)}
                    />
                    <span>{branch.branch_name}{isDefault ? " (default)" : ""}</span>
                  </label>
                );
              })}
            </div>
          ) : <p className="rounded-[2px] border border-dashed p-3 text-sm text-muted-foreground">Create an eligible active branch before assigning this role.</p>}
        </Field>
      </div>
    </div>
  );
}
