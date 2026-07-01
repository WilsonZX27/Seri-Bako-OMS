"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ImportEntity = "items" | "products" | "suppliers" | "supplier-items";
type RowState = { index: number; values: Record<string, string>; errors: string[] };

const templates: Record<ImportEntity, string[]> = {
  items: ["item_code", "item_name", "category", "base_unit", "cost", "safety_stock"],
  products: ["product_code", "product_name", "category", "selling_unit"],
  suppliers: ["supplier_code", "name", "contact_person", "phone", "email", "payment_terms_days"],
  "supplier-items": ["supplier_id", "item_id", "supplier_item_code", "supplier_item_name", "purchase_uom", "conversion_to_base_uom", "unit_cost"],
};

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length);
  const headers = lines[0]?.split(",").map((cell) => cell.trim()) ?? [];
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
  });
}

function validateRows(entity: ImportEntity, rows: Record<string, string>[]): RowState[] {
  const required = templates[entity];
  return rows.map((values, index) => ({
    index: index + 1,
    values,
    errors: required.filter((field) => !values[field]?.trim()).map((field) => `${field} is required`),
  }));
}

export function ImportWorkflow({ entity }: { entity: ImportEntity }) {
  const [rows, setRows] = useState<RowState[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const validRows = useMemo(() => rows.filter((row) => !row.errors.length), [rows]);
  const errorRows = useMemo(() => rows.filter((row) => row.errors.length), [rows]);
  const headers = templates[entity];

  async function loadFile(file: File | undefined) {
    if (!file) return;
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      setRows([]);
      setMessage("XLSX template detected. For Sprint 2 preview, please export the sheet as CSV before confirming import.");
      return;
    }
    const text = await file.text();
    const parsed = validateRows(entity, parseCsv(text));
    setRows(parsed);
    setMessage(`${parsed.length} rows loaded. ${parsed.filter((row) => !row.errors.length).length} valid, ${parsed.filter((row) => row.errors.length).length} with errors.`);
  }

  async function confirmImport() {
    setIsSaving(true);
    const response = await fetch("/api/imports/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, rows: validRows.map((row) => row.values) }),
    });
    const result = (await response.json()) as { imported: number; message?: string };
    setIsSaving(false);
    setMessage(result.message ?? `${result.imported} valid rows imported.`);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-sm font-semibold">Upload CSV/XLSX</p>
            <p className="mt-1 text-sm text-muted-foreground">Required columns: {headers.join(", ")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input type="file" accept=".csv,.xlsx" onChange={(event) => loadFile(event.target.files?.[0])} />
            <Button type="button" onClick={confirmImport} disabled={!validRows.length || isSaving}>
              <Upload className="mr-2 h-4 w-4" />
              Confirm import
            </Button>
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-secondary/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="h-4 w-4" /> Valid rows</div>
              <p className="mt-1 text-2xl font-semibold">{validRows.length}</p>
            </div>
            <div className="rounded-md border bg-secondary/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive"><XCircle className="h-4 w-4" /> Error rows</div>
              <p className="mt-1 text-2xl font-semibold">{errorRows.length}</p>
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
                {headers.map((header) => <TableHead key={header}>{header}</TableHead>)}
                <TableHead>Validation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.index}>
                  <TableCell>{row.index}</TableCell>
                  {headers.map((header) => <TableCell key={header}>{row.values[header] || "-"}</TableCell>)}
                  <TableCell className={row.errors.length ? "text-destructive" : "text-success"}>{row.errors.length ? row.errors.join("; ") : "Valid"}</TableCell>
                </TableRow>
              ))}
              {!rows.length ? <TableRow><TableCell colSpan={headers.length + 2} className="text-center text-muted-foreground">Upload a CSV file to preview rows.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
