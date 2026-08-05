"use client";

import { type FormEvent, useRef, useState } from "react";
import { Download, LoaderCircle, X } from "lucide-react";
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
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = getToday();

  async function handleExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPreparing) return;

    setIsPreparing(true);
    setError(null);

    try {
      const form = event.currentTarget;
      const url = new URL(form.action, window.location.origin);
      new FormData(form).forEach((value, key) => url.searchParams.set(key, String(value)));
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw new Error("The workbook could not be prepared. Please try again.");

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      const filename = encodedName ? decodeURIComponent(encodedName) : plainName ?? "stock-counts.xlsx";
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      dialogRef.current?.close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The workbook could not be prepared. Please try again.");
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className="w-full justify-center gap-2" onClick={() => dialogRef.current?.showModal()}>
        <Download className="h-4 w-4" aria-hidden="true" />
        Export workbook
      </Button>
      <dialog ref={dialogRef} className="m-auto w-[min(32rem,calc(100vw-2rem))] max-w-none rounded-[var(--sb-panel-radius)] border border-[var(--sb-border)] bg-[var(--sb-surface)] p-0 text-[var(--sb-text)] shadow-[0_8px_24px_rgb(6_44_31_/_0.18)] backdrop:bg-[rgb(6_44_31_/_0.55)] backdrop:backdrop-blur-sm">
        <form action="/api/export/stock-counts-workbook" method="get" onSubmit={handleExport}>
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
            {error ? <p role="alert" className="border-l-2 border-destructive pl-3 text-xs leading-5 text-destructive">{error}</p> : null}
          </div>
          <footer className="flex justify-end gap-2 border-t border-[var(--sb-border-soft)] px-4 py-3">
            <Button type="button" variant="outline" disabled={isPreparing} onClick={() => dialogRef.current?.close()}>Cancel</Button>
            <Button type="submit" className="gap-2" disabled={isPreparing} aria-busy={isPreparing}>
              {isPreparing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              {isPreparing ? "Preparing..." : "Download Excel"}
            </Button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
