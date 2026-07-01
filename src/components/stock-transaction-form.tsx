import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { getToday } from "@/lib/utils";
import type { Database, StockTransactionType } from "@/types/database";
import Link from "next/link";
import { ScanLine } from "lucide-react";

type Item = Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit" | "status">;
type Location = Pick<Database["public"]["Tables"]["locations"]["Row"], "id" | "location_code" | "location_name" | "status">;

const types: { value: StockTransactionType; label: string; direction: "in" | "out" | "flex" }[] = [
  { value: "opening_balance", label: "Opening Balance", direction: "in" },
  { value: "purchase", label: "Purchase", direction: "in" },
  { value: "production_output", label: "Production Output", direction: "in" },
  { value: "transfer_in", label: "Transfer In", direction: "in" },
  { value: "extra", label: "Extra", direction: "in" },
  { value: "customer_return", label: "Customer Return", direction: "in" },
  { value: "production_usage", label: "Production Usage", direction: "out" },
  { value: "transfer_out", label: "Transfer Out", direction: "out" },
  { value: "wastage", label: "Wastage", direction: "out" },
  { value: "damage", label: "Damage", direction: "out" },
  { value: "missing", label: "Missing", direction: "out" },
  { value: "return_to_supplier", label: "Return To Supplier", direction: "out" },
  { value: "stock_adjustment", label: "Stock Adjustment", direction: "flex" },
  { value: "stock_count_adjustment", label: "Stock Count Adjustment", direction: "flex" },
  { value: "correction", label: "Correction", direction: "flex" },
  { value: "transfer", label: "Transfer", direction: "flex" },
];

type StockTransactionFormProps = {
  items: Item[];
  locations: Location[];
  action: (formData: FormData) => Promise<void>;
};

export function StockTransactionForm({ items, locations, action }: StockTransactionFormProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button asChild type="button" variant="outline" size="sm">
            <Link href="/stock-transfer/scan"><ScanLine className="mr-2 h-4 w-4" /> Transfer scan</Link>
          </Button>
          <Button asChild type="button" variant="outline" size="sm">
            <Link href="/stock-wastage/scan"><ScanLine className="mr-2 h-4 w-4" /> Wastage scan</Link>
          </Button>
        </div>
        <form action={action} className="grid gap-4 md:grid-cols-3">
          <Field label="Transaction Date">
            <Input name="transaction_date" type="date" defaultValue={getToday()} required />
          </Field>
          <Field label="Item">
            <SelectNative name="item_id" required>
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item_code} - {item.item_name} ({item.base_unit})
                </option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Location">
            <SelectNative name="location_id" required>
              <option value="">Select location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.location_code} - {location.location_name}
                </option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Transaction Type">
            <SelectNative name="transaction_type" required>
              {types.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Direction">
            <SelectNative name="direction" defaultValue="in" required>
              <option value="in">Increase stock</option>
              <option value="out">Reduce stock</option>
            </SelectNative>
          </Field>
          <Field label="Quantity in Base Unit">
            <Input name="quantity" type="number" step="0.0001" min="0.0001" required />
          </Field>
          <Field label="Unit Cost">
            <Input name="unit_cost" type="number" step="0.0001" min="0" />
          </Field>
          <Field label="From Location">
            <SelectNative name="from_location_id">
              <option value="">Not applicable</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.location_name}
                </option>
              ))}
            </SelectNative>
          </Field>
          <Field label="To Location">
            <SelectNative name="to_location_id">
              <option value="">Not applicable</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.location_name}
                </option>
              ))}
            </SelectNative>
          </Field>
          <div className="md:col-span-3">
            <Field label="Remarks">
              <Textarea name="remarks" placeholder="Reason, batch note, or manual reference." />
            </Field>
          </div>
          <div className="flex justify-end md:col-span-3">
            <Button type="submit">Post stock transaction</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
