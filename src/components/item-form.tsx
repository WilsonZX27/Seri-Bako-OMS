import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { RecordSection } from "@/components/record-workspace";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { SupplierCombobox } from "@/components/supplier-combobox";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { normalizeUom, uomOptionsWithCurrent } from "@/lib/uom";
import type { Database } from "@/types/database";

type Item = Database["public"]["Tables"]["items"]["Row"];
type Supplier = Pick<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "name" | "supplier_code" | "status">;

type ItemFormProps = {
  item?: Item;
  suppliers: Supplier[];
  action: (formData: FormData) => Promise<void>;
  formId?: string;
  showSubmit?: boolean;
  canCreateSupplier?: boolean;
};

export function ItemForm({ item, suppliers, action, formId, showSubmit = true, canCreateSupplier = false }: ItemFormProps) {
  return (
    <form id={formId} action={action} className="space-y-4">
      <RecordSection title="Identity" description="Item code, name, category, and operational status.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Item Code" required>
            <Input name="item_code" defaultValue={item?.item_code ?? ""} required />
          </Field>
          <Field label="AutoCount Code">
            <Input name="autocount_code" defaultValue={item?.autocount_code ?? ""} />
          </Field>
          <Field label="Item Name" required>
            <Input name="item_name" defaultValue={item?.item_name ?? ""} required />
          </Field>
          <Field label="Category" required>
            <Input name="category" defaultValue={item?.category ?? ""} placeholder="Flour, Dairy, Packaging" required />
          </Field>
          <Field label="Item Image">
            <Input name="item_image" type="file" accept="image/png,image/jpeg,image/webp" />
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, or WEBP. Leave empty to keep the current image.</p>
          </Field>
        </div>
      </RecordSection>

      <RecordSection title="Inventory Controls" description="Stock units, safety level, and cost.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Base Unit" required>
            <SelectNative name="base_unit" defaultValue={normalizeUom(item?.base_unit) || "KG"} required>
              {uomOptionsWithCurrent(item?.base_unit).map((uom) => (
                <option key={uom} value={uom}>{uom}</option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Purchase Unit" required>
            <SelectNative name="purchase_unit" defaultValue={normalizeUom(item?.purchase_unit ?? item?.base_unit) || "KG"} required>
              {uomOptionsWithCurrent(item?.purchase_unit ?? item?.base_unit).map((uom) => (
                <option key={uom} value={uom}>{uom}</option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Cost">
            <Input name="cost" type="number" step="0.0001" min="0" defaultValue={item?.cost ?? 0} />
          </Field>
          <Field label="Safety Stock">
            <Input name="safety_stock" type="number" step="0.0001" min="0" defaultValue={item?.safety_stock ?? 0} />
          </Field>
        </div>
      </RecordSection>

      <RecordSection title="Supplier & Usage" description="Optional default supplier used by purchasing workflows.">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <Field label="Supplier">
            <SupplierCombobox suppliers={suppliers} initialSupplierId={item?.supplier_id} />
          </Field>
          {canCreateSupplier ? <div>
            <Button asChild type="button" variant="outline" size="sm">
              <Link href="/suppliers/new">Create supplier</Link>
            </Button>
          </div> : null}
        </div>
      </RecordSection>

      <input type="hidden" name="conversion_to_base_unit" value={item?.conversion_to_base_unit ?? 1} />
      <input type="hidden" name="moq" value={item?.moq ?? 0} />
      <input type="hidden" name="lead_time_days" value={item?.lead_time_days ?? 0} />
      {showSubmit ? (
        <Card>
          <CardContent className="flex justify-end gap-2 p-3">
            <Button asChild type="button" variant="outline"><Link href="/items">Cancel</Link></Button>
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">{item ? "Save item" : "Create item"}</SubmitButton>
          </CardContent>
        </Card>
      ) : null}
    </form>
  );
}
