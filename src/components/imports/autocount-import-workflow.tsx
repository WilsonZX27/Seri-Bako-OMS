"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileSpreadsheet, LoaderCircle, ShieldCheck, Upload } from "lucide-react";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/system-states";
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

async function readJsonResponse<T extends { ok: boolean; message?: string }>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    if (response.status === 401 || response.redirected || response.url.includes("/login")) {
      throw new Error("Your session expired. Sign in again, then retry Review import; your selected files remain here.");
    }
    throw new Error(`The import service returned an unexpected response (${response.status}). Retry; no OMS records were changed.`);
  }
  return await response.json() as T;
}

export function AutoCountImportWorkflow() {
  const [files, setFiles] = useState<AutoCountParsedFile[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"parsing" | "preview" | "confirm" | null>(null);

  async function selectFiles(selected: FileList | null) {
    if (!selected?.length) return;
    setBusy("parsing"); setMessage(null); setPreview(null); setResult(null);
    try {
      const parsed = await Promise.all([...selected].map(parseAutoCountWorkbook));
      const unique = new Map(parsed.map((file) => [file.hash, file]));
      setFiles([...unique.values()]);
      if (unique.size !== parsed.length) setMessage("Duplicate files were removed from this job.");
    } catch (error) {
      setFiles([]);
      setMessage(error instanceof Error ? error.message : "Could not read the selected workbooks.");
    } finally { setBusy(null); }
  }

  async function createPreview() {
    setBusy("preview"); setMessage(null); setResult(null);
    try {
      const response = await fetch("/api/imports/autocount/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files }) });
      const payload = await readJsonResponse<PreviewResponse>(response);
      if (!response.ok || !payload.ok) throw new Error(payload.message ?? "Could not prepare the import preview.");
      setPreview(payload);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not prepare the import preview."); }
    finally { setBusy(null); }
  }

  async function confirmImport() {
    if (!preview?.jobId) return;
    setBusy("confirm"); setMessage(null);
    try {
      const response = await fetch("/api/imports/autocount/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: preview.jobId }) });
      const payload = await readJsonResponse<{ ok: boolean; message?: string; result?: ConfirmResult }>(response);
      if (!response.ok || !payload.ok) throw new Error(payload.message ?? "The import could not be confirmed.");
      setResult(payload.result ?? {});
    } catch (error) { setMessage(error instanceof Error ? error.message : "The import could not be confirmed."); }
    finally { setBusy(null); }
  }

  const blockers = preview?.blockingIssues ?? [];
  const issueDetails = preview?.issueDetails ?? [];
  const missingItemRecords = issueDetails.filter((issue) => issue.code === "missing_item_list_record");
  const retryConfirm = Boolean(preview?.jobId && message);
  const rail = (
    <>
      <ConsoleSection title="Actions">
        {!preview ? (
          <Button type="button" onClick={createPreview} disabled={!files.length || Boolean(busy)} data-mobile-primary-action>
            {busy === "preview" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Review import
          </Button>
        ) : (
          <Button type="button" onClick={confirmImport} disabled={!preview.jobId || blockers.length > 0 || Boolean(busy) || Boolean(result)} data-mobile-primary-action>
            {busy === "confirm" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {retryConfirm ? "Retry confirm" : "Confirm once"}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => { setFiles([]); setPreview(null); setResult(null); setMessage(null); }} disabled={Boolean(busy)}>Start over</Button>
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
      <Card>
        <CardHeader>
          <CardTitle>Select the original AutoCount exports</CardTitle>
          <CardDescription>Choose one Supplier List, one Item List, and any number of Location Snapshot workbooks in the same selection. No OMS template is required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--sb-panel-radius)] border border-dashed border-[var(--sb-border)] bg-[var(--sb-surface-muted)] px-4 py-6 text-center focus-within:ring-2 focus-within:ring-[var(--sb-green-700)]">
            {busy === "parsing" ? <LoaderCircle className="h-6 w-6 animate-spin text-[var(--sb-green-800)]" /> : <Upload className="h-6 w-6 text-[var(--sb-green-800)]" />}
            <span className="text-sm font-semibold">Choose AutoCount .xlsx files</span>
            <span className="text-xs text-[var(--sb-text-muted)]">The first worksheet is identified by its column headers.</span>
            <input type="file" accept=".xlsx" multiple className="sr-only" onChange={(event) => void selectFiles(event.target.files)} disabled={Boolean(busy)} />
          </label>
          {files.length ? <div className="divide-y rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)]">
            {files.map((file) => <div key={file.hash} className="flex items-center gap-3 px-3 py-2.5">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-[var(--sb-green-800)]" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-[var(--sb-text-muted)]">{typeLabels[file.type]} · {file.rows.length.toLocaleString()} rows</p></div>
            </div>)}
          </div> : null}
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
      {preview?.warnings?.length ? <Notice tone="warning" title="Non-blocking review notes"><ul className="max-h-52 list-disc space-y-1 overflow-y-auto pl-4">{preview.warnings.slice(0, 50).map((warning) => <li key={warning}>{warning}</li>)}</ul></Notice> : null}
      {result ? <Notice tone="success" title="AutoCount import completed">
        <p>Items, suppliers, purchasing relationships, and branch mappings were committed in one transaction. Inventory movements created: 0.</p>
      </Notice> : null}
    </WorkspaceGrid>
  );
}
