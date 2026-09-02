"use client";

import { useMemo, useState } from "react";
import { Copy, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";

type Branch = { id: string; branch_name: string };
type Person = { id: string; full_name: string; staff_code: string | null; employment_type: string };
type Template = { id: string; code: string; name: string; planned_start: string; planned_end: string; colour: string };
type Assignment = { staff_id: string; work_date: string; assignment_kind: string; shift_template_id: string | null; custom_start?: string | null; custom_end?: string | null; custom_crosses_midnight?: boolean; custom_break_seconds?: number | null; custom_maximum_recognised_seconds?: number | null; custom_reason?: string | null };
type Week = { id: string; status: string } | null;
const markers = ["off", "al", "mc", "upl", "ro"] as const;

function addDays(day: string, amount: number) { const value = new Date(`${day}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + amount); return value.toISOString().slice(0, 10); }
function compactTime(value?: string | null) { return value?.slice(0, 5) ?? ""; }

export function SchedulePlanner({ branches, branchId, weekStart, week, people, templates, initialAssignments, canDraft, canSubmit, canApprove }: { branches: Branch[]; branchId: string; weekStart: string; week: Week; people: Person[]; templates: Template[]; initialAssignments: Assignment[]; canDraft: boolean; canSubmit: boolean; canApprove: boolean }) {
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const initial = useMemo(() => new Map(initialAssignments.map(assignment => [`${assignment.staff_id}:${assignment.work_date}`, assignment])), [initialAssignments]);
  const [cells, setCells] = useState<Map<string, Assignment>>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<Assignment | null>(null);
  const [customStart, setCustomStart] = useState("08:00");
  const [customEnd, setCustomEnd] = useState("16:30");
  const [message, setMessage] = useState(people.length ? "Select cells, then apply working times or a day marker." : "No active staff are assigned to this outlet.");
  const [busy, setBusy] = useState(false);

  function select(key: string, event: React.MouseEvent) { setSelected(current => { const next = new Set(event.shiftKey || event.ctrlKey || event.metaKey ? current : []); if (next.has(key)) next.delete(key); else next.add(key); return next; }); }
  function assign(kind: string, templateId: string | null = null) { setCells(current => { const next = new Map(current); for (const key of selected) { const [staff_id, work_date] = key.split(":"); next.set(key, { staff_id, work_date, assignment_kind: kind, shift_template_id: templateId }); } return next; }); }
  function assignWorkingTimes() {
    if (!customStart || !customEnd) return;
    const crossesMidnight = customEnd <= customStart;
    setCells(current => { const next = new Map(current); for (const key of selected) { const [staff_id, work_date] = key.split(":"); next.set(key, { staff_id, work_date, assignment_kind: "shift", shift_template_id: null, custom_start: customStart, custom_end: customEnd, custom_crosses_midnight: crossesMidnight, custom_break_seconds: 3600, custom_maximum_recognised_seconds: 510 * 60, custom_reason: "Outlet roster working time" }); } return next; });
    setMessage(`${customStart}–${customEnd} applied to ${selected.size} selected ${selected.size === 1 ? "day" : "days"}.`);
  }
  function paste() { if (!copied) return; setCells(current => { const next = new Map(current); for (const key of selected) { const [staff_id, work_date] = key.split(":"); next.set(key, { ...copied, staff_id, work_date }); } return next; }); }
  async function action(payload: Record<string, unknown>) { setBusy(true); try { const response = await fetch("/api/attendance/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json() as { ok: boolean; message?: string }; if (!result.ok) throw new Error(result.message); setMessage("Schedule action completed."); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Schedule action failed."); } finally { setBusy(false); } }
  const assignments = [...cells.values()];

  return <div className="space-y-3">
    <section className="sb-work-surface flex flex-wrap items-center gap-2 p-3">
      <label className="text-xs font-medium">Outlet <select className="ml-2 h-9 rounded-md border bg-background px-2" value={branchId} onChange={event => { window.location.href = `/attendance/schedule?branch=${encodeURIComponent(event.target.value)}&week=${weekStart}`; }}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}</select></label>
      <StatusBadge status={week?.status ?? "not_started"}/><span className="text-xs text-muted-foreground">{weekStart} – {dates[6]}</span>
      <div className="ml-auto flex flex-wrap gap-2">{canDraft ? <><Button size="sm" variant="outline" disabled={!selected.size} onClick={() => setCopied(cells.get([...selected][0]) ?? null)}><Copy className="mr-2 h-4 w-4"/>Copy</Button><Button size="sm" variant="outline" disabled={!selected.size || !copied} onClick={paste}>Paste</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void action({ action: "save", branchId, weekStart, assignments })}><Save className="mr-2 h-4 w-4"/>Save draft</Button></> : null}{canSubmit && week ? <Button size="sm" disabled={busy} onClick={() => void action({ action: "submit", weekId: week.id })}><Send className="mr-2 h-4 w-4"/>Submit</Button> : null}{canApprove && week?.status === "submitted" ? <><Button size="sm" onClick={() => void action({ action: "decide", weekId: week.id, decision: "approve" })}>Publish</Button><Button size="sm" variant="outline" onClick={() => { const comment = window.prompt("Return reason"); if (comment) void action({ action: "decide", weekId: week.id, decision: "return", comment }); }}>Return</Button></> : null}</div>
    </section>
    {canDraft ? <section className="sb-work-surface space-y-3 p-3">
      <div className="flex flex-wrap items-end gap-2"><label className="grid gap-1 text-xs font-medium">Check in<Input type="time" step={1800} value={customStart} onChange={event => setCustomStart(event.target.value)} className="h-9 w-32"/></label><label className="grid gap-1 text-xs font-medium">Check out<Input type="time" step={1800} value={customEnd} onChange={event => setCustomEnd(event.target.value)} className="h-9 w-32"/></label><Button size="sm" disabled={!selected.size} onClick={assignWorkingTimes}>Apply working time</Button><span className="pb-2 text-xs text-muted-foreground">Direct times follow the existing outlet roster method. Break defaults to 1 hour; recognised time caps at 8.5 hours.</span></div>
      <div className="flex flex-wrap gap-2"><span className="self-center text-xs text-muted-foreground">Saved shifts:</span>{templates.map(template => <Button key={template.id} size="sm" variant="outline" disabled={!selected.size} onClick={() => assign("shift", template.id)}>{template.code} · {compactTime(template.planned_start)}–{compactTime(template.planned_end)}</Button>)}<span className="mx-1 h-8 w-px bg-[var(--sb-border-soft)]"/>{markers.map(marker => <Button key={marker} size="sm" variant="outline" disabled={!selected.size} onClick={() => assign(marker)}>{marker.toUpperCase()}</Button>)}</div>
    </section> : null}
    <p className="text-xs text-muted-foreground" role="status">{message}</p>
    <section className="sb-work-surface overflow-hidden"><div className="overflow-auto"><table className="w-full min-w-[64rem] border-separate border-spacing-0 text-xs"><thead><tr><th className="sticky left-0 top-0 z-30 min-w-52 border-b border-r bg-[var(--sb-surface-muted)] px-3 py-3 text-left">Employee</th>{dates.map(date => <th key={date} className="sticky top-0 z-20 min-w-28 border-b border-r bg-[var(--sb-surface-muted)] px-2 py-3 text-center">{new Intl.DateTimeFormat("en-MY", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}</th>)}</tr></thead><tbody>{people.map(person => <tr key={person.id}><th className="sticky left-0 z-10 border-b border-r bg-[var(--sb-surface)] px-3 py-3 text-left"><span className="block font-semibold">{person.full_name}</span><span className="block font-normal text-muted-foreground">{person.staff_code ?? "No staff code"} · {person.employment_type.replace("_", " ")}</span></th>{dates.map(date => { const key = `${person.id}:${date}`; const value = cells.get(key); const template = value?.shift_template_id ? templates.find(item => item.id === value.shift_template_id) : null; const label = value?.assignment_kind === "shift" ? template ? `${compactTime(template.planned_start)}–${compactTime(template.planned_end)}` : value.custom_start && value.custom_end ? `${compactTime(value.custom_start)}–${compactTime(value.custom_end)}` : "Shift" : value?.assignment_kind.toUpperCase() ?? "—"; return <td key={date} className="border-b border-r p-1.5"><button type="button" onClick={event => select(key, event)} className={`h-12 w-full rounded-[var(--sb-radius-control)] border px-1 text-xs font-semibold tabular-nums ${selected.has(key) ? "border-[var(--sb-green-700)] bg-[var(--sb-green-100)]" : "border-[var(--sb-border-soft)] hover:bg-[var(--sb-surface-muted)]"}`}>{label}</button></td>; })}</tr>)}</tbody><tfoot><tr><th className="sticky left-0 border-r bg-[var(--sb-surface-muted)] px-3 py-2 text-left">Coverage</th>{dates.map(date => <td key={date} className="border-r bg-[var(--sb-surface-muted)] px-2 py-2 text-center font-semibold">{people.filter(person => cells.get(`${person.id}:${date}`)?.assignment_kind === "shift").length} staff</td>)}</tr></tfoot></table></div></section>
  </div>;
}
