import { buildZipArchive } from "./people-workbook";
import { type PayslipExport, payslipMoney } from "./payslip-export";

const xml = (value: unknown) => String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
type Value = string | number | null | { formula: string; cache: number };
/** User text is always inlineStr; only fixed summary formulas become Excel formulas. */
export function buildPayslipWorkbook(slip: PayslipExport) {
  const rows: string[] = [], merges: string[] = [];
  const row = (values: Value[], style = 0, height = 22, styles: Record<number, number> = {}) => {
    const r = rows.length + 1;
    rows.push(`<row r="${r}" ht="${height}" customHeight="1">${values.map((value, i) => {
      const start = `<c r="${String.fromCharCode(65 + i)}${r}" s="${styles[i] ?? style}"`;
      return value == null ? `${start}/>` : typeof value === "object" ? `${start}><f>${value.formula}</f><v>${value.cache}</v></c>` : typeof value === "number" ? `${start}><v>${value}</v></c>` : `${start} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    }).join("")}</row>`);
    return r;
  };
  const wide = (label: string, style = 0, height = 24) => { const r = row([label], style, height); merges.push(`A${r}:D${r}`); };
  const serial = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86400000 + 25569;
  wide("PAYSLIP", 1, 32);
  wide(slip.state === "draft" ? "DRAFT — NOT APPROVED" : `${slip.state.toUpperCase()} · VERSION ${slip.version}`, 1);
  row(["Employee", slip.employee, "Staff ID", slip.staffCode], 0, Math.max(32, Math.ceil(slip.employee.length / 25) * 15));
  row(["Employee record", slip.staffId, "Company", slip.companyId], 0, 36);
  row(["Period start", serial(slip.periodStart), "Period end", serial(slip.periodEnd)], 0, 24, { 1: 3, 3: 3 });
  row(["Version", slip.version, "Currency", slip.currency]);
  row(["Snapshot", slip.id, "Generated (UTC)", slip.generatedAt], 0, 36);
  row(["Approved (UTC)", slip.approvedAt, "Released (UTC)", slip.releasedAt], 0, 36);
  wide("INPUTS · Verified monetary snapshot. No attendance-to-money conversion.");
  row(["Type", "Description", "Earning (MYR)", "Deduction (MYR)"], 1);
  const begin = rows.length + 1;
  for (const line of slip.lines) row([line.kind, line.label, line.kind === "earning" ? line.cents / 100 : null, line.kind === "deduction" ? line.cents / 100 : null], 0, Math.max(24, Math.ceil(line.label.length / 28) * 15), { 2: 2, 3: 2 });
  const end = rows.length;
  const total = row(["CALCULATED", "Amount totals", { formula: `SUM(C${begin}:C${end})`, cache: slip.earningsCents / 100 }, { formula: `SUM(D${begin}:D${end})`, cache: slip.deductionsCents / 100 }], 1, 26, { 2: 2, 3: 2 });
  row(["RESULT", "Net pay (MYR)", { formula: `C${total}-D${total}`, cache: Number(payslipMoney(slip.earningsCents - slip.deductionsCents)) }, null], 1, 28, { 2: 2 });
  wide("Local edits change this file only; they do not approve or update the OMS snapshot.", 0, 30);
  wide("ATTENDANCE SNAPSHOT · Outstanding stays beside its date", 1);
  row(["Date", "Outstanding"], 1);
  for (const day of slip.outstanding) {
    const r = row([serial(day.date), day.label], 0, Math.max(24, Math.ceil(day.label.length / 75) * 14), { 0: 3 });
    merges.push(`B${r}:D${r}`);
  }
  if (!slip.outstanding.length) wide("No attendance rows in this snapshot.");
  row([], 0, 22);
  row(["Prepared by", "Checked by", "Approved by", "Employee signature"], 1);
  row([null, null, null, null], 0, 56);
  wide("Blank signature fields — this export does not contain or create signatures.", 0, 28);
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:D${rows.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="10" topLeftCell="A11" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="23" customWidth="1"/><col min="2" max="2" width="44" customWidth="1"/><col min="3" max="4" width="25" customWidth="1"/></cols><sheetData>${rows.join("")}</sheetData><mergeCells count="${merges.length}">${merges.map(ref => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells><pageMargins left="0.25" right="0.25" top="0.3" bottom="0.3" header="0" footer="0"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><bottom style="thin"><color rgb="FFD8DFDB"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4">${[0, 0, 2, 164].map((fmt, i) => `<xf numFmtId="${fmt}" fontId="${i === 1 ? 1 : 0}" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`).join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return buildZipArchive([
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Payslip" sheetId="1" r:id="r1"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">Payslip!$A$1:$D$${rows.length}</definedName></definedNames><calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="r2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", content: styles }, { name: "xl/worksheets/sheet1.xml", content: sheet },
  ]);
}
