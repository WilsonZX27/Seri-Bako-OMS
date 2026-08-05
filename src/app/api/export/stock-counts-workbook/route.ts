import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const exportQuerySchema = z.object({
  branch_id: z.uuid(),
  from: z.iso.date(),
  to: z.iso.date(),
});

function dateRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (end < start) throw new Error("The end date must be on or after the start date.");
  const dates: string[] = [];
  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + 86_400_000)) {
    dates.push(cursor.toISOString().slice(0, 10));
    if (dates.length > 366) throw new Error("Export a maximum of 366 days at a time.");
  }
  return dates;
}

function worksheetName(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(input: Buffer) {
  let value = 0xffffffff;
  for (const byte of input) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function xmlEscape(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function inlineCell(value: unknown, style = "") {
  return `<c${style ? ` s="${style}"` : ""} t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
}

function numberCell(value: number, style = "") {
  return `<c${style ? ` s="${style}"` : ""}><v>${Number.isFinite(value) ? value : 0}</v></c>`;
}

function worksheetXml(headers: string[], rows: Array<Array<unknown>>) {
  const headerXml = headers.map((header) => inlineCell(header, "1")).join("");
  const rowXml = rows.map((row, rowIndex) => {
    const cells = row.map((value, cellIndex) => {
      const numeric = [3, 4, 5, 6].includes(cellIndex) && typeof value === "number";
      const percent = cellIndex === 6 && typeof value === "number";
      return numeric ? numberCell(value, percent ? "2" : "") : inlineCell(value);
    }).join("");
    return `<row r="${rowIndex + 2}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols><col min="1" max="1" width="18" customWidth="1"/><col min="2" max="2" width="34" customWidth="1"/><col min="3" max="3" width="12" customWidth="1"/><col min="4" max="7" width="14" customWidth="1"/><col min="8" max="8" width="30" customWidth="1"/><col min="9" max="10" width="20" customWidth="1"/><col min="11" max="11" width="22" customWidth="1"/></cols><sheetData><row r="1" ht="24" customHeight="1">${headerXml}</row>${rowXml}</sheetData><autoFilter ref="A1:K${rows.length + 1}"/></worksheet>`;
}

function makeZip(files: Array<{ name: string; content: string }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const content = Buffer.from(file.content, "utf8");
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc32(content), 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    localParts.push(local, content);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc32(content), 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    offset += local.length + content.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

export async function GET(request: Request) {
  if (!(await hasPermission("stock_count.read"))) {
    return NextResponse.json({ ok: false, message: "You do not have permission to export Stock Counts." }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const input = exportQuerySchema.parse({ branch_id: url.searchParams.get("branch_id"), from: url.searchParams.get("from"), to: url.searchParams.get("to") });
    const dates = dateRange(input.from, input.to);
    const supabase = await createClient();
    const [{ data: branch, error: branchError }, { data: counts, error: countsError }] = await Promise.all([
      supabase.from("branches").select("id, branch_code, branch_name").eq("id", input.branch_id).single(),
      supabase.from("stock_counts").select("id, count_no, count_date, status, counted_by, remarks").eq("branch_id", input.branch_id).gte("count_date", input.from).lte("count_date", input.to).is("deleted_at", null).order("count_date", { ascending: true }).order("count_no", { ascending: true }),
    ]);
    if (branchError) throw new Error(branchError.message);
    if (countsError) throw new Error(countsError.message);

    const countIds = (counts ?? []).map((count) => count.id);
    const staffIds = [...new Set((counts ?? []).map((count) => count.counted_by).filter(Boolean))] as string[];
    const [{ data: lines, error: linesError }, { data: staffs, error: staffsError }] = await Promise.all([
      countIds.length
        ? supabase.from("stock_count_lines").select("stock_count_id, item_id, theoretical_qty, physical_qty, variance_qty, variance_percent, uom, remarks, line_position").in("stock_count_id", countIds).order("line_position", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      staffIds.length
        ? supabase.from("staffs").select("id, full_name").in("id", staffIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (linesError) throw new Error(linesError.message);
    if (staffsError) throw new Error(staffsError.message);

    const itemIds = [...new Set((lines ?? []).map((line) => line.item_id).filter(Boolean))];
    const { data: items, error: itemsError } = itemIds.length
      ? await supabase.from("items").select("id, item_code, item_name").in("id", itemIds)
      : { data: [], error: null };
    if (itemsError) throw new Error(itemsError.message);

    const countById = new Map((counts ?? []).map((count) => [count.id, count]));
    const itemById = new Map((items ?? []).map((item) => [item.id, item]));
    const staffById = new Map((staffs ?? []).map((staff) => [staff.id, staff.full_name]));
    const linesByDate = new Map<string, NonNullable<typeof lines>>();
    for (const line of lines ?? []) {
      const date = countById.get(line.stock_count_id)?.count_date;
      if (!date) continue;
      linesByDate.set(date, [...(linesByDate.get(date) ?? []), line]);
    }

    const headers = ["Item Code", "Item Name", "UOM", "System Qty", "Counted Qty", "Variance", "Variance %", "Remarks", "Count No", "Status", "Submitted By"];
    const worksheets = dates.map((date, index) => {
      const rowsForDate = (linesByDate.get(date) ?? []).map((line) => {
        const count = countById.get(line.stock_count_id);
        const item = itemById.get(line.item_id);
        return [item?.item_code ?? line.item_id, item?.item_name ?? line.item_id, line.uom, Number(line.theoretical_qty), Number(line.physical_qty), Number(line.variance_qty), Number(line.variance_percent) / 100, line.remarks ?? "", count?.count_no ?? "", count?.status ?? "", count?.counted_by ? staffById.get(count.counted_by) ?? count.counted_by : ""];
      });
      return { name: worksheetName(date), path: `xl/worksheets/sheet${index + 1}.xml`, xml: worksheetXml(headers, rowsForDate) };
    });
    const workbookSheets = worksheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
    const workbookRelationships = worksheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
    const files = [
      { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${worksheets.map((sheet) => `<Override PartName="/${sheet.path}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
      { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRelationships}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: "xl/styles.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="165" formatCode="0.00%"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF063F2F"/></patternFill></fill></fills><borders count="1"><border/></borders><cellXfs count="3"><xf/><xf fontId="1" fillId="1" applyFont="1" applyFill="1"/><xf numFmtId="165" applyNumberFormat="1"/></cellXfs></styleSheet>` },
      ...worksheets.map((sheet) => ({ name: sheet.path, content: sheet.xml })),
    ];
    const buffer = makeZip(files);
    const safeBranchCode = String(branch.branch_code ?? branch.branch_name ?? "branch").replace(/[^a-zA-Z0-9_-]+/g, "-");
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="stock-counts-${safeBranchCode}-${input.from}-to-${input.to}.xlsx"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    logServerError(error, { source: "api.export.stock-counts-workbook" });
    const message = error instanceof Error ? error.message : "Stock Count workbook could not be exported.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
