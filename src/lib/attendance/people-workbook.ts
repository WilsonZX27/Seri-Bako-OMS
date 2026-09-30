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
function timeSeconds(value: string | null | undefined) { if (!value) return null; const parts = value.slice(0, 8).split(":").map(Number); if (parts.length < 2 || parts.some(Number.isNaN)) return null; return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0); }
function scheduleSpan(start: string | null | undefined, end: string | null | undefined) { const a = timeSeconds(start); const b = timeSeconds(end); if (a == null || b == null) return null; return b >= a ? b - a : b + 86400 - a; }
function dateLabel(iso: string) { const [year, month, day] = iso.split("-").map(Number); return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`; }
function daysInMonth(month: string) { const [year, monthNumber] = month.split("-").map(Number); return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(); }
function monthDates(month: string) { return Array.from({ length: daysInMonth(month) }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`); }

function sheetXml(sheet: PeopleWorkbookSheet) {
  const dates = monthDates(sheet.month);
  const byDate = new Map(sheet.days.map((day) => [day.date, day]));
  const body: string[] = [];
  body.push(row(1, [sheet.employee, "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""], styles.header));
  body.push(row(2, ["Prepared By", "", "Checked By: Staff", "", "Verified by: Supervisor", "", "Approved by: Manager", "", "", "", "", "", "", "", "", ""], styles.subheader));
  body.push(row(3, ["Signature / date", "", "Signature / date", "", "Signature / date", "", "Signature / date", "", "", "", "", "", "", "", "", ""], styles.label));
  body.push(row(4, ["Name:", sheet.employee, "Staff code:", sheet.staffCode ?? "", "Month:", sheet.month, "", "", "", "", "", "", "", "", "", ""], styles.label));
  body.push(row(5, ["Outlet:", sheet.outlet, "Employment:", sheet.employmentType ? sheet.employmentType.replace("_", " ").toUpperCase() : "", "", "", "", "", "", "", "", "", "", ""], styles.label));
  body.push(row(6, []));
  body.push(row(7, ["Date", "Day", "Working Time", "", "INFO AS PER PUNCH CARD", "", "", "", "Total Working", "OVERTIME", "Short Hours", "PPH(Triple Pay)", "Events / Normal", "Time Out - Time In", "", "Meal Allowance"], styles.header));
  body.push(row(8, ["", "", "AM In", "PM Out", "Time In", "Time Out", "Time In", "Time Out", "Hours", "Hours", "", "", "", "Total Working Time", "", ""], styles.subheader));
  dates.forEach((iso, index) => {
    const day = byDate.get(iso);
    const schedule = day?.off ? ["OFF", ""] : [timeLabel(day?.scheduleStart), timeLabel(day?.scheduleEnd)];
    const punches = (day?.punches ?? []).slice(0, 4).map(timeLabel);
    const span = scheduleSpan(day?.scheduleStart, day?.scheduleEnd);
    const values = [dateLabel(iso), day?.day ?? new Intl.DateTimeFormat("en-MY", { weekday: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)), schedule[0], schedule[1], punches[0] ?? "", punches[1] ?? "", punches[2] ?? "", punches[3] ?? "", durationLabel(day?.workedSeconds), durationLabel(day?.overtimeSeconds), durationLabel(day?.shortHoursSeconds), durationLabel(day?.pphSeconds), day?.off ? "OFF" : "Normal", durationLabel(span), "", ""];
    body.push(row(10 + index, values, day?.off ? styles.off : styles.daily));
  });

  const dailyEnd = 9 + dates.length;
  const blocks: Array<{ start: number; end: number; label: string }> = [];
  let cursor = 1;
  while (cursor <= dates.length) {
    const start = cursor;
    const startDate = new Date(`${dates[start - 1]}T00:00:00Z`);
    const remaining = dates.length - start + 1;
    const length = cursor === 1 ? Math.min(7 - (startDate.getUTCDay() || 7) + 1, remaining) : Math.min(7, remaining);
    const end = start + length - 1;
    const firstDate = dates[start - 1];
    const priorMonth = new Date(`${firstDate}T00:00:00Z`);
    priorMonth.setUTCMonth(priorMonth.getUTCMonth() - 1);
    const continuation = blocks.length === 0 && start === 1 && (new Date(`${firstDate}T00:00:00Z`).getUTCDay() || 7) !== 1;
    const weekNumber = continuation ? 5 : blocks.length + 1;
    blocks.push({ start, end, label: `${continuation ? `(Continues with ${priorMonth.toLocaleString("en-MY", { month: "long" })}) ` : ""}Total Hours (WEEK ${weekNumber}) ${dateLabel(firstDate)}-${dateLabel(dates[end - 1])}` });
    cursor = end + 1;
  }
  const weekStartRow = dailyEnd + 2;
  blocks.forEach((block, index) => {
    const weekOvertime = sheet.days.slice(block.start - 1, block.end).reduce((sum, day) => sum + Number(day.overtimeSeconds ?? 0), 0);
    const weekShort = sheet.days.slice(block.start - 1, block.end).reduce((sum, day) => sum + Number(day.shortHoursSeconds ?? 0), 0);
    const weekPph = sheet.days.slice(block.start - 1, block.end).reduce((sum, day) => sum + Number(day.pphSeconds ?? 0), 0);
    body.push(row(weekStartRow + index * 2, [block.label, "", "", "", "", "", "", "", "", durationLabel(weekOvertime), durationLabel(weekShort), durationLabel(weekPph)], styles.summary));
    body.push(row(weekStartRow + index * 2 + 1, ["Total Hours convert to Minutes", "", "", "", "", "", "", "", "", String(Math.round(weekOvertime / 60)), String(Math.round(weekShort / 60)), String(Math.round(weekPph / 60))], styles.summaryValue));
  });
  const merges = ["A1:P1", "A2:B2", "C2:D2", "E2:F2", "G2:H2", "A7:A8", "B7:B8", "C7:D7", "E7:H7", "I7:I8", "J7:J8", "K7:K8", "L7:L8", "M7:M8", "N7:O7", "P7:P8"];
  const mergeXml = `<mergeCells count="${merges.length}">${merges.map((range) => `<mergeCell ref="${range}"/>`).join("")}</mergeCells>`;
  return `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:P${body.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="8" topLeftCell="A10" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="10" customWidth="1"/><col min="3" max="4" width="12" customWidth="1"/><col min="5" max="8" width="12" customWidth="1"/><col min="9" max="12" width="14" customWidth="1"/><col min="13" max="16" width="15" customWidth="1"/></cols><sheetData>${body.join("")}</sheetData>${mergeXml}<pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

function stylesXml() {
  return `<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="0"/><fonts count="3"><font><sz val="10"/><name val="Aptos"/><family val="2"/><scheme val="minor"/></font><font><b/><sz val="10"/><name val="Aptos"/><family val="2"/><scheme val="minor"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos"/><family val="2"/><scheme val="minor"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B5D45"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2F0DF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8DCC8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="3"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border><border><left style="medium"/><right style="medium"/><top style="medium"/><bottom style="medium"/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0"/><xf numFmtId="0" fontId="2" fillId="2" borderId="2" applyFont="1" applyFill="1" xfId="0"/><xf numFmtId="0" fontId="1" fillId="3" borderId="1" applyFont="1" applyFill="1" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0"/><xf numFmtId="0" fontId="1" fillId="3" borderId="1" applyFont="1" applyFill="1" xfId="0"/><xf numFmtId="0" fontId="0" fillId="3" borderId="1" applyFill="1" xfId="0"/><xf numFmtId="0" fontId="2" fillId="2" borderId="2" applyFont="1" applyFill="1" xfId="0"/><xf numFmtId="0" fontId="1" fillId="4" borderId="2" applyFont="1" applyFill="1" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleMedium9"/></styleSheet>`;
}

function safeSheetName(name: string, index: number, used: Set<string>) { const base = name.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31) || `Employee ${index + 1}`; let candidate = base; let suffix = 2; while (used.has(candidate.toLowerCase())) candidate = `${base.slice(0, 27)} ${suffix++}`; used.add(candidate.toLowerCase()); return candidate; }

export function buildPeopleWorkbook(sheets: PeopleWorkbookSheet[]) {
  const used = new Set<string>();
  const named = sheets.map((sheet, index) => ({ ...sheet, name: safeSheetName(sheet.name, index, used) }));
  const theme = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F497D"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2><a:accent1><a:srgbClr val="4F81BD"/></a:accent1><a:accent2><a:srgbClr val="C0504D"/></a:accent2><a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4><a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme></a:themeElements></a:theme>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Seri Bako OMS</dc:creator><cp:lastModifiedBy>Seri Bako OMS</cp:lastModifiedBy></cp:coreProperties>`;
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Seri Bako OMS</Application><AppVersion>9.2</AppVersion></Properties>`;
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${named.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
    { name: "docProps/core.xml", content: core },
    { name: "docProps/app.xml", content: app },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="24526"/><workbookPr defaultThemeVersion="164011"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="17640"/></bookViews><calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/><sheets>${named.map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${named.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId${named.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>` },
    { name: "xl/styles.xml", content: stylesXml() },
    { name: "xl/theme/theme1.xml", content: theme },
  ];
  named.forEach((sheet, index) => files.push({ name: `xl/worksheets/sheet${index + 1}.xml`, content: sheetXml(sheet) }));
  return zip(files);
}
