"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useBulkSelection } from "@/components/bulk-selection";
import { bulkHardDeletePurchaseRequests } from "@/server/actions/hard-delete-bulk";

export function BulkPhaseOneDelete() {
  const { selectedIds, clear } = useBulkSelection();
  const [open, setOpen] = useState(false); const [typed, setTyped] = useState("");
  if (!selectedIds.size) return null;
  return <>
    <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>Review permanent deletion ({selectedIds.size})</Button>
    {open ? <div role="dialog" aria-modal="true" className="fixed inset-0 z-[var(--sb-z-dialog)] flex items-center justify-center bg-slate-950/30 p-4"><div className="w-full max-w-lg space-y-4 rounded-md border bg-white p-5"><h2 className="text-lg font-semibold text-red-700">Review selected purchase requests</h2><p className="text-sm text-muted-foreground">The server will recheck status, company scope, permissions, and linked purchase orders. Blocked records are skipped and reported.</p><form action={async (formData) => { await bulkHardDeletePurchaseRequests(formData); clear(); }} className="space-y-3"><input type="hidden" name="record_ids" value={JSON.stringify([...selectedIds])} /><Input name="confirmation" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type DELETE" /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><SubmitButton type="submit" variant="destructive" disabled={typed.trim().toUpperCase() !== "DELETE"} pendingLabel="Deleting...">Delete eligible requests</SubmitButton></div></form></div></div> : null}
  </>;
}
