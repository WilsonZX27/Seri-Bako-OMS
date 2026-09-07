"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { parseCsv, parseXlsx } from "@/components/imports/import-workflow";
import { detectParserProfile, inferTimecardWeek, parsePunchRows, parseReportRows, parseTimecardRows, validateHeaders, type ParserProfile, type ParsedRow } from "@/lib/attendance/ngteco";
import { sha256Hex } from "@/lib/attendance/ngteco";

function currentMalaysiaWeekStart(){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());const date=new Date(`${parts}T00:00:00Z`);const offset=(date.getUTCDay()+6)%7;date.setUTCDate(date.getUTCDate()-offset);return date.toISOString().slice(0,10);}
function addDays(day:string,amount:number){const date=new Date(`${day}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10)}
function displayDate(day:string){return new Intl.DateTimeFormat("en-MY",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"}).format(new Date(`${day}T00:00:00Z`))}

type StaffOption = { id: string; full_name: string; staff_code: string | null };
const normalizedName = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleUpperCase("en-MY");

export function AttendanceImportWorkflow({ staffs = [], mappedPersonIds = [], mappedSources = [], canMap = false }: { staffs?: StaffOption[]; mappedPersonIds?: string[]; mappedSources?: string[]; canMap?: boolean }) {
  const [profile, setProfile] = useState<ParserProfile>("view_attendance_punch");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [fileHash,setFileHash]=useState("");
  const [saving,setSaving]=useState(false);
  const [weekStart,setWeekStart]=useState(currentMalaysiaWeekStart());
  const [knownPersonIds,setKnownPersonIds]=useState(mappedPersonIds);
  const errors = useMemo(() => rows.reduce((sum, row) => sum + row.errors.length, 0), [rows]);
  const warnings = useMemo(() => rows.reduce((sum, row) => sum + row.warnings.length, 0), [rows]);
  const validMonday = /^\d{4}-\d{2}-\d{2}$/.test(weekStart) && new Date(`${weekStart}T00:00:00Z`).getUTCDay() === 1;
  const uniqueStaffByName = useMemo(() => { const grouped = new Map<string, StaffOption[]>(); for (const staff of staffs) { const key = normalizedName(staff.full_name); grouped.set(key, [...(grouped.get(key) ?? []), staff]); } return grouped; }, [staffs]);
  const suggestions = useMemo(() => { const known = new Set(knownPersonIds); const seen = new Set<string>(); return rows.flatMap(row => { const personId = row.values["Person ID"]?.trim(); const personName = row.values["Person Name"]?.trim(); if (!personId || !personName || known.has(personId) || seen.has(personId)) return []; seen.add(personId); const matches = uniqueStaffByName.get(normalizedName(personName)) ?? []; return matches.length === 1 ? [{ personId, personName, staff: matches[0] }] : []; }); }, [knownPersonIds, rows, uniqueStaffByName]);
  const unmappedPersonIds = useMemo(() => profile !== "attendance_report" ? [...new Set(rows.map(row => row.values["Person ID"]?.trim()).filter(Boolean))].filter(id => !knownPersonIds.includes(id)) : [], [knownPersonIds, profile, rows]);
  const autoMatchedPersonIds = useMemo(() => new Set(suggestions.map((item) => item.personId)), [suggestions]);
  const unmatchedEmployees = useMemo(() => unmappedPersonIds.filter((id) => !autoMatchedPersonIds.has(id)), [autoMatchedPersonIds, unmappedPersonIds]);
  const unmappedSources = useMemo(() => profile === "view_attendance_punch" ? [...new Set(rows.map(row => row.values.Source?.trim()).filter(Boolean))].filter(source => !mappedSources.includes(source)) : [], [mappedSources, profile, rows]);
  const usableTimecardRows = useMemo(() => profile === "timecard_report" ? rows.filter(row => row.values["Clock In"]?.trim() || row.values["Clock Out"]?.trim()).length : rows.length, [profile, rows]);
  const importableRows = useMemo(() => rows.filter(row => !row.errors.length && (profile !== "timecard_report" || row.values["Clock In"]?.trim() || row.values["Clock Out"]?.trim())), [profile, rows]);
  const excludedRows = rows.length - importableRows.length;

  async function load(file?: File) {
    if (!file) return;
    setFileName(file.name);
    try {
      const parsed = file.name.toLowerCase().endsWith(".xlsx") ? await parseXlsx(file) : parseCsv(await file.text());
      setFileHash(await sha256Hex(await file.arrayBuffer()));
      const detected = detectParserProfile(parsed.headers);
      const missing = validateHeaders(detected, parsed.headers);
      setProfile(detected);
      if (missing.length) { setRows([]); setMessage(`Missing required columns: ${missing.join(", ")}`); return; }
      const inferredWeek = detected === "timecard_report" ? inferTimecardWeek(parsed.dataRows) : null;
      if (detected === "timecard_report" && !inferredWeek) { setRows([]); setMessage("This Timecard Report contains invalid dates or more than one attendance week. Export and upload one week at a time."); return; }
      if (inferredWeek) setWeekStart(inferredWeek);
      const next = detected === "view_attendance_punch" ? parsePunchRows(parsed.dataRows) : detected === "timecard_report" ? parseTimecardRows(parsed.dataRows) : parseReportRows(parsed.dataRows);
      setRows(next);
      const label=detected === "view_attendance_punch" ? "View Attendance Punch" : detected === "timecard_report" ? "Timecard Report" : "Attendance Report";
      setMessage(`${next.length} rows previewed from ${label}. No records changed.`);
    } catch { setRows([]); setMessage("This file could not be parsed. Use the original NGTeco CSV/XLSX export."); }
  }

  async function confirm(){setSaving(true);try{for(const suggestion of suggestions){const mappingResponse=await fetch("/api/attendance/mappings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"person",personId:suggestion.personId,staffId:suggestion.staff.id,active:true})});if(!mappingResponse.ok)throw new Error("automatic employee match failed");}const response=await fetch("/api/attendance/imports/confirm",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({profile,weekStart,fileName,fileHash,rows:importableRows.map(row=>row.values)})});const result=await response.json() as {ok:boolean;message:string};setKnownPersonIds(current=>[...new Set([...current,...suggestions.map(suggestion=>suggestion.personId)])]);setMessage(result.ok&&excludedRows?`${result.message} ${excludedRows} incomplete or invalid rows were excluded for review.`:result.message);}catch{setMessage("Attendance import could not be finalised. Preview remains available.");}finally{setSaving(false)}}

  return <div className="space-y-4">
    <section className="sb-work-surface p-3">
      <div className="grid min-w-0 gap-3 md:items-start lg:grid-cols-[minmax(14rem,1fr)_minmax(13rem,0.7fr)_minmax(17rem,1fr)] lg:items-end">
        <div className="self-center"><h2 className="text-sm font-semibold">Import attendance file</h2></div>
        <div><p className="text-xs font-medium">Attendance week</p><p className="mt-1 flex h-10 items-center rounded-[var(--sb-radius-control)] border bg-[var(--sb-surface-muted)] px-3 text-xs font-semibold tabular-nums">{displayDate(weekStart)} – {displayDate(addDays(weekStart,6))}</p></div>
        <label className="grid gap-1 text-xs font-medium"><span>Upload NGTeco CSV or XLSX</span><Input type="file" accept=".csv,.xlsx" onChange={(event) => void load(event.currentTarget.files?.[0])}/></label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground" role="status">{message}</p>{profile==="view_attendance_punch"&&rows.length?<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--sb-border-soft)] pt-3 text-xs"><span><strong>{suggestions.length}</strong> employees matched automatically · <strong>{unmatchedEmployees.length}</strong> names need correction · <strong>{unmappedSources.length}</strong> unmapped devices</span><span className="text-muted-foreground">Employee names must uniquely match an active OMS employee.</span></div>:null}
    </section>
    {fileName ? <section className="sb-work-surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--sb-border-soft)] px-3 py-2"><FileSpreadsheet className="h-4 w-4"/><strong className="min-w-0 truncate text-sm">{fileName}</strong><StatusBadge status={profile}/><span className="ml-auto text-xs text-muted-foreground">{rows.length} rows · {errors} errors · {warnings} warnings</span></div>
      <div className="max-h-[32rem] overflow-auto"><table className="w-full min-w-[48rem] text-left text-xs"><thead className="sticky top-0 bg-[var(--sb-surface-muted)]"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Person ID</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Date / period</th><th className="px-3 py-2">Time / work</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Validation</th></tr></thead><tbody>{rows.map((row)=><tr key={row.rowNumber} className="border-t border-[var(--sb-border-soft)]"><td className="px-3 py-2 tabular-nums">{row.rowNumber}</td><td className="px-3 py-2 font-medium">{row.values["Person ID"]}</td><td className="px-3 py-2">{row.values["Person Name"]||"—"}</td><td className="px-3 py-2 tabular-nums">{row.values["Punch Date"]||row.values.Date}</td><td className="px-3 py-2 tabular-nums">{profile==="timecard_report"?`${row.values["Clock In"]||"—"} → ${row.values["Clock Out"]||"—"}`:row.values["Attendance record"]||row.values["Total Work Hours(h)"]||"—"}</td><td className="px-3 py-2">{profile==="timecard_report"?"Timecard Report":row.values.Source||"—"}</td><td className="px-3 py-2">{row.errors.length?<span className="inline-flex gap-1 text-destructive"><AlertTriangle className="h-3.5 w-3.5"/>{row.errors.join("; ")}</span>:row.warnings.length?<span className="inline-flex gap-1 text-amber-800"><AlertTriangle className="h-3.5 w-3.5"/>{row.warnings.join("; ")}</span>:<span className="inline-flex gap-1 text-[var(--sb-success)]"><CheckCircle2 className="h-3.5 w-3.5"/>Ready</span>}</td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--sb-border-soft)] p-3"><p className="text-xs text-muted-foreground">{!validMonday?"The file must resolve to one Monday–Sunday attendance week.":unmatchedEmployees.length?"Correct employee names that do not uniquely match OMS.":unmappedSources.length?"Map each NGTeco device source to its outlet.":excludedRows?`${importableRows.length} rows will import · ${excludedRows} incomplete or invalid rows will be excluded for review.`:"Employees will be matched automatically when you confirm."}</p><Button disabled={!rows.length||!usableTimecardRows||!importableRows.length||saving||!validMonday||unmatchedEmployees.length>0||unmappedSources.length>0||!canMap} onClick={()=>void confirm()}><Upload className="mr-2 h-4 w-4"/>{saving?"Finalising…":"Confirm import"}</Button></div>
    </section>:null}
  </div>;
}
