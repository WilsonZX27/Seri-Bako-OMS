import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { BarcodeFields } from "@/components/barcode-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatNumber } from "@/lib/utils";
import type { Database } from "@/types/database";

type Item = Database["public"]["Tables"]["items"]["Row"];
type Supplier = Pick<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "name" | "supplier_code" | "status">;

type ItemFormProps = {
  item?: Item;
  suppliers: Supplier[];
  currentStock?: number;
  initialBarcode?: string;
  action: (formData: FormData) => Promise<void>;
};

export function ItemForm({ item, suppliers, currentStock, initialBarcode, action }: ItemFormProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="grid gap-4 md:grid-cols-3">
          <Field label="Item Code">
            <Input name="item_code" defaultValue={item?.item_code ?? ""} required />
          </Field>
          <Field label="AutoCount Code">
            <Input name="autocount_code" defaultValue={item?.autocount_code ?? ""} />
          </Field>
          <Field label="Item Name">
            <Input name="item_name" defaultValue={item?.item_name ?? ""} required />
          </Field>
          <Field label="Category">
            <Input name="category" defaultValue={item?.category ?? ""} placeholder="Flour, Dairy, Packaging" required />
          </Field>
          <Field label="Supplier">
            <SelectNative name="supplier_id" defaultValue={item?.supplier_id ?? ""}>
              <option value="">No supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Status">
            <SelectNative name="status" defaultValue={item?.status ?? "active"}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectNative>
          </Field>
          <Field label="Item Image URL">
            <Input name="item_image_url" defaultValue={item?.item_image_url ?? ""} placeholder="https://..." />
          </Field>
          <Field label="Base Unit">
            <Input name="base_unit" defaultValue={item?.base_unit ?? ""} placeholder="kg" required />
          </Field>
          <Field label="Cost">
            <Input name="cost" type="number" step="0.0001" min="0" defaultValue={item?.cost ?? 0} />
          </Field>
          <Field label="Safety Stock">
            <Input name="safety_stock" type="number" step="0.0001" min="0" defaultValue={item?.safety_stock ?? 0} />
          </Field>
          <div className="rounded-md border bg-secondary/50 p-3">
            <p className="text-sm font-medium">Current Stock</p>
            <p className="mt-1 text-lg font-semibold">
              {currentStock === undefined ? "-" : formatNumber(currentStock)} {item?.base_unit ?? ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Calculated from stock transactions.</p>
          </div>
          <BarcodeFields
            barcode={item?.barcode ?? initialBarcode}
            qrCode={item?.qr_code}
            supplierBarcode={item?.supplier_barcode}
            internalBarcode={item?.internal_barcode}
            barcodeType={item?.barcode_type}
            barcodeImageUrl={item?.barcode_image_url}
            showSupplierBarcode
          />
          <div className="grid gap-4 md:col-span-3 md:grid-cols-2">
            <div className="rounded-lg border bg-secondary/30 p-4">
              <p className="text-sm font-semibold">Item Image</p>
              {item?.item_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.item_image_url} alt={item.item_name} className="mt-3 aspect-video w-full rounded-md border object-cover" />
              ) : (
                <div className="mt-3 flex aspect-video items-center justify-center rounded-md border bg-background text-sm text-muted-foreground">
                  No image uploaded yet
                </div>
              )}
            </div>
            <div className="rounded-lg border bg-secondary/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Attachments / Certificates</p>
                <span className="rounded-full bg-background px-2 py-1 text-xs text-muted-foreground">0 files</span>
              </div>
              <div className="mt-3 rounded-md border bg-background p-3 text-sm text-muted-foreground">
                Halal certificates, supplier COA, packaging specifications, and SDS documents will appear here once shared attachments are enabled.
              </div>
            </div>
          </div>
          <input type="hidden" name="purchase_unit" value={item?.purchase_unit ?? ""} />
          <input type="hidden" name="conversion_to_base_unit" value={item?.conversion_to_base_unit ?? 1} />
          <input type="hidden" name="moq" value={item?.moq ?? 0} />
          <input type="hidden" name="lead_time_days" value={item?.lead_time_days ?? 0} />
          <div className="flex justify-end md:col-span-3">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">{item ? "Save item" : "Create item"}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
