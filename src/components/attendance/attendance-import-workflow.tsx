"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { parseCsv, parseXlsx } from "@/components/imports/import-workflow";
import { parsePunchRows, parseReportRows, validateHeaders, type ParserProfile, type ParsedRow } from "@/lib/attendance/ngteco";
import { sha256Hex } from "@/lib/attendance/ngteco";

function currentMalaysiaWeekStart(){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());const date=new Date(`${parts}T00:00:00Z`);const offset=(date.getUTCDay()+6)%7;date.setUTCDate(date.getUTCDate()-offset);return date.toISOString().slice(0,10);}

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
  const unmappedPersonIds = useMemo(() => profile === "view_attendance_punch" ? [...new Set(rows.map(row => row.values["Person ID"]?.trim()).filter(Boolean))].filter(id => !knownPersonIds.includes(id)) : [], [knownPersonIds, profile, rows]);
  const unmappedSources = useMemo(() => profile === "view_attendance_punch" ? [...new Set(rows.map(row => row.values.Source?.trim()).filter(Boolean))].filter(source => !mappedSources.includes(source)) : [], [mappedSources, profile, rows]);

  async function load(file?: File) {
    if (!file) return;
    setFileName(file.name);
    try {
      const parsed = file.name.toLowerCase().endsWith(".xlsx") ? await parseXlsx(file) : parseCsv(await file.text());
      setFileHash(await sha256Hex(await file.arrayBuffer()));
      const detected: ParserProfile = parsed.headers.includes("Punch Date") ? "view_attendance_punch" : "attendance_report";
      const missing = validateHeaders(detected, parsed.headers);
      setProfile(detected);
      if (missing.length) { setRows([]); setMessage(`Missing required columns: ${missing.join(", ")}`); return; }
      const next = detected === "view_attendance_punch" ? parsePunchRows(parsed.dataRows) : parseReportRows(parsed.dataRows);
      setRows(next);
      setMessage(`${next.length} rows previewed from ${detected === "view_attendance_punch" ? "View Attendance Punch" : "Attendance Report"}. No records changed.`);
    } catch { setRows([]); setMessage("This file could not be parsed. Use the original NGTeco CSV/XLSX export."); }
  }

  async function confirm(){setSaving(true);try{const response=await fetch("/api/attendance/imports/confirm",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({profile,weekStart,fileName,fileHash,rows:rows.map(row=>row.values)})});const result=await response.json() as {ok:boolean;message:string};setMessage(result.message);}catch{setMessage("Attendance import could not be finalised. Preview remains available.");}finally{setSaving(false)}}
  async function acceptNameMatches(){setSaving(true);try{for(const suggestion of suggestions){const response=await fetch("/api/attendance/mappings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"person",personId:suggestion.personId,staffId:suggestion.staff.id,active:true})});if(!response.ok)throw new Error();}setKnownPersonIds(current=>[...new Set([...current,...suggestions.map(suggestion=>suggestion.personId)])]);setMessage(`${suggestions.length} exact unique name ${suggestions.length===1?"match":"matches"} linked to existing staff accounts. Your preview is still ready.`);}catch{setMessage("Name matches could not be saved. Review them in Person ID mappings.");}finally{setSaving(false)}}

  return <div className="space-y-4">
    <section className="sb-work-surface p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div><h2 className="text-sm font-semibold">NGTeco import preview</h2><p className="mt-1 text-xs text-muted-foreground">Punch events calculate attendance. Attendance Report totals are reconciliation-only.</p></div>
        <div className="grid min-w-0 gap-3 md:w-80"><label className="grid gap-1.5 text-xs font-medium"><span>Monday week start</span><Input type="date" value={weekStart} onChange={event=>setWeekStart(event.currentTarget.value)}/></label><label className="grid gap-1.5 text-xs font-medium"><span>Upload CSV or XLSX</span><Input type="file" accept=".csv,.xlsx" onChange={(event) => void load(event.currentTarget.files?.[0])}/></label></div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground" role="status">{message}</p>{profile==="view_attendance_punch"&&rows.length?<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--sb-border-soft)] pt-3 text-xs"><span><strong>{unmappedPersonIds.length}</strong> unmapped people · <strong>{unmappedSources.length}</strong> unmapped devices</span>{canMap&&suggestions.length?<Button size="sm" variant="outline" disabled={saving} onClick={()=>void acceptNameMatches()}>Accept {suggestions.length} exact name {suggestions.length===1?"match":"matches"}</Button>:null}<span className="text-muted-foreground">Names assist matching only when exactly one staff account matches; Person ID remains the stored identity.</span></div>:null}
    </section>
    {fileName ? <section className="sb-work-surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--sb-border-soft)] px-3 py-2"><FileSpreadsheet className="h-4 w-4"/><strong className="min-w-0 truncate text-sm">{fileName}</strong><StatusBadge status={profile}/><span className="ml-auto text-xs text-muted-foreground">{rows.length} rows · {errors} errors · {warnings} warnings</span></div>
      <div className="max-h-[32rem] overflow-auto"><table className="w-full min-w-[48rem] text-left text-xs"><thead className="sticky top-0 bg-[var(--sb-surface-muted)]"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Person ID</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Date / period</th><th className="px-3 py-2">Time / work</th><th className="px-3 py-2">Device</th><th className="px-3 py-2">Validation</th></tr></thead><tbody>{rows.map((row)=><tr key={row.rowNumber} className="border-t border-[var(--sb-border-soft)]"><td className="px-3 py-2 tabular-nums">{row.rowNumber}</td><td className="px-3 py-2 font-medium">{row.values["Person ID"]}</td><td className="px-3 py-2">{row.values["Person Name"]||"—"}</td><td className="px-3 py-2 tabular-nums">{row.values["Punch Date"]||row.values.Date}</td><td className="px-3 py-2 tabular-nums">{row.values["Attendance record"]||row.values["Total Work Hours(h)"]||"—"}</td><td className="px-3 py-2 font-mono">{row.values.Source||"—"}</td><td className="px-3 py-2">{row.errors.length?<span className="inline-flex gap-1 text-destructive"><AlertTriangle className="h-3.5 w-3.5"/>{row.errors.join("; ")}</span>:<span className="inline-flex gap-1 text-[var(--sb-success)]"><CheckCircle2 className="h-3.5 w-3.5"/>Ready</span>}</td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--sb-border-soft)] p-3"><p className="text-xs text-muted-foreground">{!validMonday?"Select a Monday as the week start.":unmappedPersonIds.length||unmappedSources.length?"Complete person and device mappings before confirmation.":"Confirmation stores immutable source rows and a file hash."}</p><Button disabled={!rows.length||errors>0||saving||!validMonday||unmappedPersonIds.length>0||unmappedSources.length>0} onClick={()=>void confirm()}><Upload className="mr-2 h-4 w-4"/>{saving?"Finalising…":"Confirm import"}</Button></div>
    </section>:null}
  </div>;
}
