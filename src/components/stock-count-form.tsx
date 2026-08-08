"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ListFilter, Minus, Plus, Search } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateOnly, formatQuantity, formatQuantityInput, getToday } from "@/lib/utils";
import type { StockCountAutosaveResult } from "@/server/actions/stock-counts";

type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };
type SeedLine = {
  line_id?: string;
  item_id: string;
  item_code: string;
  item_name: string;
  theoretical_qty: number;
  physical_qty: number;
  prefill_source: "last_posted_count" | "ledger_balance";
  uom: string;
  remarks?: string | null;
};

type SeedLineInput = SeedLine & { physicalQty: string; remarks: string; initialPhysicalQty: string; adjusted: boolean };
type AutosaveState = "idle" | "recovered" | "saving" | "saved" | "error";
const STOCK_COUNT_SORT_KEY = "seri-bako:stock-count-sort";
const MAX_AUTOSAVE_RETRIES = 3;
const AUTOSAVE_DEBOUNCE_MS = 12_000;
type LocalDraftSnapshot = {
  branchId: string;
  countDate: string;
  tolerance: string;
  remarks: string;
  lines: Array<{ itemId: string; physicalQty: string; remarks: string }>;
  savedLocallyAt: string;
};

function variancePercent(theoretical: number, physical: number) {
  if (theoretical === 0) return null;
  return ((physical - theoretical) / theoretical) * 100;
}

function toNumber(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function allowsFraction(uom: string) {
  return new Set(["kg", "g", "l", "ml", "ltr", "liter", "litre"]).has(uom.trim().toLowerCase());
}

function quantityStep(uom: string) {
  return allowsFraction(uom) ? 0.01 : 1;
}

function quantityInputValue(value: number, uom: string) {
  return allowsFraction(uom) ? formatQuantityInput(value) : String(Math.round(value));
}

function makeEditableLine(line: SeedLine): SeedLineInput {
  const physicalQty = quantityInputValue(line.physical_qty, line.uom);
  return { ...line, physicalQty, initialPhysicalQty: physicalQty, remarks: line.remarks ?? "", adjusted: false };
}

function formatVariancePercent(percent: number | null) {
  if (percent === null || Number.isNaN(percent)) return "0%";
  return `${percent > 0 ? "+" : ""}${formatQuantity(percent)}%`;
}

export function StockCountForm({
  branches,
  selectedBranchId,
  seedLines,
  action,
  formId,
  showSubmit = true,
  initialCountDate,
  initialTolerance = 2,
  initialRemarks,
  autosaveAction,
  draftId,
}: {
  branches: BranchOption[];
  selectedBranchId?: string;
  seedLines: SeedLine[];
  action: (formData: FormData) => Promise<void>;
  formId?: string;
  showSubmit?: boolean;
  initialCountDate?: string;
  initialTolerance?: number;
  initialRemarks?: string | null;
  autosaveAction?: (formData: FormData) => Promise<StockCountAutosaveResult>;
  draftId?: string;
}) {
  const router = useRouter();
  const tolerance = 2;
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const hasUserEdited = useRef(false);
  const saveSequence = useRef(0);
  const lastSavedRevision = useRef(0);
  const retryTimer = useRef<number | null>(null);
  const retryRevision = useRef(0);
  const retryAttempts = useRef(0);
  const [lines, setLines] = useState<SeedLineInput[]>(() =>
    seedLines.map(makeEditableLine),
  );
  const [countDate, setCountDate] = useState(initialCountDate ?? getToday());
  const [toleranceValue, setToleranceValue] = useState(String(initialTolerance ?? tolerance));
  const [countRemarks, setCountRemarks] = useState(initialRemarks ?? "");
  const [dirtyRevision, setDirtyRevision] = useState(0);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const [autosaveError, setAutosaveError] = useState("");
  const [autosaveRetryable, setAutosaveRetryable] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdjustedOnly, setShowAdjustedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "code">("code");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sortPreferenceReady = useRef(false);
  const resolvedBranchId = selectedBranchId ?? branches[0]?.id ?? "";
  const localStorageKey = `seri-bako:stock-count-draft:${draftId ?? `new:${resolvedBranchId}`}`;

  function markDirty() {
    hasUserEdited.current = true;
    setDirtyRevision((current) => current + 1);
  }

  // Next can preserve this client component while the branch query changes.
  // Reset the editable rows only when the selected branch changes so PJS10 and
  // ALMA never show each other's count lines.
  useEffect(() => {
    setLines(seedLines.map(makeEditableLine));
    setSearch("");
    setShowAdjustedOnly(false);
    setCountDate(initialCountDate ?? getToday());
    setToleranceValue(String(initialTolerance ?? tolerance));
    setCountRemarks(initialRemarks ?? "");
    hasUserEdited.current = false;
    setAutosaveState("idle");
    setAutosaveError("");
    setAutosaveRetryable(true);
  }, [selectedBranchId, seedLines, initialCountDate, initialTolerance, initialRemarks]);

  useEffect(() => {
    const storedSort = window.localStorage.getItem(STOCK_COUNT_SORT_KEY);
    if (storedSort === "name" || storedSort === "code") setSortBy(storedSort);
    sortPreferenceReady.current = true;
  }, []);

  useEffect(() => {
    if (!sortPreferenceReady.current) return;
    window.localStorage.setItem(STOCK_COUNT_SORT_KEY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    const desktopWorkspace = window.matchMedia("(min-width: 1024px)");
    const syncSettings = () => setSettingsOpen(desktopWorkspace.matches);
    syncSettings();
    desktopWorkspace.addEventListener("change", syncSettings);
    return () => desktopWorkspace.removeEventListener("change", syncSettings);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(localStorageKey);
      if (!raw) return;
      const snapshot = JSON.parse(raw) as LocalDraftSnapshot;
      if (snapshot.branchId !== resolvedBranchId) return;
      const savedLines = new Map(snapshot.lines.map((line) => [line.itemId, line]));
      if (seedLines.some((line) => !savedLines.has(line.item_id))) return;
      setLines(seedLines.map((line) => {
        const editable = makeEditableLine(line);
        const saved = savedLines.get(line.item_id);
        if (!saved) return editable;
        return {
          ...editable,
          physicalQty: saved.physicalQty,
          remarks: saved.remarks,
          adjusted: saved.physicalQty !== editable.initialPhysicalQty,
        };
      }));
      setCountDate(snapshot.countDate);
      setToleranceValue(snapshot.tolerance);
      setCountRemarks(snapshot.remarks);
      hasUserEdited.current = true;
      setAutosaveState("recovered");
      setDirtyRevision((current) => current + 1);
    } catch {
      window.localStorage.removeItem(localStorageKey);
    }
  }, [localStorageKey, resolvedBranchId, seedLines]);

  const saveDraft = useCallback(async (revision: number) => {
    if (!autosaveAction || !formRef.current || !hasUserEdited.current || revision <= lastSavedRevision.current) return true;
    if (retryRevision.current !== revision) {
      retryRevision.current = revision;
      retryAttempts.current = 0;
    }
    const sequence = ++saveSequence.current;
    setAutosaveState("saving");
    setAutosaveError("");
    setAutosaveRetryable(true);
    try {
      const result = await autosaveAction(new FormData(formRef.current));
      if (sequence !== saveSequence.current) return result.ok;
      if (!result.ok || !result.id) {
        setAutosaveState("error");
        setAutosaveError(result.error ?? "Autosave failed. Your changes remain on this device.");
        const canRetry = result.retryable === false ? false : retryAttempts.current < MAX_AUTOSAVE_RETRIES;
        retryAttempts.current += 1;
        setAutosaveRetryable(canRetry);
        if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
        retryTimer.current = !canRetry
          ? null
          : window.setTimeout(() => void saveDraft(revision), 15_000);
        return false;
      }
      lastSavedRevision.current = revision;
      retryAttempts.current = 0;
      window.localStorage.removeItem(localStorageKey);
      setAutosaveState("saved");
      setAutosaveRetryable(true);
      if (!draftId) router.replace(`/stock-counts/${result.id}?autosaved=1`);
      return true;
    } catch {
      if (sequence === saveSequence.current) {
        setAutosaveState("error");
        const canRetry = retryAttempts.current < MAX_AUTOSAVE_RETRIES;
        retryAttempts.current += 1;
        setAutosaveError(canRetry ? "Autosave failed. Your changes remain on this device and will retry." : "Autosave failed. Your changes remain on this device. Save draft manually when the connection is ready.");
        setAutosaveRetryable(canRetry);
        if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
        retryTimer.current = canRetry ? window.setTimeout(() => void saveDraft(revision), 15_000) : null;
      }
      return false;
    }
  }, [autosaveAction, draftId, localStorageKey, router]);

  useEffect(() => () => {
    if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
  }, []);

  useEffect(() => {
    if (!hasUserEdited.current || dirtyRevision <= lastSavedRevision.current) return;
    const snapshot: LocalDraftSnapshot = {
      branchId: resolvedBranchId,
      countDate,
      tolerance: toleranceValue,
      remarks: countRemarks,
      lines: lines.map((line) => ({ itemId: line.item_id, physicalQty: line.physicalQty, remarks: line.remarks })),
      savedLocallyAt: new Date().toISOString(),
    };
    window.localStorage.setItem(localStorageKey, JSON.stringify(snapshot));
    // Give a physical-count entry session time to finish a short burst of
    // edits before sending a draft write. The local snapshot is still written
    // immediately, so this delay never risks losing the user's work.
    const timer = window.setTimeout(() => void saveDraft(dirtyRevision), AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [countDate, countRemarks, dirtyRevision, lines, localStorageKey, resolvedBranchId, saveDraft, toleranceValue]);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") void saveDraft(dirtyRevision);
    };
    const retryWhenOnline = () => void saveDraft(dirtyRevision);
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("online", retryWhenOnline);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("online", retryWhenOnline);
    };
  }, [dirtyRevision, saveDraft]);

  function selectBranch(branchId: string) {
    router.push(branchId ? `/stock-counts/new?branch_id=${branchId}` : "/stock-counts/new");
  }

  function updatePhysicalQty(itemId: string, nextPhysicalQty: string) {
    markDirty();
    setLines((current) => current.map((line) => (line.item_id === itemId ? { ...line, physicalQty: nextPhysicalQty, adjusted: nextPhysicalQty !== line.initialPhysicalQty } : line)));
  }

  function normalizePhysicalQty(itemId: string) {
    setLines((current) => current.map((line) => {
      if (line.item_id !== itemId) return line;
      if (!line.physicalQty.trim()) return line;
      const normalized = quantityInputValue(toNumber(line.physicalQty), line.uom);
      return { ...line, physicalQty: normalized, adjusted: normalized !== line.initialPhysicalQty };
    }));
  }

  function adjustPhysicalQty(itemId: string, direction: -1 | 1) {
    markDirty();
    setLines((current) => current.map((line) => {
      if (line.item_id !== itemId) return line;
      const next = Math.max(0, toNumber(line.physicalQty) + (quantityStep(line.uom) * direction));
      const physicalQty = quantityInputValue(next, line.uom);
      return { ...line, physicalQty, adjusted: physicalQty !== line.initialPhysicalQty };
    }));
  }

  const adjustedCount = lines.filter((line) => line.adjusted).length;
  const normalizedSearch = search.trim().toLowerCase();
  const visibleLines = lines
    .filter((line) => {
      if (showAdjustedOnly && !line.adjusted) return false;
      if (!normalizedSearch) return true;
      return `${line.item_name} ${line.item_code}`.toLowerCase().includes(normalizedSearch);
    })
    .sort((left, right) => {
      const leftValue = sortBy === "name" ? left.item_name : left.item_code;
      const rightValue = sortBy === "name" ? right.item_name : right.item_code;
      return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: "base" });
    });
  const countComplete = lines.length > 0 && lines.every((line) => line.physicalQty.trim() !== "");
  const autosaveLabel = autosaveState === "saving"
    ? "Saving…"
    : autosaveState === "saved"
      ? "Saved"
      : autosaveState === "recovered"
          ? "Recovered unsaved changes"
          : autosaveState === "error"
          ? autosaveRetryable
            ? "Save failed — retrying"
            : "Save failed — changes kept locally"
          : "Autosave ready";

  return (
    <div className="rounded-none md:rounded-[var(--sb-panel-radius)] md:border md:bg-white">
      <div className="md:p-4">
        <form ref={formRef} id={formId} action={action} className={showSubmit ? "space-y-3 pb-28 xl:pb-0" : "space-y-3"}>
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <section data-stock-count-setup className="erp-surface grid rounded-none px-3 py-2 md:grid-cols-2 md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0">
            <input type="hidden" name="branch_id" value={resolvedBranchId} />
            <div className="flex min-w-0 items-center justify-between gap-3 md:border md:border-[var(--sb-border-soft)] md:bg-[var(--sb-surface)] md:p-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Count date</p>
                <p className="truncate text-sm font-semibold text-foreground">{initialCountDate ? formatDateOnly(countDate) : `Today · ${formatDateOnly(countDate)}`}</p>
              </div>
              <Input aria-label="Count date" name="count_date" type="date" value={countDate} onChange={(event) => { setCountDate(event.target.value); markDirty(); }} required className="basis-36 shrink-0" />
            </div>
            <div className="hidden items-center justify-between gap-3 border border-[var(--sb-border-soft)] bg-[var(--sb-surface)] p-3 md:flex" aria-live="polite">
              <div className="min-w-0">
                <p className={`truncate text-xs font-medium ${autosaveState === "error" ? "text-destructive" : autosaveState === "saved" ? "text-[var(--sb-green-900)]" : "text-muted-foreground"}`} title={autosaveError || autosaveLabel}>{autosaveLabel}</p>
                <p className="text-xs text-muted-foreground">{lines.length} values ready · {adjustedCount} adjusted</p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{countComplete ? "Ready to save" : "Complete all quantities to save"}</span>
            </div>
            <details open={settingsOpen} className="sb-stock-count-settings group mt-2 border-t border-slate-100 pt-2 md:col-span-2">
              <summary onClick={(event) => { event.preventDefault(); setSettingsOpen((current) => !current); }} className="cursor-pointer text-xs font-medium text-muted-foreground lg:hidden">More settings</summary>
              <div className="sb-stock-count-settings-content mt-2 grid gap-2 sm:grid-cols-2">
                <Field label="Tolerance %"><Input name="tolerance_percent" type="number" min="0" step="0.01" value={toleranceValue} onChange={(event) => { setToleranceValue(event.target.value); markDirty(); }} required /></Field>
                {branches.length > 1 ? <Field label="Branch"><SelectNative name="branch_selector" value={selectedBranchId ?? branches[0]?.id ?? ""} onChange={(event) => selectBranch(event.target.value)}><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}</SelectNative></Field> : <p className="self-end pb-2 text-xs text-muted-foreground">Branch locked to {branches[0]?.branch_name ?? "assigned kitchen"}.</p>}
              </div>
              <div className="sb-stock-count-settings-content mt-2"><Textarea name="remarks" value={countRemarks} onChange={(event) => { setCountRemarks(event.target.value); markDirty(); }} className="min-h-16" placeholder="Count note (optional)" /></div>
            </details>
          </section>

          <section data-stock-count-workspace className="erp-surface rounded-none overflow-hidden md:rounded-none md:border-0 md:bg-transparent">

          <div className="flex items-center gap-2 border-b border-slate-100 bg-white p-3 md:border-0 md:bg-transparent md:px-0 md:pt-3">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Find an item</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Find item name or code" />
            </label>
            <SelectNative aria-label="Sort items" value={sortBy} onChange={(event) => setSortBy(event.target.value as "name" | "code")} className="h-[var(--sb-control-height)] w-[4.75rem] shrink-0 px-2 text-xs">
              <option value="name">Name</option>
              <option value="code">Code</option>
            </SelectNative>
            <button
              type="button"
              className="inline-flex h-[var(--sb-control-height)] min-w-11 shrink-0 items-center justify-center gap-1.5 border border-[var(--sb-border)] bg-white px-2.5 text-sm font-medium hover:bg-[var(--sb-surface-muted)]"
              aria-pressed={showAdjustedOnly}
              onClick={() => setShowAdjustedOnly((current) => !current)}
            >
              <ListFilter className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{showAdjustedOnly ? "Show all items" : `Show adjusted (${adjustedCount})`}</span>
              <span className="text-xs tabular-nums sm:hidden">{showAdjustedOnly ? "All" : adjustedCount}</span>
            </button>
          </div>

          <div className="hidden" aria-hidden="true">
            {lines.filter((line) => !visibleLines.some((visible) => visible.item_id === line.item_id)).map((line) => (
              <div key={`hidden-${line.item_id}`}>
                <input name="line_item_id" value={line.item_id} readOnly />
                <input name="line_id" value={line.line_id ?? ""} readOnly />
                <input name="line_theoretical_qty" value={line.theoretical_qty} readOnly />
                <input name="line_physical_qty" value={line.physicalQty} readOnly />
                <input name="line_uom" value={line.uom} readOnly />
                <input name="line_remarks" value={line.remarks} readOnly />
              </div>
            ))}
          </div>

          <div data-stock-count-line-list className="rounded-none md:rounded-sm md:border">
            <div className="hidden border-b bg-secondary/40 px-3 py-1.5 md:grid md:grid-cols-[minmax(0,4fr)_minmax(4rem,2fr)_minmax(0,4fr)] md:gap-3">
              <p className="text-xs font-semibold">Item</p>
              <p className="text-xs text-right font-semibold">Variance</p>
              <p className="text-xs font-semibold">Count</p>
            </div>
            <div className="divide-y">
              {visibleLines.map((line) => {
                const hasPhysical = line.physicalQty.trim() !== "";
                const physical = hasPhysical ? toNumber(line.physicalQty) : 0;
                const variance = physical - line.theoretical_qty;
                const percent = variancePercent(line.theoretical_qty, physical);
                return (
                  <div
                    key={line.item_id}
                    className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 border-b border-slate-100 px-3 py-2 md:min-h-14 md:grid-cols-[minmax(0,4fr)_minmax(4rem,2fr)_minmax(0,4fr)] md:gap-3"
                  >
                    <div className="order-1 min-w-0">
                      <p className="break-words text-sm font-medium leading-tight text-slate-800">{line.item_name}</p>
                      <p className="truncate whitespace-nowrap text-[10px] leading-3 tracking-[0.01em] text-slate-400">{line.item_code}</p>
                    </div>

                    <div className={`order-2 min-w-0 text-right text-xs font-medium ${variance < 0 ? "text-red-600" : variance > 0 ? "text-emerald-700" : "text-muted-foreground"}`}>
                      {hasPhysical ? <><span className="block whitespace-nowrap">{variance > 0 ? "+" : ""}{formatQuantity(variance)}</span><span className="block text-[10px] font-normal">{formatVariancePercent(percent)}</span></> : <span className="font-normal">—</span>}
                    </div>

                    <div className="order-3 col-span-2 flex min-w-0 items-center justify-end gap-1 md:col-span-1">
                        <div className="flex w-full min-w-0 overflow-hidden rounded-sm border border-[var(--sb-border)] bg-white md:max-w-64">
                          <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center border-r border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)] md:h-10 md:w-10" onClick={() => adjustPhysicalQty(line.item_id, -1)} aria-label={`Decrease physical quantity for ${line.item_name}`}><Minus className="h-4 w-4" /></button>
                        <Input
                          id={`physical-${line.item_id}`}
                          name="line_physical_qty"
                          type="number"
                          min="0"
                          step={quantityStep(line.uom)}
                          value={line.physicalQty}
                          onChange={(event) => updatePhysicalQty(line.item_id, event.target.value)}
                          onBlur={() => normalizePhysicalQty(line.item_id)}
                          required
                           aria-label={`Counted quantity for ${line.item_name}`}
                          placeholder="0.00"
                           className="h-9 min-w-0 flex-1 rounded-none border-0 px-2 text-center text-[13px] font-semibold tabular-nums shadow-none focus-visible:ring-inset [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none md:h-10 md:min-w-[7.5rem]"
                        />
                          <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center border-l border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)] md:h-10 md:w-10" onClick={() => adjustPhysicalQty(line.item_id, 1)} aria-label={`Increase physical quantity for ${line.item_name}`}><Plus className="h-4 w-4" /></button>
                        </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{line.uom}</span>
                    </div>

                    <input type="hidden" name="line_item_id" value={line.item_id} />
                    <input type="hidden" name="line_id" value={line.line_id ?? ""} />
                    <input type="hidden" name="line_theoretical_qty" value={line.theoretical_qty} />
                    <input type="hidden" name="line_uom" value={line.uom} />
                    <input type="hidden" name="line_remarks" value={line.remarks} readOnly />
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
          </section>

          {showSubmit ? (
            <div
              data-mobile-document-action
              className="sb-mobile-action-bar fixed inset-x-0 bottom-0 z-[var(--sb-z-sticky)] flex min-w-0 items-center gap-3 border-t border-[var(--sb-border)] bg-[var(--sb-surface)] p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_14px_rgb(6_44_31_/_0.14)] xl:hidden"
            >
              <div className="flex min-w-0 flex-1 flex-col items-start gap-0">
                <span
                  className={`max-w-full truncate text-xs font-medium ${autosaveState === "error" ? "text-destructive" : autosaveState === "saved" ? "text-[var(--sb-green-900)]" : "text-muted-foreground"}`}
                  role="status"
                  aria-live="polite"
                  title={autosaveError || autosaveLabel}
                >
                  {autosaveLabel}
                </span>
                <span className="text-sm font-semibold tabular-nums">{lines.length} values ready</span>
                <span className="text-xs tabular-nums text-muted-foreground">{adjustedCount} adjusted{autosaveError ? ` · ${autosaveError}` : ""}</span>
              </div>
              <SubmitButton type="submit" disabled={!countComplete} className="shrink-0" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Save draft</SubmitButton>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
