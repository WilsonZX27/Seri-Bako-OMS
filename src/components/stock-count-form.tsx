"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ListFilter, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatQuantity, formatQuantityInput } from "@/lib/utils";

type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };
type SeedLine = {
  item_id: string;
  item_code: string;
  item_name: string;
  theoretical_qty: number;
  physical_qty: number;
  uom: string;
};

type SeedLineInput = SeedLine & { physicalQty: string; remarks: string };

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
    seedLines.map((line) => ({ ...line, physicalQty: "", remarks: "" })),
  );
  const [search, setSearch] = useState("");
  const [showRemainingOnly, setShowRemainingOnly] = useState(false);
  const [openNoteIds, setOpenNoteIds] = useState<Set<string>>(() => new Set());

  // Next can preserve this client component while the branch query changes.
  // Reset the editable rows only when the selected branch changes so PJS10 and
  // ALMA never show each other's count lines.
  useEffect(() => {
    setLines(seedLines.map((line) => ({ ...line, physicalQty: "", remarks: "" })));
    setSearch("");
    setShowRemainingOnly(false);
    setOpenNoteIds(new Set());
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
      if (!line.physicalQty.trim()) return line;
      return { ...line, physicalQty: formatQuantityInput(line.physicalQty) };
    }));
  }

  function updateRemarks(itemId: string, remarks: string) {
    setLines((current) => current.map((line) => (line.item_id === itemId ? { ...line, remarks } : line)));
  }

  const completedCount = lines.filter((line) => line.physicalQty.trim() !== "").length;
  const remainingCount = lines.length - completedCount;
  const normalizedSearch = search.trim().toLowerCase();
  const visibleLines = lines.filter((line) => {
    if (showRemainingOnly && line.physicalQty.trim() !== "") return false;
    if (!normalizedSearch) return true;
    return `${line.item_name} ${line.item_code}`.toLowerCase().includes(normalizedSearch);
  });
  const countComplete = lines.length > 0 && completedCount === lines.length;

  function showLineNote(itemId: string) {
    setOpenNoteIds((current) => new Set(current).add(itemId));
  }

  return (
    <Card className="border-0 bg-transparent shadow-none md:border md:bg-white">
      <CardContent className="p-0 md:p-4">
        <form id={formId} action={action} className={showSubmit ? "space-y-3 pb-20 xl:pb-0" : "space-y-3"}>
          <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2 lg:grid-cols-3 lg:gap-3">
            <Field label="Count Date"><Input name="count_date" type="date" defaultValue={today()} required /></Field>
            <Field label="Tolerance %"><Input name="tolerance_percent" type="number" min="0" step="0.01" defaultValue={tolerance} required /></Field>
            <div className="col-span-2 lg:col-span-1">
              <Field label="Branch">
                <SelectNative name="branch_id" value={selectedBranchId ?? branches[0]?.id ?? ""} onChange={(event) => selectBranch(event.target.value)} required>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                </SelectNative>
              </Field>
            </div>
            <div className="col-span-2 lg:col-span-3">
              <details className="group rounded-[2px] border border-dashed border-[var(--sb-border)] bg-[var(--sb-surface-muted)] px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium marker:text-[var(--sb-text-muted)]">Add count note <span className="font-normal text-muted-foreground">(optional)</span></summary>
                <div className="mt-2"><Textarea name="remarks" className="min-h-16" placeholder="Nightly count note" /></div>
              </details>
            </div>
          </div>

          <section aria-label="Count progress" className="grid gap-2 border border-[var(--sb-border)] bg-[var(--sb-surface-muted)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-semibold">{countComplete ? "Count complete" : `${remainingCount} item${remainingCount === 1 ? "" : "s"} remaining`}</p>
                <p className="shrink-0 tabular-nums text-muted-foreground">{completedCount} / {lines.length}</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white" aria-hidden="true">
                <div className="h-full bg-[var(--sb-green-700)] transition-[width]" style={{ width: `${lines.length ? (completedCount / lines.length) * 100 : 0}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Enter the quantity you physically see. Theoretical stock is shown only as a reference.
              </p>
            </div>
            {showSubmit ? (
              <SubmitButton type="submit" disabled={!countComplete} className="hidden xl:inline-flex" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">
                Create draft count
              </SubmitButton>
            ) : countComplete ? <CheckCircle2 className="hidden h-5 w-5 text-[var(--sb-success)] sm:block" aria-hidden="true" /> : null}
          </section>

          <div className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Find an item</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Find item name or code" />
            </label>
            <button
              type="button"
              className="inline-flex h-[var(--sb-control-height)] min-w-11 shrink-0 items-center justify-center gap-1.5 border border-[var(--sb-border)] bg-white px-2.5 text-sm font-medium hover:bg-[var(--sb-surface-muted)]"
              aria-pressed={showRemainingOnly}
              onClick={() => setShowRemainingOnly((current) => !current)}
            >
              <ListFilter className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{showRemainingOnly ? "Show all items" : `Show remaining (${remainingCount})`}</span>
              <span className="text-xs tabular-nums sm:hidden">{showRemainingOnly ? "All" : remainingCount}</span>
            </button>
          </div>

          <div className="hidden" aria-hidden="true">
            {lines.filter((line) => !visibleLines.some((visible) => visible.item_id === line.item_id)).map((line) => (
              <div key={`hidden-${line.item_id}`}>
                <input name="line_item_id" value={line.item_id} readOnly />
                <input name="line_theoretical_qty" value={line.theoretical_qty} readOnly />
                <input name="line_physical_qty" value={line.physicalQty} readOnly />
                <input name="line_uom" value={line.uom} readOnly />
                <input name="line_remarks" value={line.remarks} readOnly />
              </div>
            ))}
          </div>

          <div className="rounded-[2px] border">
            <div className="hidden border-b bg-secondary/40 px-3 py-2 lg:grid lg:grid-cols-[minmax(12rem,1.4fr)_minmax(7rem,0.65fr)_minmax(10rem,0.8fr)_minmax(9rem,0.7fr)_minmax(10rem,1fr)] lg:gap-3">
              <p className="text-xs font-semibold">Item</p>
              <p className="text-xs text-right font-semibold">Theoretical</p>
              <p className="text-xs text-right font-semibold">Physical</p>
              <p className="text-xs text-right font-semibold">Variance</p>
              <p className="text-xs font-semibold">Remarks</p>
            </div>
            <div className="divide-y">
              {visibleLines.map((line) => {
                const hasPhysical = line.physicalQty.trim() !== "";
                const physical = hasPhysical ? toNumber(line.physicalQty) : 0;
                const variance = physical - line.theoretical_qty;
                const percent = variancePercent(line.theoretical_qty, physical);
                const absolutePercent = percent === null ? 0 : Math.abs(percent);
                const high = hasPhysical && percent !== null && absolutePercent > tolerance;
                const toneClass = high ? varianceToneClass(percent, high) : "";
                return (
                  <div
                    key={line.item_id}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(10rem,11.25rem)] gap-x-3 gap-y-2 px-3 py-3 lg:grid-cols-[minmax(12rem,1.4fr)_minmax(7rem,0.65fr)_minmax(10rem,0.8fr)_minmax(9rem,0.7fr)_minmax(10rem,1fr)] lg:items-start lg:gap-3"
                  >
                    <div className="min-w-0 order-1 lg:col-span-1 lg:order-1">
                      <p className="break-words text-sm font-medium leading-tight">{line.item_name}</p>
                      <p className="text-xs text-muted-foreground">{line.item_code}</p>
                    </div>

                    <div className="order-2 min-w-0 lg:col-span-1 lg:order-3">
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground lg:hidden" htmlFor={`physical-${line.item_id}`}>
                        Physical
                      </label>
                      <div className="mt-1 flex items-center gap-2 lg:mt-0">
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
                          aria-label={`Physical quantity for ${line.item_name}`}
                          placeholder="0.00"
                          className="h-11 min-w-[8.5rem] text-base font-semibold tabular-nums lg:h-9 lg:min-w-0 lg:text-sm"
                        />
                        <span className="text-xs text-muted-foreground">{line.uom}</span>
                      </div>
                    </div>

                    <div className="order-3 col-span-2 grid grid-cols-2 gap-3 lg:contents">
                      <div className="space-y-0.5 lg:col-span-1 lg:text-right lg:order-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground lg:hidden">Theoretical</p>
                        <p className="text-sm font-medium">{formatVarianceDisplay(line.theoretical_qty, line.uom)}</p>
                      </div>
                      <div className="space-y-0.5 lg:col-span-1 lg:text-right lg:order-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground lg:hidden">Variance</p>
                        <p className={`text-sm font-semibold ${high ? toneClass : "text-foreground"}`}>
                          {hasPhysical ? <>{formatVarianceDisplay(variance, line.uom)} <span className="font-normal">({formatVariancePercent(percent)})</span></> : <span className="font-normal text-muted-foreground">Not counted</span>}
                        </p>
                      </div>
                    </div>

                    <div className="order-4 col-span-2 min-w-0 lg:col-span-1 lg:order-5">
                      {!high && !openNoteIds.has(line.item_id) ? (
                        <button type="button" className="py-1 text-xs font-medium text-muted-foreground lg:hidden" onClick={() => showLineNote(line.item_id)}>
                          Add line note
                        </button>
                      ) : null}
                      {high ? <label className="mb-1 block text-xs font-medium text-destructive lg:hidden" htmlFor={`remarks-${line.item_id}`}>Reason required</label> : null}
                      <Input
                        id={`remarks-${line.item_id}`}
                        name="line_remarks"
                        aria-label={`Remarks for ${line.item_name}`}
                        className={cn(!high && !openNoteIds.has(line.item_id) && "hidden lg:flex")}
                        placeholder={high ? "Explain this variance" : "Add note"}
                        required={high}
                        value={line.remarks}
                        onChange={(event) => updateRemarks(line.item_id, event.target.value)}
                      />
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
              ) : !visibleLines.length ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No items match this view.
                </div>
              ) : null}
            </div>
          </div>

          {showSubmit ? (
            <div className="sb-mobile-action-bar fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-[var(--sb-z-sticky)] flex min-w-0 items-center gap-3 p-2 xl:hidden">
              <p className="min-w-0 flex-1 truncate text-xs font-medium">{countComplete ? "Ready to create draft" : `${completedCount}/${lines.length} counted`}</p>
              <SubmitButton type="submit" disabled={!countComplete} className="shrink-0" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Create draft</SubmitButton>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
