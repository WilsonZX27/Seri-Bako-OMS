import { ArrowRight, MapPin, Warehouse } from "lucide-react";
import { RecordSection } from "@/components/record-workspace";
import { SelectNative } from "@/components/ui/select-native";
import { SubmitButton } from "@/components/ui/submit-button";
import type { BranchType } from "@/types/database";

type BranchOption = { id: string; branch_code: string; branch_name: string; branch_type: BranchType };
type SupplyRoute = { source_branch_id: string; destination_branch_id: string };

export type BranchSupplyRouteContext = {
  available: boolean;
  centralKitchens: BranchOption[];
  outlets: BranchOption[];
  routes: SupplyRoute[];
};

export function BranchSupplyRouteForm({ branch, context, action }: {
  branch: BranchOption;
  context: BranchSupplyRouteContext;
  action: (formData: FormData) => void | Promise<void>;
}) {
  if (branch.branch_type !== "outlet" && branch.branch_type !== "central_kitchen") return null;
  const sourceByOutlet = new Map(context.routes.map((route) => [route.destination_branch_id, route.source_branch_id]));
  const kitchenById = new Map(context.centralKitchens.map((kitchen) => [kitchen.id, kitchen]));
  const selectedKitchenId = sourceByOutlet.get(branch.id) ?? "";
  const suppliedOutletIds = new Set(context.routes.filter((route) => route.source_branch_id === branch.id).map((route) => route.destination_branch_id));

  return (
    <RecordSection title="Supply Route" description={branch.branch_type === "outlet" ? "Choose the Central Kitchen responsible for supplying this outlet." : "Choose every outlet supplied by this Central Kitchen."}>
      {!context.available ? (
        <div className="rounded-[var(--sb-radius-control)] border border-[var(--sb-warning-border)] bg-[var(--sb-warning-bg)] p-3 text-sm text-[var(--sb-warning-text)]">
          Supply-route setup is awaiting the latest database migration. Existing branch details remain editable.
        </div>
      ) : (
        <form action={action} className="space-y-3">
          {branch.branch_type === "outlet" ? (
            <label className="grid max-w-xl gap-1.5 text-sm font-medium">
              Primary Central Kitchen <span className="text-destructive">*</span>
              <SelectNative name="related_branch_id" defaultValue={selectedKitchenId} required>
                <option value="" disabled>Select a Central Kitchen</option>
                {context.centralKitchens.map((kitchen) => <option key={kitchen.id} value={kitchen.id}>{kitchen.branch_name} ({kitchen.branch_code})</option>)}
              </SelectNative>
              <span className="text-xs font-normal text-muted-foreground">This controls Kitchen access, dispatch ownership, and Qty Sent confirmation for the outlet.</span>
            </label>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {context.outlets.map((outlet) => {
                const currentSource = sourceByOutlet.get(outlet.id);
                const currentKitchen = currentSource ? kitchenById.get(currentSource) : null;
                return (
                  <label key={outlet.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white px-3 py-2 text-sm">
                    <input type="checkbox" name="related_branch_id" value={outlet.id} defaultChecked={suppliedOutletIds.has(outlet.id)} className="h-4 w-4 shrink-0 accent-[var(--sb-green-700)]" />
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{outlet.branch_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{outlet.branch_code}{currentKitchen && currentKitchen.id !== branch.id ? ` · currently ${currentKitchen.branch_name}` : ""}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-[var(--sb-border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Warehouse className="h-4 w-4" /><span>Changes update the active primary route immediately.</span><ArrowRight className="hidden h-3.5 w-3.5 sm:block" /></div>
            <SubmitButton type="submit" pendingLabel="Saving route..." className="sm:min-w-40">Save Supply Route</SubmitButton>
          </div>
        </form>
      )}
    </RecordSection>
  );
}
