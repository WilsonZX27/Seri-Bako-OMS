import { ItemImageInput } from "@/components/item-image-input";
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
type Branch = Pick<Database["public"]["Tables"]["branches"]["Row"], "id" | "branch_code" | "branch_name" | "status">;

type ItemFormProps = {
  item?: Item;
  suppliers: Supplier[];
  action: (formData: FormData) => Promise<void>;
  formId?: string;
  showSubmit?: boolean;
  canCreateSupplier?: boolean;
  canCreateSourcing?: boolean;
  branches?: Branch[];
  categories?: string[];
};

export function ItemForm({ item, suppliers, action, formId, showSubmit = true, canCreateSupplier = false, canCreateSourcing = false, branches = [], categories = [] }: ItemFormProps) {
  return (
    <form id={formId} action={action} className="space-y-4">
      <RecordSection title="Identity" description="Item code, name, category, and operational status.">
        <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
          <Field label="Item Image">
            <ItemImageInput currentUrl={item?.item_image_url} name={item?.item_name ?? "Item image"} />
          </Field>
          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Item Code" required><Input name="item_code" defaultValue={item?.item_code ?? ""} required /></Field>
            <Field label="AutoCount Code"><Input name="autocount_code" defaultValue={item?.autocount_code ?? ""} /></Field>
            <Field label="Item Name" required><Input name="item_name" defaultValue={item?.item_name ?? ""} required /></Field>
            <Field label="Brand"><Input name="brand_name" defaultValue={item?.brand_name ?? ""} placeholder="Brand" /></Field>
            <Field label="Category" required><Input list="item-category-options" name="category" defaultValue={item?.category ?? ""} placeholder="Choose or enter a category" required /><datalist id="item-category-options">{categories.map(category => <option key={category} value={category} />)}</datalist></Field>
          </div>
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

      <RecordSection title="Default sourcing" description="Optional supplier terms used by purchasing.">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <Field label="Supplier">
            <SupplierCombobox suppliers={suppliers} initialSupplierId={item?.supplier_id} />
          </Field>
          {canCreateSupplier ? <div className="flex items-start md:self-start md:pt-6">
            <Button asChild type="button" variant="outline" className="w-full md:w-auto">
              <Link href="/suppliers/new">Create supplier</Link>
            </Button>
          </div> : null}
        </div>
        {!item && canCreateSourcing ? <details className="group mt-4 rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span>Supplier terms & branch availability</span><span className="text-xs font-normal text-muted-foreground group-open:hidden">Optional</span>
          </summary>
          <div className="grid gap-4 border-t p-3 md:grid-cols-2">
            <Field label="Supplier purchase UOM"><SelectNative name="supplier_purchase_uom" defaultValue="KG">{uomOptionsWithCurrent("KG").map((uom) => <option key={uom} value={uom}>{uom}</option>)}</SelectNative></Field>
            <Field label="Conversion to base UOM"><Input name="supplier_conversion_to_base_uom" type="number" step="0.000001" min="0.000001" defaultValue={1} /></Field>
            <Field label="Supplier unit cost"><Input name="supplier_unit_cost" type="number" step="0.0001" min="0" defaultValue={0} /></Field>
            <Field label="Supplier MOQ"><Input name="supplier_moq" type="number" step="0.0001" min="0" defaultValue={0} /></Field>
            <Field label="Supplier lead time (days)"><Input name="supplier_lead_time_days" type="number" min="0" defaultValue={0} /></Field>
            {branches.length ? <fieldset className="grid gap-2 md:col-span-2">
              <legend className="text-sm font-medium">Available branches</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{branches.map((branch) => <label key={branch.id} className="flex min-h-10 items-center gap-2 rounded-[var(--sb-radius-control)] border bg-white px-3 py-2 text-sm"><input type="checkbox" name="branch_ids" value={branch.id} className="h-4 w-4 accent-[var(--sb-brand)]" /><span className="min-w-0 truncate">{branch.branch_name}</span></label>)}</div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" name="supplier_preferred" value="true" className="h-4 w-4 accent-[var(--sb-brand)]" />Preferred supplier for selected branches</label>
            </fieldset> : null}
          </div>
        </details> : null}
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
