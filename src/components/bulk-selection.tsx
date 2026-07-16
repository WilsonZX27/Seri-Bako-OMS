"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type BulkSelectionContextValue = {
  selectedIds: Set<string>;
  visibleIds: string[];
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
  /** Retained temporarily for list callers; no action is shown until it is real. */
  actionLabel?: string;
  actionHint?: string;
  canAct?: boolean;
}) {
  const { ids, children, actionHint = "Open selected records to archive or deactivate them safely." } = props;
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const visibleIds = useMemo(() => ids, [ids]);

  const value = useMemo<BulkSelectionContextValue>(() => ({
    selectedIds: selected,
    visibleIds,
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
  }), [selected, visibleIds]);

  return (
    <BulkSelectionContext.Provider value={value}>
      <div className="space-y-3">
        {selected.size > 0 ? (
          <div className="flex flex-col gap-3 rounded-[2px] border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Selected {selected.size} item{selected.size === 1 ? "" : "s"}</p>
              <p className="text-xs text-muted-foreground">{actionHint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={value.clear}>Deselect all</Button>
            </div>
          </div>
        ) : null}
        {children}
      </div>
    </BulkSelectionContext.Provider>
  );
}

export function BulkSelectAllCheckbox() {
  const { selectedIds, visibleIds, toggleAll } = useBulkSelection();
  const checked = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const indeterminate = !checked && visibleIds.some((id) => selectedIds.has(id));
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(node) => {
        if (node) node.indeterminate = indeterminate;
      }}
      onChange={toggleAll}
      aria-label="Select all visible rows"
      className="h-4 w-4 rounded border-slate-300"
    />
  );
}

export function BulkSelectRowCheckbox({ id }: { id: string }) {
  const { selectedIds, toggleOne } = useBulkSelection();
  return (
    <input
      type="checkbox"
      checked={selectedIds.has(id)}
      onChange={() => toggleOne(id)}
      aria-label="Select row"
      className="h-4 w-4 rounded border-slate-300"
    />
  );
}
