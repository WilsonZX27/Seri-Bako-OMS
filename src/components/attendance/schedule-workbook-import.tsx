"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readJsonResponse } from "@/lib/http/read-json-response";
import { parseScheduleWorkbook, type ScheduleImportCatalog, type ScheduleWorkbookPreview } from "@/lib/attendance/schedule-workbook";

const SHEET_FOR_BRANCH: Record<string, string> = {
  "Gurney Plaza": "GURNEY PLAZA", "Queensbay Mall": "QUEENSBAY", "Kwan Kee @ Publika": "PUBLIKA", "IOI Mall Puchong": "IOI PUCHONG", "Jakel Mall": "JAKEL SQUARE", TRX: "TRX", "Kwan Kee Store @ Petaling Street": "PETALING STREET", "Kwan Kee Store @ Sunway Pyramid": "SUNWAY PYRAMID", "Kwan Kee Store @ Mid Valley": "MID VALLEY", "Kwan Kee Store @ Sunway Velocity": "VELOCITY",
};

export function ScheduleWorkbookImport({ weekStart, canDraft }: { weekStart: string; canDraft: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<ScheduleWorkbookPreview | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null);
  if (!canDraft) return null;
  const outletIssues = (branchName: string) => preview?.issues.filter((issue) => issue.sheet === SHEET_FOR_BRANCH[branchName]) ?? [];
  const importable = preview?.outlets.filter((outlet) => !["published", "locked", "submitted"].includes(outlet.status) && outlet.assignments.length) ?? [];
  async function load(file?: File) {
    if (!file) return;
    setBusy(true); setMessage("Checking the workbook against current OMS staff and outlets…"); setPreview(null);
    try {
      const response = await fetch(`/api/attendance/schedule/import-catalog?week=${encodeURIComponent(weekStart)}`);
      const catalog = await readJsonResponse<ScheduleImportCatalog & { ok?: boolean; message?: string }>(response, { unexpectedResponse: "The schedule catalog returned an unexpected response." });
      if (!response.ok) throw new Error(catalog.message ?? "The schedule catalog could not be loaded.");
      const result = await parseScheduleWorkbook(file, weekStart, catalog);
      setPreview(result);
      setMessage(result.issues.length ? `${result.assignmentCount} safe assignments are readable. ${result.issues.length} source item${result.issues.length === 1 ? " will" : "s will"} remain empty for correction in the partial drafts.` : `${result.assignmentCount} assignments are ready for draft import.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The workbook could not be read."); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!preview || !importable.length) return;
    setBusy(true); setMessage(`Importing ${importable.length} verified outlet draft${importable.length === 1 ? "" : "s"}…`);
    try {
      const response = await fetch("/api/attendance/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "import_drafts", weekStart, fileName: preview.fileName, fileHash: preview.fileHash, outlets: importable.map((outlet) => ({ branch_id: outlet.branchId, assignments: outlet.assignments })), unresolvedCount: 0, sourceMetadata: { source: "schedule_workbook_ui", parserVersion: 5, sourceIssues: preview.issues, importedOutlets: importable.map((outlet) => outlet.branchName) } }) });
      const result = await readJsonResponse<{ ok: boolean; message?: string }>(response, { unexpectedResponse: "The schedule import returned an unexpected response." });
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Schedule drafts could not be imported.");
      setMessage(`${importable.length} outlet draft${importable.length === 1 ? " was" : "s were"} imported. Published rosters were unchanged; source issues remain empty and auditable.`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No schedule drafts were imported."); }
    finally { setBusy(false); }
  }
  return <>
    <section className="sb-work-surface flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Schedule workbook</h2><p className="mt-0.5 text-xs text-muted-foreground">Preview the company workbook against live staff, outlets and existing week status before anything changes.</p></div>
      <Button size="sm" variant="outline" onClick={() => dialog.current?.showModal()}><FileSpreadsheet className="h-4 w-4"/>Import workbook</Button>
    </section>
    <dialog ref={dialog} className="m-auto max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-[var(--sb-panel-radius)] border-0 bg-white p-0 shadow-2xl backdrop:bg-black/55">
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex items-start gap-3 border-b border-[var(--sb-border-soft)] p-4"><div className="min-w-0 flex-1"><h2 className="text-base font-semibold">Import schedule workbook</h2><p className="mt-1 text-xs text-muted-foreground">Week {weekStart}. This preview fails closed: unclear times, HR instructions and published rosters are never overwritten.</p></div><Button size="icon" variant="ghost" aria-label="Close schedule import" onClick={() => dialog.current?.close()}><X className="h-4 w-4"/></Button></header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <label className="grid gap-1 text-xs font-medium"><span>Seri Bako schedule workbook (.xlsx)</span><Input type="file" accept=".xlsx" disabled={busy} onChange={(event) => void load(event.currentTarget.files?.[0])}/></label>
          {message ? <p role="status" className="rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] p-3 text-xs">{message}</p> : null}
          {preview ? <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Safe assignments" value={preview.assignmentCount}/><Metric label="Draft outlets" value={importable.length}/><Metric label="Needs review" value={preview.issues.length}/><Metric label="Workbook SHA" value={preview.fileHash.slice(0, 8)}/></div>
            <section className="overflow-hidden rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)]"><div className="divide-y divide-[var(--sb-border-soft)]">{preview.outlets.map((outlet) => { const issues = outletIssues(outlet.branchName), immutable = ["published", "locked", "submitted"].includes(outlet.status); return <div key={outlet.branchId} className="grid gap-1 px-3 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><strong className="truncate">{outlet.branchName}</strong><span className="tabular-nums">{outlet.assignments.length} assignments</span><span className={issues.length || immutable ? "text-amber-800" : "text-[var(--sb-success)]"}>{immutable ? `${outlet.status} · unchanged` : issues.length ? `Partial draft · ${issues.length} to review` : "Ready"}</span></div>; })}</div></section>
            {preview.issues.length ? <section><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Source items requiring a decision</h3><ul className="mt-2 space-y-2">{preview.issues.map((issue, index) => <li key={`${issue.sheet}:${issue.employee}:${issue.date}:${index}`} className="rounded-[var(--sb-radius-control)] bg-amber-50 p-2 text-xs text-amber-950">{issue.message}</li>)}</ul></section> : null}
          </> : null}
        </div>
        <footer className="flex flex-wrap items-center gap-3 border-t border-[var(--sb-border-soft)] p-4"><p className="min-w-0 flex-1 text-xs text-muted-foreground">Safe rows enter a draft; flagged cells stay empty for correction. Existing published schedules require an audited correction.</p><Button disabled={busy || !importable.length} onClick={() => void confirm()}><Upload className="h-4 w-4"/>{busy ? "Working…" : `Import ${importable.length} draft outlet${importable.length === 1 ? "" : "s"}`}</Button></footer>
      </div>
    </dialog>
  </>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] p-2"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold tabular-nums">{value}</p></div>; }
