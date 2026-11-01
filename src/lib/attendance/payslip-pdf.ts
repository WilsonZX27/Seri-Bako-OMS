import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createFont } from "fonteditor-core";
import { type PayslipExport, payslipMoney } from "./payslip-export";

export async function buildPayslipPdf(slip: PayslipExport) {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const source = await readFile(path.join(process.cwd(), "src/lib/attendance/fonts/NotoSansSC-Regular.ttf"));
  const characters = new Set([...JSON.stringify(slip), ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)), "—", "·"]);
  const compact = createFont(source, { type: "ttf", subset: [...characters].map(char => char.codePointAt(0)!), compound2simple: true });
  const font = await doc.embedFont(compact.write({ type: "ttf" }) as Buffer, { subset: false });
  doc.setTitle(`Payslip v${slip.version} · ${slip.state}`); doc.setSubject("Verified monetary snapshot; blank signature fields");
  const ink = rgb(.08, .16, .13), muted = rgb(.35, .4, .38), border = rgb(.82, .86, .84);
  let page = doc.addPage([595.28, 841.89]), y = 0;
  const wrap = (value: string, width: number, size = 9) => {
    const lines: string[] = []; let line = "";
    for (const char of value.replace(/[\r\n\t]+/g, " ")) {
      if (line && font.widthOfTextAtSize(line + char, size) > width) { lines.push(line); line = ""; }
      line += char;
    }
    if (line) lines.push(line); return lines.length ? lines : [""];
  };
  const newPage = (continued = false) => {
    if (continued) page = doc.addPage([595.28, 841.89]);
    if (slip.state === "draft") page.drawText("DRAFT", { x: 105, y: 340, size: 70, font, color: rgb(.92, .92, .92), rotate: degrees(35) });
    page.drawText("PAYSLIP", { x: 36, y: 797, size: 20, font, color: ink });
    page.drawText(`${slip.state === "draft" ? "DRAFT — NOT APPROVED" : slip.state.toUpperCase()} · VERSION ${slip.version}${continued ? " · continued" : ""}`, { x: 36, y: 776, size: 10, font, color: ink });
    y = 751;
  };
  newPage();
  const room = (height: number) => { if (y - height < 60) newPage(true); };
  const paragraph = (value: string, size = 9) => {
    for (const line of wrap(value, 523, size)) { room(size + 6); page.drawText(line, { x: 36, y, size, font, color: ink }); y -= size + 6; }
  };
  paragraph(`${slip.employee} · Staff ID: ${slip.staffCode || "Not recorded"}`, 12);
  paragraph(`Employee record: ${slip.staffId}`);
  paragraph(`Company: ${slip.companyId}`);
  paragraph(`Period: ${slip.periodStart} to ${slip.periodEnd} · Currency: MYR`);
  paragraph(`Snapshot: ${slip.id}`);
  paragraph(`Generated (UTC): ${slip.generatedAt}`, 8);
  paragraph(`Approved (UTC): ${slip.approvedAt ?? "Not approved"} · Released (UTC): ${slip.releasedAt ?? "Not released"}`, 8);
  y -= 10;
  paragraph("Verified monetary inputs", 11);
  const columns = [36, 101, 377, 468], widths = [59, 270, 85, 91];
  const tableRow = (values: string[], heading = false) => {
    const lines = values.map((value, i) => wrap(value, widths[i], 9));
    const height = Math.max(25, ...lines.map(line => line.length * 13 + 10));
    if (y - height < 60) {
      newPage(true);
      if (!heading) tableRow(["Type", "Description", "Earning MYR", "Deduction MYR"], true);
    }
    lines.forEach((ls, i) => ls.forEach((line, n) => page.drawText(line, { x: columns[i], y: y - 13 - n * 13, size: 9, font, color: heading ? ink : muted })));
    y -= height; page.drawLine({ start: { x: 36, y }, end: { x: 559, y }, thickness: .5, color: border });
  };
  tableRow(["Type", "Description", "Earning MYR", "Deduction MYR"], true);
  for (const line of slip.lines) tableRow([line.kind, line.label, line.kind === "earning" ? payslipMoney(line.cents) : "", line.kind === "deduction" ? payslipMoney(line.cents) : ""]);
  tableRow(["Total", "Calculated amount totals", payslipMoney(slip.earningsCents), payslipMoney(slip.deductionsCents)], true);
  y -= 15;
  paragraph(`Net pay (MYR): ${payslipMoney(slip.earningsCents - slip.deductionsCents)}`, 14);
  paragraph("Amounts come from the verified snapshot. No OT, PPH or short-hours monetary conversion is applied.", 8);
  y -= 12;
  paragraph("Attendance snapshot · Outstanding", 11);
  for (const day of slip.outstanding) {
    const lines = wrap(day.label, 420, 9), height = Math.max(24, lines.length * 13 + 10);
    if (y - height < 60) { newPage(true); paragraph("Attendance snapshot · Outstanding (continued)", 11); }
    page.drawText(day.date, { x: 36, y: y - 13, size: 9, font, color: ink });
    lines.forEach((line, n) => page.drawText(line, { x: 134, y: y - 13 - n * 13, size: 9, font, color: muted }));
    y -= height; page.drawLine({ start: { x: 36, y }, end: { x: 559, y }, thickness: .5, color: border });
  }
  if (!slip.outstanding.length) paragraph("No attendance rows in this snapshot.");
  if (y < 170) newPage(true);
  // Blank fields on the last page only; approval metadata is never rendered as a signature.
  ["Prepared by", "Checked by", "Approved by", "Employee signature"].forEach((label, i) => {
    const x = 36 + i * 133;
    page.drawText(label, { x, y: 133, size: 8, font, color: ink });
    page.drawLine({ start: { x, y: 87 }, end: { x: x + 118, y: 87 }, thickness: .5, color: border });
  });
  page.drawText("Blank signature fields — this export does not contain or create signatures.", { x: 36, y: 66, size: 8, font, color: muted });
  doc.getPages().forEach((p, i) => p.drawText(`${slip.id} · v${slip.version} · ${slip.state} · ${i + 1}/${doc.getPageCount()}`, { x: 36, y: 27, size: 7, font, color: muted }));
  return Buffer.from(await doc.save());
}
