"use client";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const batch = "34ffbb89-be58-4d74-b6ed-a8ab3a25cda5";
const week = "2026-10-19";
// Responsive rails can mount the same action twice. Share the attempt latch so
// changing viewport cannot expose a second submit after an uncertain outcome.
let repairAttempted = false;
const attemptListeners = new Set<(value: boolean) => void>();

export function AttendanceFixedRepairAction({ batchId, weekStart, disabled = false }: { batchId: string; weekStart: string; disabled?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settled, setSettled] = useState(repairAttempted);
  const [message, setMessage] = useState("");
  const latch = useRef(false);
  const inScope = batchId === batch && weekStart === week && !disabled;

  useEffect(() => {
    setEnabled(false);
    attemptListeners.add(setSettled);
    if (!inScope) return () => { attemptListeners.delete(setSettled); };
    const controller = new AbortController();
    void fetch("/api/attendance/recalculate", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!controller.signal.aborted) setEnabled(response.ok && data.capability === "oms269-fixed-v1" && data.enabled === true);
      }).catch(() => { /* Optional maintenance capability stays unavailable. */ });
    return () => { controller.abort(); attemptListeners.delete(setSettled); };
  }, [inScope]);

  async function submit() {
    if (repairAttempted || latch.current || !inScope || !enabled || !checked || settled) return;
    latch.current = true;
    repairAttempted = true;
    attemptListeners.forEach(listener => listener(true));
    setBusy(true);
    setChecked(false);
    try {
      const response = await fetch("/api/attendance/recalculate", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: batch, repair: "oms269-20261019-v1/run", expectedCount:269 }) });
      const data = await response.json();
      if (!response.ok || data.ok !== true || ![0, 269].includes(data.calculated)) throw new Error(data.message ?? "The result is not confirmed. Check the repair receipt and current state before retrying.");
      setMessage(data.calculated === 269 ? "269 staff days processed. Independent receipt verification is still required." : "No additional staff days changed. Verify the existing receipt.");
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : "The result is not confirmed."} Do not submit again until the repair receipt and current state and current versions have been checked.`);
    } finally {
      setSettled(true);
      setBusy(false);
    }
  }

  if (!inScope || !enabled) return null;
  return <div className="mt-3 space-y-2 border-t border-[var(--sb-border-soft)] pt-3">
    <p className="text-xs text-muted-foreground">19–25 Oct · Correct only the remaining 269 staff days. Preserve the 36 already updated and 30 outside this range, along with raw punches and history.</p>
    <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={checked} disabled={busy || settled} onChange={event => setChecked(event.target.checked)} />Confirm the approved 269-day scope</label>
    <Button type="button" size="sm" variant="outline" className="w-full" disabled={!checked || busy || settled} onClick={() => void submit()}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />{busy ? "Processing…" : "Apply approved correction"}</Button>
    {message ? <p role="status" aria-live="polite" className="text-xs text-muted-foreground">{message}</p> : null}
  </div>;
}
