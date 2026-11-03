"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { readJsonResponse } from "@/lib/http/read-json-response";

type Receipt = { status: "ready" | "completed" | "restored"; count: number; snapshot?: string };
let submitting = false;
export function Person63RecoveryAction() {
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState("");
  const alive = useRef(true);
  async function inspect(signal?: AbortSignal) {
    const response = await fetch("/api/attendance/recovery-63", { credentials: "same-origin", cache: "no-store", signal });
    const body = await readJsonResponse<{ ok: boolean; data?: Receipt; message?: string }>(response, { unexpectedResponse: "Recovery status is unavailable." });
    if (!response.ok || !body.ok || !body.data) throw new Error(body.message ?? "Recovery status is unavailable.");
    if (alive.current) { setReceipt(body.data); setChecked(false); setMessage(""); }
  }
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void inspect(controller.signal).catch(error => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Check recovery status."); });
    return () => { alive.current = false; controller.abort(); };
  }, []);
  async function submit() {
    if (submitting || busy || !checked || receipt?.status !== "ready" || !receipt.snapshot) return;
    submitting = true; setBusy(true); setChecked(false); setMessage("");
    const snapshot = receipt.snapshot;
    setReceipt(null);
    try {
      const response = await fetch("/api/attendance/recovery-63", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshot }) });
      const body = await readJsonResponse<{ ok: boolean; data?: Receipt; message?: string }>(response, { unexpectedResponse: "Recovery result is not confirmed. Check its receipt." });
      if (!response.ok || !body.ok || body.data?.status !== "completed") throw new Error(body.message ?? "Check recovery status before continuing.");
      if (alive.current) { setReceipt(body.data); router.refresh(); }
    } catch (error) {
      if (alive.current) setMessage(error instanceof Error ? error.message : "Recovery result is not confirmed. Check its receipt.");
    } finally { submitting = false; if (alive.current) setBusy(false); }
  }
  return <div className="space-y-2 text-xs" aria-label="Staff63 attendance recovery">
    <p className="font-medium">BAKIARAJ · Staff63</p>
    {receipt?.status === "completed" ? <p role="status">25 days recovered. Review the updated punches.</p> : receipt?.status === "restored" ? <p role="status">Recovery was reversed. Original results are current.</p> : <>
      <p>Recover 25 existing days, 1 Oct–1 Nov. Leave 13 and 17 Oct unchanged. Schedules remain unapproved.</p>
      {receipt?.status === "ready" ? <label className="flex items-start gap-2"><input type="checkbox" checked={checked} disabled={busy} onChange={event => setChecked(event.target.checked)} /><span>Confirm this employee and these 25 days.</span></label> : null}
      <Button size="sm" className="w-full" disabled={busy || !checked || receipt?.status !== "ready"} onClick={() => void submit()}>{busy ? "Recovering…" : "Recover 25 days"}</Button>
    </>}
    {message ? <p role="alert">{message}</p> : null}
    <Button size="sm" variant="outline" className="w-full" disabled={busy} onClick={() => { setBusy(true); void inspect().catch(error => { setReceipt(null); setMessage(error instanceof Error ? error.message : "Recovery status is unavailable."); }).finally(() => setBusy(false)); }}>Check recovery status</Button>
  </div>;
}
