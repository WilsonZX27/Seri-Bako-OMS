import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/types/database";

type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];

type SupplierFormProps = {
  supplier?: Supplier;
  action: (formData: FormData) => Promise<void>;
};

export function SupplierForm({ supplier, action }: SupplierFormProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <Field label="Supplier Code">
            <Input name="supplier_code" defaultValue={supplier?.supplier_code ?? ""} placeholder="SUP-001" />
          </Field>
          <Field label="Supplier Name">
            <Input name="name" defaultValue={supplier?.name ?? ""} required />
          </Field>
          <Field label="Contact Person">
            <Input name="contact_person" defaultValue={supplier?.contact_person ?? ""} />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={supplier?.phone ?? ""} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={supplier?.email ?? ""} />
          </Field>
          <Field label="Payment Terms Days">
            <Input name="payment_terms_days" type="number" min="0" defaultValue={supplier?.payment_terms_days ?? 30} />
          </Field>
          <Field label="Status">
            <SelectNative name="status" defaultValue={supplier?.status ?? "active"}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectNative>
          </Field>
          <div className="md:col-span-2">
            <Field label="Address">
              <Textarea name="address" defaultValue={supplier?.address ?? ""} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">{supplier ? "Save supplier" : "Create supplier"}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
