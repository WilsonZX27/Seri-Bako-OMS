import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/types/database";

type ItemOption = Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit" | "status">;
type SupplierOption = Pick<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "supplier_code" | "name" | "status">;
type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };
type LocationOption = { id: string; branch_id?: string | null; location_code: string; location_name: string; status: string };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ItemSelect({ items, name = "line_item_id", required = false }: { items: ItemOption[]; name?: string; required?: boolean }) {
  return (
    <SelectNative name={name} required={required}>
      <option value="">Select item</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.item_code} - {item.item_name} - {item.base_unit}
        </option>
      ))}
    </SelectNative>
  );
}

export function PurchaseRequestForm({
  items,
  suppliers,
  branches,
  locations,
  action,
}: {
  items: ItemOption[];
  suppliers: SupplierOption[];
  branches: BranchOption[];
  locations: LocationOption[];
  action: (formData: FormData) => Promise<void>;
}) {
  const requestNo = `PR-${Date.now().toString().slice(-6)}`;
  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Request No">
              <Input name="request_no" defaultValue={requestNo} required />
            </Field>
            <Field label="Request Date">
              <Input name="request_date" type="date" defaultValue={today()} required />
            </Field>
            <Field label="Required Date">
              <Input name="required_date" type="date" />
            </Field>
            <Field label="Priority">
              <SelectNative name="priority" defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </SelectNative>
              <p className="mt-1 text-xs text-muted-foreground">Use urgent or critical when production or outlet service may be affected.</p>
            </Field>
            <Field label="Needed By">
              <Input name="needed_by_date" type="date" />
            </Field>
            <Field label="Branch">
              <SelectNative name="branch_id" defaultValue={branches[0]?.id ?? ""} required>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
              </SelectNative>
              <p className="mt-1 text-xs text-muted-foreground">Stock will be recorded under this branch&apos;s default location.</p>
            </Field>
            <Field label="Status">
              <SelectNative name="status" defaultValue="draft">
                <option value="draft">Draft</option>
              </SelectNative>
            </Field>
            <details className="rounded-md border bg-secondary/20 p-3 md:col-span-3">
              <summary className="cursor-pointer text-sm font-medium">Advanced location</summary>
              <div className="mt-3 max-w-sm">
                <Field label="Specific Location">
                  <SelectNative name="location_id" defaultValue="">
                    <option value="">Use branch default location</option>
                    {locations.map((location) => <option key={location.id} value={location.id}>{location.location_name}</option>)}
                  </SelectNative>
                </Field>
              </div>
            </details>
            <div className="md:col-span-3">
              <Field label="Remarks">
                <Textarea name="remarks" placeholder="Reason for purchasing request" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Urgency Reason">
                <Input name="urgency_reason" placeholder="Example: production batch blocked by missing ingredient" />
              </Field>
            </div>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <input type="checkbox" name="production_risk" className="h-4 w-4" />
              Production risk
            </label>
          </div>

          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b bg-secondary/40 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Request Lines</p>
                <p className="text-xs text-muted-foreground">Search by item image, barcode, item code, or name in the item selector.</p>
              </div>
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="divide-y">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="grid gap-3 p-4 lg:grid-cols-[2fr_100px_90px_130px_1.4fr_1fr_1fr]">
                  <ItemSelect items={items} required={index === 0} />
                  <Input name="line_qty" type="number" min="0.0001" step="0.0001" placeholder="Qty" required={index === 0} />
                  <Input name="line_uom" placeholder="UOM" defaultValue={items[index]?.base_unit ?? ""} required={index === 0} />
                  <Input name="line_estimated_unit_cost" type="number" min="0" step="0.0001" placeholder="Cost" defaultValue={0} />
                  <SelectNative name="line_suggested_supplier_id" defaultValue="">
                    <option value="">Supplier suggestion</option>
                    {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                  </SelectNative>
                  <Input name="line_reason" placeholder="Reason" defaultValue={index === 0 ? "Low stock" : ""} />
                  <Input name="line_remarks" placeholder="Remarks" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Create purchase request</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PurchaseOrderForm({
  items,
  suppliers,
  action,
}: {
  items: ItemOption[];
  suppliers: SupplierOption[];
  action: (formData: FormData) => Promise<void>;
}) {
  const poNo = `PO-${Date.now().toString().slice(-6)}`;
  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="PO No">
              <Input name="po_no" defaultValue={poNo} required />
            </Field>
            <Field label="Supplier">
              <SelectNative name="supplier_id" defaultValue={suppliers[0]?.id ?? ""} required>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </SelectNative>
            </Field>
            <Field label="Order Date">
              <Input name="order_date" type="date" defaultValue={today()} required />
            </Field>
            <Field label="Expected Delivery">
              <Input name="expected_delivery_date" type="date" />
            </Field>
            <Field label="Status">
              <SelectNative name="status" defaultValue="draft">
                <option value="draft">Draft</option>
              </SelectNative>
            </Field>
            <Field label="Approval Status">
              <SelectNative name="approval_status" defaultValue="draft">
                <option value="draft">Draft</option>
              </SelectNative>
            </Field>
            <div className="md:col-span-3">
              <Field label="Remarks">
                <Textarea name="remarks" placeholder="Supplier ordering remarks" />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="border-b bg-secondary/40 px-4 py-3">
              <p className="text-sm font-semibold">PO Lines</p>
              <p className="text-xs text-muted-foreground">Pending quantity is calculated from ordered minus received and cancelled.</p>
            </div>
            <div className="divide-y">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="grid gap-3 p-4 lg:grid-cols-[2fr_120px_120px_120px_90px_130px]">
                  <ItemSelect items={items} required={index === 0} />
                  <Input name="line_qty_ordered" type="number" min="0.0001" step="0.0001" placeholder="Ordered" required={index === 0} />
                  <Input name="line_qty_received" type="number" min="0" step="0.0001" placeholder="Received" defaultValue={0} />
                  <Input name="line_qty_cancelled" type="number" min="0" step="0.0001" placeholder="Cancelled" defaultValue={0} />
                  <Input name="line_uom" placeholder="UOM" defaultValue={items[index]?.base_unit ?? ""} required={index === 0} />
                  <Input name="line_unit_price" type="number" min="0" step="0.0001" placeholder="Unit price" defaultValue={0} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Create purchase order</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
