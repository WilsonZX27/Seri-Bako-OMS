import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { getToday } from "@/lib/utils";
import type { Database, StockTransactionType } from "@/types/database";

type Item = Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit" | "status">;
type Location = Pick<Database["public"]["Tables"]["locations"]["Row"], "id" | "location_code" | "location_name" | "status">;
type Branch = Pick<Database["public"]["Tables"]["branches"]["Row"], "id" | "branch_code" | "branch_name" | "status">;

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
  branches: Branch[];
  locations: Location[];
  action: (formData: FormData) => Promise<void>;
};

export function StockTransactionForm({ items, branches, action }: StockTransactionFormProps) {
  return (
    <Card>
      <CardContent className="p-5">
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
          <Field label="Branch">
            <SelectNative name="branch_id" defaultValue={branches[0]?.id ?? ""} required>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name}
                </option>
              ))}
            </SelectNative>
            <p className="mt-1 text-xs text-muted-foreground">Select the outlet, kitchen, office, or event booth this record belongs to.</p>
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
          <div className="md:col-span-3">
            <Field label="Remarks">
              <Textarea name="remarks" placeholder="Reason, batch note, or manual reference." />
            </Field>
          </div>
          <div className="flex justify-end md:col-span-3">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Post stock transaction</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
