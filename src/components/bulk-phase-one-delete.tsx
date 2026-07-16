"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useBulkSelection } from "@/components/bulk-selection";
import { bulkHardDeletePurchaseRequests, previewBulkHardDeletePurchaseRequests } from "@/server/actions/hard-delete-bulk";

export function BulkPhaseOneDelete() {
  const { selectedIds } = useBulkSelection();
  const router = useRouter();
  const [open, setOpen] = useState(false); const [typed, setTyped] = useState(""); const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewBulkHardDeletePurchaseRequests>> | null>(null); const [result, setResult] = useState<{ deleted: number; blocked: number; failed: number; details: { record_id: string; reason: string; kind: "blocked" | "failed" }[] } | null>(null); const [error, setError] = useState<string | null>(null);
  if (!selectedIds.size) return null;
  const openReview = async () => { setError(null); setResult(null); setOpen(true); try { setPreview(await previewBulkHardDeletePurchaseRequests([...selectedIds])); } catch (e) { setError(e instanceof Error ? e.message : "Could not load deletion preview."); } };
  const eligible = preview?.filter((item) => item.eligible) ?? [];
  const blocked = preview?.filter((item) => !item.eligible) ?? [];
  return <>
    <Button type="button" variant="destructive" size="sm" onClick={openReview}>Review permanent deletion ({selectedIds.size})</Button>
    {open ? <div role="dialog" aria-modal="true" className="fixed inset-0 z-[var(--sb-z-dialog)] flex items-center justify-center bg-slate-950/30 p-4"><div className="w-full max-w-2xl space-y-4 rounded-md border bg-white p-5"><h2 className="text-lg font-semibold text-red-700">Review selected purchase requests</h2><p className="text-sm text-muted-foreground">Only records shown as eligible can be deleted. The server rechecks status, company scope, permissions, and dependencies.</p>{error ? <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}{preview ? <div className="grid gap-3 sm:grid-cols-2"><div><h3 className="font-medium text-emerald-700">Eligible ({eligible.length})</h3>{eligible.map((item) => <p key={item.record_id} className="text-sm">{item.record_number ?? item.record_id} · {item.status}</p>)}</div><div><h3 className="font-medium text-red-700">Blocked ({blocked.length})</h3>{blocked.map((item) => <p key={item.record_id} className="text-sm">{item.record_number ?? item.record_id}: {item.reason ?? "Blocked by dependencies."}</p>)}</div></div> : <p className="text-sm text-muted-foreground">Loading preview...</p>}{result ? <div className="rounded border bg-slate-50 p-3 text-sm"><strong>{result.deleted} deleted · {result.blocked} blocked · {result.failed} failed</strong>{result.details.map((item) => <p key={`${item.kind}-${item.record_id}`}>{item.kind}: {item.record_id} — {item.reason}</p>)}</div> : null}<form action={async (formData) => { try { setResult(await bulkHardDeletePurchaseRequests(formData)); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Deletion failed. Try again."); } }} className="space-y-3"><input type="hidden" name="record_ids" value={JSON.stringify([...selectedIds])} /><Input name="confirmation" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type DELETE" disabled={!eligible.length} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button><SubmitButton type="submit" variant="destructive" disabled={!eligible.length || typed.trim().toUpperCase() !== "DELETE"} pendingLabel="Deleting...">Delete eligible requests</SubmitButton></div></form></div></div> : null}
  </>;
}
