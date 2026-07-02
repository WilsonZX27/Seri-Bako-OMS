"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from "lucide-react";
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

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
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
      if (char === "\r" && next === "\n") i += 1;
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
  const dataRows = rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])),
  );

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

const stepLabels = [
  "Step 1: Download template",
  "Step 2: Fill data",
  "Step 3: Upload file",
  "Step 4: Preview and validate",
  "Step 5: Confirm import",
];

export function ImportWorkflow({ entity }: { entity: ImportEntity }) {
  const spec = importTemplates[entity];
  const [rows, setRows] = useState<RowState[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [mode, setMode] = useState<ImportMode>(spec.defaultMode);
  const [confirmPosting, setConfirmPosting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const validRows = useMemo(() => rows.filter((row) => !row.errors.length), [rows]);
  const errorRows = useMemo(() => rows.filter((row) => row.errors.length), [rows]);

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

  async function loadFile(file: File | undefined) {
    setResult(null);
    if (!file) return;

    setFileName(file.name);
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      setRows([]);
      setMessage("Please export this template as CSV for now, then upload the CSV file.");
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

    const preview = validateRows(entity, parsed.dataRows);
    setRows(preview);
    setMessage(`${preview.length} rows loaded. ${preview.filter((row) => !row.errors.length).length} valid, ${preview.filter((row) => row.errors.length).length} with errors.`);
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold">Import workflow</p>
              <p className="mt-1 text-sm text-muted-foreground">{spec.description}</p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {spec.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download template
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            {stepLabels.map((step) => (
              <div key={step} className="rounded-lg border bg-[var(--sb-muted)] p-3 text-sm text-muted-foreground">
                {step}
              </div>
            ))}
          </div>

          <div className="rounded-md border bg-[var(--sb-muted)] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              Sample row
            </div>
            <p className="mt-2 overflow-x-auto whitespace-nowrap font-mono text-xs">
              {spec.headers.map((header) => spec.sample[header] || "-").join(" | ")}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <div className="space-y-3">
              <Input type="file" accept=".csv,.xlsx" onChange={(event) => loadFile(event.target.files?.[0])} />
              {fileName ? <p className="text-xs text-muted-foreground">Loaded file: {fileName}</p> : null}
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
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmPosting}
                onChange={(event) => setConfirmPosting(event.target.checked)}
              />
              <span>I understand this will post opening stock into the stock ledger.</span>
            </label>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              onClick={confirmImport}
              disabled={!validRows.length || isSaving || Boolean(errorRows.length) || Boolean(spec.needsPostingConfirmation && !confirmPosting)}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isSaving ? "Importing..." : "Confirm import"}
            </Button>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border bg-secondary/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" />
                Imported
              </div>
              <p className="mt-1 text-2xl font-semibold">{summary.imported}</p>
            </div>
            <div className="rounded-md border bg-secondary/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Upload className="h-4 w-4" />
                Updated
              </div>
              <p className="mt-1 text-2xl font-semibold">{summary.updated}</p>
            </div>
            <div className="rounded-md border bg-secondary/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Skipped
              </div>
              <p className="mt-1 text-2xl font-semibold">{summary.skipped}</p>
            </div>
            <div className="rounded-md border bg-secondary/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <XCircle className="h-4 w-4" />
                Errors
              </div>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.index}>
                  <TableCell>{row.index}</TableCell>
                  {spec.headers.map((header) => (
                    <TableCell key={header}>{row.values[header] || "-"}</TableCell>
                  ))}
                  <TableCell className={row.errors.length ? "text-destructive" : "text-success"}>
                    {row.errors.length ? row.errors.join("; ") : "Valid"}
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={spec.headers.length + 2} className="text-center text-muted-foreground">
                    Upload a CSV file to preview rows.
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
              <p className="font-semibold">Row-level issues</p>
              <p className="text-sm text-muted-foreground">Invalid rows were not imported. Review and correct the source file before retrying.</p>
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
