"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { formatQuantity, formatQuantityInput } from "@/lib/utils";

type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };
type SeedLine = {
  item_id: string;
  item_code: string;
  item_name: string;
  theoretical_qty: number;
  physical_qty: number;
  uom: string;
};

type SeedLineInput = SeedLine & { physicalQty: string };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function variancePercent(theoretical: number, physical: number) {
  if (theoretical === 0) return null;
  return ((physical - theoretical) / theoretical) * 100;
}

function toNumber(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatVarianceDisplay(variance: number, uom: string) {
  if (variance === 0) return `0 ${uom}`;
  return `${variance > 0 ? "+" : ""}${formatQuantity(variance)} ${uom}`;
}

function formatVariancePercent(percent: number | null) {
  if (percent === null || Number.isNaN(percent)) return "0%";
  return `${percent > 0 ? "+" : ""}${formatQuantity(percent)}%`;
}

function varianceToneClass(percent: number | null, high: boolean) {
  if (!high) return "text-foreground";
  if (percent === null) return "text-muted-foreground";
  return percent > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive";
}

export function StockCountForm({
  branches,
  selectedBranchId,
  seedLines,
  action,
  formId,
  showSubmit = true,
}: {
  branches: BranchOption[];
  selectedBranchId?: string;
  seedLines: SeedLine[];
  action: (formData: FormData) => Promise<void>;
  formId?: string;
  showSubmit?: boolean;
}) {
  const router = useRouter();
  const tolerance = 2;
  const [lines, setLines] = useState<SeedLineInput[]>(() =>
    seedLines.map((line) => ({ ...line, physicalQty: formatQuantityInput(line.physical_qty) })),
  );

  // Next can preserve this client component while the branch query changes.
  // Reset the editable rows only when the selected branch changes so PJS10 and
  // ALMA never show each other's count lines.
  useEffect(() => {
    setLines(seedLines.map((line) => ({ ...line, physicalQty: formatQuantityInput(line.physical_qty) })));
  }, [selectedBranchId, seedLines]);

  function selectBranch(branchId: string) {
    router.push(branchId ? `/stock-counts/new?branch_id=${branchId}` : "/stock-counts/new");
  }

  function updatePhysicalQty(itemId: string, nextPhysicalQty: string) {
    setLines((current) => current.map((line) => (line.item_id === itemId ? { ...line, physicalQty: nextPhysicalQty } : line)));
  }

  function normalizePhysicalQty(itemId: string) {
    setLines((current) => current.map((line) => {
      if (line.item_id !== itemId) return line;
      return { ...line, physicalQty: formatQuantityInput(line.physicalQty) };
    }));
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form id={formId} action={action} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Count Date"><Input name="count_date" type="date" defaultValue={today()} required /></Field>
            <Field label="Tolerance %"><Input name="tolerance_percent" type="number" min="0" step="0.01" defaultValue={tolerance} required /></Field>
            <Field label="Branch">
              <SelectNative name="branch_id" value={selectedBranchId ?? branches[0]?.id ?? ""} onChange={(event) => selectBranch(event.target.value)} required>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
              </SelectNative>
            </Field>
            <div className="md:col-span-3">
              <Field label="Remarks"><Textarea name="remarks" placeholder="Nightly count note" /></Field>
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="hidden border-b bg-secondary/40 px-3 py-2 md:grid md:grid-cols-[minmax(0,1fr)_130px_130px_150px_1fr] md:gap-3">
              <p className="text-xs font-semibold">Item</p>
              <p className="text-xs text-right font-semibold">Theoretical</p>
              <p className="text-xs text-right font-semibold">Physical</p>
              <p className="text-xs text-right font-semibold">Variance</p>
              <p className="text-xs font-semibold">Remarks</p>
            </div>
            <div className="divide-y">
              {lines.map((line) => {
                const physical = toNumber(line.physicalQty);
                const variance = physical - line.theoretical_qty;
                const percent = variancePercent(line.theoretical_qty, physical);
                const absolutePercent = percent === null ? 0 : Math.abs(percent);
                const high = percent !== null && absolutePercent > tolerance;
                const toneClass = high ? varianceToneClass(percent, high) : "";
                return (
                  <div
                    key={line.item_id}
                    className="grid grid-cols-[minmax(0,1fr)_110px] gap-2 px-3 py-3 md:grid-cols-[minmax(0,1fr)_120px_120px_130px_1fr] md:gap-3 md:items-start"
                  >
                    <div className="min-w-0 order-1 md:col-span-1 md:order-1">
                      <p className="truncate text-sm font-medium leading-tight">{line.item_name}</p>
                      <p className="text-xs text-muted-foreground">{line.item_code}</p>
                    </div>

                    <div className="order-2 grid grid-cols-[1fr_auto] items-end gap-2 md:col-span-1 md:order-3 md:grid-cols-1">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground md:hidden" htmlFor={`physical-${line.item_id}`}>
                        Physical
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`physical-${line.item_id}`}
                          name="line_physical_qty"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.physicalQty}
                          onChange={(event) => updatePhysicalQty(line.item_id, event.target.value)}
                          onBlur={() => normalizePhysicalQty(line.item_id)}
                          required
                          className="h-9 md:h-8"
                        />
                        <span className="text-xs text-muted-foreground">{line.uom}</span>
                      </div>
                    </div>

                    <div className="order-3 col-span-2 space-y-1 md:col-span-1 md:text-right md:order-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground md:hidden">Theoretical</p>
                      <p className="text-sm font-medium">{formatVarianceDisplay(line.theoretical_qty, line.uom)}</p>
                    </div>

                    <div className="order-4 col-span-2 space-y-1 md:col-span-1 md:text-right md:order-4">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground md:hidden">Variance</p>
                      <p className={`text-sm font-semibold ${high ? toneClass : "text-foreground"}`}>
                        {formatVarianceDisplay(variance, line.uom)} <span className="font-normal">({formatVariancePercent(percent)})</span>
                      </p>
                    </div>

                    <div className="order-5 col-span-2 min-w-0 space-y-1 md:col-span-1 md:order-5 md:max-w-[14rem]">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground md:hidden" htmlFor={`remarks-${line.item_id}`}>
                        Remarks
                      </label>
                      <Input id={`remarks-${line.item_id}`} name="line_remarks" placeholder="Optional" />
                    </div>

                    <input type="hidden" name="line_item_id" value={line.item_id} />
                    <input type="hidden" name="line_theoretical_qty" value={line.theoretical_qty} />
                    <input type="hidden" name="line_uom" value={line.uom} />
                  </div>
                );
              })}
              {!lines.length ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  No stock balance rows found for this branch yet.
                </div>
              ) : null}
            </div>
          </div>

          {showSubmit ? <div className="flex justify-end">
            <SubmitButton type="submit" disabled={!lines.length} pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Create draft count</SubmitButton>
          </div> : null}
        </form>
      </CardContent>
    </Card>
  );
}
