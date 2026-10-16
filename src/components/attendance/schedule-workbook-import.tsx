"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectControl } from "@/components/ui/select-control";
import { Input } from "@/components/ui/input";
import { readJsonResponse } from "@/lib/http/read-json-response";
import { parseScheduleWorkbook, SCHEDULE_SHEET_BRANCHES, type ScheduleImportCatalog, type ScheduleWorkbookPreview, type ScheduleEmployeeMatch } from "@/lib/attendance/schedule-workbook";


export function ScheduleWorkbookImport({ weekStart, canDraft }: { weekStart: string; canDraft: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step,setStep]=useState<1|2|3>(1);
  const [preview, setPreview] = useState<ScheduleWorkbookPreview | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null);
  const [source, setSource] = useState<File | null>(null), [catalog, setCatalog] = useState<ScheduleImportCatalog | null>(null);
  const [sheet, setSheet] = useState(""), [branchId, setBranchId] = useState(""), [datesConfirmed, setDatesConfirmed] = useState(false);
  const [destinationMappings,setDestinationMappings] = useState<Record<string,string>>({});
  const [destinationReviews,setDestinationReviews] = useState<ScheduleWorkbookPreview["destinationReviews"]>([]);
  const [shiftSelections, setShiftSelections] = useState<Record<string,string>>({});
  const [shiftConflicts, setShiftConflicts] = useState<ScheduleWorkbookPreview["shiftConflicts"]>([]);
  const [showMatched, setShowMatched] = useState(false);
  const [employeeMappings, setEmployeeMappings] = useState<Record<string, string>>({});
  const [employeeMatches, setEmployeeMatches] = useState<ScheduleEmployeeMatch[]>([]);
  const [sheetMappings, setSheetMappings] = useState<Record<string,string>>({});
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]);
  const [excludedRows, setExcludedRows] = useState<string[]>([]);
  const [outcomes, setOutcomes] = useState<Record<string,{status:"importing"|"imported"|"failed";message:string}>>({});
  const rowKey = (branch: string, staff: string, date: string) => `${branch}:${staff}:${date}`;
  const [sheetNames,setSheetNames] = useState<string[]>([]);
  const [importWeek, setImportWeek] = useState(weekStart);
  const [endTimes, setEndTimes] = useState<Record<string, string>>({});
  const [missingEndTimes, setMissingEndTimes] = useState<ScheduleWorkbookPreview["missingEndTimeSources"]>([]);
  if (!canDraft) return null;
  const outletIssues = (branchName: string) => preview?.issues.filter((issue) => (SCHEDULE_SHEET_BRANCHES[issue.sheet.toUpperCase()] === branchName || catalog?.branches.find(branch => branch.id === sheetMappings[issue.sheet])?.name === branchName || issue.sheet === "Workbook")) ?? [];
  const importable = preview?.outlets.filter(outlet => !["published", "locked", "submitted"].includes(outlet.status)).map(outlet => ({...outlet,assignments:outlet.assignments.filter(assignment => !catalog?.current_assignments.some(existing => existing.staff_id === assignment.staff_id && existing.work_date === assignment.work_date) && !excludedRows.includes(rowKey(outlet.branchId,assignment.staff_id,assignment.work_date)))})).filter(outlet => outlet.assignments.length) ?? [];
  const selected = importable.filter(outlet => selectedOutlets.includes(outlet.branchId));
  const pendingSelected = selected.filter(outlet => outcomes[outlet.branchId]?.status !== "imported");
  const eligibleCount = importable.filter(outlet => outcomes[outlet.branchId]?.status !== "imported").reduce((sum, outlet) => sum + outlet.assignments.length, 0);
  async function load(file?: File) {
    if (!file) return;
    setShiftSelections({});setShiftConflicts([]);setDestinationMappings({});setDestinationReviews([]);setEmployeeMappings({}); setEmployeeMatches([]);
    setEndTimes({}); setMissingEndTimes([]); setCatalog(null); setSheetNames([]);
    setSheetMappings({}); setSelectedOutlets([]); setExcludedRows([]); setOutcomes({});
    setStep(1); setSource(file); setSheet(""); setBranchId(""); setDatesConfirmed(false);
    setBusy(true); setMessage("Checking the workbook against current OMS staff and outlets…"); setPreview(null);
    try {
      const response = await fetch(`/api/attendance/schedule/import-catalog?week=${encodeURIComponent(importWeek)}`);
      const catalog = await readJsonResponse<ScheduleImportCatalog & { ok?: boolean; message?: string }>(response, { unexpectedResponse: "The schedule catalog returned an unexpected response." });
      if (!response.ok) throw new Error(catalog.message ?? "The schedule catalog could not be loaded.");
      setCatalog(catalog);
      const result = await parseScheduleWorkbook(file, importWeek, catalog);
      setSheetMappings(Object.fromEntries(result.sheets.map(name => [name, catalog.branches.find(branch => branch.name === SCHEDULE_SHEET_BRANCHES[name.toUpperCase()])?.id ?? ""])));
      setPreview(result); setEmployeeMatches(result.employeeMatches);setShiftConflicts(result.shiftConflicts);setDestinationReviews(result.destinationReviews); setSheetNames(result.sheets); setMissingEndTimes(result.missingEndTimeSources);
      setMessage(result.issues.length ? `${result.assignmentCount} safe assignments are readable. ${result.issues.length} source item${result.issues.length === 1 ? " will" : "s will"} remain empty for correction in the partial drafts.` : result.assignmentCount ? `${result.assignmentCount} assignments recognised. Select available outlets below.` : "No assignments were recognised. Select a sheet, check its dates and map its outlet.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The workbook could not be read."); }
    finally { setBusy(false); }
  }
  async function recheck(targetWeek = importWeek) {
    if (!source || !catalog || (sheet && !branchId)) return;
    setBusy(true); setPreview(null); setSelectedOutlets([]); setExcludedRows([]); setOutcomes({}); setMessage("Checking dates and assignments…");
    try {
      const response = await fetch(`/api/attendance/schedule/import-catalog?week=${encodeURIComponent(targetWeek)}`);
      const fresh = await readJsonResponse<ScheduleImportCatalog & { message?: string }>(response, { unexpectedResponse: "The schedule catalog returned an unexpected response." });
      if (!response.ok) throw new Error(fresh.message ?? "The schedule catalog could not be loaded.");
      const result = await parseScheduleWorkbook(source, targetWeek, fresh, {sheet: sheet || undefined,branchId: branchId || undefined,confirmDateContext:datesConfirmed && targetWeek === importWeek,sheetEndTimes:endTimes,employeeMappings,shiftSelections,destinationMappings,sheetMappings});
      const detectedWeek = result.issues.find(issue => issue.suggestedWeekStart)?.suggestedWeekStart;
      if (sheet && detectedWeek && detectedWeek !== targetWeek) {
        await recheck(detectedWeek);
        return;
      }
      setCatalog(fresh); setImportWeek(targetWeek); setPreview(result); setEmployeeMatches(result.employeeMatches);setShiftConflicts(result.shiftConflicts);setDestinationReviews(result.destinationReviews); setMissingEndTimes(result.missingEndTimeSources);
      if (targetWeek !== importWeek) setDatesConfirmed(false);
      setMessage(`${result.weekStart} – ${result.weekEnd} · ${result.assignmentCount} assignments · ${result.issues.length} to review`);
    } catch(error) { setMessage(error instanceof Error ? error.message : "Could not check this sheet."); }
    finally {setBusy(false);}
  }
  async function confirm() {
    if (!preview || !selected.length) return;
    setBusy(true);
    const pending = selected.filter(outlet => outcomes[outlet.branchId]?.status !== "imported");
    let completed = 0;
    for (const outlet of pending) {
      setOutcomes(current => ({...current,[outlet.branchId]:{status:"importing",message:"Importing…"}}));
      setMessage(`Importing ${completed + 1} of ${pending.length}: ${outlet.branchName}`);
      try {
        const response = await fetch("/api/attendance/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "import_drafts", appendOnly:true, weekStart: preview.weekStart, fileName: preview.fileName, fileHash: preview.fileHash, outlets: [{branch_id:outlet.branchId,assignments:outlet.assignments}], unresolvedCount:0, sourceMetadata:{source:"schedule_workbook_ui",parserVersion:10,sheetMappings,endTimes,employeeMatches:preview.employeeMatches,assignmentSources:preview.assignmentSources,shiftSelections,destinationMappings,sourceIssues:preview.issues,sourceNotices:preview.notices,sourceNotes:preview.notes,excludedRows} }) });
        const result = await readJsonResponse<{ok:boolean;message?:string;data?:{idempotent?:boolean}}>(response,{unexpectedResponse:"The import response could not be read. Retry this same selection to check its receipt."});
        if (!response.ok || !result.ok) throw new Error(result.message ?? "Import failed. Preview again to check this outlet.");
        setOutcomes(current => ({...current,[outlet.branchId]:{status:"imported",message:`${outlet.assignments.length} assignments imported${result.data?.idempotent ? " · already saved" : ""}`}}));
      } catch (error) {
        setOutcomes(current => ({...current,[outlet.branchId]:{status:"failed",message:error instanceof Error ? error.message : "Import failed. Retry this selection."}}));
      }
      completed++;
    }
    setBusy(false); setMessage("Import finished. Check each outlet’s result below; failed selections can be retried.");
  }
  return <>
    <section className="sb-work-surface flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Schedule workbook</h2><p className="mt-0.5 text-xs text-muted-foreground">Import Excel shifts into a draft.</p></div>
      <Button size="sm" variant="outline" onClick={() => dialog.current?.showModal()}><FileSpreadsheet className="h-4 w-4"/>Import workbook</Button>
    </section>
    <dialog ref={dialog} className="sb-schedule-import-dialog m-auto max-h-[calc(100dvh-4rem)] w-[min(48rem,calc(100vw-2rem))] max-w-none overflow-visible rounded-[var(--sb-panel-radius)] border-0 bg-white p-0 shadow-2xl backdrop:bg-black/55">
      <div className="flex max-h-[calc(100dvh-4rem)] flex-col">
        <header className="flex items-start gap-3 border-b border-[var(--sb-border-soft)] p-4"><div className="min-w-0 flex-1"><h2 className="text-base font-semibold">Import schedule workbook</h2><p className="mt-1 text-xs text-muted-foreground">Preview all locations together, then select the drafts to import.</p></div><Button size="icon" variant="ghost" aria-label="Close schedule import" onClick={() => dialog.current?.close()}><X className="h-4 w-4"/></Button></header>
        <nav aria-label="Import steps" className="grid grid-cols-3 gap-1 px-4 pt-3">{(["Import","Fix import","Review"] as const).map((label,index)=><Button key={label} type="button" variant={step===index+1?"default":"ghost"} aria-current={step===index+1?"step":undefined} disabled={busy || (index>0 && !catalog) || (index===2 && (!preview || step===1))} onClick={()=>setStep((index+1) as 1|2|3)}>{index+1}. {label}</Button>)}</nav>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {message ? <p role="status" className="rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] p-3 text-xs">{message}</p> : null}
          <div className={step===1 ? "grid items-end gap-3 sm:grid-cols-2" : "hidden"}>
          <label className="grid gap-1 text-xs font-medium"><span>Workbook (.xlsx)</span><Input type="file" accept=".xlsx" disabled={busy} onChange={(event) => void load(event.currentTarget.files?.[0])}/></label>
          <label className="grid gap-1 text-xs">Week starting (Monday)<Input type="date" value={importWeek} disabled={busy} onChange={event=>{setImportWeek(event.target.value);setDatesConfirmed(false);setSelectedOutlets([]);setPreview(null);}}/></label></div>
          <div hidden={step!==2} className="space-y-4">
          {source && catalog ? <section className="space-y-3">
            <p className="text-xs text-muted-foreground">Match locations and employees, then check the corrected workbook.</p>
            <details className="space-y-2" open={Object.values(sheetMappings).some(value => !value)}>
              <summary className="cursor-pointer text-sm font-semibold">Sheet locations · {sheetNames.length}</summary>
              <p className="text-xs text-muted-foreground">Check the suggested locations. Every included sheet is checked together.</p>
              <div className="space-y-2">{sheetNames.map(name => <label key={name} className="grid min-w-0 items-center gap-2 text-xs sm:grid-cols-2"><span className="break-words">{name}</span><SelectControl ariaLabel={`Outlet for ${name}`} placeholder="Choose outlet" portalContainer={dialog.current} disabled={busy} value={sheetMappings[name] ?? ""} options={[...catalog.branches.map(branch => ({value:branch.id,label:branch.name})),{value:"skip",label:"Exclude this sheet"}]} onValueChange={value => {setSheetMappings(current => ({...current,[name]:value}));setEmployeeMatches([]);setEmployeeMappings({});setShiftSelections({});setShiftConflicts([]);setDestinationMappings({});setDestinationReviews([]);setSelectedOutlets([]);setPreview(null);}}/></label>)}</div>
            </details>
            {preview?.issues.some(issue => issue.reason === "date_context_required") || datesConfirmed ? <label className="flex items-start gap-2 text-xs"><input type="checkbox" disabled={busy} checked={datesConfirmed} onChange={event=>{setDatesConfirmed(event.target.checked);setPreview(null);}}/><span>These incomplete dates belong to the week starting {importWeek}.</span></label> : null}
            {missingEndTimes.length ? <fieldset className="space-y-2"><legend className="text-sm font-semibold">Confirm missing end times</legend><p className="text-xs text-muted-foreground">These cells contain only a start time. Set the end time for each start below, then check the sheet again. Each rule applies only to the named sheet. An earlier end time means the next day.</p><div className="grid gap-3 sm:grid-cols-3">{missingEndTimes.map(({key,sheet,start}) => <label key={key} className="grid gap-1 text-xs"><span>{sheet} · {start} · ends</span><Input type="time" disabled={busy} value={endTimes[key] ?? ""} onChange={event => {setEndTimes({...endTimes,[key]:event.target.value});setPreview(null);}}/></label>)}</div></fieldset> : null}
          </section> : null}
          {catalog?.import_history?.length ? <details className="space-y-2 text-xs"><summary className="cursor-pointer font-semibold">Recent imports · {catalog.import_history.length}</summary>{catalog.import_history.map(item => <p key={item.id}>{item.fileName} · {new Date(item.createdAt).toLocaleString()} · {item.outcomes.reduce((sum,outlet) => sum + outlet.assignments,0)} assignments</p>)}</details> : null}
          {preview ? <>
            {preview.issues.length ? <section className="space-y-2"><h3 className="text-sm font-semibold">Needs attention</h3><ul className="space-y-2">{Object.values(preview.issues.reduce<Record<string, {message: string; count: number}>>((groups, issue) => {
              const key = `${issue.sheet}:${issue.employee ?? ""}:${issue.reason}`;
              if (groups[key]) groups[key].count++; else groups[key] = {message:issue.message,count:1};
              return groups;
            }, {})).map((issue,index) => <li key={index} className="rounded-[var(--sb-radius-control)] bg-amber-50 p-2 text-xs text-amber-950">{issue.message}{issue.count > 1 ? ` (${issue.count} affected days)` : ""}</li>)}</ul></section> : null}
          </> : null}
          {employeeMatches.some(match => !match.staffId || employeeMappings[match.key]) || showMatched ? <section className="space-y-2" aria-label="Employee matching">
            <h3 className="text-sm font-semibold">Match employees</h3>
            <p className="text-xs text-muted-foreground">Staff ID is checked first. Confirm uncertain rows, then preview again.</p>
            <button type="button" className="text-xs underline" onClick={() => setShowMatched(value => !value)}>{showMatched ? "Show uncertain rows only" : `Review ${employeeMatches.filter(match => match.staffId).length} matched rows`}</button>
            <div className="space-y-2">{employeeMatches.filter(match => showMatched || !match.staffId || employeeMappings[match.key]).map(match => {
              const people = [...new Map((catalog?.staff ?? []).filter(person => person.branch_id === match.branchId).map(person => [person.id, person])).values()];
              const changed = Object.prototype.hasOwnProperty.call(employeeMappings, match.key) && employeeMappings[match.key] !== match.staffId;
              return <div key={match.key} className="grid min-w-0 gap-2 rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] p-3 sm:grid-cols-2">
                <div className="min-w-0 break-words text-xs"><strong>{match.employee || "Unnamed row"}{match.staffCode ? ` · ID ${match.staffCode}` : ""}</strong><p className="mt-1 text-muted-foreground">{match.sheet} · row {match.row}</p><p className="mt-1">{changed ? "Selection changed. Preview again to check assignments." : match.reason}</p></div>
                <SelectControl ariaLabel={`Employee for ${match.sheet} row ${match.row}`} portalContainer={dialog.current} searchable searchPlaceholder="Search employee or Staff ID" disabled={busy} placeholder="Choose employee" value={employeeMappings[match.key] ?? match.staffId ?? ""} options={people.map(person => ({value:person.id,label:`${person.name}${person.staff_code ? ` · ${person.staff_code}` : ""}`}))} onValueChange={value => {
                  setEmployeeMappings(current => ({...current,[match.key]:value}));setShiftSelections({});setShiftConflicts([]);setDestinationMappings({});setDestinationReviews([]); setPreview(null); setMessage("Employee selection changed. Preview import again before saving.");
                }}/>
              </div>;
            })}</div>
          </section> : null}
          {employeeMatches.length && !showMatched && !employeeMatches.some(match => !match.staffId || employeeMappings[match.key]) ? <button type="button" className="min-h-11 text-xs underline" onClick={() => setShowMatched(true)}>Review {employeeMatches.length} matched rows</button> : null}
          {destinationReviews.length ? <section className="space-y-2"><h3 className="text-sm font-semibold">Confirm destination names</h3>{destinationReviews.map(review => <label key={review.key} className="grid min-w-0 gap-1 text-xs"><span>{review.sheet} · row {review.row} · {review.date}: “{review.value}”</span><SelectControl ariaLabel={`Destination for ${review.sheet} row ${review.row} ${review.date}`} portalContainer={dialog.current} disabled={busy} placeholder="Confirm destination" value={destinationMappings[review.key] ?? review.selected} options={review.candidates.map(branch => ({value:branch.id,label:branch.name}))} onValueChange={value => {setDestinationMappings(current => ({...current,[review.key]:value}));setPreview(null);setMessage("Destination changed. Preview import again before saving.");}}/></label>)}</section> : null}
          {shiftConflicts.length ? <section className="space-y-2"><h3 className="text-sm font-semibold">Confirm overlapping shifts</h3>{shiftConflicts.map(conflict => <label key={conflict.key} className="grid min-w-0 gap-1 text-xs"><span>{conflict.employee} · {conflict.date}</span><SelectControl ariaLabel={`Shift for ${conflict.employee} ${conflict.date}`} portalContainer={dialog.current} disabled={busy} placeholder="Choose source shift" value={shiftSelections[conflict.key] ?? conflict.selected} options={conflict.choices.map(choice => ({value:choice.key,label:choice.label}))} onValueChange={value => {setShiftSelections(current => ({...current,[conflict.key]:value}));setPreview(null);setMessage("Shift selection changed. Preview import again before saving.");}}/></label>)}</section> : null}
          </div>
          <div hidden={step!==3} className="space-y-4">
          {Object.keys(outcomes).length ? <section aria-label="Import results" className="space-y-2 text-xs"><h3 className="font-semibold">Import results</h3>{Object.entries(outcomes).map(([id,outcome]) => <p key={id} role="status"><strong>{catalog?.branches.find(branch => branch.id === id)?.name}</strong> · {outcome.message}</p>)}</section> : null}
          {preview ? <>
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs tabular-nums" aria-label="Assignment counts">{preview.assignmentCount} recognised · {eligibleCount} available · {pendingSelected.reduce((sum, outlet) => sum + outlet.assignments.length, 0)} selected</p>{importable.length ? <Button size="sm" variant="outline" disabled={busy} onClick={() => setSelectedOutlets(importable.filter(outlet => outcomes[outlet.branchId]?.status !== "imported").map(outlet => outlet.branchId))}>Select all available outlets</Button> : null}</div>
            {preview.notes.length ? <details className="space-y-2 text-xs"><summary className="cursor-pointer font-semibold">Workbook remarks · {preview.notes.length}</summary><p className="text-muted-foreground">Review each sheet’s written notes. Referenced dates, replacement leave and balances stay separate; colours do not change written shift times.</p><ul className="space-y-2">{preview.notes.map(note => <li key={`${note.sheet}:${note.range}`} className="rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] p-2"><strong>{/^rgb:[0-9a-f]{8}$/i.test(note.fill) ? <span aria-label="Source fill colour" className="mr-2 inline-block h-3 w-3 rounded-sm border border-black/20 align-middle" style={{backgroundColor:`#${note.fill.slice(-6)}`}}/> : null}{note.sheet} · {note.range}</strong><p className="mt-1 whitespace-pre-wrap break-words">{note.text}</p>{note.columnHeaders.length ? <p className="mt-1 text-muted-foreground">Source column dates: {note.columnHeaders.join(", ")}</p> : null}{note.relatedCells.length ? <p className="mt-1 text-muted-foreground">Same colour in these columns: {note.relatedCells.join(", ")} · confirm the relationship</p> : null}</li>)}</ul></details> : null}
            {preview.notices.length ? <details className="text-xs"><summary className="cursor-pointer font-medium">Hidden workbook content skipped</summary><ul className="mt-2 space-y-1 text-muted-foreground">{preview.notices.map(notice => <li key={notice}>{notice}</li>)}</ul></details> : null}
            <section className="overflow-hidden rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)]"><div className="divide-y divide-[var(--sb-border-soft)]">{preview.outlets.map((outlet) => { const issues = outletIssues(outlet.branchName), existing = catalog?.current_assignments.filter(a=>String(a.branch_id)===outlet.branchId) ?? [], immutable = ["published", "locked", "submitted"].includes(outlet.status); return <div key={outlet.branchId} className="grid gap-x-3 gap-y-1 px-3 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_7rem_12rem] sm:items-center"><label className="flex min-w-0 items-center gap-2"><input type="checkbox" aria-label={`Import ${outlet.branchName}`} disabled={busy || outcomes[outlet.branchId]?.status === "imported" || !importable.some(item => item.branchId === outlet.branchId)} checked={selectedOutlets.includes(outlet.branchId)} onChange={event => setSelectedOutlets(current => event.target.checked ? [...current,outlet.branchId] : current.filter(id => id !== outlet.branchId))}/><strong className="break-words">{outlet.branchName}</strong></label><span className="tabular-nums sm:text-right">{importable.find(item => item.branchId === outlet.branchId)?.assignments.length ?? 0} new assignments</span><span className={issues.length || immutable ? "text-amber-800" : existing.length ? "text-muted-foreground" : "text-[var(--sb-success)]"}>{immutable ? `${outlet.status} · unchanged` : existing.length ? "Existing days excluded" : issues.length ? `Partial draft · ${issues.length} to review` : "Ready"}</span></div>; })}</div></section>
            <details className="space-y-2"><summary className="cursor-pointer text-sm font-semibold">View {preview.assignmentCount} recognised assignments</summary><div className="max-h-72 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Employee / date</th><th className="p-2">Current</th><th className="p-2">Workbook</th></tr></thead><tbody>{preview.outlets.flatMap(outlet=>outlet.assignments.map((assignment,index)=>{const current=catalog?.current_assignments.find(a=>String(a.staff_id)===assignment.staff_id&&String(a.work_date)===assignment.work_date);return <tr className="border-t" key={`${outlet.branchId}:${index}`}><td className="p-2"><label className="flex items-start gap-2"><input type="checkbox" aria-label={`Include ${catalog?.staff.find(p=>p.id===assignment.staff_id)?.name} ${assignment.work_date}`} disabled={busy || Boolean(current) || ["published","locked","submitted"].includes(outlet.status) || outcomes[outlet.branchId]?.status === "imported"} checked={!current && !excludedRows.includes(rowKey(outlet.branchId,assignment.staff_id,assignment.work_date))} onChange={event => {const key=rowKey(outlet.branchId,assignment.staff_id,assignment.work_date);setExcludedRows(rows => event.target.checked ? rows.filter(row => row !== key) : [...rows,key]);}}/><span>{catalog?.staff.find(p=>p.id===assignment.staff_id)?.name}</span></label><br/>{assignment.work_date}</td><td className="p-2">{current ? `${String(current.assignment_kind)} ${String(current.custom_start??"")}–${String(current.custom_end??"")}` : "No assignment"}</td><td className="p-2">{assignment.assignment_kind} {assignment.custom_start} {assignment.custom_end ? `– ${assignment.custom_end}` : ""}<br/>{outlet.branchName}</td></tr>}))}</tbody></table></div></details>

          </> : null}
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sb-border-soft)] p-4"><p className="basis-full text-xs text-muted-foreground">Flagged cells stay empty; existing schedules stay unchanged.</p>{step>1?<Button variant="outline" disabled={busy} onClick={()=>setStep(step===3?2:1)}>Back</Button>:<span/>}{step===1?<Button disabled={busy || !source || !catalog} onClick={async()=>{if(!preview)await recheck();setStep(2);}}>Continue to fix import</Button>:step===2?<div className="flex gap-2"><Button variant="outline" disabled={busy || !source} onClick={()=>void recheck()}>Check changes</Button><Button disabled={busy || !preview} onClick={()=>setStep(3)}>Review import</Button></div>:<Button disabled={busy || !pendingSelected.length} onClick={()=>void confirm()}><Upload className="h-4 w-4"/>{busy?"Importing…":`Import ${pendingSelected.length} draft outlets`}</Button>}</footer>
      </div>
    </dialog>
  </>;
}
