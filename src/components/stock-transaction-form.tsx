"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { FormPendingBridge, SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { getToday } from "@/lib/utils";
import type { Database, StockTransactionType } from "@/types/database";

type Item = Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit" | "status">;
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
  action: (formData: FormData) => Promise<void>;
  formId?: string;
  showSubmit?: boolean;
};

export function StockTransactionForm({ items, branches, action, formId, showSubmit = true }: StockTransactionFormProps) {
  const [itemId, setItemId] = useState("");
  const unit = items.find(item => item.id === itemId)?.base_unit;
  return (
    <Card className="border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-sm" data-stock-transaction-setup>
      <CardContent className="p-3 md:p-5">
        <form id={formId} action={action} className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {formId ? <FormPendingBridge formId={formId} /> : null}
          <Field label="Transaction Date" className="order-1 col-span-2 md:col-span-1">
            <Input name="transaction_date" type="date" defaultValue={getToday()} required />
          </Field>
          <Field label="Item" className="order-1 col-span-2 md:col-span-1">
            <SelectControl name="item_id" required value={itemId} onValueChange={selectedValue => setItemId(selectedValue)} ariaLabel={"Item"} options={[({value: "", label: "Select item"}), ...(items.map((item) => (
                ({value: String((item.id) ?? ""), label: [item.item_code, " - ", item.item_name, " (", item.base_unit, ")"].join("")})
              )))]}/>
          </Field>
          <Field label="Branch" className="order-1 col-span-2 md:col-span-1">
            <SelectControl name="branch_id" defaultValue={branches[0]?.id ?? ""} required ariaLabel={"Branch"} options={[...(branches.map((branch) => (
                ({value: String((branch.id) ?? ""), label: String((branch.branch_name) ?? "")})
              )))]}/>
          </Field>
          <Field label="Transaction Type" className="order-2">
            <SelectControl name="transaction_type" required ariaLabel={"Transaction Type"} options={[...(types.map((type) => (
                ({value: String((type.value) ?? ""), label: String((type.label) ?? "")})
              )))]}/>
          </Field>
          <Field label="Direction" className="order-2">
            <SelectControl name="direction" defaultValue="in" required ariaLabel={"Direction"} options={[({value: "in", label: "Increase stock"}), ({value: "out", label: "Reduce stock"})]}/>
          </Field>
          <Field label={unit ? `Quantity · ${unit}` : "Quantity in base unit"} className="order-2">
            <Input name="quantity" type="number" step="0.0001" min="0.0001" required />
          </Field>
          <Field label="Unit cost · RM" className="order-3">
            <Input name="unit_cost" type="number" step="0.0001" min="0" />
          </Field>
          <div className="order-4 col-span-2 md:col-span-3">
            <Field label="Remarks">
              <Textarea name="remarks" placeholder="Reason, batch note, or manual reference." />
            </Field>
          </div>
          {showSubmit ? <div className="order-5 flex justify-end md:col-span-3">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Post stock transaction</SubmitButton>
          </div> : null}
        </form>
      </CardContent>
    </Card>
  );
}
