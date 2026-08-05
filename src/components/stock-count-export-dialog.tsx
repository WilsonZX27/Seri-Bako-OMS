"use client";

import { useRef } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { getToday } from "@/lib/utils";

type BranchOption = { id: string; branch_name: string };

export function StockCountExportDialog({
  branches,
  defaultFrom,
  defaultTo,
}: {
  branches: BranchOption[];
  defaultFrom?: string;
  defaultTo?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const today = getToday();

  return (
    <>
      <Button type="button" variant="outline" className="w-full justify-center gap-2" onClick={() => dialogRef.current?.showModal()}>
        <Download className="h-4 w-4" aria-hidden="true" />
        Export workbook
      </Button>
      <dialog ref={dialogRef} className="m-auto w-[min(32rem,calc(100vw-2rem))] max-w-none rounded-[var(--sb-panel-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface)] p-0 text-[var(--sb-text)] shadow-[0_8px_24px_rgb(6_44_31_/_0.18)] backdrop:bg-[rgb(6_44_31_/_0.55)] backdrop:backdrop-blur-sm">
        <form action="/api/export/stock-counts-workbook" method="get">
          <header className="flex min-h-14 items-center justify-between border-b border-[var(--sb-border-soft)] px-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--sb-green-950)]">Export Stock Counts</h2>
              <p className="text-xs text-[var(--sb-text-muted)]">One outlet per workbook, one worksheet per date.</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => dialogRef.current?.close()} aria-label="Close export dialog"><X className="h-5 w-5" /></Button>
          </header>
          <div className="grid gap-4 p-4">
            <label className="grid gap-1.5 text-xs font-semibold text-[var(--sb-text-muted)]">
              Outlet / Branch
              <SelectNative name="branch_id" required defaultValue={branches[0]?.id ?? ""}>
                <option value="" disabled>Select one outlet</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
              </SelectNative>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-[var(--sb-text-muted)]">From date<Input name="from" type="date" required defaultValue={defaultFrom ?? today} /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-[var(--sb-text-muted)]">To date<Input name="to" type="date" required defaultValue={defaultTo ?? defaultFrom ?? today} /></label>
            </div>
            <p className="text-xs leading-5 text-[var(--sb-text-muted)]">The range includes both dates. Dates without a Stock Count will still receive an empty worksheet with the standard columns.</p>
          </div>
          <footer className="flex justify-end gap-2 border-t border-[var(--sb-border-soft)] px-4 py-3">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>Cancel</Button>
            <Button type="submit" className="gap-2"><Download className="h-4 w-4" aria-hidden="true" />Download Excel</Button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
