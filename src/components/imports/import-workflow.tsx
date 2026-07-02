"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, PencilLine, Save, Trash2, Upload, XCircle } from "lucide-react";
import { importTemplates, type ImportEntity, type ImportMode } from "@/lib/imports/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type RowState = { index: number; values: Record<string, string>; errors: string[] };
type ImportErrorRow = { rowNumber: number; values: Record<string, string>; message: string };
type ImportResult = {
  ok: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string;
  errorRows: ImportErrorRow[];
};

type DraftPayload = {
  mode: ImportMode;
  confirmPosting: boolean;
  fileName: string;
  rows: Record<string, string>[];
  savedAt: string;
};

function parseDelimitedTable(text: string, headers: string[]) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  return lines.map((line) => {
    const values = line.includes("\t") ? line.split("\t") : line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
  });
}

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);

  const headers = rows[0]?.map((cell) => cell.trim()) ?? [];
  const dataRows = rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])));
  return { headers, dataRows };
}

function validateRows(entity: ImportEntity, rows: Record<string, string>[]) {
  const spec = importTemplates[entity];
  const seen = new Map<string, number>();

  return rows.map((values, index) => {
    const errors = spec.required
      .filter((field) => !String(values[field] ?? "").trim())
      .map((field) => `${field} is required`);

    const duplicateKey = spec.duplicateKey.map((field) => String(values[field] ?? "").trim().toLowerCase()).join("|");
    if (duplicateKey.replaceAll("|", "")) {
      const firstRow = seen.get(duplicateKey);
      if (firstRow) errors.push(`Duplicate of row ${firstRow}`);
      else seen.set(duplicateKey, index + 1);
    }

    return { index: index + 1, values, errors };
  });
}

function draftKey(entity: ImportEntity) {
  return `seri-bako-import-draft-${entity}`;
}

function formatSavedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

const steps = [
  { title: "1. Template", detail: "Download the correct columns first." },
  { title: "2. Fill", detail: "Prepare the rows in CSV format." },
  { title: "3. Upload", detail: "Load the file or a saved draft." },
  { title: "4. Review", detail: "Fix errors directly in the grid if needed." },
  { title: "5. Save or Import", detail: "Save a draft or push only clean rows." },
];

export function ImportWorkflow({ entity }: { entity: ImportEntity }) {
  const spec = importTemplates[entity];
  const [rows, setRows] = useState<RowState[]>([]);
  const [entryMode, setEntryMode] = useState<"upload" | "table">("upload");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<ImportMode>(spec.defaultMode);
  const [confirmPosting, setConfirmPosting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const validRows = useMemo(() => rows.filter((row) => !row.errors.length), [rows]);
  const errorRows = useMemo(() => rows.filter((row) => row.errors.length), [rows]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(draftKey(entity));
      if (!saved) return;
      const draft = JSON.parse(saved) as DraftPayload;
      if (!Array.isArray(draft.rows) || !draft.rows.length) return;
      setRows(validateRows(entity, draft.rows));
      setMode(draft.mode ?? spec.defaultMode);
      setConfirmPosting(Boolean(draft.confirmPosting));
      setFileName(draft.fileName || "Saved draft");
      setDraftSavedAt(draft.savedAt);
      setMessage(`Loaded saved draft with ${draft.rows.length} row(s).`);
    } catch {
      // Ignore invalid local drafts and let the user start clean.
    }
  }, [entity, spec.defaultMode]);

  function downloadTemplate() {
    const csv = [spec.headers.join(","), spec.headers.map((header) => csvEscape(spec.sample[header] ?? "")).join(",")].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${entity}-template.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function updateRows(nextRows: Record<string, string>[]) {
    setRows(validateRows(entity, nextRows));
  }

  async function loadFile(file: File | undefined) {
    setResult(null);
    if (!file) return;

    setFileName(file.name);
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      setRows([]);
      setMessage("Please export this template as CSV first, then upload the CSV file.");
      return;
    }

    const text = await file.text();
    const parsed = parseCsv(text);
    const missingColumns = spec.required.filter((header) => !parsed.headers.includes(header));

    if (missingColumns.length) {
      setRows([]);
      setMessage(`Missing required column${missingColumns.length > 1 ? "s" : ""}: ${missingColumns.join(", ")}`);
      return;
    }

    updateRows(parsed.dataRows);
    setMessage(`${parsed.dataRows.length} row(s) loaded. ${parsed.dataRows.length - validateRows(entity, parsed.dataRows).filter((row) => row.errors.length).length} valid so far.`);
  }

  function updateCell(rowIndex: number, header: string, value: string) {
    const nextRows = rows.map((row, index) => (index === rowIndex ? { ...row.values, [header]: value } : row.values));
    updateRows(nextRows);
    setResult(null);
  }

  function addBlankRow() {
    updateRows([...rows.map((row) => row.values), Object.fromEntries(spec.headers.map((header) => [header, ""]))]);
  }

  function removeRow(rowIndex: number) {
    updateRows(rows.filter((_, index) => index !== rowIndex).map((row) => row.values));
  }

  function saveDraft() {
    if (!rows.length) {
      setMessage("Load or enter at least one row before saving a draft.");
      return;
    }

    const payload: DraftPayload = {
      mode,
      confirmPosting,
      fileName,
      rows: rows.map((row) => row.values),
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(draftKey(entity), JSON.stringify(payload));
    setDraftSavedAt(payload.savedAt);
    setMessage("Draft saved on this browser only.");
  }

  function loadDraft() {
    try {
      const saved = window.localStorage.getItem(draftKey(entity));
      if (!saved) {
        setMessage("No saved draft was found on this browser.");
        return;
      }
      const draft = JSON.parse(saved) as DraftPayload;
      updateRows(draft.rows);
      setMode(draft.mode ?? spec.defaultMode);
      setConfirmPosting(Boolean(draft.confirmPosting));
      setFileName(draft.fileName || "Saved draft");
      setDraftSavedAt(draft.savedAt);
      setEntryMode("table");
      setMessage(`Loaded saved draft with ${draft.rows.length} row(s).`);
    } catch {
      setMessage("Saved draft could not be read on this browser.");
    }
  }

  function clearDraft() {
    window.localStorage.removeItem(draftKey(entity));
    setDraftSavedAt(null);
    setMessage("Saved draft cleared.");
  }

  function checkErrors() {
    const nextRows = validateRows(entity, rows.map((row) => row.values));
    setRows(nextRows);
    setResult(null);
    setMessage(nextRows.some((row) => row.errors.length) ? "Some rows still need fixes before import." : "All current rows look ready.");
  }

  function applyPastedTable() {
    if (!pasteText.trim()) {
      setMessage("Paste some rows first.");
      return;
    }
    const parsedRows = parseDelimitedTable(pasteText, spec.headers);
    updateRows(parsedRows);
    setEntryMode("table");
    setMessage(`${parsedRows.length} row(s) pasted into the table.`);
  }

  async function confirmImport() {
    setIsSaving(true);
    setResult(null);

    try {
      const response = await fetch("/api/imports/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity,
          mode,
          confirmPosting,
          rows: validRows.map((row) => row.values),
        }),
      });
      const payload = (await response.json()) as ImportResult;
      setResult(payload);
      setMessage(payload.message);
      if (payload.ok) {
        window.localStorage.removeItem(draftKey(entity));
        setDraftSavedAt(null);
      }
    } catch {
      setMessage("Could not complete this import. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const summary = result ?? {
    ok: true,
    imported: validRows.length,
    updated: 0,
    skipped: 0,
    errors: errorRows.length,
    message: "",
    errorRows: [],
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold">Import workflow</p>
              <p className="mt-1 text-sm text-muted-foreground">{spec.description}</p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {spec.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border bg-[var(--sb-muted)] p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Template and draft</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Template
                </Button>
                <Button type="button" variant="outline" onClick={saveDraft}>
                  <Save className="mr-2 h-4 w-4" />
                  Save draft
                </Button>
                <Button type="button" variant="outline" onClick={loadDraft}>
                  Load draft
                </Button>
                {draftSavedAt ? (
                  <Button type="button" variant="ghost" onClick={clearDraft}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-5">
            {steps.map((step) => (
              <div key={step.title} className="rounded-lg border bg-[var(--sb-muted)] p-3">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <div className="rounded-md border bg-[var(--sb-muted)] p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  Sample row
                </div>
                <p className="mt-2 overflow-x-auto whitespace-nowrap font-mono text-xs">
                  {spec.headers.map((header) => spec.sample[header] || "-").join(" | ")}
                </p>
              </div>

              <div className="rounded-lg border bg-card p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Input mode</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={entryMode === "upload" ? "default" : "outline"} onClick={() => setEntryMode("upload")}>Upload file</Button>
                  <Button type="button" variant={entryMode === "table" ? "default" : "outline"} onClick={() => setEntryMode("table")}>Edit in table</Button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-3">
                  {entryMode === "upload" ? (
                    <>
                      <Input type="file" accept=".csv,.xlsx" onChange={(event) => loadFile(event.target.files?.[0])} />
                      {fileName ? <p className="text-xs text-muted-foreground">Loaded source: {fileName}</p> : null}
                    </>
                  ) : (
                    <>
                      <textarea
                        value={pasteText}
                        onChange={(event) => setPasteText(event.target.value)}
                        className="min-h-32 w-full rounded-md border bg-background p-3 text-sm"
                        placeholder="Paste rows from Excel or Google Sheets here."
                      />
                      <Button type="button" variant="outline" onClick={applyPastedTable}>Paste into table</Button>
                    </>
                  )}
                  {draftSavedAt ? <p className="text-xs text-muted-foreground">Saved draft on this browser: {formatSavedAt(draftSavedAt)}</p> : null}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Import mode</p>
                  <SelectNative value={mode} onChange={(event) => setMode(event.target.value as ImportMode)} disabled={spec.modes.length === 1}>
                    {spec.modes.map((value) => (
                      <option key={value} value={value}>
                        {value === "create" ? "Create only" : value === "update" ? "Update existing" : "Create or update"}
                      </option>
                    ))}
                  </SelectNative>
                </div>
              </div>

              {spec.needsPostingConfirmation ? (
                <label className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <input type="checkbox" className="mt-1" checked={confirmPosting} onChange={(event) => setConfirmPosting(event.target.checked)} />
                  <span>I understand this will post opening stock into the stock ledger.</span>
                </label>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold">Current file</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between"><span>Total rows</span><span className="font-medium text-foreground">{rows.length}</span></div>
                  <div className="flex items-center justify-between"><span>Valid rows</span><span className="font-medium text-foreground">{validRows.length}</span></div>
                  <div className="flex items-center justify-between"><span>Rows needing fixes</span><span className="font-medium text-foreground">{errorRows.length}</span></div>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm font-semibold">Review actions</p>
                <p className="mt-1 text-xs text-muted-foreground">Check the grid before proceeding. Confirm stays disabled until valid rows are ready.</p>
                <div className="mt-3 flex flex-col gap-2">
                  <Button type="button" variant="outline" onClick={addBlankRow}>
                    <PencilLine className="mr-2 h-4 w-4" />
                    Add blank row
                  </Button>
                  <Button type="button" variant="outline" onClick={checkErrors}>
                    Check errors
                  </Button>
                  <Button
                    type="button"
                    onClick={confirmImport}
                    disabled={!validRows.length || isSaving || Boolean(errorRows.length) || Boolean(spec.needsPostingConfirmation && !confirmPosting)}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isSaving ? "Importing..." : "Proceed / Confirm Import"}
                  </Button>
                </div>
                {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border bg-[var(--sb-muted)] p-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="h-4 w-4" />Imported</div>
              <p className="mt-1 text-2xl font-semibold">{summary.imported}</p>
            </div>
            <div className="rounded-md border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary"><Upload className="h-4 w-4" />Updated</div>
              <p className="mt-1 text-2xl font-semibold">{summary.updated}</p>
            </div>
            <div className="rounded-md border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700"><AlertTriangle className="h-4 w-4" />Skipped</div>
              <p className="mt-1 text-2xl font-semibold">{summary.skipped}</p>
            </div>
            <div className="rounded-md border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive"><XCircle className="h-4 w-4" />Errors</div>
              <p className="mt-1 text-2xl font-semibold">{summary.errors}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                {spec.headers.map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
                <TableHead>Validation</TableHead>
                <TableHead className="w-24 text-right">Row</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={row.index}>
                  <TableCell>{row.index}</TableCell>
                  {spec.headers.map((header) => (
                    <TableCell key={header} className="min-w-[180px]">
                      <Input value={row.values[header] ?? ""} onChange={(event) => updateCell(rowIndex, header, event.target.value)} />
                    </TableCell>
                  ))}
                  <TableCell className={row.errors.length ? "text-destructive" : "text-success"}>
                    {row.errors.length ? row.errors.join("; ") : "Valid"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(rowIndex)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={spec.headers.length + 3} className="text-center text-muted-foreground">
                    Upload a CSV file or add a blank row to start reviewing data.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      {result?.errorRows.length ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="font-semibold">Row-level issues from import</p>
              <p className="text-sm text-muted-foreground">These rows were rejected by the server and should be corrected before retrying.</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Values</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.errorRows.map((row) => (
                    <TableRow key={`${row.rowNumber}-${row.message}`}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell className="max-w-xl">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {Object.entries(row.values).map(([key, value]) => (
                            <p key={key}>
                              <span className="font-medium text-foreground">{key}</span>: {value || "-"}
                            </p>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-destructive">{row.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
