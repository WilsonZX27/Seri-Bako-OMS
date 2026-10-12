"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectControl } from "@/components/ui/select-control";
import { Input } from "@/components/ui/input";
import { readJsonResponse } from "@/lib/http/read-json-response";
import { parseScheduleWorkbook, type ScheduleImportCatalog, type ScheduleWorkbookPreview } from "@/lib/attendance/schedule-workbook";

const SHEET_FOR_BRANCH: Record<string, string> = {
  "Gurney Plaza": "GURNEY PLAZA", "Queensbay Mall": "QUEENSBAY", "Kwan Kee @ Publika": "PUBLIKA", "IOI Mall Puchong": "IOI PUCHONG", "Jakel Mall": "JAKEL SQUARE", TRX: "TRX", "Kwan Kee Store @ Petaling Street": "PETALING STREET", "Kwan Kee Store @ Sunway Pyramid": "SUNWAY PYRAMID", "Kwan Kee Store @ Mid Valley": "MID VALLEY", "Kwan Kee Store @ Sunway Velocity": "VELOCITY",
};

export function ScheduleWorkbookImport({ weekStart, canDraft }: { weekStart: string; canDraft: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<ScheduleWorkbookPreview | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null);
  const [source, setSource] = useState<File | null>(null), [catalog, setCatalog] = useState<ScheduleImportCatalog | null>(null);
  const [sheet, setSheet] = useState(""), [branchId, setBranchId] = useState(""), [datesConfirmed, setDatesConfirmed] = useState(false);
  const [sheetNames,setSheetNames] = useState<string[]>([]);
  const [importWeek, setImportWeek] = useState(weekStart);
  const [endTimes, setEndTimes] = useState<Record<string, string>>({});
  const [missingEndTimes, setMissingEndTimes] = useState<string[]>([]);
  if (!canDraft) return null;
  const outletIssues = (branchName: string) => preview?.issues.filter((issue) => (issue.sheet === SHEET_FOR_BRANCH[branchName] || issue.sheet === sheet)) ?? [];
  const importable = preview?.outlets.filter((outlet) => !["published", "locked", "submitted"].includes(outlet.status) && outlet.assignments.length && !catalog?.current_assignments.some(a => String(a.branch_id) === outlet.branchId)) ?? [];
  async function load(file?: File) {
    if (!file) return;
    setImportWeek(weekStart); setEndTimes({}); setMissingEndTimes([]); setCatalog(null); setSheetNames([]);
    setSource(file); setSheet(""); setBranchId(""); setDatesConfirmed(false);
    setBusy(true); setMessage("Checking the workbook against current OMS staff and outlets…"); setPreview(null);
    try {
      const response = await fetch(`/api/attendance/schedule/import-catalog?week=${encodeURIComponent(weekStart)}`);
      const catalog = await readJsonResponse<ScheduleImportCatalog & { ok?: boolean; message?: string }>(response, { unexpectedResponse: "The schedule catalog returned an unexpected response." });
      if (!response.ok) throw new Error(catalog.message ?? "The schedule catalog could not be loaded.");
      setCatalog(catalog);
      const result = await parseScheduleWorkbook(file, weekStart, catalog);
      setPreview(result); setSheetNames(result.sheets);
      setMessage(result.issues.length ? `${result.assignmentCount} safe assignments are readable. ${result.issues.length} source item${result.issues.length === 1 ? " will" : "s will"} remain empty for correction in the partial drafts.` : result.assignmentCount ? `${result.assignmentCount} assignments are ready for draft import.` : "No assignments were recognised. Select a sheet, check its dates and map its outlet.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The workbook could not be read."); }
    finally { setBusy(false); }
  }
  async function recheck(targetWeek = importWeek) {
    if (!source || !catalog || !sheet || !branchId) return;
    setBusy(true); setPreview(null); setMessage("Checking dates and assignments…");
    try {
      const response = await fetch(`/api/attendance/schedule/import-catalog?week=${encodeURIComponent(targetWeek)}`);
      const fresh = await readJsonResponse<ScheduleImportCatalog & { message?: string }>(response, { unexpectedResponse: "The schedule catalog returned an unexpected response." });
      if (!response.ok) throw new Error(fresh.message ?? "The schedule catalog could not be loaded.");
      const result = await parseScheduleWorkbook(source, targetWeek, fresh, {sheet,branchId,confirmDateContext:datesConfirmed && targetWeek === importWeek,endTimes});
      const detectedWeek = result.issues.find(issue => issue.suggestedWeekStart)?.suggestedWeekStart;
      if (detectedWeek && detectedWeek !== targetWeek) {
        await recheck(detectedWeek);
        return;
      }
      setCatalog(fresh); setImportWeek(targetWeek); setPreview(result); setMissingEndTimes(result.missingEndTimes);
      if (targetWeek !== importWeek) setDatesConfirmed(false);
      setMessage(`${result.weekStart} – ${result.weekEnd} · ${result.assignmentCount} assignments · ${result.issues.length} to review`);
    } catch(error) { setMessage(error instanceof Error ? error.message : "Could not check this sheet."); }
    finally {setBusy(false);}
  }
  async function confirm() {
    if (!preview || !importable.length || preview.issues.some(issue=>issue.reason==="duplicate_assignment")) return;
    setBusy(true); setMessage(`Importing ${importable.length} verified outlet draft${importable.length === 1 ? "" : "s"}…`);
    try {
      const response = await fetch("/api/attendance/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "import_drafts", weekStart: preview.weekStart, fileName: preview.fileName, fileHash: preview.fileHash, outlets: importable.map((outlet) => ({ branch_id: outlet.branchId, assignments: outlet.assignments })), unresolvedCount: 0, sourceMetadata: { source: "schedule_workbook_ui", parserVersion: 8, endTimes, selectedSheet: sheet || null, confirmedDateContext: datesConfirmed, sourceIssues: preview.issues, importedOutlets: importable.map((outlet) => outlet.branchName) } }) });
      const result = await readJsonResponse<{ ok: boolean; message?: string }>(response, { unexpectedResponse: "The schedule import returned an unexpected response." });
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Schedule drafts could not be imported.");
      setMessage(`${importable.length} outlet draft${importable.length === 1 ? " was" : "s were"} imported. Published rosters were unchanged; source issues remain empty and auditable.`);
      window.setTimeout(() => window.location.assign(`/attendance/schedule?week=${encodeURIComponent(preview.weekStart)}&branch=${encodeURIComponent(branchId)}`), 900);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No schedule drafts were imported."); }
    finally { setBusy(false); }
  }
  return <>
    <section className="sb-work-surface flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Schedule workbook</h2><p className="mt-0.5 text-xs text-muted-foreground">Import Excel shifts into a draft.</p></div>
      <Button size="sm" variant="outline" onClick={() => dialog.current?.showModal()}><FileSpreadsheet className="h-4 w-4"/>Import workbook</Button>
    </section>
    <dialog ref={dialog} className="sb-schedule-import-dialog max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] max-w-none overflow-visible rounded-[var(--sb-panel-radius)] border-0 bg-white p-0 shadow-2xl backdrop:bg-black/55">
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex items-start gap-3 border-b border-[var(--sb-border-soft)] p-4"><div className="min-w-0 flex-1"><h2 className="text-base font-semibold">Import schedule workbook</h2><p className="mt-1 text-xs text-muted-foreground">Select a sheet and outlet. Workbook dates determine the import week.</p></div><Button size="icon" variant="ghost" aria-label="Close schedule import" onClick={() => dialog.current?.close()}><X className="h-4 w-4"/></Button></header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <label className="grid gap-1 text-xs font-medium"><span>Workbook (.xlsx)</span><Input type="file" accept=".xlsx" disabled={busy} onChange={(event) => void load(event.currentTarget.files?.[0])}/></label>
          {source && catalog ? <section className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectControl ariaLabel="Workbook sheet" placeholder="Select sheet" disabled={busy} portalContainer={dialog.current} value={sheet} onValueChange={value => {setSheet(value);setDatesConfirmed(false);setEndTimes({});setMissingEndTimes([]);setPreview(null);}} options={sheetNames.map(name=>({value:name,label:name}))}/>
              <SelectControl ariaLabel="Workbook outlet" placeholder="Confirm OMS outlet" disabled={busy} portalContainer={dialog.current} value={branchId} onValueChange={value=>{setBranchId(value);setEndTimes({});setMissingEndTimes([]);setPreview(null);}} options={catalog.branches.map(branch=>({value:branch.id,label:branch.name}))}/>
            </div>
            {preview?.issues.some(issue => issue.reason === "date_context_required") || datesConfirmed ? <label className="flex items-start gap-2 text-xs"><input type="checkbox" disabled={busy} checked={datesConfirmed} onChange={event=>{setDatesConfirmed(event.target.checked);setPreview(null);}}/><span>These incomplete dates belong to the week starting {importWeek}.</span></label> : null}
            {missingEndTimes.length ? <fieldset className="space-y-2"><legend className="text-sm font-semibold">Confirm missing end times</legend><p className="text-xs text-muted-foreground">These cells contain only a start time. Set the end time for each start below, then check the sheet again. The rule applies to every matching start in this sheet. An earlier end time means the next day.</p><div className="grid gap-3 sm:grid-cols-3">{missingEndTimes.map(start => <label key={start} className="grid gap-1 text-xs"><span>Starts {start} · ends</span><Input type="time" disabled={busy} value={endTimes[start] ?? ""} onChange={event => {setEndTimes({...endTimes,[start]:event.target.value});setPreview(null);}}/></label>)}</div></fieldset> : null}
            {preview?.issues.some(issue => issue.reason === "date_context_required" || (issue.reason === "date_window_mismatch" && !issue.suggestedWeekStart)) ? <label className="grid gap-1 text-xs">Week starting (Monday)<Input type="date" value={importWeek} disabled={busy} onChange={event => {setImportWeek(event.target.value);setDatesConfirmed(false);}}/></label> : null}
            <Button variant="outline" disabled={busy || !sheet || !branchId || !/^\d{4}-\d{2}-\d{2}$/.test(importWeek)} onClick={()=>void recheck()}>Preview import</Button>
          </section> : null}
          {message ? <p role="status" className="rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] p-3 text-xs">{message}</p> : null}
          {preview ? <>
            <section className="overflow-hidden rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)]"><div className="divide-y divide-[var(--sb-border-soft)]">{preview.outlets.map((outlet) => { const issues = outletIssues(outlet.branchName), existing = catalog?.current_assignments.filter(a=>String(a.branch_id)===outlet.branchId) ?? [], immutable = ["published", "locked", "submitted"].includes(outlet.status); return <div key={outlet.branchId} className="grid gap-1 px-3 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><strong className="truncate">{outlet.branchName}</strong><span className="tabular-nums">{outlet.assignments.length} assignments</span><span className={issues.length || immutable ? "text-amber-800" : "text-[var(--sb-success)]"}>{immutable ? `${outlet.status} · unchanged` : existing.length ? "Existing draft · compare below; import blocked" : issues.length ? `Partial draft · ${issues.length} to review` : "Ready"}</span></div>; })}</div></section>
            <details className="space-y-2"><summary className="cursor-pointer text-sm font-semibold">View {preview.assignmentCount} recognised assignments</summary><div className="max-h-72 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Employee / date</th><th className="p-2">Current</th><th className="p-2">Workbook</th></tr></thead><tbody>{preview.outlets.flatMap(outlet=>outlet.assignments.map((assignment,index)=>{const current=catalog?.current_assignments.find(a=>String(a.staff_id)===assignment.staff_id&&String(a.work_date)===assignment.work_date);return <tr className="border-t" key={`${outlet.branchId}:${index}`}><td className="p-2">{catalog?.staff.find(p=>p.id===assignment.staff_id)?.name}<br/>{assignment.work_date}</td><td className="p-2">{current ? `${String(current.assignment_kind)} ${String(current.custom_start??"")}–${String(current.custom_end??"")}` : "No assignment"}</td><td className="p-2">{assignment.assignment_kind} {assignment.custom_start} {assignment.custom_end ? `– ${assignment.custom_end}` : ""}<br/>{outlet.branchName}</td></tr>}))}</tbody></table></div></details>
            {preview.issues.length ? <section className="space-y-2"><h3 className="text-sm font-semibold">Needs attention</h3><ul className="space-y-2">{Object.values(preview.issues.reduce<Record<string, {message: string; count: number}>>((groups, issue) => {
              const key = `${issue.sheet}:${issue.employee ?? ""}:${issue.reason}`;
              if (groups[key]) groups[key].count++; else groups[key] = {message:issue.message,count:1};
              return groups;
            }, {})).map((issue,index) => <li key={index} className="rounded-[var(--sb-radius-control)] bg-amber-50 p-2 text-xs text-amber-950">{issue.message}{issue.count > 1 ? ` (${issue.count} affected days)` : ""}</li>)}</ul></section> : null}
          </> : null}
        </div>
        <footer className="flex flex-wrap items-center gap-3 border-t border-[var(--sb-border-soft)] p-4"><p className="min-w-0 flex-1 text-xs text-muted-foreground">Flagged cells stay empty; existing schedules stay unchanged.</p><Button disabled={busy || !importable.length || preview?.issues.some(issue=>issue.reason==="duplicate_assignment")} onClick={() => void confirm()}><Upload className="h-4 w-4"/>{busy ? "Working…" : `Import ${importable.length} draft outlet${importable.length === 1 ? "" : "s"}`}</Button></footer>
      </div>
    </dialog>
  </>;
}
