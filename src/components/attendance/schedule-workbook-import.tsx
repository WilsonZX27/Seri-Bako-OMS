"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectControl } from "@/components/ui/select-control";
import {TimeSelect} from "@/components/attendance/time-select";
import { Input } from "@/components/ui/input";
import { readJsonResponse } from "@/lib/http/read-json-response";
import { parseScheduleWorkbooks, scheduleImportDisposition, scheduleOtResolutionError, SCHEDULE_SHEET_BRANCHES, type ScheduleImportRule, type ScheduleOtResolution, type ScheduleOtReview, type ScheduleImportCatalog, type ScheduleWorkbookPreview, type ScheduleEmployeeMatch } from "@/lib/attendance/schedule-workbook";


export function ScheduleWorkbookImport({ weekStart, canDraft }: { weekStart: string; canDraft: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step,setStep]=useState<1|2|3>(1);
  const [preview, setPreview] = useState<ScheduleWorkbookPreview | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null);
  const [source, setSource] = useState<File[]>([]), [catalog, setCatalog] = useState<ScheduleImportCatalog | null>(null);
  const [sheet, setSheet] = useState(""), [branchId, setBranchId] = useState(""), [datesConfirmed, setDatesConfirmed] = useState(false);
  const otDialog=useRef<HTMLDialogElement>(null);
  const [otReviews,setOtReviews]=useState<ScheduleOtReview[]>([]);
  const [otResolutions,setOtResolutions]=useState<Record<string,ScheduleOtResolution>>({});
  const [otEditing,setOtEditing]=useState<ScheduleOtReview|null>(null);
  const [otInput,setOtInput]=useState<ScheduleOtResolution>({kind:"shift",start:"",end:"",breakMinutes:0,capMinutes:0,reason:""});
  const [rules,setRules]=useState<Record<string,ScheduleImportRule>>({});
  const [namedShifts,setNamedShifts]=useState<ScheduleWorkbookPreview["namedShifts"]>([]);
  const [policyStaff,setPolicyStaff]=useState("");
  const [policyRequiresFingerprint,setPolicyRequiresFingerprint]=useState(false);
  const [policyReason,setPolicyReason]=useState("Head chef: fingerprint attendance is not required.");
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
  const otError=scheduleOtResolutionError(otInput,otEditing?.noteOnly);
  if (!canDraft) return null;
  const outletIssues = (branchName: string) => preview?.issues.filter((issue) => (SCHEDULE_SHEET_BRANCHES[issue.sheet.toUpperCase()] === branchName || catalog?.branches.find(branch => branch.id === sheetMappings[issue.sheet])?.name === branchName || issue.sheet === "Workbook")) ?? [];
  const importable = preview?.outlets.filter(outlet => !["published", "locked", "submitted"].includes(outlet.status)).map(outlet => ({...outlet,assignments:outlet.assignments.filter(assignment => catalog && ["new","update"].includes(scheduleImportDisposition(outlet.branchId,assignment,catalog)) && !excludedRows.includes(rowKey(outlet.branchId,assignment.staff_id,assignment.work_date)))})).filter(outlet => outlet.assignments.length) ?? [];
  const selected = importable.filter(outlet => selectedOutlets.includes(outlet.branchId));
  const pendingSelected = selected.filter(outlet => outcomes[outlet.branchId]?.status !== "imported");
  const eligibleCount = importable.filter(outlet => outcomes[outlet.branchId]?.status !== "imported").reduce((sum, outlet) => sum + outlet.assignments.length, 0);
  async function load(files: File[]) {
    if (!files.length) return;
    setShiftSelections({});setShiftConflicts([]);setDestinationMappings({});setDestinationReviews([]);setEmployeeMappings({}); setEmployeeMatches([]);
    setEndTimes({}); setMissingEndTimes([]); setCatalog(null); setSheetNames([]);
    setSheetMappings({}); setSelectedOutlets([]); setExcludedRows([]); setOutcomes({});
    setOtReviews([]);setOtResolutions({});setRules({});setNamedShifts([]);setStep(1); setSource(files); setSheet(""); setBranchId(""); setDatesConfirmed(false);
    setBusy(true); setMessage("Checking the workbook against current OMS staff and outlets…"); setPreview(null);
    try {
      const response = await fetch(`/api/attendance/schedule/import-catalog?week=${encodeURIComponent(importWeek)}`);
      const catalog = await readJsonResponse<ScheduleImportCatalog & { ok?: boolean; message?: string }>(response, { unexpectedResponse: "The schedule catalog returned an unexpected response." });
      if (!response.ok) throw new Error(catalog.message ?? "The schedule catalog could not be loaded.");
      setCatalog(catalog);
      const result = await parseScheduleWorkbooks(files, importWeek, catalog);
      setSheetMappings(result.sheetBranches);setNamedShifts(result.namedShifts);const aiden=[...new Map(catalog.staff.filter(person=>person.name.trim().toLowerCase()==="aiden").map(person=>[person.id,person])).values()];setPolicyStaff(aiden.length===1?aiden[0].id:"");
      setOtReviews(result.otReviews);setPreview(result); setEmployeeMatches(result.employeeMatches);setShiftConflicts(result.shiftConflicts);setDestinationReviews(result.destinationReviews); setSheetNames(result.sheets); setMissingEndTimes(result.missingEndTimeSources);
      setMessage(result.issues.length ? `${result.assignmentCount} safe assignments are readable. ${result.issues.length} source item${result.issues.length === 1 ? " will" : "s will"} remain empty for correction in the partial drafts.` : result.assignmentCount ? `${result.assignmentCount} assignments recognised. Select available outlets below.` : "No assignments were recognised. Select a sheet, check its dates and map its outlet.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The workbook could not be read."); }
    finally { setBusy(false); }
  }
  async function recheck(targetWeek = importWeek) {
    if (!source.length || !catalog || (sheet && !branchId)) return;
    setBusy(true); setPreview(null); setSelectedOutlets([]); setExcludedRows([]); setOutcomes({}); setMessage("Checking dates and assignments…");
    try {
      const response = await fetch(`/api/attendance/schedule/import-catalog?week=${encodeURIComponent(targetWeek)}`);
      const fresh = await readJsonResponse<ScheduleImportCatalog & { message?: string }>(response, { unexpectedResponse: "The schedule catalog returned an unexpected response." });
      if (!response.ok) throw new Error(fresh.message ?? "The schedule catalog could not be loaded.");
      const result = await parseScheduleWorkbooks(source, targetWeek, fresh, {otResolutions,rules,sheet: sheet || undefined,branchId: branchId || undefined,confirmDateContext:datesConfirmed && targetWeek === importWeek,sheetEndTimes:endTimes,employeeMappings,shiftSelections,destinationMappings,sheetMappings});
      const detectedWeek = result.issues.find(issue => issue.suggestedWeekStart)?.suggestedWeekStart;
      if (sheet && detectedWeek && detectedWeek !== targetWeek) {
        await recheck(detectedWeek);
        return;
      }
      setNamedShifts(result.namedShifts);setSheetNames(result.sheets);setSheetMappings(current=>({...result.sheetBranches,...current}));setCatalog(fresh); setImportWeek(targetWeek); setOtReviews(result.otReviews);setPreview(result); setEmployeeMatches(result.employeeMatches);setShiftConflicts(result.shiftConflicts);setDestinationReviews(result.destinationReviews); setMissingEndTimes(result.missingEndTimeSources);
      if (targetWeek !== importWeek) setDatesConfirmed(false);
      setMessage(`${result.weekStart} – ${result.weekEnd} · ${result.assignmentCount} assignments · ${result.issues.length} to review`);
    } catch(error) { setMessage(error instanceof Error ? error.message : "Could not check this sheet."); }
    finally {setBusy(false);}
  }
  async function confirm() {
    if (!preview || !selected.length) return;
    setBusy(true);
    const pending = selected.filter(outlet => outcomes[outlet.branchId]?.status !== "imported");
    for(const outlet of pending)setOutcomes(current=>({...current,[outlet.branchId]:{status:"importing",message:"Importing batch…"}}));
    try {
      const days=new Set(pending.flatMap(outlet=>outlet.assignments.map(assignment=>`${assignment.staff_id}:${assignment.work_date}`)));
      const response=await fetch("/api/attendance/schedule",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"import_drafts",reconcileDrafts:true,weekStart:preview.weekStart,fileName:preview.fileName,fileHash:preview.fileHash,outlets:pending.map(outlet=>({branch_id:outlet.branchId,assignments:outlet.assignments})),unresolvedCount:0,sourceMetadata:{source:"schedule_workbook_ui",parserVersion:12,otResolutions,files:preview.files,untimedDuties:preview.untimedDuties.filter(row=>pending.some(outlet=>outlet.branchId===row.branchId)),reusableRules:preview.reusableRules,expectedAssignments:(catalog?.current_assignments??[]).filter(row=>days.has(`${row.staff_id}:${row.work_date}`)).map(row=>row.id).sort(),sheetMappings,employeeMatches:preview.employeeMatches,assignmentSources:preview.assignmentSources,shiftSelections,destinationMappings,sourceIssues:preview.issues,sourceNotices:preview.notices,sourceNotes:preview.notes,excludedRows}})});
      const result=await readJsonResponse<{ok:boolean;message?:string;data?:{idempotent?:boolean}}>(response,{unexpectedResponse:"The batch response could not be read. Retry the same selection to check its receipt."});
      if(!response.ok||!result.ok)throw new Error(result.message??"The batch was not imported. Check changes and try again.");
      for(const outlet of pending)setOutcomes(current=>({...current,[outlet.branchId]:{status:"imported",message:`${outlet.assignments.length} assignments saved${result.data?.idempotent?" · already saved":""}`}}));
      setMessage("All selected locations were saved together. Confirmed matching and label rules will be reused next time.");
    }catch(error){const message=error instanceof Error?error.message:"Import failed.";for(const outlet of pending)setOutcomes(current=>({...current,[outlet.branchId]:{status:"failed",message}}));setMessage(message);}
    finally{setBusy(false);}
  }
  async function saveFingerprintException(){
    if(!policyStaff)return;setBusy(true);
    try{
      const response=await fetch("/api/attendance/schedule/fingerprint-policy",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({staffId:policyStaff,effectiveFrom:importWeek,requiresFingerprint:policyRequiresFingerprint,reason:policyReason})});
      const result=await readJsonResponse<{ok:boolean;message?:string}>(response,{unexpectedResponse:"The policy response could not be read."});
      if(!response.ok||!result.ok)throw new Error(result.message??"Policy could not be saved.");
      setCatalog(current=>current?{...current,fingerprint_exempt_staff:policyRequiresFingerprint?(current.fingerprint_exempt_staff??[]).filter(id=>id!==policyStaff):[...new Set([...(current.fingerprint_exempt_staff??[]),policyStaff])]}:current);
      setMessage("Staff exception saved. Check changes to refresh this preview. No working or paid hours were assumed.");setPreview(null);
    }catch(error){setMessage(error instanceof Error?error.message:"Could not save staff exception.");}finally{setBusy(false);}
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
          <label className="grid gap-1 text-xs font-medium"><span>Workbooks (.xlsx) · choose up to 10</span><Input type="file" multiple accept=".xlsx" disabled={busy} onChange={(event) => void load(Array.from(event.currentTarget.files??[]))}/></label>
          <label className="grid gap-1 text-xs">Week starting (Monday)<Input type="date" value={importWeek} disabled={busy} onChange={event=>{setImportWeek(event.target.value);setDatesConfirmed(false);setSelectedOutlets([]);setPreview(null);}}/></label></div>
          <div hidden={step!==2} className="space-y-4">
          {source.length && catalog ? <section className="space-y-3">
            <p className="text-xs text-muted-foreground">Match locations and employees, then check the corrected workbook.</p>
            <details className="space-y-2" open={Object.values(sheetMappings).some(value => !value)}>
              <summary className="cursor-pointer text-sm font-semibold">Sheet locations · {sheetNames.length}</summary>
              <p className="text-xs text-muted-foreground">Check the suggested locations. Every included sheet is checked together.</p>
              <div className="space-y-2">{sheetNames.map(name => <label key={name} className="grid min-w-0 items-center gap-2 text-xs sm:grid-cols-2"><span className="break-words">{name}</span><SelectControl ariaLabel={`Outlet for ${name}`} placeholder="Choose outlet" portalContainer={dialog.current} disabled={busy} value={sheetMappings[name] ?? ""} options={[...catalog.branches.map(branch => ({value:branch.id,label:branch.name})),{value:"skip",label:"Exclude this sheet"}]} onValueChange={value => {setSheetMappings(current => ({...current,[name]:value}));setEmployeeMatches([]);setEmployeeMappings({});setShiftSelections({});setShiftConflicts([]);setDestinationMappings({});setDestinationReviews([]);setSelectedOutlets([]);setPreview(null);}}/></label>)}</div>
            </details>
            {preview?.issues.some(issue => issue.reason === "date_context_required") || datesConfirmed ? <label className="flex items-start gap-2 text-xs"><input type="checkbox" disabled={busy} checked={datesConfirmed} onChange={event=>{setDatesConfirmed(event.target.checked);setPreview(null);}}/><span>These incomplete dates belong to the week starting {importWeek}.</span></label> : null}
            {missingEndTimes.length ? <fieldset className="space-y-2"><legend className="text-sm font-semibold">Confirm missing end times</legend><p className="text-xs text-muted-foreground">These cells contain only a start time. Set the end time for each start below, then check the sheet again. Each rule applies only to the named sheet. An earlier end time means the next day.</p><div className="grid gap-3 sm:grid-cols-3">{missingEndTimes.map(({key,sheet,start}) => <label key={key} className="grid gap-1 text-xs"><span>{sheet} · {start} · ends</span><Input type="time" disabled={busy} value={endTimes[key] ?? ""} onChange={event => {setEndTimes({...endTimes,[key]:event.target.value});setPreview(null);}}/></label>)}</div></fieldset> : null}
          </section> : null}
          {catalog?.can_manage_exemptions ? <details className="space-y-2 text-xs"><summary className="cursor-pointer font-semibold">Staff fingerprint exception</summary><p>Select the employee identity once. This dated Owner exception removes missing-fingerprint requirements on future calculations; it does not infer shift hours or change approved payroll.</p><SelectControl ariaLabel="Fingerprint-exempt employee" portalContainer={dialog.current} searchable value={policyStaff} options={[...new Map(catalog.staff.map(person=>[person.id,person])).values()].map(person=>({value:person.id,label:`${person.name}${person.staff_code?` · ${person.staff_code}`:""}`}))} onValueChange={setPolicyStaff}/><SelectControl ariaLabel="Fingerprint requirement" portalContainer={dialog.current} value={String(policyRequiresFingerprint)} options={[{value:"false",label:"Fingerprint not required — staff exception"},{value:"true",label:"Fingerprint required — end exception"}]} onValueChange={value=>setPolicyRequiresFingerprint(value==="true")}/><Input aria-label="Fingerprint exception reason" value={policyReason} onChange={event=>setPolicyReason(event.target.value)}/><Button variant="outline" disabled={busy||!policyStaff||!policyReason.trim()||(Boolean(catalog.fingerprint_exempt_staff?.includes(policyStaff))===!policyRequiresFingerprint)} onClick={()=>void saveFingerprintException()}>{policyRequiresFingerprint?"Restore fingerprint requirement":"Confirm exemption"} from {importWeek}</Button></details>:null}
          {otReviews.length?<section className="space-y-2"><h3 className="text-sm font-semibold">OT · confirm each case</h3><p className="text-xs text-muted-foreground">Every OT entry needs your instructions for this file and date. Conditions are never reused as a standard shift or automatic OT credit.</p>{otReviews.map(item=><div key={item.key} className="flex items-center gap-3 rounded border p-3 text-xs"><div className="min-w-0 flex-1"><strong>{item.employee} · {item.date}</strong><p className="break-words">{item.value}</p><p className="text-muted-foreground">{item.sheet}</p></div><Button size="sm" variant="outline" disabled={busy} onClick={()=>{setOtEditing(item);setOtInput(otResolutions[item.key]??{kind:item.noteOnly?"separate":"shift",start:"",end:"",breakMinutes:0,capMinutes:0,reason:""});otDialog.current?.showModal();}}>{item.confirmed?"Edit OT instructions":"Review OT"}</Button></div>)}</section>:null}
          {namedShifts.length ? <section className="space-y-3"><h3 className="text-sm font-semibold">Remember a source label</h3><p className="text-xs text-muted-foreground">Confirm its meaning once for this workbook and location. Unknown labels remain excluded until confirmed. MORNING for a fingerprint-exempt employee stays a note.</p>{namedShifts.map(item=><fieldset key={item.key} className="grid gap-2 rounded border p-3 text-xs"><legend>{item.sheet} · {item.label}</legend><SelectControl ariaLabel={`Meaning of ${item.label} in ${item.sheet}`} portalContainer={dialog.current} value={rules[item.key]?.kind??(rules[item.key]?.start!==undefined?"time":"")} placeholder="Choose meaning" options={[{value:"time",label:"Working shift — enter times"},{value:"off",label:"Rest day"},{value:"ro",label:"Replacement off"},{value:"al",label:"Annual leave"}]} onValueChange={value=>{const branchId=preview?.sheetBranches[item.sheet]??sheetMappings[item.sheet];setRules(current=>({...current,[item.key]:{branchId,...(value==="time"?{start:"",end:""}:{kind:value as ScheduleImportRule["kind"]})}}));setPreview(null);}}/>{rules[item.key]?.start!==undefined?<div className="grid grid-cols-2 gap-2"><Input type="time" aria-label={`${item.label} starts`} value={rules[item.key]?.start??""} onChange={event=>{setRules(current=>({...current,[item.key]:{...current[item.key],start:event.target.value}}));setPreview(null);}}/><Input type="time" aria-label={`${item.label} ends`} value={rules[item.key]?.end??""} onChange={event=>{setRules(current=>({...current,[item.key]:{...current[item.key],end:event.target.value}}));setPreview(null);}}/></div>:null}</fieldset>)}</section>:null}
          {catalog?.import_history?.length ? <details className="space-y-2 text-xs"><summary className="cursor-pointer font-semibold">Recent imports · {catalog.import_history.length}</summary>{catalog.import_history.map(item => <p key={item.id}>{item.fileName} · {new Date(item.createdAt).toLocaleString()} · {item.outcomes.reduce((sum,outlet) => sum + outlet.assignments,0)} assignments</p>)}</details> : null}
          {preview ? <>
            {preview.resolved.length ? <p className="rounded bg-emerald-50 p-3 text-xs">{preview.resolved.length} duplicate rows and explicit destination records reconciled automatically.</p>:null}
            {preview.issues.length ? <section className="space-y-2"><h3 className="text-sm font-semibold">Needs attention</h3><ul className="space-y-2">{Object.values(preview.issues.reduce<Record<string, {message: string; count: number}>>((groups, issue) => {
              const key = `${issue.sheet}:${issue.employee ?? ""}:${issue.reason}`;
              if (groups[key]) groups[key].count++; else groups[key] = {message:issue.message,count:1};
              return groups;
            }, {})).map((issue,index) => <li key={index} className="rounded-[var(--sb-radius-control)] bg-amber-50 p-2 text-xs text-amber-950">{issue.message}{issue.count > 1 ? ` (${issue.count} source items)` : ""}</li>)}</ul></section> : null}
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
            {preview.untimedDuties.length ? <p className="rounded border p-3 text-xs">{preview.untimedDuties.length} named duties for fingerprint-exempt employees will be kept as roster notes, with no assumed hours.</p>:null}
            {preview.notes.length ? <details className="space-y-2 text-xs"><summary className="cursor-pointer font-semibold">Workbook remarks · {preview.notes.length}</summary><p className="text-muted-foreground">Review each sheet’s written notes. Referenced dates, replacement leave and balances stay separate; colours do not change written shift times.</p><ul className="space-y-2">{preview.notes.map(note => <li key={`${note.sheet}:${note.range}`} className="rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] p-2"><strong>{/^rgb:[0-9a-f]{8}$/i.test(note.fill) ? <span aria-label="Source fill colour" className="mr-2 inline-block h-3 w-3 rounded-sm border border-black/20 align-middle" style={{backgroundColor:`#${note.fill.slice(-6)}`}}/> : null}{note.sheet} · {note.range}</strong><p className="mt-1 whitespace-pre-wrap break-words">{note.text}</p>{note.columnHeaders.length ? <p className="mt-1 text-muted-foreground">Source column dates: {note.columnHeaders.join(", ")}</p> : null}{note.relatedCells.length ? <p className="mt-1 text-muted-foreground">Same colour in these columns: {note.relatedCells.join(", ")} · confirm the relationship</p> : null}</li>)}</ul></details> : null}
            {preview.notices.length ? <details className="text-xs"><summary className="cursor-pointer font-medium">Workbook notices</summary><ul className="mt-2 space-y-1 text-muted-foreground">{preview.notices.map(notice => <li key={notice}>{notice}</li>)}</ul></details> : null}
            <section className="overflow-hidden rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)]"><div className="divide-y divide-[var(--sb-border-soft)]">{preview.outlets.map((outlet) => { const issues = outletIssues(outlet.branchName), existing = catalog?.current_assignments.filter(a=>String(a.branch_id)===outlet.branchId) ?? [], immutable = ["published", "locked", "submitted"].includes(outlet.status); return <div key={outlet.branchId} className="grid gap-x-3 gap-y-1 px-3 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_7rem_12rem] sm:items-center"><label className="flex min-w-0 items-center gap-2"><input type="checkbox" aria-label={`Import ${outlet.branchName}`} disabled={busy || outcomes[outlet.branchId]?.status === "imported" || !importable.some(item => item.branchId === outlet.branchId)} checked={selectedOutlets.includes(outlet.branchId)} onChange={event => setSelectedOutlets(current => event.target.checked ? [...current,outlet.branchId] : current.filter(id => id !== outlet.branchId))}/><strong className="break-words">{outlet.branchName}</strong></label><span className="tabular-nums sm:text-right">{importable.find(item => item.branchId === outlet.branchId)?.assignments.length ?? 0} assignments to save</span><span className={issues.length || immutable ? "text-amber-800" : existing.length ? "text-muted-foreground" : "text-[var(--sb-success)]"}>{immutable ? `${outlet.status} · unchanged` : existing.length ? "Review draft changes below" : issues.length ? `Partial draft · ${issues.length} to review` : "Ready"}</span></div>; })}</div></section>
            <details className="space-y-2"><summary className="cursor-pointer text-sm font-semibold">View {preview.assignmentCount} recognised assignments</summary><div className="max-h-72 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Employee / date</th><th className="p-2">Current</th><th className="p-2">Workbook</th></tr></thead><tbody>{preview.outlets.flatMap(outlet=>outlet.assignments.map((assignment,index)=>{const current=catalog?.current_assignments.find(a=>String(a.staff_id)===assignment.staff_id&&String(a.work_date)===assignment.work_date);return <tr className="border-t" key={`${outlet.branchId}:${index}`}><td className="p-2"><label className="flex items-start gap-2"><input type="checkbox" aria-label={`Include ${catalog?.staff.find(p=>p.id===assignment.staff_id)?.name} ${assignment.work_date}`} disabled={busy || !catalog || !["new","update"].includes(scheduleImportDisposition(outlet.branchId,assignment,catalog)) || ["published","locked","submitted"].includes(outlet.status) || outcomes[outlet.branchId]?.status === "imported"} checked={Boolean(catalog&&["new","update"].includes(scheduleImportDisposition(outlet.branchId,assignment,catalog))) && !excludedRows.includes(rowKey(outlet.branchId,assignment.staff_id,assignment.work_date))} onChange={event => {const key=rowKey(outlet.branchId,assignment.staff_id,assignment.work_date);setExcludedRows(rows => event.target.checked ? rows.filter(row => row !== key) : [...rows,key]);}}/><span>{catalog?.staff.find(p=>p.id===assignment.staff_id)?.name}</span></label><br/>{assignment.work_date}</td><td className="p-2">{current ? `${String(current.assignment_kind)} ${String(current.custom_start??"")}–${String(current.custom_end??"")}` : "No assignment"}</td><td className="p-2">{assignment.assignment_kind} {assignment.custom_start} {assignment.custom_end ? `– ${assignment.custom_end}` : ""}<br/>{outlet.branchName}</td></tr>}))}</tbody></table></div></details>

          </> : null}
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sb-border-soft)] p-4"><p className="basis-full text-xs text-muted-foreground">Only reviewed employee days are saved. Existing drafts may be revised; published and locked schedules are protected.</p>{step>1?<Button variant="outline" disabled={busy} onClick={()=>setStep(step===3?2:1)}>Back</Button>:<span/>}{step===1?<Button disabled={busy || !source.length || !catalog} onClick={async()=>{if(!preview)await recheck();setStep(2);}}>Continue to fix import</Button>:step===2?<div className="flex gap-2"><Button variant="outline" disabled={busy || !source.length} onClick={()=>void recheck()}>Check changes</Button><Button disabled={busy || !preview} onClick={()=>setStep(3)}>Review import</Button></div>:<Button disabled={busy || !pendingSelected.length} onClick={()=>void confirm()}><Upload className="h-4 w-4"/>{busy?"Importing…":`Import ${pendingSelected.length} draft outlets`}</Button>}</footer>
      </div>
    </dialog>
    <dialog ref={otDialog} aria-labelledby="import-ot-title" className="fixed left-1/2 top-1/2 m-0 max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[var(--sb-panel-radius)] border-0 bg-white p-4 shadow-xl backdrop:bg-black/50">
      <div className="space-y-4"><h2 id="import-ot-title" className="text-base font-semibold">OT · special conditions</h2><p className="text-sm">{otEditing?.employee} · {otEditing?.date}</p><p className="rounded bg-amber-50 p-3 text-xs">Source: {otEditing?.value}</p>
        <SelectControl ariaLabel="OT schedule handling" portalContainer={otDialog.current} value={otInput.kind} options={otEditing?.noteOnly?[{value:"separate",label:"Record instructions; handle separately"}]:[{value:"shift",label:"Enter planned working time"},{value:"off",label:"Confirm a full rest day"},{value:"ro",label:"Confirm a full replacement-off day"},{value:"separate",label:"Keep existing schedule; handle separately"}]} onValueChange={value=>setOtInput(current=>({...current,kind:value as ScheduleOtResolution["kind"]}))}/>
        {otInput.kind==="shift"?<div className="grid grid-cols-2 gap-3"><TimeSelect label="Check in" portalContainer={otDialog.current} value={otInput.start??""} onChange={start=>setOtInput(current=>({...current,start}))}/><TimeSelect label="Check out" portalContainer={otDialog.current} value={otInput.end??""} onChange={end=>setOtInput(current=>({...current,end}))}/><label className="grid gap-1 text-xs">Break (minutes)<Input type="number" min={0} max={720} value={otInput.breakMinutes??0} onChange={event=>setOtInput(current=>({...current,breakMinutes:Number(event.target.value)}))}/></label><label className="grid gap-1 text-xs">Paid time limit (minutes)<Input type="number" min={1} max={1440} value={otInput.capMinutes??0} onChange={event=>setOtInput(current=>({...current,capMinutes:Number(event.target.value)}))}/></label></div>:null}
        <label className="grid gap-1 text-xs">Special conditions / instructions<textarea className="min-h-24 rounded border p-2" maxLength={1000} value={otInput.reason} onChange={event=>setOtInput(current=>({...current,reason:event.target.value}))}/></label><p className="text-xs text-muted-foreground">This confirms the planned schedule only. OT claims and approved RO balance adjustments still follow their attendance approval workflow.</p>
        <p role="status" className="text-xs text-amber-800">{otInput.reason.trim()?otError:null}</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>otDialog.current?.close()}>Cancel</Button><Button disabled={Boolean(otError)} onClick={()=>{if(!otEditing)return;setOtResolutions(current=>({...current,[otEditing.key]:otInput}));setPreview(null);setMessage("OT instructions saved for this employee/date. Check changes before importing.");otDialog.current?.close();}}>Confirm this case</Button></div>
      </div>
    </dialog>
  </>;
}
