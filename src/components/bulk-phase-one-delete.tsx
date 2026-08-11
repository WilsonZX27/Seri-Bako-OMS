"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { ModalShell } from "@/components/ui/modal-shell";
import { useBulkSelection } from "@/components/bulk-selection";
import { bulkHardDeletePurchaseRequests, previewBulkHardDeletePurchaseRequests } from "@/server/actions/hard-delete-bulk";

export function BulkPhaseOneDelete() {
  const { selectedIds } = useBulkSelection();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewBulkHardDeletePurchaseRequests>> | null>(null);
  const [result, setResult] = useState<{ deleted: number; blocked: number; failed: number; details: { record_id: string; reason: string; kind: "blocked" | "failed" }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  if (!selectedIds.size) return null;
  const eligible = preview?.filter((item) => item.eligible) ?? [];
  const blocked = preview?.filter((item) => !item.eligible) ?? [];
  const openReview = async () => {
    setError(null); setResult(null); setPreview(null); setOpen(true);
    try { setPreview(await previewBulkHardDeletePurchaseRequests([...selectedIds])); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load deletion preview."); }
  };
  return <>
    <Button ref={triggerRef} type="button" variant="destructive" size="sm" onClick={openReview}>Review permanent deletion ({selectedIds.size})</Button>
    <ModalShell open={open} onClose={() => setOpen(false)} titleId={titleId} triggerRef={triggerRef} initialFocusRef={closeRef} className="max-w-2xl space-y-4">
      <h2 id={titleId} className="text-lg font-semibold text-[var(--sb-danger)]">Review selected purchase requests</h2>
      <p className="text-sm text-muted-foreground">Permanent deletion removes the selected requests and their internal history. Requests linked to separate purchasing documents will be identified before deletion.</p>
      {error ? <p className="border border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] p-2 text-sm text-[var(--sb-danger)]" role="alert">{error}</p> : null}
      {preview ? <div className="grid gap-3 sm:grid-cols-2"><div><h3 className="font-medium text-[var(--sb-success)]">Eligible ({eligible.length})</h3>{eligible.map((item) => <p key={item.record_id} className="text-sm">{item.record_number ?? item.record_id} · {item.status} · internal history safe</p>)}</div><div><h3 className="font-medium text-[var(--sb-danger)]">Blocked ({blocked.length})</h3>{blocked.map((item) => <p key={item.record_id} className="text-sm">{item.record_number ?? item.record_id}: {item.reason ?? "Separate purchasing document."}</p>)}</div></div> : <p className="text-sm text-muted-foreground">Loading preview...</p>}
      {result ? <div className="border bg-[var(--sb-surface-muted)] p-3 text-sm"><strong>{result.deleted} deleted · {result.blocked} blocked · {result.failed} failed</strong>{result.details.map((item) => <p key={`${item.kind}-${item.record_id}`}>{item.kind}: {item.record_id} — {item.reason}</p>)}</div> : null}
      <form action={async (formData) => { try { setResult(await bulkHardDeletePurchaseRequests(formData)); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Deletion failed. Try again."); } }} className="space-y-3">
        <input type="hidden" name="record_ids" value={JSON.stringify([...selectedIds])} />
        <Input name="confirmation" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type DELETE" disabled={!eligible.length} />
        <div className="flex justify-end gap-2"><Button ref={closeRef} type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button><SubmitButton type="submit" variant="destructive" disabled={!eligible.length || typed.trim().toUpperCase() !== "DELETE"} pendingLabel="Deleting...">Delete eligible requests</SubmitButton></div>
      </form>
    </ModalShell>
  </>;
}
