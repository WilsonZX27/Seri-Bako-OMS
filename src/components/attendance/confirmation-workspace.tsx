"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { readJsonResponse } from "@/lib/http/read-json-response";

type Day = { assignment_kind?: string; date: string; branch_id: string; outlet: string; punches: string[]; worked_seconds: number | null; break_out: string | null; break_in: string | null; scheduled_start: string | null; scheduled_end: string | null; first_in: string | null; last_out: string | null; late_seconds: number | null; early_leave_seconds: number | null; statuses: string[] | null };
type Item = { id: string; employee: string; period_start: string; period_end: string; version: number; source_hash: string; state: string; own: boolean; days: Day[]; events: { action: string; actor: string | null; branch_id: string | null; recorded_at: string; reason: string | null }[] };
type Data = { items: Item[]; employees: { id: string; full_name: string; staff_code: string }[]; people: boolean; supervisor: boolean; manager: boolean };
const clock = (value: string | null) => !value ? "—" : value.includes("T") || value.includes("+") ? new Intl.DateTimeFormat("en-MY", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kuala_Lumpur" }).format(new Date(value)) : value.slice(0, 5);
export function ConfirmationWorkspace() {
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [staff, setStaff] = useState("*"), [start, setStart] = useState(""), [end, setEnd] = useState(""), [reason, setReason] = useState<Record<string, string>>({});
  const load = useCallback(async (offset = 0) => {
    const response = await fetch(`/api/attendance/confirmations?offset=${offset}`, { cache: "no-store" });
    const result = await readJsonResponse<Data & { message?: string }>(response, { unexpectedResponse: "Attendance confirmations are unavailable." });
    if (!response.ok) throw new Error(result.message);
    setHasMore(result.items.length === 200);
    setData(current => offset && current ? { ...result, items: [...current.items, ...result.items.filter(item => !current.items.some(existing => existing.id === item.id))] } : result);
  }, []);
  useEffect(() => { void load().catch(error => setError(error.message)); }, [load]);
  async function send(payload: object) {
    const response = await fetch("/api/attendance/confirmations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await readJsonResponse<{ message?: string }>(response, { unexpectedResponse: "Attendance could not be updated." });
    if (!response.ok) throw new Error(result.message);
  }
  async function act(payload: object) {
    setBusy(true); setError("");
    try { await send(payload); await load(); }
    catch (error) { setError(error instanceof Error ? error.message : "Please retry."); }
    finally { setBusy(false); }
  }
  async function prepare() {
    setBusy(true); setError("");
    const targets = data?.employees.filter(employee => staff === "*" || employee.id === staff) ?? [], failures: string[] = [];
    for (const [index, employee] of targets.entries()) {
      setProgress(`Preparing ${index + 1} / ${targets.length}`);
      try { await send({ action: "prepare", staff: employee.id, start, end }); }
      catch { failures.push(employee.full_name); }
    }
    try { await load(); } catch { setError("Could not refresh the list. Reload to see completed preparations."); }
    setProgress(`${targets.length - failures.length} prepared${failures.length ? ` · ${failures.length} need attention` : ""}`);
    if (failures.length) setError(`Not ready: ${failures.join(", ")}. Completed versions are retained; retrying does not duplicate them.`);
    setBusy(false);
  }
  return <div className="space-y-4">
    {error ? <p role="alert" className="text-sm text-warning">{error}</p> : null}
    {!data && !error ? <p role="status">Loading attendance…</p> : null}
    {data?.people ? <form className="sb-work-surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={event => { event.preventDefault(); void prepare(); }}>
      <label className="grid gap-1 text-sm">Employee<SelectControl ariaLabel="Employee" required value={staff} onValueChange={selectedValue => setStaff(selectedValue)} options={[({value: "*", label: "All active employees"}), ...(data.employees.map(employee => ({value: String((employee.id) ?? ""), label: [employee.full_name, " · ", employee.staff_code].join("")})))]}/></label>
      <label className="grid gap-1 text-sm">From<Input aria-label="From" type="date" required value={start} onChange={event => setStart(event.target.value)} /></label><label className="grid gap-1 text-sm">To<Input aria-label="To" type="date" required min={start} value={end} onChange={event => setEnd(event.target.value)} /></label><Button className="self-end" disabled={busy}>Prepare attendance</Button>
    </form> : null}
    {progress ? <p role="status" className="text-sm text-muted-foreground">{progress}</p> : null}
    {data?.items.length === 0 ? <section className="sb-work-surface space-y-3 p-6"><h2 className="text-base font-semibold">No attendance ready for confirmation</h2><p className="max-w-prose text-sm text-muted-foreground">{data.people ? "Choose employees and a period above to prepare their attendance for checking." : "Your attendance will appear here after People prepares the period. You can then check each day and request corrections."}</p><Button asChild variant="outline"><Link href="/attendance/review">Review attendance</Link></Button></section> : null}
    {data?.items.map(item => <details key={item.id} className="sb-work-surface min-w-0 p-4 [overflow-wrap:anywhere]">
      <summary className="cursor-pointer text-sm"><strong className="block">{item.employee}</strong><span className="mt-1 flex flex-wrap gap-x-3 gap-y-1"><span>{item.period_start} – {item.period_end}</span><span className="text-muted-foreground">{item.state} · v{item.version}</span></span></summary>
      <div className="mt-3 space-y-2">{item.days.map((day, index) => <div key={`${day.date}-${index}`} className="grid gap-2 border-b py-3 text-sm sm:grid-cols-3"><strong>{day.date}<span className="block font-normal text-muted-foreground">{day.outlet}</span></strong><div>Planned {clock(day.scheduled_start)}–{clock(day.scheduled_end)}<br />Actual {clock(day.first_in)}–{clock(day.last_out)}{day.punches?.length ? <span className="block text-xs text-muted-foreground">Punches: {day.punches.map(clock).join(" · ")}</span> : null}{day.break_out || day.break_in ? <span className="block text-xs text-muted-foreground">Break {clock(day.break_out)}–{clock(day.break_in)}</span> : null}{day.worked_seconds != null ? <span className="block text-xs text-muted-foreground">Worked {Math.floor(day.worked_seconds / 3600)}h {Math.floor(day.worked_seconds % 3600 / 60)}m</span> : null}</div><div>{day.assignment_kind === "el" || day.statuses?.includes("el_paid") ? <p className="font-medium">EL · paid leave; no deduction. Original time evidence follows.</p> : null}{day.late_seconds ? `Late ${Math.ceil(day.late_seconds / 60)} min. ` : ""}{day.early_leave_seconds ? `Early leave ${Math.ceil(day.early_leave_seconds / 60)} min. ` : ""}{day.statuses?.filter(value => value !== "normal").join(", ")}</div></div>)}</div>
      {item.own && item.state === "prepared" ? <div className="mt-4 grid gap-3"><Button disabled={busy} onClick={() => void act({ action: "check", id: item.id, hash: item.source_hash })}>Confirm this version</Button><label className="grid gap-1 text-sm">Something needs correcting<Input value={reason[item.id] ?? ""} maxLength={1000} onChange={event => setReason(current => ({ ...current, [item.id]: event.target.value }))} /></label><Button variant="outline" disabled={busy || !reason[item.id]?.trim()} onClick={() => void act({ action: "dispute", id: item.id, hash: item.source_hash, reason: reason[item.id] })}>Request correction</Button></div> : null}
      {((data.supervisor && item.state === "checked") || (data.manager && item.state === "verified")) ? <div className="mt-4 flex flex-wrap gap-2">{[...new Set(item.days.map(day => day.branch_id))].filter(branch => !item.events.some(event => event.branch_id === branch && event.action === (item.state === "checked" ? "verify" : "approve"))).map(branch => <Button key={branch} disabled={busy} onClick={() => void act({ action: item.state === "checked" ? "verify" : "approve", id: item.id, hash: item.source_hash, branch })}>{item.state === "checked" ? "Verify" : "Approve"} {item.days.find(day => day.branch_id === branch)?.outlet ?? "outlet"}</Button>)}</div> : null}
      <ol className="mt-4 space-y-1 text-xs text-muted-foreground">{item.events.map((event, index) => <li key={index}>{event.action}{event.actor ? ` · ${event.actor}` : ""} · {new Date(event.recorded_at).toLocaleString()}{event.reason ? ` · ${event.reason}` : ""}</li>)}</ol>
    </details>)}
    {hasMore ? <Button variant="outline" disabled={busy} onClick={() => { setBusy(true); void load(data?.items.length ?? 0).catch(error => setError(error.message)).finally(() => setBusy(false)); }}>Load earlier attendance</Button> : null}
  </div>;
}
