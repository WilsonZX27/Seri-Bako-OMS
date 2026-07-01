"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber, getToday } from "@/lib/utils";
import { wastageReasons } from "@/lib/validations/stock-operations";

type Branch = { id: string; branch_code: string; branch_name: string; status: string };
type Location = { id: string; branch_id?: string | null; location_code: string; location_name: string; status: string };
type SeedLine = { item_id: string; item_code: string; item_name: string; barcode: string | null; available_qty: number; quantity: number; uom: string };

export function StockTransferForm({ branches, locations, selectedFromLocationId, selectedFromBranchId, seedLines, action }: { branches: Branch[]; locations: Location[]; selectedFromLocationId?: string; selectedFromBranchId?: string; seedLines: SeedLine[]; action: (formData: FormData) => Promise<void> }) {
  const router = useRouter();
  const no = `TRF-${Date.now().toString().slice(-6)}`;
  function selectFrom(id: string) { router.push(id ? `/stock-transfers/new?from_location_id=${id}` : "/stock-transfers/new"); }
  function selectFromBranch(id: string) { router.push(id ? `/stock-transfers/new?from_branch_id=${id}` : "/stock-transfers/new"); }
  return (
    <Card><CardContent className="p-5">
      <form action={action} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Transfer No"><Input name="transfer_no" defaultValue={no} required /></Field>
          <Field label="Transfer Date"><Input name="transfer_date" type="date" defaultValue={getToday()} required /></Field>
          <Field label="Status"><SelectNative name="status" defaultValue="draft"><option value="draft">Draft</option></SelectNative></Field>
          <Field label="From Branch"><SelectNative name="from_branch_id" value={selectedFromBranchId ?? branches[0]?.id ?? ""} onChange={(e) => selectFromBranch(e.target.value)} required>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</SelectNative><p className="mt-1 text-xs text-muted-foreground">Stock will move from this branch&apos;s default location.</p></Field>
          <Field label="To Branch"><SelectNative name="to_branch_id" defaultValue={branches[1]?.id ?? branches[0]?.id ?? ""} required>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</SelectNative><p className="mt-1 text-xs text-muted-foreground">Stock will move into this branch&apos;s default location.</p></Field>
          <details className="rounded-md border bg-secondary/20 p-3 md:col-span-3">
            <summary className="cursor-pointer text-sm font-medium">Advanced transfer locations</summary>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Field label="From Location"><SelectNative name="from_location_id" value={selectedFromLocationId ?? ""} onChange={(e) => selectFrom(e.target.value)}><option value="">Use from branch default</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.location_name}</option>)}</SelectNative></Field>
              <Field label="To Location"><SelectNative name="to_location_id"><option value="">Use to branch default</option>{locations.filter((l) => l.id !== selectedFromLocationId).map((l) => <option key={l.id} value={l.id}>{l.location_name}</option>)}</SelectNative></Field>
            </div>
          </details>
          <div className="md:col-span-2"><Field label="Remarks"><Textarea name="remarks" placeholder="Transfer reason or handling note" /></Field></div>
        </div>
        <LineGrid seedLines={seedLines} mode="transfer" />
        <div className="flex justify-end"><Button disabled={!seedLines.length}>Create transfer</Button></div>
      </form>
    </CardContent></Card>
  );
}

export function StockWastageForm({ branches, locations, selectedLocationId, selectedBranchId, seedLines, action }: { branches: Branch[]; locations: Location[]; selectedLocationId?: string; selectedBranchId?: string; seedLines: SeedLine[]; action: (formData: FormData) => Promise<void> }) {
  const router = useRouter();
  const no = `WST-${Date.now().toString().slice(-6)}`;
  function selectLocation(id: string) { router.push(id ? `/stock-wastage/new?location_id=${id}` : "/stock-wastage/new"); }
  function selectBranch(id: string) { router.push(id ? `/stock-wastage/new?branch_id=${id}` : "/stock-wastage/new"); }
  return (
    <Card><CardContent className="p-5">
      <form action={action} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Wastage No"><Input name="wastage_no" defaultValue={no} required /></Field>
          <Field label="Wastage Date"><Input name="wastage_date" type="date" defaultValue={getToday()} required /></Field>
          <Field label="Main Reason"><SelectNative name="reason" defaultValue="damaged">{wastageReasons.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</SelectNative></Field>
          <Field label="Branch"><SelectNative name="branch_id" value={selectedBranchId ?? branches[0]?.id ?? ""} onChange={(e) => selectBranch(e.target.value)} required>{branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</SelectNative><p className="mt-1 text-xs text-muted-foreground">Stock will be recorded under this branch&apos;s default location.</p></Field>
          <Field label="Status"><SelectNative name="status" defaultValue="draft"><option value="draft">Draft</option></SelectNative></Field>
          <details className="rounded-md border bg-secondary/20 p-3 md:col-span-3">
            <summary className="cursor-pointer text-sm font-medium">Advanced wastage location</summary>
            <div className="mt-3 max-w-sm">
              <Field label="Specific Location"><SelectNative name="location_id" value={selectedLocationId ?? ""} onChange={(e) => selectLocation(e.target.value)}><option value="">Use branch default location</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.location_name}</option>)}</SelectNative></Field>
            </div>
          </details>
          <div className="md:col-span-3"><Field label="Remarks"><Textarea name="remarks" placeholder="Photo required for damaged, expired, supplier claim, or abnormal wastage" /></Field></div>
        </div>
        <LineGrid seedLines={seedLines} mode="wastage" />
        <div className="flex justify-end"><Button disabled={!seedLines.length}>Create wastage</Button></div>
      </form>
    </CardContent></Card>
  );
}

function LineGrid({ seedLines, mode }: { seedLines: SeedLine[]; mode: "transfer" | "wastage" }) {
  return (
    <div className="rounded-lg border">
      <div className="border-b bg-secondary/40 px-4 py-3"><p className="text-sm font-semibold">Lines</p><p className="text-xs text-muted-foreground">Availability is calculated from the stock ledger. Posting creates ledger rows only.</p></div>
      <div className="divide-y">
        {seedLines.map((line) => (
          <div key={line.item_id} className="grid gap-3 p-4 xl:grid-cols-[2fr_120px_120px_90px_130px_130px_1fr]">
            <div><p className="font-medium">{line.item_name}</p><p className="text-xs text-muted-foreground">{line.item_code} - {line.barcode ?? "No barcode"}</p></div>
            <div className="rounded-md border bg-secondary/30 p-2 text-sm"><p className="text-xs text-muted-foreground">Available</p><p className="font-semibold">{formatNumber(line.available_qty)}</p></div>
            <Field label="Quantity"><Input name="line_quantity" type="number" min="0.0001" step="0.0001" defaultValue={Math.min(line.quantity, line.available_qty)} /></Field>
            <Field label="UOM"><Input name="line_uom" value={line.uom} readOnly /></Field>
            {mode === "wastage" ? <Field label="Reason"><SelectNative name="line_reason" defaultValue="damaged">{wastageReasons.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</SelectNative></Field> : <input type="hidden" name="line_reason" value="other" />}
            {mode === "wastage" ? <Field label="Batch"><Input name="line_batch_no" placeholder="Batch" /></Field> : <input type="hidden" name="line_batch_no" value="" />}
            <Field label="Remarks"><Input name="line_remarks" placeholder="Notes" /></Field>
            {mode === "wastage" ? <input type="hidden" name="line_expiry_date" value="" /> : null}
            <input type="hidden" name="line_item_id" value={line.item_id} />
            <input type="hidden" name="line_barcode" value={line.barcode ?? ""} />
          </div>
        ))}
        {!seedLines.length ? <div className="flex items-center gap-2 p-5 text-sm text-warning"><AlertTriangle className="h-4 w-4" /> No available branch stock found.</div> : null}
      </div>
    </div>
  );
}
