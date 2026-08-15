"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, ChevronDown, ListFilter, MapPin, Minus, Plus, Search } from "lucide-react";
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
  // Keep the settings content present on the first render so desktop/tablet
  // users never lose the optional count note while the viewport media query
  // synchronises. The media-query effect below collapses it on phone widths.
  const [settingsOpen, setSettingsOpen] = useState(true);
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
    <div className="min-w-0">
      <div>
        <form ref={formRef} id={formId} action={action} className={showSubmit ? "space-y-3 pb-28 xl:pb-0" : "space-y-3"}>
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <section data-stock-count-setup className="erp-surface overflow-hidden rounded-[var(--sb-panel-radius)] border bg-[var(--sb-surface)] p-3 md:p-4">
            <input type="hidden" name="branch_id" value={resolvedBranchId} />
            <button type="button" className="flex w-full min-w-0 items-start justify-between gap-3 text-left" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((current) => !current)}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Count details</p>
                {!settingsOpen ? <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" />{branches.find((branch) => branch.id === resolvedBranchId)?.branch_name ?? "Assigned branch"}</span>
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{formatDateOnly(countDate)}</span>
                </div> : <p className="mt-0.5 text-xs text-muted-foreground">Date, branch and count settings.</p>}
              </div>
              <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
            </button>
            <div className={`${settingsOpen ? "grid" : "hidden"} mt-3 gap-3 border-t border-[var(--sb-border-soft)] pt-3 lg:grid-cols-2`}>
              <div className="flex min-w-0 flex-col gap-2 rounded-[var(--sb-control-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface)] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Count date</p>
                  <p className="text-sm font-semibold text-foreground">{initialCountDate ? formatDateOnly(countDate) : `Today · ${formatDateOnly(countDate)}`}</p>
                </div>
                <Input aria-label="Count date" name="count_date" type="date" value={countDate} onChange={(event) => { setCountDate(event.target.value); markDirty(); }} required className="w-full shrink-0 sm:w-40" />
              </div>
              <div className="hidden min-w-0 items-center justify-between gap-3 rounded-[var(--sb-control-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface)] p-3 md:flex" aria-live="polite">
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${autosaveState === "error" ? "text-destructive" : autosaveState === "saved" ? "text-[var(--sb-green-900)]" : "text-muted-foreground"}`} title={autosaveError || autosaveLabel}>{autosaveLabel}</p>
                  <p className="text-xs text-muted-foreground">{lines.length} values ready · {adjustedCount} adjusted</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{countComplete ? "Ready to save" : "Complete all quantities"}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:col-span-2">
                <Field label="Tolerance %"><Input name="tolerance_percent" type="number" min="0" step="0.01" value={toleranceValue} onChange={(event) => { setToleranceValue(event.target.value); markDirty(); }} required /></Field>
                {branches.length > 1 ? <Field label="Branch"><SelectNative name="branch_selector" value={selectedBranchId ?? branches[0]?.id ?? ""} onChange={(event) => selectBranch(event.target.value)}><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}</SelectNative></Field> : <p className="self-end pb-2 text-xs text-muted-foreground">Branch locked to {branches[0]?.branch_name ?? "assigned kitchen"}.</p>}
              </div>
              <div className="lg:col-span-2"><Textarea name="remarks" value={countRemarks} onChange={(event) => { setCountRemarks(event.target.value); markDirty(); }} className="min-h-16" placeholder="Count note (optional)" /></div>
            </div>
          </section>

          <section data-stock-count-workspace className="erp-surface overflow-hidden rounded-[var(--sb-panel-radius)] border bg-[var(--sb-surface)]">

          <div className="flex items-center gap-2 border-b border-[var(--sb-border-soft)] bg-[var(--sb-surface)] p-3 md:bg-transparent md:px-3 md:pt-3">
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
              className="inline-flex h-[var(--sb-control-height)] min-w-11 shrink-0 items-center justify-center gap-1.5 border border-[var(--sb-border)] bg-[var(--sb-surface)] px-2.5 text-sm font-medium hover:bg-[var(--sb-surface-muted)]"
              aria-pressed={showAdjustedOnly}
              onClick={() => setShowAdjustedOnly((current) => !current)}
            >
              <ListFilter className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{showAdjustedOnly ? "Show all items" : `Show adjusted (${adjustedCount})`}</span>
              <span className="text-xs tabular-nums sm:hidden">{showAdjustedOnly ? "All" : adjustedCount}</span>
            </button>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--sb-border-soft)] bg-[var(--sb-surface)] px-4 py-2 text-xs" role="status" aria-live="polite">
            <p className="min-w-0 text-muted-foreground"><strong className="font-semibold text-foreground">{visibleLines.length}</strong> items shown</p>
            <p className="shrink-0 tabular-nums text-muted-foreground"><strong className="font-semibold text-foreground">{adjustedCount}</strong> adjusted</p>
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

          <div data-stock-count-line-list>
            <div className="sticky top-[7.25rem] z-10 hidden border-y border-[var(--sb-border)] bg-[var(--sb-surface)] px-4 py-2 shadow-[0_4px_10px_rgb(6_44_31_/_0.08)] lg:grid lg:grid-cols-[minmax(12rem,1fr)_5rem_minmax(14rem,17rem)] lg:items-center lg:gap-4 xl:top-[7.75rem] xl:grid-cols-[minmax(16rem,1fr)_5rem_minmax(16rem,18rem)]">
              <p className="text-xs font-semibold">Item</p>
              <p className="text-xs text-right font-semibold">Variance</p>
              <p className="text-xs font-semibold">Count</p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 sm:block sm:divide-y sm:gap-0 sm:p-0">
              {visibleLines.map((line, lineIndex) => {
                const hasPhysical = line.physicalQty.trim() !== "";
                const physical = hasPhysical ? toNumber(line.physicalQty) : 0;
                const variance = physical - line.theoretical_qty;
                const percent = variancePercent(line.theoretical_qty, physical);
                return (
                  <div
                    key={line.item_id}
                    data-stock-count-line
                    className={`grid min-h-[13rem] grid-cols-1 content-between gap-2 rounded-[var(--sb-control-radius)] border border-[var(--sb-border-soft)] px-3 py-3 ${line.adjusted ? "bg-[var(--sb-green-100)]" : "bg-[var(--sb-surface)]"} sm:min-h-14 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-2 sm:gap-y-1.5 sm:rounded-none sm:border-0 sm:border-b sm:px-4 sm:py-2 md:min-h-14 lg:grid-cols-[minmax(12rem,1fr)_5rem_minmax(14rem,17rem)] lg:gap-4 xl:grid-cols-[minmax(16rem,1fr)_5rem_minmax(16rem,18rem)]`}
                  >
                    <div className="order-1 flex min-w-0 items-start gap-2">
                      <span className="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sb-surface-muted)] px-1 text-[10px] font-semibold tabular-nums text-muted-foreground" aria-label={`Item ${lineIndex + 1}`}>{lineIndex + 1}</span>
                      <div className="min-w-0">
                        <p className="break-words text-[13px] font-medium leading-tight text-slate-800">{line.item_name}</p>
                        <p className="min-w-0 break-all text-[10px] leading-3 tracking-[0.01em] text-slate-400">{line.item_code}</p>
                      </div>
                    </div>

                    <div className={`order-2 min-w-0 text-right text-xs font-medium sm:justify-self-end ${variance < 0 ? "text-red-600" : variance > 0 ? "text-emerald-700" : "text-muted-foreground"}`}>
                      {hasPhysical ? <><span className="block whitespace-nowrap">{variance > 0 ? "+" : ""}{formatQuantity(variance)}</span><span className="block text-[10px] font-normal">{formatVariancePercent(percent)}</span></> : <span className="font-normal">—</span>}
                    </div>

                    <div className="order-3 flex min-w-0 items-center justify-end gap-2 sm:col-span-2 lg:col-span-1 lg:justify-self-stretch">
                        <div className="flex min-w-0 flex-1 overflow-hidden rounded-sm border border-[var(--sb-border)] bg-[var(--sb-surface)]">
                          <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center border-r border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)] lg:h-10 lg:w-10" onClick={() => adjustPhysicalQty(line.item_id, -1)} aria-label={`Decrease physical quantity for ${line.item_name}`}><Minus className="h-4 w-4" /></button>
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
                           className="h-9 w-full min-w-0 flex-1 rounded-none border-0 px-2 text-center text-[13px] font-semibold tabular-nums shadow-none focus-visible:ring-inset [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none lg:h-10"
                        />
                          <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center border-l border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)] lg:h-10 lg:w-10" onClick={() => adjustPhysicalQty(line.item_id, 1)} aria-label={`Increase physical quantity for ${line.item_name}`}><Plus className="h-4 w-4" /></button>
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
              className="sb-mobile-action-bar fixed inset-x-0 bottom-0 z-[var(--sb-z-sticky)] grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--sb-border)] bg-[var(--sb-surface)] p-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(6_44_31_/_0.16)] md:hidden"
            >
              <div className="flex min-w-0 flex-1 flex-col items-start gap-0">
                <span
                  className={`max-w-full break-words text-xs font-medium ${autosaveState === "error" ? "text-destructive" : autosaveState === "saved" ? "text-[var(--sb-green-900)]" : "text-muted-foreground"}`}
                  role="status"
                  aria-live="polite"
                  title={autosaveError || autosaveLabel}
                >
                  {autosaveLabel}
                </span>
                <span className="text-sm font-semibold tabular-nums">{lines.length} values ready</span>
                <span className="text-xs tabular-nums text-muted-foreground">{adjustedCount} adjusted{autosaveError ? ` · ${autosaveError}` : ""}</span>
              </div>
              <SubmitButton type="submit" disabled={!countComplete} className="h-11 w-auto min-w-32 shrink-0 px-5" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Save draft</SubmitButton>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
