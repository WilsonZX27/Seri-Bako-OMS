"use client";

import { useState, type DragEvent } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileSpreadsheet, LoaderCircle, RotateCcw, ShieldCheck, Upload, X } from "lucide-react";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/system-states";
import { readJsonResponse } from "@/lib/http/read-json-response";
import { parseAutoCountWorkbook } from "@/lib/imports/autocount-xlsx";
import type { AutoCountIssue, AutoCountParsedFile } from "@/lib/imports/autocount";

type Summary = {
  files: number;
  supplierSources: number;
  itemSources: number;
  locationSources: number;
  suppliers: number;
  items: number;
  branchMappings: number;
  uomConversions: number;
  inventoryMovements: number;
};
type PreviewResponse = { ok: boolean; message?: string; jobId?: string; status?: string; summary?: Summary; blockingIssues?: string[]; issueDetails?: AutoCountIssue[]; warnings?: string[]; reused?: boolean };
type ConfirmResult = Record<string, number>;

const typeLabels = { supplier_list: "Supplier List", item_list: "Item List", location_snapshot: "Location Snapshot" } as const;

function mergeSelectedFiles(current: AutoCountParsedFile[], incoming: AutoCountParsedFile[]) {
  const next = new Map(current.map((file) => [file.hash, file]));
  let duplicates = 0;
  let replaced = 0;
  for (const file of incoming) {
    if (next.has(file.hash)) {
      duplicates += 1;
      continue;
    }
    if (file.type !== "location_snapshot") {
      for (const [hash, existing] of next) {
        if (existing.type === file.type) {
          next.delete(hash);
          replaced += 1;
        }
      }
    }
    next.set(file.hash, file);
  }
  return { files: [...next.values()], duplicates, replaced };
}

function warningSummary(warnings: string[]) {
  const missingSupplier = warnings.reduce((total, warning) => {
    const match = warning.match(/:\s*(\d+)\s+items?\s+(?:has|have)\s+no Main Supplier/i);
    return total + (match ? Number(match[1]) : 0);
  }, 0);
  const conversionWarnings = warnings.filter((warning) => warning.includes("no trustworthy conversion"));
  return { missingSupplier, conversionWarnings, otherCount: Math.max(warnings.length - conversionWarnings.length, 0) };
}

export function AutoCountImportWorkflow() {
  const [files, setFiles] = useState<AutoCountParsedFile[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectionNote, setSelectionNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<"parsing" | "preview" | "confirm" | null>(null);
  const [dragActive, setDragActive] = useState(false);

  async function selectFiles(selected: FileList | File[] | null) {
    if (!selected?.length) return;
    setBusy("parsing"); setMessage(null); setSelectionNote(null); setPreview(null); setResult(null);
    try {
      const parsed = await Promise.all(Array.from(selected).map(parseAutoCountWorkbook));
      const merged = mergeSelectedFiles(files, parsed);
      setFiles(merged.files);
      const notes = [
        merged.replaced ? `${merged.replaced} earlier Supplier or Item export${merged.replaced === 1 ? " was" : "s were"} replaced by the newer selection.` : null,
        merged.duplicates ? `${merged.duplicates} duplicate file${merged.duplicates === 1 ? " was" : "s were"} skipped.` : null,
      ].filter(Boolean);
      if (notes.length) setSelectionNote(notes.join(" "));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read the selected workbooks.");
    } finally { setBusy(null); }
  }

  async function createPreview() {
    setBusy("preview"); setMessage(null); setResult(null);
    try {
      const response = await fetch("/api/imports/autocount/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files }) });
      const payload = await readJsonResponse<PreviewResponse>(response, {
        sessionExpired: "Your session expired. Sign in again, then retry Review import; your selected files remain here.",
        unexpectedResponse: `The import service returned an unexpected response (${response.status}). Retry; no OMS records were changed.`,
      });
      if (!response.ok || !payload.ok) throw new Error(payload.message ?? "Could not prepare the import preview.");
      setPreview(payload);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not prepare the import preview."); }
    finally { setBusy(null); }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    if (!busy) void selectFiles(event.dataTransfer.files);
  }

  function removeFile(hash: string) {
    setFiles((current) => current.filter((file) => file.hash !== hash));
    setPreview(null);
    setResult(null);
    setMessage(null);
    setSelectionNote(null);
  }

  async function confirmImport() {
    if (!preview?.jobId) return;
    setBusy("confirm"); setMessage(null);
    try {
      const response = await fetch("/api/imports/autocount/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: preview.jobId }) });
      const payload = await readJsonResponse<{ ok: boolean; message?: string; result?: ConfirmResult }>(response, {
        sessionExpired: "Your session expired. Sign in again, then retry confirmation; the prepared preview remains available.",
        unexpectedResponse: `The import service returned an unexpected response (${response.status}). Retry confirmation; no duplicate import was created.`,
      });
      if (!response.ok || !payload.ok) throw new Error(payload.message ?? "The import could not be confirmed.");
      setResult(payload.result ?? {});
    } catch (error) { setMessage(error instanceof Error ? error.message : "The import could not be confirmed."); }
    finally { setBusy(null); }
  }

  const blockers = preview?.blockingIssues ?? [];
  const issueDetails = preview?.issueDetails ?? [];
  const missingItemRecords = issueDetails.filter((issue) => issue.code === "missing_item_list_record");
  const alreadyCompleted = preview?.status === "completed";
  const retryConfirm = Boolean(preview?.jobId && message && !alreadyCompleted);
  const warnings = preview?.warnings ?? [];
  const warningGroups = warningSummary(warnings);
  const rail = (
    <>
      <ConsoleSection title="Actions">
        <div className="grid gap-2">
          {!preview ? (
          <Button type="button" className="w-full" onClick={createPreview} disabled={!files.length || Boolean(busy)} data-mobile-primary-action>
            {busy === "preview" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Review import
          </Button>
        ) : (
          <Button type="button" className="w-full" onClick={confirmImport} disabled={!preview.jobId || blockers.length > 0 || Boolean(busy) || Boolean(result) || alreadyCompleted} data-mobile-primary-action>
            {busy === "confirm" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {alreadyCompleted ? "Already imported" : retryConfirm ? "Retry confirm" : "Confirm once"}
          </Button>
        )}
          {files.length || preview || result || message ? <Button type="button" className="w-full" variant="outline" onClick={() => { setFiles([]); setPreview(null); setResult(null); setMessage(null); setSelectionNote(null); }} disabled={Boolean(busy)}><RotateCcw className="h-4 w-4" />Start over</Button> : null}
        </div>
      </ConsoleSection>
      {message ? <ConsoleSection title="Import error"><Notice tone="error" title="Import could not continue">{message}</Notice></ConsoleSection> : null}
      <ConsoleSection title="Import status">
        <div className="space-y-1.5">
          <p className="flex items-center justify-between gap-2"><span>Files</span><strong>{files.length}</strong></p>
          <p className="flex items-center justify-between gap-2"><span>Blocking issues</span><strong>{blockers.length}</strong></p>
          <p className="flex items-center justify-between gap-2"><span>Inventory movements</span><strong>0</strong></p>
        </div>
      </ConsoleSection>
    </>
  );

  return (
    <WorkspaceGrid rightRail={rail} tabletCanvas="contained" tabletRailBreakpoint="md">
      {alreadyCompleted ? <Notice tone="success" title="This file set was already imported">OMS reused the completed job and did not create a duplicate import.</Notice> : null}
      {result ? <Notice tone="success" title="AutoCount import completed">
        <p>Items, suppliers, purchasing relationships, and branch mappings were committed in one transaction. Inventory movements created: 0.</p>
      </Notice> : null}
      <Card>
        <CardHeader>
          <CardTitle>Select the original AutoCount exports</CardTitle>
          <CardDescription>Choose one Supplier List, one Item List, and any number of Location Snapshot workbooks in the same selection. No OMS template is required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label
            className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--sb-panel-radius)] border border-dashed px-4 py-6 text-center transition-colors focus-within:ring-2 focus-within:ring-[var(--sb-green-700)] ${dragActive ? "border-[var(--sb-green-700)] bg-[var(--sb-success-bg)]" : "border-[var(--sb-border)] bg-[var(--sb-surface-muted)]"}`}
            onDragEnter={(event) => { event.preventDefault(); if (!busy) setDragActive(true); }}
            onDragOver={(event) => { event.preventDefault(); if (!busy) event.dataTransfer.dropEffect = "copy"; }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false); }}
            onDrop={handleDrop}
          >
            {busy === "parsing" ? <LoaderCircle className="h-6 w-6 animate-spin text-[var(--sb-green-800)]" /> : <Upload className="h-6 w-6 text-[var(--sb-green-800)]" />}
            <span className="text-sm font-semibold">{dragActive ? "Drop files to add them" : "Drop or choose AutoCount .xlsx files"}</span>
            <span className="text-xs text-[var(--sb-text-muted)]">Multiple files accepted · identified by column headers</span>
            <input type="file" accept=".xlsx" multiple className="sr-only" onChange={(event) => { const selected = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; void selectFiles(selected); }} disabled={Boolean(busy)} />
          </label>
          {files.length ? <div className="divide-y rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)]">
            {files.map((file) => <div key={file.hash} className="flex items-center gap-3 px-3 py-2.5">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-[var(--sb-green-800)]" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-[var(--sb-text-muted)]">{typeLabels[file.type]} · {file.rows.length.toLocaleString()} rows</p></div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeFile(file.hash)} disabled={Boolean(busy)} aria-label={`Remove ${file.name}`} title="Remove file"><X className="h-4 w-4" /></Button>
            </div>)}
          </div> : null}
          {selectionNote ? <p className="text-xs text-[var(--sb-text-muted)]" role="status">{selectionNote}</p> : null}
        </CardContent>
      </Card>

      {preview?.summary ? <Card>
        <CardHeader><CardTitle>One-job impact preview</CardTitle><CardDescription>{preview.reused ? "This exact file set was already staged; the existing job was reused." : "These changes will be applied together after one confirmation."}</CardDescription></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-[var(--sb-text-muted)]">Suppliers</dt><dd className="font-semibold">{preview.summary.suppliers}</dd></div>
            <div><dt className="text-xs text-[var(--sb-text-muted)]">Items</dt><dd className="font-semibold">{preview.summary.items}</dd></div>
            <div><dt className="text-xs text-[var(--sb-text-muted)]">Branch mappings</dt><dd className="font-semibold">{preview.summary.branchMappings}</dd></div>
            <div><dt className="text-xs text-[var(--sb-text-muted)]">UOM conversions</dt><dd className="font-semibold">{preview.summary.uomConversions}</dd></div>
          </dl>
          <Notice tone="info" className="mt-4" title="OMS inventory remains authoritative">AutoCount Qty, Total Cost, and Average Cost are retained only as source snapshot context. This job creates no stock movement.</Notice>
        </CardContent>
      </Card> : null}

      {blockers.length ? <Notice tone="error" title="Confirm is locked until the source records are corrected">
        <p>{blockers.length} blocking issue{blockers.length === 1 ? "" : "s"} found. No OMS records have been changed.</p>
        {missingItemRecords.length ? <div className="mt-3 rounded-[var(--sb-control-radius)] bg-[var(--sb-surface-raised)] p-3">
          <p className="flex items-start gap-2 font-semibold"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" />{missingItemRecords.length} Item Code{missingItemRecords.length === 1 ? " is" : "s are"} in Location data but missing from the selected Item List.</p>
          <p className="mt-1 text-sm">The Item List may be older than the Location export. Export a new Item List at the same time as, or after, the Location Snapshot, then start over and review again.</p>
        </div> : null}
        {issueDetails.length ? <div className="mt-4 overflow-x-auto rounded-[var(--sb-control-radius)] border border-[var(--sb-border-soft)]">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="bg-[var(--sb-surface-muted)] text-xs text-[var(--sb-text-muted)]"><tr><th className="px-3 py-2 font-semibold">Record</th><th className="px-3 py-2 font-semibold">Where</th><th className="px-3 py-2 font-semibold">What is wrong</th><th className="px-3 py-2 font-semibold">How to fix</th></tr></thead>
            <tbody className="divide-y divide-[var(--sb-border-soft)]">{issueDetails.slice(0, 100).map((issue, index) => <tr key={`${issue.code}-${issue.sourceFile ?? "job"}-${issue.sourceRow ?? index}`}>
              <td className="whitespace-nowrap px-3 py-2.5 font-medium">{issue.itemCode ?? "File set"}</td>
              <td className="px-3 py-2.5 text-[var(--sb-text-muted)]">{issue.sourceFile ? <>{issue.sourceFile}{issue.sourceRow ? <><br />Row {issue.sourceRow}</> : null}</> : "Selected files"}</td>
              <td className="px-3 py-2.5">{issue.message}</td>
              <td className="px-3 py-2.5">{issue.resolution}</td>
            </tr>)}</tbody>
          </table>
        </div> : <ul className="mt-3 max-h-72 list-disc space-y-1 overflow-y-auto pl-4">{blockers.slice(0, 100).map((issue) => <li key={issue}>{issue}</li>)}</ul>}
        {(issueDetails.length || blockers.length) > 100 ? <p className="mt-2 flex items-center gap-1.5 font-medium"><AlertTriangle className="h-4 w-4" />Showing the first 100 issues.</p> : null}
      </Notice> : null}
      {warnings.length ? <Notice tone="warning" title="Review after import">
        <p className="font-medium">These notes do not block the import.</p>
        <ul className="mt-2 space-y-1.5">
          {warningGroups.missingSupplier ? <li><strong>{warningGroups.missingSupplier} items:</strong> Item data will import without a supplier mapping. Assign the Main Supplier later in Item Master when the source is known.</li> : null}
          {warningGroups.conversionWarnings.length ? <li><strong>{warningGroups.conversionWarnings.length} UOM conversion{warningGroups.conversionWarnings.length === 1 ? "" : "s"}:</strong> Review the named source row and add the verified conversion after import.</li> : null}
          {warningGroups.otherCount && !warningGroups.missingSupplier ? <li><strong>{warningGroups.otherCount} source note{warningGroups.otherCount === 1 ? "" : "s"}:</strong> Review when maintaining supplier mappings.</li> : null}
        </ul>
        <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold">View {warnings.length} source note{warnings.length === 1 ? "" : "s"}</summary><ul className="mt-2 max-h-52 list-disc space-y-1 overflow-y-auto pl-4">{warnings.slice(0, 50).map((warning) => <li key={warning}>{warning}</li>)}</ul></details>
      </Notice> : null}
    </WorkspaceGrid>
  );
}
