"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { readJsonResponse } from "@/lib/http/read-json-response";
type Line = { kind: "earning" | "deduction"; label: string; amount: number };
type Slip = { id: string; confirmation_id: string; version: number; currency: string; state: string; earnings: number; deductions: number; detail: Line[]; released_at: string | null; attendance_confirmations: { period_start: string; period_end: string; staffs: { full_name: string } | null } | null };
type Data = { people: boolean; items: Slip[] };
type Attendance = { id: string; employee: string; period_start: string; period_end: string; state: string };
export function PayslipWorkspace() {
  const [data, setData] = useState<Data | null>(null), [approved, setApproved] = useState<Attendance[]>([]), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(""), [lines, setLines] = useState<Line[]>([{ kind: "earning", label: "Basic pay", amount: 0 }]);
  const load = useCallback(async () => {
    const response = await fetch("/api/people/payslips", { cache: "no-store" });
    const result = await readJsonResponse<Data & { message?: string }>(response, { unexpectedResponse: "Payslips are unavailable." });
    if (!response.ok) throw new Error(result.message);
    setData(result);
    if (result.people) {
      const review = await fetch("/api/attendance/confirmations", { cache: "no-store" });
      const attendance = await readJsonResponse<{ items: Attendance[]; message?: string }>(review, { unexpectedResponse: "Approved attendance is unavailable." });
      if (!review.ok) throw new Error(attendance.message);
      setApproved(attendance.items.filter(item => item.state === "approved"));
    }
  }, []);
  useEffect(() => { void load().catch(error => setError(error.message)); }, [load]);
  async function act(payload: object) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/people/payslips", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await readJsonResponse<{ message?: string }>(response, { unexpectedResponse: "Payslip could not be updated." });
      if (!response.ok) throw new Error(result.message);
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Please retry."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    {error ? <p role="alert" className="text-sm text-warning">{error}</p> : null}
    {!data && !error ? <p role="status">Loading payslips…</p> : null}
    {data?.people ? <form className="sb-work-surface space-y-3 p-4" onSubmit={event => { event.preventDefault(); void act({ action: "calculate", confirmation, lines }); }}><label className="grid gap-1 text-sm">Approved attendance<SelectNative aria-label="Approved attendance" required value={confirmation} onChange={event => setConfirmation(event.target.value)}><option value="">Select employee and period</option>{approved.map(item => <option key={item.id} value={item.id}>{item.employee} · {item.period_start} – {item.period_end}</option>)}</SelectNative></label>
      <p className="text-xs text-muted-foreground">Enter verified MYR amounts. Tax, rates and allowances are not inferred.</p>
      {lines.map((line, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_1fr_auto]"><SelectNative aria-label={`Line ${index + 1} type`} value={line.kind} onChange={event => setLines(current => current.map((value, i) => i === index ? { ...value, kind: event.target.value as Line["kind"] } : value))}><option value="earning">Earning</option><option value="deduction">Deduction</option></SelectNative><Input aria-label={`Line ${index + 1} description`} required maxLength={120} value={line.label} onChange={event => setLines(current => current.map((value, i) => i === index ? { ...value, label: event.target.value } : value))} /><Input aria-label={`Line ${index + 1} amount MYR`} required type="number" min="0" max="999999999" step="0.01" value={line.amount} onChange={event => setLines(current => current.map((value, i) => i === index ? { ...value, amount: Number(event.target.value) } : value))} />{lines.length > 1 ? <Button type="button" variant="outline" aria-label={`Remove line ${index + 1}`} disabled={busy} onClick={() => setLines(current => current.filter((_, i) => i !== index))}>Remove</Button> : null}</div>)}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy || lines.length >= 50} onClick={() => setLines(current => [...current, { kind: "deduction", label: "", amount: 0 }])}>Add line</Button><Button disabled={busy || !confirmation}>Save calculation</Button></div></form> : null}
    {data?.items.length === 0 ? <section className="sb-work-surface space-y-2 p-6"><h2 className="text-base font-semibold">{data.people ? "No payslips prepared" : "Your payslips will appear here"}</h2><p className="max-w-prose text-sm text-muted-foreground">{data.people ? "Complete attendance confirmation, then select an approved employee period above to prepare a payslip." : "People must approve and release your payslip before you can view it here."}</p></section> : null}
    {data?.items.map(slip => <section key={slip.id} className="sb-work-surface min-w-0 space-y-3 p-4 [overflow-wrap:anywhere]"><h2 className="font-semibold">{slip.attendance_confirmations?.staffs?.full_name ?? "Payslip"} · {slip.state} · v{slip.version}</h2><p className="text-sm text-muted-foreground">{slip.attendance_confirmations?.period_start} – {slip.attendance_confirmations?.period_end}</p>{slip.detail.map((line, index) => <div className="flex justify-between gap-3 text-sm" key={index}><span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{line.label} {line.kind === "deduction" ? "(deduction)" : ""}</span><span className="shrink-0 tabular-nums">MYR {Number(line.amount).toFixed(2)}</span></div>)}<p className="flex justify-between border-t pt-3 font-semibold"><span>Net pay</span><span>MYR {(Number(slip.earnings) - Number(slip.deductions)).toFixed(2)}</span></p>
      {data.people && (slip.state === "draft" || slip.state === "approved") ? <Button disabled={busy} onClick={() => void act({ action: slip.state === "draft" ? "approve" : "release", id: slip.id, version: slip.version })}>{slip.state === "draft" ? "Approve calculation" : "Release to employee"}</Button> : null}
    </section>)}
  </div>;
}
