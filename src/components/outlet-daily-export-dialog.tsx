"use client";

import { useId, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

type BranchOption = { id: string; branch_name: string };

export function OutletDailyExportDialog({ branches }: { branches: BranchOption[] }) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(() => new Set());

  const allSelected = selectedBranches.size === branches.length;
  const href = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (selectedBranches.size) params.set("branches", [...selectedBranches].join(","));
    return `/api/export/outlet-daily-records${params.toString() ? `?${params.toString()}` : ""}`;
  }, [from, selectedBranches, to]);

  function toggleBranch(id: string) {
    setSelectedBranches((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedBranches(allSelected ? new Set() : new Set(branches.map((branch) => branch.id)));
  }

  return <>
    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
      <Download className="h-4 w-4" aria-hidden="true" />Export CSV
    </Button>
    <ModalShell open={open} onClose={() => setOpen(false)} titleId={titleId} className="max-w-md overflow-hidden p-0">
      <header className="border-b px-5 py-4">
        <h2 id={titleId} className="text-base font-semibold">Export outlet daily records</h2>
        <p className="mt-1 text-xs text-muted-foreground">Choose a date range and one or more outlets.</p>
      </header>
      <div className="grid gap-4 px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-xs font-medium">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-[var(--sb-control-height)] rounded-[var(--sb-radius-control)] border border-input bg-background px-3" /></label>
          <label className="grid gap-1.5 text-xs font-medium">To<input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="h-[var(--sb-control-height)] rounded-[var(--sb-radius-control)] border border-input bg-background px-3" /></label>
        </div>
        <fieldset>
          <div className="flex items-center justify-between gap-3"><legend className="text-xs font-medium">Outlets</legend><button type="button" className="text-xs font-semibold text-[var(--sb-green-800)]" onClick={toggleAll}>{allSelected ? "Clear all" : "Select all"}</button></div>
          <div className="mt-2 grid max-h-48 gap-1 overflow-y-auto rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] p-2">
            {branches.map((branch) => <label key={branch.id} className="flex min-h-9 items-center gap-2 rounded px-2 text-xs hover:bg-[var(--sb-surface-muted)]"><input type="checkbox" checked={selectedBranches.has(branch.id)} onChange={() => toggleBranch(branch.id)} />{branch.branch_name}</label>)}
          </div>
        </fieldset>
      </div>
      <footer className="flex justify-end gap-2 border-t px-5 py-4"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button asChild><a href={href} onClick={() => setOpen(false)}><Download className="h-4 w-4" aria-hidden="true" />Download CSV</a></Button></footer>
    </ModalShell>
  </>;
}
