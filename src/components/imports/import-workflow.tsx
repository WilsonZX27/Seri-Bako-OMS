"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Save, Trash2, Upload, XCircle } from "lucide-react";
import { importTemplates, type ImportEntity, type ImportMode } from "@/lib/imports/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { ConsoleSection, RightConsoleMount } from "@/components/layout/right-console";
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
  supplierMappingsCreated?: number;
  supplierMappingsUpdated?: number;
  supplierMappingsSkipped?: number;
  supplierMappingErrors?: number;
};

type DraftPayload = {
  mode: ImportMode;
  confirmPosting: boolean;
  fileName: string;
  rows: Record<string, string>[];
  savedAt: string;
};

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

function columnIndex(cellRef: string) {
  const letters = cellRef.replace(/\d+/g, "");
  return [...letters].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function inflateRaw(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzipText(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error("Invalid XLSX file.");
  const entries = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const files = new Map<string, string>();
  const decoder = new TextDecoder();
  for (let entry = 0; entry < entries; entry += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(start, start + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (content) files.set(name, decoder.decode(content));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function textContent(xml: string) {
  return xml.replace(/<[^>]+>/g, "").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'");
}

async function parseXlsx(file: File) {
  const files = await unzipText(file);
  const shared = [...(files.get("xl/sharedStrings.xml") ?? "").matchAll(/<si[\s\S]*?<\/si>/g)].map((match) => textContent(match[0]));
  const sheet = files.get("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("The first worksheet could not be read.");
  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c[^>]*r="([A-Z]+\d+)"[^>]*(?:t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g)) {
      const index = columnIndex(cellMatch[1]);
      const type = cellMatch[2];
      const body = cellMatch[3];
      const raw = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
      row[index] = type === "s" ? shared[Number(raw)] ?? "" : textContent(raw);
    }
    if (row.some(Boolean)) rows.push(row);
  }
  const headers = rows[0]?.map((cell) => String(cell ?? "").trim()) ?? [];
  const dataRows = rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, String(values[index] ?? "").trim()])));
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
  { title: "5. Import", detail: "Confirm clean rows and review the result." },
];

type SupplierPreview = { id: string; supplier_code: string | null; name: string };

export function ImportWorkflow({ entity, suppliers = [] }: { entity: ImportEntity; suppliers?: SupplierPreview[] }) {
  const spec = importTemplates[entity];
  const [rows, setRows] = useState<RowState[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<ImportMode>(spec.defaultMode);
  const [confirmPosting, setConfirmPosting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
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

  function downloadErrorCsv() {
    const invalid = rows.filter((row) => row.errors.length);
    const headers = ["row_number", ...spec.headers, "errors"];
    const csv = [
      headers.join(","),
      ...invalid.map((row) => [String(row.index), ...spec.headers.map((header) => row.values[header] ?? ""), row.errors.join("; ")].map(csvEscape).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${entity}-errors.csv`;
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
    if (file.size > 2 * 1024 * 1024) {
      setRows([]);
      setMessage("File is too large. Keep imports under 2 MB.");
      return;
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".xlsx")) {
      setRows([]);
      setMessage("Unsupported file type. Upload CSV or XLSX only.");
      return;
    }

    let parsed: { headers: string[]; dataRows: Record<string, string>[] };
    try {
      parsed = lowerName.endsWith(".xlsx") ? await parseXlsx(file) : parseCsv(await file.text());
    } catch {
      setRows([]);
      setMessage("Could not read this file. Use the fixed CSV/XLSX template.");
      return;
    }
    const missingColumns = spec.required.filter((header) => !parsed.headers.includes(header));

    if (missingColumns.length) {
      setRows([]);
      setMessage(`Missing required column${missingColumns.length > 1 ? "s" : ""}: ${missingColumns.join(", ")}`);
      return;
    }

    if (parsed.dataRows.length > 500) {
      setRows([]);
      setMessage("Too many rows. Keep one import under 500 rows.");
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
          rows: rows.map((row) => row.values),
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
  const activeStep = result ? 4 : rows.length ? 3 : 2;

  return (
    <div className="space-y-5">
      <RightConsoleMount hideMobileBar>
        <ConsoleSection title="Template and draft">
          <Button type="button" variant="outline" className="w-full justify-start" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />CSV template</Button>
          <Button type="button" variant="outline" className="w-full justify-start" onClick={saveDraft}><Save className="mr-2 h-4 w-4" />Save draft</Button>
          <Button type="button" variant="outline" className="w-full justify-start" onClick={loadDraft}>Load draft</Button>
          {draftSavedAt ? <Button type="button" variant="ghost" className="w-full justify-start" onClick={clearDraft}><Trash2 className="mr-2 h-4 w-4" />Clear draft</Button> : null}
        </ConsoleSection>
        <ConsoleSection title="Review actions">
          <p className="text-xs text-muted-foreground">Validate the current rows before confirming. Confirmation stays disabled until valid rows are ready.</p>
          <Button type="button" variant="outline" className="w-full" onClick={checkErrors}>Check errors</Button>
          <Button type="button" className="w-full" onClick={confirmImport} disabled={!validRows.length || isSaving || Boolean(spec.needsPostingConfirmation && !confirmPosting)}><Upload className="mr-2 h-4 w-4" />{isSaving ? "Importing..." : "Confirm import"}</Button>
          <Button type="button" variant="outline" className="w-full" onClick={downloadErrorCsv} disabled={!errorRows.length}>Download errors</Button>
          {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
        </ConsoleSection>
        <ConsoleSection title="Current file">
          <div className="space-y-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Total rows</span><strong>{rows.length}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Valid rows</span><strong>{validRows.length}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Needs fixes</span><strong>{errorRows.length}</strong></div></div>
        </ConsoleSection>
      </RightConsoleMount>
      <Card>
        <CardContent className="space-y-5 p-5">
          <div>
            <div>
              <p className="text-sm font-semibold">Import workflow</p>
              <p className="mt-1 text-sm text-muted-foreground">{spec.description}</p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {spec.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid items-stretch gap-3 xl:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step.title} aria-current={index === activeStep ? "step" : undefined} className={`h-full rounded-[2px] border p-3 ${index === activeStep ? "border-[var(--sb-amber-600)] bg-[var(--sb-amber-100)]" : index < activeStep ? "bg-[var(--sb-success-bg)]" : "bg-[var(--sb-muted)]"}`}>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4">
            <div className="space-y-4">
              <div className="rounded-[2px] border bg-[var(--sb-muted)] p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  Sample row
                </div>
                <p className="mt-2 overflow-x-auto whitespace-nowrap font-mono text-xs">
                  {spec.headers.map((header) => spec.sample[header] || "-").join(" | ")}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-3">
                  <label className="grid gap-1 text-xs"><span>Upload file</span><Input type="file" accept=".csv,.xlsx" onChange={(event) => loadFile(event.target.files?.[0])} /></label>
                  {fileName ? <p className="text-xs text-muted-foreground">Loaded source: {fileName}</p> : null}
                  {draftSavedAt ? <p className="text-xs text-muted-foreground">Saved draft on this browser: {formatSavedAt(draftSavedAt)}</p> : null}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium">Import mode</p>
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
                <label className="flex items-start gap-3 rounded-[2px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <input type="checkbox" className="mt-1" checked={confirmPosting} onChange={(event) => setConfirmPosting(event.target.checked)} />
                  <span>I understand this will post opening stock into the Movement Ledger.</span>
                </label>
              ) : null}
            </div>

          </div>

          {result ? <div className="grid gap-3 rounded-[2px] border bg-[var(--sb-muted)] p-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[2px] border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="h-4 w-4" />Imported</div>
              <p className="mt-1 text-2xl font-semibold">{summary.imported}</p>
            </div>
            <div className="rounded-[2px] border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary"><Upload className="h-4 w-4" />Updated</div>
              <p className="mt-1 text-2xl font-semibold">{summary.updated}</p>
            </div>
            <div className="rounded-[2px] border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700"><AlertTriangle className="h-4 w-4" />Skipped</div>
              <p className="mt-1 text-2xl font-semibold">{summary.skipped}</p>
            </div>
            <div className="rounded-[2px] border bg-card p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive"><XCircle className="h-4 w-4" />Errors</div>
              <p className="mt-1 text-2xl font-semibold">{summary.errors}</p>
            </div>
          </div> : null}
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-[2px] border bg-card">
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
                    {row.errors.length ? row.errors.join("; ") : (() => {
                      const supplierCode = row.values.supplier_code?.trim().toLowerCase();
                      const supplier = entity === "items" && supplierCode
                        ? suppliers.find((entry) => entry.supplier_code?.trim().toLowerCase() === supplierCode)
                        : null;
                      return supplierCode ? (supplier ? `Resolved: ${supplier.supplier_code} - ${supplier.name}` : "Supplier code will be verified on import") : "Valid";
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(rowIndex)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={spec.headers.length + 3} className="text-center text-muted-foreground">
                    Upload a CSV or XLSX file to start reviewing data.
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
