"use client";

import { useId, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

const fields = [
  ["request_no", "PR number"], ["request_date", "Request date"],
  ["needed_by_date", "Needed by"], ["priority", "Priority"],
  ["status", "Status"], ["branch_id", "Branch"], ["remarks", "Remarks"],
] as const;
type ExportField = (typeof fields)[number][0];

export function PurchaseRequestExportDialog() {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(() => new Set(fields.map(([value]) => value)));

  function toggle(field: ExportField) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field); else next.add(field);
      return next;
    });
  }

  const href = `/api/export/purchase-requests?status=${encodeURIComponent(status)}&columns=${encodeURIComponent([...selected].join(","))}`;
  return <>
    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)} data-mobile-primary-action>
      <Download className="h-4 w-4" />Export CSV
    </Button>
    <ModalShell open={open} onClose={() => setOpen(false)} titleId={titleId} className="max-w-lg overflow-hidden rounded-[var(--sb-panel-radius)] p-0">
      <header className="border-b px-5 py-4"><h2 id={titleId} className="text-lg font-semibold">Export purchase requests</h2><p className="mt-1 text-sm text-muted-foreground">Choose the records and columns to include.</p></header>
      <div className="grid gap-4 px-5 py-4">
        <label className="grid gap-1.5 text-sm font-medium">Status<select className="h-[var(--sb-control-height)] rounded-[var(--sb-radius-control)] border border-input bg-background px-3" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="manager_review">Manager review</option><option value="admin_review">Purchasing review</option><option value="finance_review">Finance review</option><option value="ready_to_convert">Ready to convert</option><option value="converted_to_po">Converted</option><option value="rejected">Rejected</option><option value="returned">Returned</option></select></label>
        <fieldset><legend className="text-sm font-medium">Columns</legend><div className="mt-2 grid grid-cols-2 gap-2">{fields.map(([value, label]) => <label key={value} className="flex min-h-10 items-center gap-2 rounded-[var(--sb-radius-control)] border px-3 text-sm"><input type="checkbox" checked={selected.has(value)} onChange={() => toggle(value)} />{label}</label>)}</div></fieldset>
      </div>
      <footer className="flex justify-end gap-2 border-t px-5 py-4"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button asChild aria-disabled={!selected.size}><a href={selected.size ? href : undefined} onClick={() => selected.size && setOpen(false)}><Download className="h-4 w-4" />Download CSV</a></Button></footer>
    </ModalShell>
  </>;
}
