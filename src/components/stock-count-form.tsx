"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber } from "@/lib/utils";

type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };
type LocationOption = { id: string; branch_id?: string | null; location_code: string; location_name: string; status: string };
type SeedLine = {
  item_id: string;
  item_code: string;
  item_name: string;
  barcode: string | null;
  theoretical_qty: number;
  physical_qty: number;
  uom: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function variancePercent(theoretical: number, physical: number) {
  if (theoretical === 0) return physical === 0 ? 0 : 100;
  return ((physical - theoretical) / theoretical) * 100;
}

export function StockCountForm({
  branches,
  locations,
  selectedLocationId,
  selectedBranchId,
  seedLines,
  action,
}: {
  branches: BranchOption[];
  locations: LocationOption[];
  selectedLocationId?: string;
  selectedBranchId?: string;
  seedLines: SeedLine[];
  action: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const tolerance = 2;
  const countNo = `SC-${Date.now().toString().slice(-6)}`;

  function selectLocation(locationId: string) {
    const branch = selectedBranchId ? `branch_id=${selectedBranchId}` : "";
    router.push(locationId ? `/stock-counts/new?${branch ? `${branch}&` : ""}location_id=${locationId}` : branch ? `/stock-counts/new?${branch}` : "/stock-counts/new");
  }

  function selectBranch(branchId: string) {
    router.push(branchId ? `/stock-counts/new?branch_id=${branchId}` : "/stock-counts/new");
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form action={action} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Count No"><Input name="count_no" defaultValue={countNo} required /></Field>
            <Field label="Count Date"><Input name="count_date" type="date" defaultValue={today()} required /></Field>
            <Field label="Tolerance %"><Input name="tolerance_percent" type="number" min="0" step="0.01" defaultValue={tolerance} required /></Field>
            <Field label="Branch">
              <SelectNative name="branch_id" value={selectedBranchId ?? branches[0]?.id ?? ""} onChange={(event) => selectBranch(event.target.value)} required>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
              </SelectNative>
              <p className="mt-1 text-xs text-muted-foreground">Stock will be counted under this branch&apos;s default location unless a specific location is selected.</p>
            </Field>
            <Field label="Status">
              <SelectNative name="status" defaultValue="draft"><option value="draft">Draft</option></SelectNative>
            </Field>
            <details className="rounded-md border bg-secondary/20 p-3 md:col-span-3">
              <summary className="cursor-pointer text-sm font-medium">Advanced location count</summary>
              <div className="mt-3 max-w-sm">
                <Field label="Specific Location">
                  <SelectNative name="location_id" value={selectedLocationId ?? ""} onChange={(event) => selectLocation(event.target.value)}>
                    <option value="">Use branch default location</option>
                    {locations.map((location) => <option key={location.id} value={location.id}>{location.location_name}</option>)}
                  </SelectNative>
                </Field>
              </div>
            </details>
            <div className="md:col-span-3">
              <Field label="Remarks"><Textarea name="remarks" placeholder="Nightly count note" /></Field>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="border-b bg-secondary/40 px-4 py-3">
              <p className="text-sm font-semibold">Count Lines</p>
              <p className="text-xs text-muted-foreground">Theoretical quantity comes from the stock ledger. Enter physical quantity only.</p>
            </div>
            <div className="divide-y">
              {seedLines.map((line) => {
                const variance = line.physical_qty - line.theoretical_qty;
                const percent = variancePercent(line.theoretical_qty, line.physical_qty);
                const high = Math.abs(percent) > tolerance;
                return (
                  <div key={line.item_id} className="grid gap-3 p-4 lg:grid-cols-[2fr_130px_130px_130px_100px_1fr]">
                    <div>
                      <p className="font-medium">{line.item_name}</p>
                      <p className="text-xs text-muted-foreground">{line.item_code} - {line.barcode ?? "No barcode"}</p>
                    </div>
                    <Field label="Theoretical"><Input name="line_theoretical_qty" value={line.theoretical_qty} readOnly /></Field>
                    <Field label="Physical"><Input name="line_physical_qty" type="number" min="0" step="0.0001" defaultValue={line.physical_qty} /></Field>
                    <div className="rounded-md border bg-secondary/30 p-2 text-sm">
                      <p className="text-xs text-muted-foreground">Variance</p>
                      <p className={high ? "font-semibold text-warning" : "font-semibold"}>{formatNumber(variance)} ({formatNumber(percent)}%)</p>
                    </div>
                    <Field label="UOM"><Input name="line_uom" value={line.uom} readOnly /></Field>
                    <Field label="Remarks"><Input name="line_remarks" placeholder={high ? "Required" : "Optional"} /></Field>
                    <input type="hidden" name="line_item_id" value={line.item_id} />
                    <input type="hidden" name="line_barcode" value={line.barcode ?? ""} />
                  </div>
                );
              })}
              {!seedLines.length ? (
                <div className="flex items-center gap-2 p-5 text-sm text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  No stock balance rows found for this branch yet.
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!seedLines.length}>Create draft count</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
