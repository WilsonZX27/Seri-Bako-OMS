"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { SelectNative } from "@/components/ui/select-native";

type Sequence = {
  company_id: string;
  document_type: string;
  prefix: string;
  next_number: number;
  reset_frequency: "never" | "yearly" | "quarterly" | "monthly" | "daily";
};

type Company = { id: string; company_name: string };

function sequencePreview(prefix: string, nextNumber: number, frequency: Sequence["reset_frequency"]) {
  const now = new Date();
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "Asia/Kuala_Lumpur" }).format(now).toUpperCase();
  const year = new Intl.DateTimeFormat("en-US", { year: "2-digit", timeZone: "Asia/Kuala_Lumpur" }).format(now);
  const monthNumber = Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "Asia/Kuala_Lumpur" }).format(now));
  const period = frequency === "monthly" ? `${month}${year}` : frequency === "quarterly" ? `Q${Math.floor((monthNumber - 1) / 3) + 1}${year}` : frequency === "yearly" ? `20${year}` : frequency === "daily" ? `${String(monthNumber).padStart(2, "0")}${new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: "Asia/Kuala_Lumpur" }).format(now)}${year}` : "ALL";
  return `${prefix.trim() || "DOC"}/${period}/${String(nextNumber || 1).padStart(3, "0")}`;
}

export function DocumentSequenceForm({ sequence, companies, action, formId, showSubmit = true }: {
  sequence?: Sequence;
  companies: Company[];
  action: (formData: FormData) => Promise<void>;
  formId?: string;
  showSubmit?: boolean;
}) {
  const [prefix, setPrefix] = useState(sequence?.prefix ?? "DOC");
  const [nextNumber, setNextNumber] = useState(sequence?.next_number ?? 1);
  const [resetFrequency, setResetFrequency] = useState<Sequence["reset_frequency"]>(sequence?.reset_frequency ?? "monthly");
  const companyId = sequence?.company_id ?? companies[0]?.id ?? "";

  return (
    <Card>
      <CardContent className="p-5">
        <form id={formId} action={action} className="grid gap-4 pb-20 md:grid-cols-2 md:pb-0">
          <input type="hidden" name="company_id" value={companyId} />
          <input type="hidden" name="padding" value="3" />
          <input type="hidden" name="status" value="active" />
          <Field label="Document Type">
            <Input name="document_type" defaultValue={sequence?.document_type ?? ""} placeholder="purchase_order" required />
          </Field>
          <Field label="Prefix">
            <Input name="prefix" value={prefix} onChange={(event) => setPrefix(event.target.value.toUpperCase())} required />
          </Field>
          <Field label="Next Number">
            <Input name="next_number" type="number" min="1" value={nextNumber} onChange={(event) => setNextNumber(Number(event.target.value))} required />
          </Field>
          <Field label="Reset Cycle">
            <SelectNative name="reset_frequency" value={resetFrequency} onChange={(event) => setResetFrequency(event.target.value as Sequence["reset_frequency"])}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="never">Never reset</option>
            </SelectNative>
          </Field>
          <div className="md:col-span-2 rounded-[2px] border bg-secondary p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Format Preview</p>
            <p className="mt-1 font-mono text-lg font-semibold">{sequencePreview(prefix, nextNumber, resetFrequency)}</p>
            <p className="mt-1 text-xs text-muted-foreground">The counter restarts when the selected cycle changes. Existing issued numbers remain unchanged.</p>
          </div>
          {showSubmit ? <div className="sb-mobile-action-bar fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-[var(--sb-z-sticky)] p-2 md:static md:flex md:justify-end md:bg-transparent md:p-0 md:shadow-none md:col-span-2">
            <SubmitButton type="submit" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes..." className="w-full md:w-auto">{sequence ? "Save sequence" : "Create sequence"}</SubmitButton>
          </div> : null}
        </form>
      </CardContent>
    </Card>
  );
}
