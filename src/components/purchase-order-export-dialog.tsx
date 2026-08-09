"use client";

import { useId, useMemo, useState } from "react";
import { Download } from "lucide-react";

import { ModalShell } from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";

type PurchaseOrderExportDialogProps = {
  className?: string;
};

function todayValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function PurchaseOrderExportDialog({ className }: PurchaseOrderExportDialogProps) {
  const titleId = useId();
  const today = useMemo(todayValue, []);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState("all");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadExport() {
    if (pending) return;
    if (!from || !to || from > to) {
      setError("Choose a valid date range before exporting.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      if (status !== "all") params.set("status", status);
      const response = await fetch(`/api/export/purchase-orders?${params.toString()}`);
      if (!response.ok) throw new Error("The purchase order export could not be prepared.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `purchase-orders-${from}-to-${to}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The export could not be prepared.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className ?? "w-full justify-start"}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Download aria-hidden="true" className="size-4" />
        Export CSV
      </Button>

      <ModalShell
        open={open}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        titleId={titleId}
        className="max-w-xl overflow-hidden rounded-[var(--sb-panel-radius)] p-0"
      >
        <header className="border-b px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold">Export Purchase Orders</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose the period and document status to include.</p>
        </header>
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            From date
            <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            To date
            <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Ready to send</option>
              <option value="sent">Sent to supplier</option>
              <option value="receiving">Receiving</option>
              <option value="received">Received</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          {error ? (
            <p role="alert" className="sb-alert-error sm:col-span-2">
              {error}
            </p>
          ) : null}
        </div>
        <footer className="flex justify-end gap-2 border-t px-5 py-4">
          <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={downloadExport}>
            <Download aria-hidden="true" className="size-4" />
            {pending ? "Preparing..." : "Download CSV"}
          </Button>
        </footer>
      </ModalShell>
    </>
  );
}
