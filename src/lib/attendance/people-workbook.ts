export type PeopleWorkbookDay = {
  date: string;
  day: string;
  outlet: string;
  scheduleStart?: string | null;
  scheduleEnd?: string | null;
  off?: boolean;
  punches?: string[];
  workedSeconds?: number | null;
  overtimeSeconds?: number | null;
  shortHoursSeconds?: number | null;
  pphSeconds?: number | null;
};

export type PeopleWorkbookSheet = {
  name: string;
  employee: string;
  staffCode?: string | null;
  employmentType?: string | null;
  outlet: string;
  month: string;
  basicSalary?: string | number | null;
  days: PeopleWorkbookDay[];
};

const xml = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const crcTable = Array.from({ length: 256 }, (_, index) => { let value = index; for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1; return value >>> 0; });
function crc32(input: Buffer) { let value = 0xffffffff; for (const byte of input) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8); return (value ^ 0xffffffff) >>> 0; }
function zip(files: Array<{ name: string; content: string }>) { const locals: Buffer[] = []; const centrals: Buffer[] = []; let offset = 0; for (const file of files) { const name = Buffer.from(file.name); const content = Buffer.from(file.content); const local = Buffer.alloc(30 + name.length); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc32(content), 14); local.writeUInt32LE(content.length, 18); local.writeUInt32LE(content.length, 22); local.writeUInt16LE(name.length, 26); name.copy(local, 30); locals.push(local, content); const central = Buffer.alloc(46 + name.length); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt32LE(crc32(content), 16); central.writeUInt32LE(content.length, 20); central.writeUInt32LE(content.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42); name.copy(central, 46); centrals.push(central); offset += local.length + content.length; } const directory = Buffer.concat(centrals); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16); return Buffer.concat([...locals, directory, end]); }

const styles = {
  normal: 0,
  label: 1,
  header: 2,
  subheader: 3,
  daily: 4,
  off: 5,
  summary: 6,
  summaryValue: 7,
  section: 8,
  total: 9,
};

function cell(value: unknown, style = styles.normal) {
  return `<c t="inlineStr" s="${style}"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}
function row(index: number, values: unknown[], style = styles.normal) {
  return `<row r="${index}">${values.map((value) => cell(value, style)).join("")}</row>`;
}
function timeLabel(value: string | null | undefined) {
  if (!value) return "";
  const parts = value.slice(0, 8).split(":").map(Number);
  if (parts.length < 2 || parts.some(Number.isNaN)) return value;
  const hour = parts[0] % 12 || 12;
  return `${hour}:${String(parts[1]).padStart(2, "0")}`;
}
function durationLabel(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const absolute = Math.max(0, Math.round(seconds));
  return `${Math.floor(absolute / 3600)}:${String(Math.floor((absolute % 3600) / 60)).padStart(2, "0")}`;
}
function money(value: number) { return `RM${value.toFixed(2)}`; }
function salaryNumber(value: string | number | null | undefined) { const match = String(value ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/); return match ? Number(match[0]) : 0; }
function timeSeconds(value: string | null | undefined) { if (!value) return null; const parts = value.slice(0, 8).split(":").map(Number); if (parts.length < 2 || parts.some(Number.isNaN)) return null; return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0); }
function scheduleSpan(start: string | null | undefined, end: string | null | undefined) { const a = timeSeconds(start); const b = timeSeconds(end); if (a == null || b == null) return null; return b >= a ? b - a : b + 86400 - a; }
function dateLabel(iso: string) { const [year, month, day] = iso.split("-").map(Number); return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`; }
function daysInMonth(month: string) { const [year, monthNumber] = month.split("-").map(Number); return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(); }
function monthDates(month: string) { return Array.from({ length: daysInMonth(month) }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`); }

function sheetXml(sheet: PeopleWorkbookSheet) {
  const dates = monthDates(sheet.month);
  const byDate = new Map(sheet.days.map((day) => [day.date, day]));
  const body: string[] = [];
  body.push(row(1, []));
  body.push(row(2, ["Name:", sheet.employee, "", sheet.employmentType ? `(${sheet.employmentType.replace("_", " ").toUpperCase()})` : "", "Staff code:", sheet.staffCode ?? ""], styles.label));
  body.push(row(3, ["Outlet :", sheet.outlet, "", "", "Basic :", sheet.basicSalary ?? ""], styles.label));
  body.push(row(4, []));
  body.push(row(5, ["Date", "Day", "Working Time", "", "INFO AS PER PUNCH CARD", "", "", "", "Total Working", "OVERTIME", "Short Hours", "PPH(Triple Pay)", "", "Time Out - Time In", ""], styles.header));
  body.push(row(6, ["", "", "AM In", "PM Out", "Time In", "Time Out", "Time In", "Time Out", "Hours", "Hours", "", "", "", "Total Working Time", ""], styles.subheader));
  dates.forEach((iso, index) => {
    const day = byDate.get(iso);
    const schedule = day?.off ? ["OFF", ""] : [timeLabel(day?.scheduleStart), timeLabel(day?.scheduleEnd)];
    const punches = (day?.punches ?? []).slice(0, 4).map(timeLabel);
    const span = scheduleSpan(day?.scheduleStart, day?.scheduleEnd);
    const values = [dateLabel(iso), day?.day ?? new Intl.DateTimeFormat("en-MY", { weekday: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)), schedule[0], schedule[1], punches[0] ?? "", punches[1] ?? "", punches[2] ?? "", punches[3] ?? "", durationLabel(day?.workedSeconds), durationLabel(day?.overtimeSeconds), durationLabel(day?.shortHoursSeconds), durationLabel(day?.pphSeconds), "", durationLabel(span), ""];
    body.push(row(8 + index, values, day?.off ? styles.off : styles.daily));
  });

  const dailyEnd = 7 + dates.length;
  const blocks: Array<{ start: number; end: number; label: string }> = [];
  let cursor = 1;
  while (cursor <= dates.length) {
    const start = cursor;
    const startDate = new Date(`${dates[start - 1]}T00:00:00Z`);
    const remaining = dates.length - start + 1;
    const length = cursor === 1 ? Math.min(7 - (startDate.getUTCDay() || 7) + 1, remaining) : Math.min(7, remaining);
    const end = start + length - 1;
    blocks.push({ start, end, label: `${blocks.length === 0 ? "Total Hours" : `Total Hours (WEEK ${blocks.length})`} ${dateLabel(dates[start - 1])}-${dateLabel(dates[end - 1])}` });
    cursor = end + 1;
  }
  const totalOvertime = sheet.days.reduce((sum, day) => sum + Number(day.overtimeSeconds ?? 0), 0);
  const totalShort = sheet.days.reduce((sum, day) => sum + Number(day.shortHoursSeconds ?? 0), 0);
  const totalPph = sheet.days.reduce((sum, day) => sum + Number(day.pphSeconds ?? 0), 0);
  const hourly = salaryNumber(sheet.basicSalary) / 26 / 8;
  const weekStartRow = dailyEnd + 2;
  blocks.forEach((block, index) => {
    const weekOvertime = sheet.days.slice(block.start - 1, block.end).reduce((sum, day) => sum + Number(day.overtimeSeconds ?? 0), 0);
    const weekShort = sheet.days.slice(block.start - 1, block.end).reduce((sum, day) => sum + Number(day.shortHoursSeconds ?? 0), 0);
    const weekPph = sheet.days.slice(block.start - 1, block.end).reduce((sum, day) => sum + Number(day.pphSeconds ?? 0), 0);
    body.push(row(weekStartRow + index * 2, [block.label, "", "", "", "", "", "", "", "", durationLabel(weekOvertime), durationLabel(weekShort), durationLabel(weekPph)], styles.summary));
    body.push(row(weekStartRow + index * 2 + 1, ["Total Hours convert to Minutes", "", "", "", "", "", "", "", "", String(Math.round(weekOvertime / 60)), String(Math.round(weekShort / 60)), String(Math.round(weekPph / 60))], styles.summaryValue));
  });
  const calcRow = weekStartRow + blocks.length * 2 + 1;
  body.push(row(calcRow, ["Calculation", "", "", "", "", "", "", "", "", "x1.5", "x1", "x3"], styles.section));
  body.push(row(calcRow + 1, [`${salaryNumber(sheet.basicSalary) || "Salary"}/26/8`, "", "", "", "", "", "", "", "", money(hourly * 1.5), money(hourly), money(hourly * 3)], styles.summaryValue));
  body.push(row(calcRow + 2, ["Total Overtime (Overtime & Adhoc) in RM", "", "", "", "", "", "", "", "", money(totalOvertime / 3600 * hourly * 1.5), money(totalShort / 3600 * hourly), money(totalPph / 3600 * hourly * 3), money(totalOvertime / 3600 * hourly * 1.5 - totalShort / 3600 * hourly + totalPph / 3600 * hourly * 3)], styles.total));
  body.push(row(calcRow + 4, ["Salary", "", "", "", "", "", "", "", "", money(salaryNumber(sheet.basicSalary))], styles.summary));
  body.push(row(calcRow + 5, ["Allowance", "", "", "", "", "", "", "", "", ""], styles.summary));
  body.push(row(calcRow + 6, ["Overtime", "", "", "", "", "", "", "", "", money(totalOvertime / 3600 * hourly * 1.5 - totalShort / 3600 * hourly + totalPph / 3600 * hourly * 3)], styles.summary));
  body.push(row(calcRow + 7, ["Grand Total", "", "", "", "", "", "", "", "", money(salaryNumber(sheet.basicSalary) + totalOvertime / 3600 * hourly * 1.5 - totalShort / 3600 * hourly + totalPph / 3600 * hourly * 3)], styles.total));
  const merges = ["C5:D5", "E5:H5", "A5:A6", "B5:B6", "I5:I6", "J5:J6", "K5:K6", "L5:L6", "M5:M6", "N5:N6", "O5:O6"];
  const mergeXml = `<mergeCells count="${merges.length}">${merges.map((range) => `<mergeCell ref="${range}"/>`).join("")}</mergeCells>`;
  return `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="6" topLeftCell="A8" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="10" customWidth="1"/><col min="3" max="4" width="12" customWidth="1"/><col min="5" max="8" width="12" customWidth="1"/><col min="9" max="12" width="14" customWidth="1"/><col min="13" max="15" width="15" customWidth="1"/></cols><sheetData>${body.join("")}</sheetData>${mergeXml}<pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/></worksheet>`;
}

function stylesXml() {
  return `<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="10"/><name val="Aptos"/></font><font><b/><sz val="10"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B5D45"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2F0DF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8DCC8"/></patternFill></fill></fills><borders count="3"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border><border><left style="medium"/><right style="medium"/><top style="medium"/><bottom style="medium"/></border></borders><cellXfs count="10"><xf numFmtId="0" fontId="0" fillId="0" borderId="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="2" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="1" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1"/><xf numFmtId="0" fontId="0" fillId="4" borderId="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="1" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="2" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="1" fillId="4" borderId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;
}

function safeSheetName(name: string, index: number, used: Set<string>) { const base = name.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31) || `Employee ${index + 1}`; let candidate = base; let suffix = 2; while (used.has(candidate.toLowerCase())) candidate = `${base.slice(0, 27)} ${suffix++}`; used.add(candidate.toLowerCase()); return candidate; }

export function buildPeopleWorkbook(sheets: PeopleWorkbookSheet[]) {
  const used = new Set<string>();
  const named = sheets.map((sheet, index) => ({ ...sheet, name: safeSheetName(sheet.name, index, used) }));
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${named.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><calcPr calcMode="auto"/><sheets>${named.map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${named.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", content: stylesXml() },
  ];
  named.forEach((sheet, index) => files.push({ name: `xl/worksheets/sheet${index + 1}.xml`, content: sheetXml(sheet) }));
  return zip(files);
}
