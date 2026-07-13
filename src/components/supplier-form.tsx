import Link from "next/link";
import { RecordSection } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
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
  formId?: string;
  showSubmit?: boolean;
};

export function SupplierForm({ supplier, action, formId, showSubmit = true }: SupplierFormProps) {
  return (
    <form id={formId} action={action} className="space-y-4">
      <RecordSection title="Supplier Identity" description="Supplier reference, name, and operational status.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Supplier Code">
            <Input name="supplier_code" defaultValue={supplier?.supplier_code ?? ""} placeholder="SUP-001" />
          </Field>
          <Field label="Supplier Name" required>
            <Input name="name" defaultValue={supplier?.name ?? ""} required />
          </Field>
          <Field label="Status">
            <SelectNative name="status" defaultValue={supplier?.status ?? "active"}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectNative>
          </Field>
        </div>
      </RecordSection>

      <RecordSection title="Contact Information" description="Primary contact details used by purchasing teams.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Contact Person">
            <Input name="contact_person" defaultValue={supplier?.contact_person ?? ""} />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={supplier?.phone ?? ""} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={supplier?.email ?? ""} />
          </Field>
        </div>
      </RecordSection>

      <RecordSection title="Address" description="Supplier correspondence and delivery address.">
        <Field label="Address">
          <Textarea name="address" defaultValue={supplier?.address ?? ""} />
        </Field>
      </RecordSection>

      <RecordSection title="Commercial Terms" description="Default terms carried into purchasing records where supported.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Payment Terms Days">
            <Input name="payment_terms_days" type="number" min="0" defaultValue={supplier?.payment_terms_days ?? 30} />
          </Field>
        </div>
      </RecordSection>
      {showSubmit ? (
        <Card>
          <CardContent className="flex justify-end gap-2 p-3">
            <Button asChild type="button" variant="outline"><Link href="/suppliers">Cancel</Link></Button>
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">{supplier ? "Save supplier" : "Create supplier"}</SubmitButton>
          </CardContent>
        </Card>
      ) : null}
    </form>
  );
}
