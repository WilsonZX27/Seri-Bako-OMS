"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ImportEntity = "items" | "products" | "suppliers" | "supplier-items";
type RowState = { index: number; values: Record<string, string>; errors: string[] };
type TemplateSpec = { headers: string[]; required: string[]; duplicateKey: string[]; sample: Record<string, string>; notes: string[] };

const templates: Record<ImportEntity, TemplateSpec> = {
  items: {
    headers: ["item_code", "item_name", "category", "base_uom", "purchase_uom", "barcode", "supplier_name", "safety_stock", "active"],
    required: ["item_code", "item_name", "category", "base_uom", "purchase_uom"],
    duplicateKey: ["item_code"],
    sample: { item_code: "CHK-001", item_name: "Chicken Satay Meat", category: "Raw Meat", base_uom: "kg", purchase_uom: "kg", barcode: "955000000001", supplier_name: "ABC Supplier", safety_stock: "20", active: "yes" },
    notes: ["supplier_name, safety_stock, barcode, and active are optional.", "active accepts yes/no or true/false."],
  },
  products: {
    headers: ["product_code", "product_name", "category", "selling_unit", "active"],
    required: ["product_code", "product_name", "category", "selling_unit"],
    duplicateKey: ["product_code"],
    sample: { product_code: "SATAY-SET", product_name: "Satay Set", category: "Menu", selling_unit: "pack", active: "yes" },
    notes: ["Products are menu/finished goods references for recipes."],
  },
  suppliers: {
    headers: ["supplier_code", "supplier_name", "contact_person", "phone", "email", "address", "payment_terms", "active"],
    required: ["supplier_name"],
    duplicateKey: ["supplier_code", "supplier_name"],
    sample: { supplier_code: "SUP-001", supplier_name: "ABC Supplier", contact_person: "Amin", phone: "0123456789", email: "sales@example.com", address: "Kuala Lumpur", payment_terms: "30", active: "yes" },
    notes: ["supplier_code is optional but recommended.", "payment_terms can be a number of days."],
  },
  "supplier-items": {
    headers: ["supplier_name", "supplier_code", "item_code", "item_name", "supplier_item_code", "supplier_item_name", "purchase_uom", "conversion_rate", "unit_cost", "lead_time_days", "active"],
    required: ["supplier_code", "item_code", "supplier_item_code", "supplier_item_name", "purchase_uom", "conversion_rate", "unit_cost"],
    duplicateKey: ["supplier_code", "item_code", "supplier_item_code"],
    sample: { supplier_name: "ABC Supplier", supplier_code: "SUP-001", item_code: "CHK-001", item_name: "Chicken Satay Meat", supplier_item_code: "ABC-CHK", supplier_item_name: "Chicken Meat 1kg", purchase_uom: "kg", conversion_rate: "1", unit_cost: "12.50", lead_time_days: "2", active: "yes" },
    notes: ["The preview flags duplicates before confirm.", "Supplier and item references must already exist before final import."],
  },
};

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length);
  const headers = lines[0]?.split(",").map((cell) => cell.trim()) ?? [];
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
  });
}

function validateRows(spec: TemplateSpec, rows: Record<string, string>[]): RowState[] {
  const seen = new Map<string, number>();
  return rows.map((values, index) => {
    const errors = spec.required.filter((field) => !values[field]?.trim()).map((field) => `${field} is required`);
    const duplicateKey = spec.duplicateKey.map((field) => values[field]?.trim().toLowerCase()).join("|");
    if (duplicateKey.replaceAll("|", "")) {
      const firstRow = seen.get(duplicateKey);
      if (firstRow) errors.push(`Duplicate of row ${firstRow}`);
      else seen.set(duplicateKey, index + 1);
    }
    return { index: index + 1, values, errors };
  });
}

function toApiRows(entity: ImportEntity, rows: RowState[]) {
  return rows.map((row) => {
    if (entity === "items") {
      return { ...row.values, base_unit: row.values.base_uom, purchase_unit: row.values.purchase_uom };
    }
    if (entity === "suppliers") {
      return { ...row.values, name: row.values.supplier_name, payment_terms_days: row.values.payment_terms };
    }
    if (entity === "supplier-items") {
      return { ...row.values, conversion_to_base_uom: row.values.conversion_rate };
    }
    return row.values;
  });
}

export function ImportWorkflow({ entity }: { entity: ImportEntity }) {
  const spec = templates[entity];
  const [rows, setRows] = useState<RowState[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
    if (!file) return;
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      setRows([]);
      setMessage("Please export this template as CSV for now, then upload the CSV file.");
      return;
    }
    const text = await file.text();
    const parsed = validateRows(spec, parseCsv(text));
    setRows(parsed);
    setMessage(`${parsed.length} rows loaded. ${parsed.filter((row) => !row.errors.length).length} valid, ${parsed.filter((row) => row.errors.length).length} with errors.`);
  }

  async function confirmImport() {
    setIsSaving(true);
    const response = await fetch("/api/imports/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, rows: toApiRows(entity, validRows) }),
    });
    const result = (await response.json()) as { imported: number; message?: string };
    setIsSaving(false);
    setMessage(result.message ?? `${result.imported} valid rows imported.`);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold">Template and validation</p>
              <p className="mt-1 text-sm text-muted-foreground">Required columns: {spec.required.join(", ")}</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {spec.notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </div>
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download template
            </Button>
          </div>

          <div className="rounded-md border bg-[var(--sb-muted)] p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Sample row</p>
            <p className="mt-2 overflow-x-auto whitespace-nowrap font-mono text-xs">{spec.headers.map((header) => spec.sample[header] || "-").join(" | ")}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input type="file" accept=".csv,.xlsx" onChange={(event) => loadFile(event.target.files?.[0])} />
            <Button type="button" onClick={confirmImport} disabled={!validRows.length || isSaving || Boolean(errorRows.length)}>
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
                {spec.headers.map((header) => <TableHead key={header}>{header}</TableHead>)}
                <TableHead>Validation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.index}>
                  <TableCell>{row.index}</TableCell>
                  {spec.headers.map((header) => <TableCell key={header}>{row.values[header] || "-"}</TableCell>)}
                  <TableCell className={row.errors.length ? "text-destructive" : "text-success"}>{row.errors.length ? row.errors.join("; ") : "Valid"}</TableCell>
                </TableRow>
              ))}
              {!rows.length ? <TableRow><TableCell colSpan={spec.headers.length + 2} className="text-center text-muted-foreground">Upload a CSV file to preview rows.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
