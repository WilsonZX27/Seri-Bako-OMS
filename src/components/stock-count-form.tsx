"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AlertTriangle, Archive, CalendarDays, ChevronDown, ListFilter, ListPlus, MapPin, Minus, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { TableActionMenuPortal } from "@/components/ui/table-action-menu-portal";
import { StockCountLineRecovery } from "@/components/stock-count-line-recovery";
import { formatDateOnly, formatQuantity, formatQuantityInput, getToday } from "@/lib/utils";
import type { StockCountAutosaveResult } from "@/server/actions/stock-counts";

type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };
type SeedLine = {
  line_id?: string;
  item_id: string;
  item_code: string;
  item_name: string;
  theoretical_qty: number;
  physical_qty: number | null;
  prefill_source: "last_posted_count" | "ledger_balance" | "unavailable";
  uom: string;
  remarks?: string | null;
  retirement?: { reason: RetirementReason; note: string; actual_qty: number; status: "pending" | "applied" } | null;
};

type RetirementReason = "used_up" | "wrong_or_duplicate_code" | "branch_no_longer_uses" | "other";
type SeedLineInput = SeedLine & { physicalQty: string; remarks: string; initialPhysicalQty: string; adjusted: boolean; retireAfterCount: boolean; retirementReason: RetirementReason | ""; retirementNote: string };
type AutosaveState = "idle" | "local" | "recovered" | "saving" | "saved" | "error";
const STOCK_COUNT_SORT_KEY = "seri-bako:stock-count-sort";
const MAX_AUTOSAVE_RETRIES = 3;
const AUTOSAVE_DEBOUNCE_MS = 12_000;
type LocalDraftSnapshot = {
  version?: 2;
  branchId: string;
  countDate: string;
  remarks: string;
  lines: Array<{ itemId: string; physicalQty: string; initialPhysicalQty?: string; remarks: string }>;
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
  const physicalQty = line.physical_qty === null ? "" : quantityInputValue(line.physical_qty, line.uom);
  return { ...line, physicalQty, initialPhysicalQty: physicalQty, remarks: line.remarks ?? "", adjusted: false, retireAfterCount: line.retirement?.status === "pending", retirementReason: line.retirement?.reason ?? "", retirementNote: line.retirement?.note ?? "" };
}

function formatVariancePercent(percent: number | null) {
  // A zero theoretical balance has no meaningful percentage denominator. Do
  // not turn that undefined ratio into a false 0% signal.
  if (percent === null || Number.isNaN(percent)) return "—";
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
  initialRemarks,
  autosaveAction,
  draftId,
  lineRevisionAction,
  itemCatalog = [],
  addItemControl,
  initialLineAction,
  allowAddItem = false,
}: {
  branches: BranchOption[];
  selectedBranchId?: string;
  seedLines: SeedLine[];
  action: (formData: FormData) => Promise<void>;
  formId?: string;
  showSubmit?: boolean;
  initialCountDate?: string;
  initialRemarks?: string | null;
  autosaveAction?: (formData: FormData) => Promise<StockCountAutosaveResult>;
  draftId?: string;
  lineRevisionAction?: (formData: FormData) => Promise<void>;
  itemCatalog?: Array<{ id: string; item_code: string; item_name: string; base_unit: string }>;
  addItemControl?: ReactNode;
  initialLineAction?: { mode: "replace" | "remove"; itemId: string } | null;
  allowAddItem?: boolean;
}) {
  const router = useRouter();
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
  const [countRemarks, setCountRemarks] = useState(initialRemarks ?? "");
  const [dirtyRevision, setDirtyRevision] = useState(0);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const [autosaveError, setAutosaveError] = useState("");
  const [autosaveRetryable, setAutosaveRetryable] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdjustedOnly, setShowAdjustedOnly] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "code">("code");
  const [retirementItemId, setRetirementItemId] = useState<string | null>(null);
  const [retirementReason, setRetirementReason] = useState<RetirementReason>("used_up");
  const [retirementNote, setRetirementNote] = useState("");
  const [afterCreateAction, setAfterCreateAction] = useState<"add-item" | "replace" | "remove" | "">("");
  const [afterCreateItemId, setAfterCreateItemId] = useState("");
  const retirementTriggerRef = useRef<HTMLButtonElement>(null);
  const retirementCancelRef = useRef<HTMLButtonElement>(null);
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
    setShowMissingOnly(false);
    setValidationAttempted(false);
    setCountDate(initialCountDate ?? getToday());
    setCountRemarks(initialRemarks ?? "");
    hasUserEdited.current = false;
    setAutosaveState("idle");
    setAutosaveError("");
    setAutosaveRetryable(true);
  }, [selectedBranchId, seedLines, initialCountDate, initialRemarks]);

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
      if (snapshot.branchId !== resolvedBranchId) {
        window.localStorage.removeItem(localStorageKey);
        return;
      }
      const isLegacySnapshot = snapshot.version !== 2;
      const savedLines = new Map(snapshot.lines.map((line) => [line.itemId, line]));
      setLines(seedLines.map((line) => {
        const editable = makeEditableLine(line);
        const saved = savedLines.get(line.item_id);
        if (!saved) return editable;
        // When the server-side starting balance changed, do not turn an old
        // untouched prefill into a false user adjustment. Explicit edits are
        // preserved because they differ from the snapshot's original value.
        const physicalQty = !isLegacySnapshot && saved.physicalQty === saved.initialPhysicalQty
          ? editable.physicalQty
          : saved.physicalQty;
        return {
          ...editable,
          physicalQty,
          remarks: saved.remarks,
          // Legacy snapshots did not record their original prefill, so there is
          // no honest way to label the recovered value as a user adjustment.
          // Preserve it, but wait for the next explicit edit before marking it.
          adjusted: isLegacySnapshot ? false : physicalQty !== editable.initialPhysicalQty,
        };
      }));
      setCountDate(snapshot.countDate);
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
    const formData = new FormData(formRef.current);
    const physicalValues = formData.getAll("line_physical_qty").map(String);
    if (!physicalValues.length || physicalValues.some((value) => value.trim() === "")) {
      setAutosaveState("local");
      setAutosaveError("");
      setAutosaveRetryable(true);
      return true;
    }
    if (retryRevision.current !== revision) {
      retryRevision.current = revision;
      retryAttempts.current = 0;
    }
    const sequence = ++saveSequence.current;
    setAutosaveState("saving");
    setAutosaveError("");
    setAutosaveRetryable(true);
    try {
      const result = await autosaveAction(formData);
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
      version: 2,
      branchId: resolvedBranchId,
      countDate,
      remarks: countRemarks,
      lines: lines.map((line) => ({ itemId: line.item_id, physicalQty: line.physicalQty, initialPhysicalQty: line.initialPhysicalQty, remarks: line.remarks })),
      savedLocallyAt: new Date().toISOString(),
    };
    window.localStorage.setItem(localStorageKey, JSON.stringify(snapshot));
    // Give a physical-count entry session time to finish a short burst of
    // edits before sending a draft write. The local snapshot is still written
    // immediately, so this delay never risks losing the user's work.
    const timer = window.setTimeout(() => void saveDraft(dirtyRevision), AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [countDate, countRemarks, dirtyRevision, lines, localStorageKey, resolvedBranchId, saveDraft]);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const firstMissing = lines.find((line) => line.physicalQty.trim() === "");
    if (!firstMissing) return;

    event.preventDefault();
    setAfterCreateAction("");
    setAfterCreateItemId("");
    setValidationAttempted(true);
    setSearch("");
    setShowAdjustedOnly(false);
    setShowMissingOnly(true);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const input = document.getElementById(`physical-${firstMissing.item_id}`);
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus({ preventScroll: true });
    }));
  }

  function openRetirement(line: SeedLineInput) {
    setRetirementItemId(line.item_id);
    setRetirementReason(line.retirementReason || "used_up");
    setRetirementNote(line.retirementNote);
  }

  function confirmRetirement() {
    if (!retirementItemId || retirementNote.trim().length < 3) return;
    markDirty();
    setLines((current) => current.map((line) => line.item_id === retirementItemId ? { ...line, retireAfterCount: true, retirementReason, retirementNote: retirementNote.trim() } : line));
    setRetirementItemId(null);
  }

  function cancelRetirement(itemId: string) {
    markDirty();
    setLines((current) => current.map((line) => line.item_id === itemId ? { ...line, retireAfterCount: false, retirementReason: "", retirementNote: "" } : line));
  }

  function continueInSavedDraft(actionName: "add-item" | "replace" | "remove", itemId = "") {
    setAfterCreateAction(actionName);
    setAfterCreateItemId(itemId);
    // Line-scope changes require a persisted Stock Count identity for audit.
    // Save the current form once, then open the requested action on the draft.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => formRef.current?.requestSubmit()));
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
  const needsPhysicalCount = lines.filter((line) => line.physicalQty.trim() === "").length;
  const completedCount = lines.length - needsPhysicalCount;
  const normalizedSearch = search.trim().toLowerCase();
  const visibleLines = lines
    .filter((line) => {
      if (showMissingOnly && line.physicalQty.trim() !== "") return false;
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
        : autosaveState === "local"
          ? "Progress saved on this device"
          : autosaveState === "error"
          ? autosaveRetryable
            ? "Save failed — retrying"
            : "Save failed — changes kept locally"
          : "Autosave ready";

  return (
    <div className="min-w-0">
      <div>
        <form ref={formRef} id={formId} action={action} noValidate onSubmit={handleSubmit} className={showSubmit ? "space-y-3 pb-28 xl:pb-0" : "space-y-3"}>
          <input type="hidden" name="has_unsaved_changes" value={String(dirtyRevision > lastSavedRevision.current)} />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input type="hidden" name="after_create_action" value={afterCreateAction} />
          <input type="hidden" name="after_create_item_id" value={afterCreateItemId} />
          <input type="hidden" name="tolerance_percent" value="0" />
          <section data-stock-count-setup className="erp-surface overflow-hidden rounded-[var(--sb-panel-radius)] border bg-[var(--sb-surface)] p-3 md:p-4">
            <input type="hidden" name="branch_id" value={resolvedBranchId} />
            <button type="button" data-stock-count-details-toggle className="flex min-h-12 w-full min-w-0 items-start justify-between gap-3 text-left" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((current) => !current)}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Count details</p>
                {!settingsOpen ? <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span data-stock-count-branch-summary className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" />{branches.find((branch) => branch.id === resolvedBranchId)?.branch_name ?? "Assigned branch"}</span>
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
                  <p className="text-xs text-muted-foreground">{completedCount} of {lines.length} counted · {adjustedCount} adjusted</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{countComplete ? "Ready to save" : `${needsPhysicalCount} need${needsPhysicalCount === 1 ? "s" : ""} a physical count`}</span>
              </div>
              <div className="grid gap-2 lg:col-span-2">
                {branches.length > 1 ? <Field label="Branch"><SelectNative name="branch_selector" value={selectedBranchId ?? branches[0]?.id ?? ""} onChange={(event) => selectBranch(event.target.value)}><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}</SelectNative></Field> : <p data-stock-count-branch-lock className="self-end pb-2 text-xs text-muted-foreground">Branch locked to {branches[0]?.branch_name ?? "assigned kitchen"}.</p>}
              </div>
              <div className="lg:col-span-2"><Textarea name="remarks" value={countRemarks} onChange={(event) => { setCountRemarks(event.target.value); markDirty(); }} className="min-h-16" placeholder="Count note (optional)" /></div>
            </div>
          </section>

          <section data-stock-count-workspace className="erp-surface overflow-hidden rounded-[var(--sb-panel-radius)] border bg-[var(--sb-surface)]">

          {validationAttempted && needsPhysicalCount > 0 ? (
            <div role="alert" className="m-3 flex items-start gap-2 rounded-[var(--sb-control-radius)] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-semibold">{needsPhysicalCount} item{needsPhysicalCount === 1 ? "" : "s"} still need a count</p>
                <p className="mt-0.5 text-xs">Complete the highlighted item{needsPhysicalCount === 1 ? "" : "s"}. The first missing quantity is focused below.</p>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2 border-b border-[var(--sb-border-soft)] bg-[var(--sb-surface)] p-3 md:bg-transparent md:px-3 md:pt-3">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Find an item</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={search} onChange={(event) => { setSearch(event.target.value); setShowMissingOnly(false); }} className="pl-9" placeholder="Find item name or code" />
            </label>
            <SelectNative aria-label="Sort items" value={sortBy} onChange={(event) => setSortBy(event.target.value as "name" | "code")} className="h-[var(--sb-control-height)] w-[4.75rem] shrink-0 px-2 text-xs">
              <option value="name">Name</option>
              <option value="code">Code</option>
            </SelectNative>
            <button
              type="button"
              className="inline-flex h-[var(--sb-control-height)] min-w-11 shrink-0 items-center justify-center gap-1.5 border border-[var(--sb-border)] bg-[var(--sb-surface)] px-2.5 text-sm font-medium hover:bg-[var(--sb-surface-muted)]"
              aria-pressed={showAdjustedOnly || showMissingOnly}
              onClick={() => {
                if (showMissingOnly) {
                  setShowMissingOnly(false);
                  return;
                }
                setShowAdjustedOnly((current) => !current);
              }}
            >
              <ListFilter className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{showMissingOnly || showAdjustedOnly ? "Show all items" : `Show adjusted (${adjustedCount})`}</span>
              <span className="text-xs tabular-nums sm:hidden">{showMissingOnly ? `Missing ${needsPhysicalCount}` : showAdjustedOnly ? "All" : adjustedCount}</span>
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
                <input name="line_item_code" value={line.item_code} readOnly />
                <input name="line_retire_after_count" value={String(line.retireAfterCount)} readOnly />
                <input name="line_retirement_reason" value={line.retirementReason} readOnly />
                <input name="line_retirement_note" value={line.retirementNote} readOnly />
              </div>
            ))}
          </div>

          <div data-stock-count-line-list>
            <div className="hidden border-y border-[var(--sb-border)] bg-[var(--sb-surface-muted)] px-4 py-2 lg:grid lg:grid-cols-[minmax(12rem,1fr)_5rem_minmax(14rem,17rem)] lg:items-center lg:gap-4 xl:grid-cols-[minmax(16rem,1fr)_5rem_minmax(16rem,18rem)]">
              <p className="text-xs font-semibold">Item</p>
              <p className="text-xs text-right font-semibold">Variance</p>
              <p className="text-xs font-semibold">Count</p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 sm:block sm:divide-y sm:gap-0 sm:p-0">
              {visibleLines.map((line, visibleIndex) => {
                const displayIndex = visibleIndex + 1;
                const hasPhysical = line.physicalQty.trim() !== "";
                const physical = hasPhysical ? toNumber(line.physicalQty) : 0;
                const variance = physical - line.theoretical_qty;
                const percent = variancePercent(line.theoretical_qty, physical);
                return (
                  <div
                    key={line.item_id}
                    data-stock-count-line
                    className={`grid min-h-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-[var(--sb-control-radius)] border px-3 py-3 ${validationAttempted && !hasPhysical ? "border-destructive/50 bg-destructive/10" : line.adjusted ? "border-[var(--sb-border-soft)] bg-[var(--sb-green-100)]" : line.prefill_source === "unavailable" ? "border-[var(--sb-border-soft)] bg-[var(--sb-warning-bg)]" : "border-[var(--sb-border-soft)] bg-[var(--sb-surface)]"} sm:min-h-14 sm:items-center sm:gap-x-2 sm:gap-y-1.5 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:px-4 sm:py-2 md:min-h-14 lg:grid-cols-[minmax(12rem,1fr)_5rem_minmax(14rem,17rem)] lg:gap-4 xl:grid-cols-[minmax(16rem,1fr)_5rem_minmax(16rem,18rem)]`}
                  >
                    <div className="order-1 flex min-w-0 items-start gap-2">
                      <div className="flex w-7 shrink-0 flex-col items-center gap-0.5">
                        <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sb-surface-muted)] px-1 text-[10px] font-semibold tabular-nums text-muted-foreground" aria-label={`Item ${displayIndex}`}>{displayIndex}</span>
                        <TableActionMenuPortal label={`More options for ${line.item_name}`}>
                          {lineRevisionAction && line.line_id ? <StockCountLineRecovery action={lineRevisionAction} line={{ id: line.line_id, item_id: line.item_id, physical_qty: toNumber(line.physicalQty), uom: line.uom }} items={itemCatalog} reviewMode={false} menuTrigger initialOpenMode={initialLineAction?.itemId === line.item_id ? initialLineAction.mode : undefined} /> : <>
                            <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-xs font-medium hover:bg-[var(--sb-surface-muted)]" onClick={() => continueInSavedDraft("replace", line.item_id)}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Replace item</button>
                            <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-xs font-medium text-[var(--sb-danger)] hover:bg-[var(--sb-danger-bg)]" onClick={() => continueInSavedDraft("remove", line.item_id)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Remove from this count</button>
                          </>}
                          <button ref={retirementTriggerRef} type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-xs font-medium hover:bg-[var(--sb-surface-muted)]" onClick={() => line.retireAfterCount ? cancelRetirement(line.item_id) : openRetirement(line)}>
                            <Archive className="h-3.5 w-3.5" aria-hidden="true" />{line.retireAfterCount ? "Keep active" : "Retire after this count"}
                          </button>
                        </TableActionMenuPortal>
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-[13px] font-medium leading-tight text-slate-800">{line.item_name}</p>
                        <p className="min-w-0 break-all text-[10px] leading-3 tracking-[0.01em] text-slate-400">{line.item_code}</p>
                        <p className="mt-1 hidden text-[10px] leading-3 text-muted-foreground sm:block">{line.prefill_source === "unavailable" ? "No prior ledger balance · enter count" : `Starting balance · ${formatQuantity(line.theoretical_qty)} ${line.uom}`}</p>
                      </div>
                    </div>

                    <div className={`order-2 min-w-0 text-right text-xs font-medium sm:justify-self-end ${variance < 0 ? "text-red-600" : variance > 0 ? "text-emerald-700" : "text-muted-foreground"}`}>
                      {hasPhysical ? <><span className="block whitespace-nowrap">{variance > 0 ? "+" : ""}{formatQuantity(variance)}</span><span className="block text-[10px] font-normal">{formatVariancePercent(percent)}</span></> : <span className="font-normal">—</span>}
                    </div>

                    <div className="order-3 col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-2 lg:col-span-1 lg:justify-self-stretch">
                        <div className="flex min-w-0 flex-1 overflow-hidden rounded-sm border border-[var(--sb-border)] bg-[var(--sb-surface)]">
                          <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center border-r border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)]" onClick={() => adjustPhysicalQty(line.item_id, -1)} aria-label={`Decrease physical quantity for ${line.item_name}`}><Minus className="h-4 w-4" /></button>
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
                          aria-invalid={validationAttempted && !hasPhysical}
                          aria-describedby={validationAttempted && !hasPhysical ? `physical-error-${line.item_id}` : undefined}
                           aria-label={`Counted quantity for ${line.item_name}`}
                          placeholder={line.prefill_source === "unavailable" ? "Enter count" : "0.00"}
                           className="h-10 w-full min-w-10 flex-1 rounded-none border-0 px-1 text-center text-[13px] font-semibold tabular-nums shadow-none focus-visible:ring-inset [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                          <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center border-l border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)]" onClick={() => adjustPhysicalQty(line.item_id, 1)} aria-label={`Increase physical quantity for ${line.item_name}`}><Plus className="h-4 w-4" /></button>
                        </div>
                      <span className="truncate text-left text-[11px] text-muted-foreground" title={line.uom}>{line.uom}</span>
                      {validationAttempted && !hasPhysical ? <span id={`physical-error-${line.item_id}`} className="sr-only">Physical count required</span> : null}
                    </div>

                    <input type="hidden" name="line_item_id" value={line.item_id} />
                    <input type="hidden" name="line_id" value={line.line_id ?? ""} />
                    <input type="hidden" name="line_theoretical_qty" value={line.theoretical_qty} />
                    <input type="hidden" name="line_uom" value={line.uom} />
                    <input type="hidden" name="line_remarks" value={line.remarks} readOnly />
                    <input type="hidden" name="line_item_code" value={line.item_code} readOnly />
                    <input type="hidden" name="line_retire_after_count" value={String(line.retireAfterCount)} readOnly />
                    <input type="hidden" name="line_retirement_reason" value={line.retirementReason} readOnly />
                    <input type="hidden" name="line_retirement_note" value={line.retirementNote} readOnly />
                  </div>
                );
              })}
              {addItemControl || (!draftId && allowAddItem) ? <div className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-[var(--sb-control-radius)] border border-dashed border-[var(--sb-green-700)] bg-[var(--sb-green-50)] p-3 sm:min-h-20 sm:rounded-none sm:border-x-0 sm:border-t-0 [&_button]:min-h-9 [&_button]:w-full [&_button]:justify-center [&_button]:border-0 [&_button]:bg-transparent [&_button]:shadow-none">{addItemControl ?? <><Button type="button" variant="outline" disabled={!itemCatalog.length || !countComplete} title={!itemCatalog.length ? "No active catalogue items are available" : !countComplete ? "Finish the current count before adding another item" : "Save this draft and choose an item"} onClick={() => continueInSavedDraft("add-item")}><ListPlus className="h-4 w-4" aria-hidden="true" />Add item</Button>{!countComplete ? <p className="text-xs text-muted-foreground">Finish the current count first; your entries will then be saved before the item picker opens.</p> : null}</>}</div> : null}
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

          <ModalShell open={Boolean(retirementItemId)} onClose={() => setRetirementItemId(null)} titleId="stock-count-retirement-title" triggerRef={retirementTriggerRef} initialFocusRef={retirementCancelRef} className="max-w-md">
            <h2 id="stock-count-retirement-title" className="flex items-center gap-2 text-base font-semibold"><Archive className="h-4 w-4" />Retire item after this count</h2>
            <p className="mt-2 text-sm text-muted-foreground">The item stays in this final count. After posting, it will be removed from future Stock Counts for this branch and Purchasing and Finance will be notified.</p>
            <div className="mt-4 space-y-4">
              <Field label="Retirement reason"><SelectNative value={retirementReason} onChange={(event) => setRetirementReason(event.target.value as RetirementReason)}><option value="used_up">Used up and no longer required</option><option value="wrong_or_duplicate_code">Wrong or duplicate item code</option><option value="branch_no_longer_uses">This branch no longer uses it</option><option value="other">Other</option></SelectNative></Field>
              <Field label="What happened and what Purchasing should update"><Textarea value={retirementNote} onChange={(event) => setRetirementNote(event.target.value)} minLength={3} maxLength={1000} required placeholder="Explain why this item is retiring and any AutoCount correction needed." /></Field>
              <p className="rounded-[var(--sb-control-radius)] bg-[var(--sb-surface-muted)] p-3 text-xs text-muted-foreground">Final actual stock: <strong className="text-foreground">{formatQuantity(toNumber(lines.find((line) => line.item_id === retirementItemId)?.physicalQty ?? 0))} {lines.find((line) => line.item_id === retirementItemId)?.uom ?? ""}</strong>. Change the count field first if this is not correct.</p>
              <div className="flex justify-end gap-2"><Button ref={retirementCancelRef} type="button" variant="outline" onClick={() => setRetirementItemId(null)}>Keep active</Button><Button type="button" disabled={retirementNote.trim().length < 3} onClick={confirmRetirement}>Retire after posting</Button></div>
            </div>
          </ModalShell>

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
                <span className="text-sm font-semibold tabular-nums">{completedCount} of {lines.length} counted</span>
                <span className="text-xs tabular-nums text-muted-foreground">{needsPhysicalCount ? `${needsPhysicalCount} remaining` : `${adjustedCount} adjusted`}{autosaveError ? ` · ${autosaveError}` : ""}</span>
              </div>
              <SubmitButton type="submit" className="h-12 w-auto min-w-32 shrink-0 px-5" pendingLabel="Saving..." showOverlay overlayLabel="Saving changes...">Save draft</SubmitButton>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
