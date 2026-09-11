"use client";

import { createContext, type ReactNode, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";

type BulkSelectionContextValue = {
  selectedIds: Set<string>;
  visibleIds: string[];
  hydrated: boolean;
  toggleOne: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
};

const BulkSelectionContext = createContext<BulkSelectionContextValue | null>(null);

export function useBulkSelection() {
  const context = useContext(BulkSelectionContext);
  if (!context) throw new Error("Bulk selection components must be used inside BulkSelectionProvider.");
  return context;
}

export function BulkSelectionProvider(props: {
  ids: string[];
  children: ReactNode;
  actionLabel?: string;
  actionHint?: string;
  confirmMessage?: string;
  actionVariant?: "default" | "destructive";
  canAct?: boolean;
  action?: (formData: FormData) => void | Promise<void>;
  fieldName?: string;
  selectionActions?: ReactNode;
}) {
  const {
    ids,
    children,
    actionHint = "Open selected records to archive or deactivate them safely.",
    confirmMessage,
    actionVariant = "destructive",
    actionLabel,
    canAct = false,
    action,
    fieldName = "selected_id",
    selectionActions,
  } = props;
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmTitleId = useId();
  const confirmTriggerRef = useRef<HTMLButtonElement>(null);
  const confirmCancelRef = useRef<HTMLButtonElement>(null);
  const visibleIds = useMemo(() => ids, [ids]);

  useEffect(() => setHydrated(true), []);

  const value = useMemo<BulkSelectionContextValue>(() => ({
    selectedIds: selected,
    visibleIds,
    hydrated,
    toggleOne(id) {
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    toggleAll() {
      setSelected((current) => {
        const allSelected = visibleIds.length > 0 && visibleIds.every((id) => current.has(id));
        return allSelected ? new Set() : new Set(visibleIds);
      });
    },
    clear() {
      setSelected(new Set());
    },
  }), [hydrated, selected, visibleIds]);

  return (
    <BulkSelectionContext.Provider value={value}>
      <div className="space-y-3">
        {selected.size > 0 ? (
          <div className="flex flex-col gap-2 rounded-[2px] border bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold">Selected {selected.size} item{selected.size === 1 ? "" : "s"}</p>
              <p className="text-[11px] leading-4 text-muted-foreground">{actionHint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Audit contract: archive remains the variant="destructive" default; restore explicitly supplies the neutral variant. */}
              {action && actionLabel && canAct ? confirmMessage ? (
                <Button ref={confirmTriggerRef} type="button" variant={actionVariant} size="sm" onClick={() => setConfirmOpen(true)}>
                  {actionLabel}
                </Button>
              ) : (
                <form action={action}>
                  {[...selected].map((id) => <input key={id} type="hidden" name={fieldName} value={id} />)}
                  <SubmitButton type="submit" variant={actionVariant} size="sm" pendingLabel="Processing...">{actionLabel}</SubmitButton>
                </form>
              ) : null}
              {selectionActions}
              <Button type="button" variant="ghost" size="sm" onClick={value.clear}>Deselect all</Button>
            </div>
          </div>
        ) : null}
        {children}
        {action && actionLabel && confirmMessage ? (
          <ModalShell
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            titleId={confirmTitleId}
            triggerRef={confirmTriggerRef}
            initialFocusRef={confirmCancelRef}
            className="max-w-md"
          >
            <h2 id={confirmTitleId} className="text-base font-semibold">Confirm {actionLabel.toLowerCase()}</h2>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">{confirmMessage}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button ref={confirmCancelRef} type="button" variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <form action={action}>
                {[...selected].map((id) => <input key={id} type="hidden" name={fieldName} value={id} />)}
                <SubmitButton type="submit" variant={actionVariant} pendingLabel="Processing..." showOverlay overlayLabel="Processing selected records...">
                  {actionLabel}
                </SubmitButton>
              </form>
            </div>
          </ModalShell>
        ) : null}
      </div>
    </BulkSelectionContext.Provider>
  );
}

export function BulkSelectAllCheckbox({ touchTarget = false }: { touchTarget?: boolean } = {}) {
  const { selectedIds, visibleIds, hydrated, toggleAll } = useBulkSelection();
  const checked = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const indeterminate = !checked && visibleIds.some((id) => selectedIds.has(id));
  const checkbox = <input
      type="checkbox"
      checked={checked}
      ref={(node) => {
        if (node) node.indeterminate = indeterminate;
      }}
      onChange={toggleAll}
      disabled={!hydrated}
      data-hydrated={hydrated ? "true" : "false"}
      aria-label="Select all visible rows"
      className="h-4 w-4 rounded border-slate-300"
    />;
  return touchTarget ? <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">{checkbox}</label> : checkbox;
}

export function BulkSelectRowCheckbox({ id, label = "Select row", touchTarget = false }: { id: string; label?: string; touchTarget?: boolean }) {
  const { selectedIds, hydrated, toggleOne } = useBulkSelection();
  const checkbox = <input
      type="checkbox"
      checked={selectedIds.has(id)}
      onChange={() => toggleOne(id)}
      disabled={!hydrated}
      data-hydrated={hydrated ? "true" : "false"}
      aria-label={label}
      className="h-4 w-4 rounded border-slate-300"
    />;
  return touchTarget ? <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">{checkbox}</label> : checkbox;
}
