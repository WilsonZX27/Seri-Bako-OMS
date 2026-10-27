import { SelectControl } from "@/components/ui/select-control";
import { SubmitButton } from "@/components/ui/submit-button";

export function PurchaseRequestSupplierRecovery({ installed, suppliers, updatedAt, action }: {
  installed: boolean;
  suppliers: Array<{ id: string; name: string }> | null;
  updatedAt: string;
  action: (formData: FormData) => Promise<void>;
}) {
  if (!installed) return <p role="status" className="text-xs text-muted-foreground">Supplier selection is not available yet. Database installation and verification are pending; this request has not changed.</p>;
  if (suppliers === null) return <p role="status" className="text-xs text-muted-foreground">Supplier options are unavailable. Reload before selecting a supplier.</p>;
  if (!suppliers.length) return <p role="status" className="text-xs text-muted-foreground">No active supplier is available. Review supplier setup before continuing.</p>;
  return <form action={action} className="space-y-2">
    <input type="hidden" name="expected_updated_at" value={updatedAt} />
    <p className="text-xs text-muted-foreground">Select the PR supplier before matching items. The supplier must have an eligible item relationship for this branch. Quantities, prices and approval status stay unchanged.</p>
    <SelectControl name="supplier_id" ariaLabel="PR supplier" placeholder="Select an active supplier" startEmpty required searchable options={suppliers.map(supplier => ({ value: supplier.id, label: supplier.name }))} />
    <label className="flex items-start gap-2 text-xs text-muted-foreground"><input type="checkbox" name="confirm_supplier" value="yes" required className="mt-0.5 h-4 w-4" />I have checked the supplier. This selection is recorded in the audit history.</label>
    <SubmitButton className="w-full justify-center" pendingLabel="Selecting supplier...">Select PR supplier</SubmitButton>
  </form>;
}
