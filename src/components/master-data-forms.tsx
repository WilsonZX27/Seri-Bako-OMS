import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { normalizeUom, uomOptionsWithCurrent } from "@/lib/uom";
import type { Database } from "@/types/database";

type SupplierItem = Database["public"]["Tables"]["supplier_items"]["Row"];
type UomConversion = Database["public"]["Tables"]["uom_conversions"]["Row"];
type Supplier = Pick<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "name" | "supplier_code">;
type Item = Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit">;

function StatusSelect({ value }: { value?: string }) {
  return (
    <SelectNative name="status" defaultValue={value ?? "active"}>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
      <option value="archived">Archived</option>
    </SelectNative>
  );
}

export function SupplierItemForm({
  supplierItem,
  suppliers,
  items,
  action,
  formId,
  showSubmit = true,
}: {
  supplierItem?: SupplierItem;
  suppliers: Supplier[];
  items: Item[];
  action: (formData: FormData) => Promise<void>;
  formId?: string;
  showSubmit?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <form id={formId} action={action} className="grid gap-4 pb-20 md:grid-cols-3 md:pb-0">
          <Field label="Supplier">
            <SelectNative name="supplier_id" defaultValue={supplierItem?.supplier_id ?? suppliers[0]?.id ?? ""} required>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Item">
            <SelectNative name="item_id" defaultValue={supplierItem?.item_id ?? items[0]?.id ?? ""} required>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item_code} - {item.item_name}
                </option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Status">
            <StatusSelect value={supplierItem?.status} />
          </Field>
          <Field label="Supplier Item Code">
            <Input name="supplier_item_code" defaultValue={supplierItem?.supplier_item_code ?? ""} required />
          </Field>
          <Field label="Supplier Item Name">
            <Input name="supplier_item_name" defaultValue={supplierItem?.supplier_item_name ?? ""} required />
          </Field>
          <Field label="Purchase UOM">
            <SelectNative name="purchase_uom" defaultValue={normalizeUom(supplierItem?.purchase_uom) || "KG"} required>
              {uomOptionsWithCurrent(supplierItem?.purchase_uom).map((uom) => (
                <option key={uom} value={uom}>{uom}</option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Conversion to Base UOM">
            <Input name="conversion_to_base_uom" type="number" step="0.000001" min="0.000001" defaultValue={supplierItem?.conversion_to_base_uom ?? 1} required />
          </Field>
          <Field label="Unit Cost">
            <Input name="unit_cost" type="number" step="0.0001" min="0" defaultValue={supplierItem?.unit_cost ?? 0} required />
          </Field>
          <Field label="MOQ">
            <Input name="moq" type="number" step="0.0001" min="0" defaultValue={supplierItem?.moq ?? 0} required />
          </Field>
          <Field label="Lead Time Days">
            <Input name="lead_time_days" type="number" min="0" defaultValue={supplierItem?.lead_time_days ?? 0} required />
          </Field>
          <Field label="Valid From">
            <Input name="valid_from" type="date" defaultValue={supplierItem?.valid_from ?? ""} />
          </Field>
          <Field label="Valid To">
            <Input name="valid_to" type="date" defaultValue={supplierItem?.valid_to ?? ""} />
          </Field>
          {showSubmit ? <div className="sb-mobile-action-bar fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-[var(--sb-z-sticky)] p-2 md:static md:flex md:justify-end md:bg-transparent md:p-0 md:shadow-none md:col-span-3">
            <Button type="submit" className="w-full md:w-auto">{supplierItem ? "Save supplier item" : "Create supplier item"}</Button>
          </div> : null}
        </form>
      </CardContent>
    </Card>
  );
}

export function UomConversionForm({ conversion, action, formId, showSubmit = true }: { conversion?: UomConversion; action: (formData: FormData) => Promise<void>; formId?: string; showSubmit?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <form id={formId} action={action} className="grid gap-4 pb-20 md:grid-cols-2 md:pb-0">
          <Field label="From UOM">
            <SelectNative name="from_uom" defaultValue={normalizeUom(conversion?.from_uom) || "KG"} required>
              {uomOptionsWithCurrent(conversion?.from_uom).map((uom) => (
                <option key={uom} value={uom}>{uom}</option>
              ))}
            </SelectNative>
          </Field>
          <Field label="To UOM">
            <SelectNative name="to_uom" defaultValue={normalizeUom(conversion?.to_uom) || "G"} required>
              {uomOptionsWithCurrent(conversion?.to_uom).map((uom) => (
                <option key={uom} value={uom}>{uom}</option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Factor">
            <Input name="factor" type="number" min="0.00000001" step="0.00000001" defaultValue={conversion?.factor ?? 1} required />
          </Field>
          <Field label="Status">
            <StatusSelect value={conversion?.status} />
          </Field>
          <div className="rounded-[var(--sb-radius-control)] border bg-secondary/50 p-3 md:col-span-2">
            <p className="text-sm font-medium">Preview</p>
            <p className="mt-1 text-sm text-muted-foreground">1 {conversion?.from_uom ?? "from UOM"} = {conversion?.factor ?? 1} {conversion?.to_uom ?? "to UOM"}</p>
          </div>
          {showSubmit ? <div className="sb-mobile-action-bar fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-[var(--sb-z-sticky)] p-2 md:static md:flex md:justify-end md:bg-transparent md:p-0 md:shadow-none md:col-span-2">
            <Button type="submit" className="w-full md:w-auto">{conversion ? "Save conversion" : "Create conversion"}</Button>
          </div> : null}
        </form>
      </CardContent>
    </Card>
  );
}
