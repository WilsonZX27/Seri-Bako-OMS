"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

type Sequence = {
  company_id: string;
  document_type: string;
  prefix: string;
  next_number: number;
};

type Company = { id: string; company_name: string };

function monthlyPreview(prefix: string, nextNumber: number) {
  const now = new Date();
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "Asia/Kuala_Lumpur" }).format(now).toUpperCase();
  const year = new Intl.DateTimeFormat("en-US", { year: "2-digit", timeZone: "Asia/Kuala_Lumpur" }).format(now);
  return `${prefix.trim() || "DOC"}/${month}${year}/${String(nextNumber || 1).padStart(3, "0")}`;
}

export function DocumentSequenceForm({ sequence, companies, action }: {
  sequence?: Sequence;
  companies: Company[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [prefix, setPrefix] = useState(sequence?.prefix ?? "DOC");
  const [nextNumber, setNextNumber] = useState(sequence?.next_number ?? 1);
  const companyId = sequence?.company_id ?? companies[0]?.id ?? "";

  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="company_id" value={companyId} />
          <input type="hidden" name="padding" value="3" />
          <input type="hidden" name="reset_frequency" value="monthly" />
          <input type="hidden" name="status" value="active" />
          <Field label="Document Type">
            <Input name="document_type" defaultValue={sequence?.document_type ?? ""} placeholder="purchase_order" required />
          </Field>
          <Field label="Prefix">
            <Input name="prefix" value={prefix} onChange={(event) => setPrefix(event.target.value.toUpperCase())} required />
          </Field>
          <Field label="This Month's Next Number">
            <Input name="next_number" type="number" min="1" value={nextNumber} onChange={(event) => setNextNumber(Number(event.target.value))} required />
          </Field>
          <Field label="Reset Monthly">
            <Input value="Yes — a separate counter is used for each month" readOnly />
          </Field>
          <div className="md:col-span-2 rounded-[2px] border bg-secondary p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Format Preview</p>
            <p className="mt-1 font-mono text-lg font-semibold">{monthlyPreview(prefix, nextNumber)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{`{PREFIX}/{MON}{YY}/{SEQ:3}`}</p>
          </div>
          <div className="flex justify-end md:col-span-2">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">{sequence ? "Save sequence" : "Create sequence"}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
