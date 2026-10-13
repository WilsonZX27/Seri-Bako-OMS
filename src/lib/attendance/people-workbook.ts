export type PeopleWorkbookDay = {
  date: string;
  event?: string;
  exceptions?: string;
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
  period?: {start:string;end:string;draft:boolean;generatedAt:string};
  days: PeopleWorkbookDay[];
};

const xml = (value: unknown) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const crcTable = Array.from({ length: 256 }, (_, index) => { let value = index; for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1; return value >>> 0; });
function crc32(input: Buffer) { let value = 0xffffffff; for (const byte of input) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8); return (value ^ 0xffffffff) >>> 0; }
export function buildZipArchive(files: Array<{ name: string; content: string | Buffer }>) { const locals: Buffer[] = []; const centrals: Buffer[] = []; let offset = 0; for (const file of files) { const name = Buffer.from(file.name); const content = Buffer.from(file.content); const local = Buffer.alloc(30 + name.length); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt32LE(crc32(content), 14); local.writeUInt32LE(content.length, 18); local.writeUInt32LE(content.length, 22); local.writeUInt16LE(name.length, 26); name.copy(local, 30); locals.push(local, content); const central = Buffer.alloc(46 + name.length); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8); central.writeUInt32LE(crc32(content), 16); central.writeUInt32LE(content.length, 20); central.writeUInt32LE(content.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42); name.copy(central, 46); centrals.push(central); offset += local.length + content.length; } const directory = Buffer.concat(centrals); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16); return Buffer.concat([...locals, directory, end]); }

// Reviewed attendance values remain inputs; summaries and minute conversions
// are live Excel formulas. No inferred payroll policy is embedded here.
type Value = string | number | null | { formula: string; value: number | null };
const DAY_SECONDS = 86400;
const widths = Array(16).fill(16);
const letter = (column: number) => String.fromCharCode(65 + column);
function cell(value: Value, style: number, address: string) {
  const start = `<c r="${address}" s="${style}"`;
  if (value == null) return `${start}/>`;
  if (typeof value === "object") return `${start}${value.value == null ? ' t="str"' : ''}><f>${xml(value.formula)}</f><v>${value.value ?? ""}</v></c>`;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid workbook number");
    return `${start}><v>${value}</v></c>`;
  }
  return `${start} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}
function row(index: number, values: Value[], style = 16, height = 24, formats: Record<number, number> = {}) {
  return `<row r="${index}" ht="${height}" customHeight="1">${values.map((value, column) => cell(value, formats[column] ?? style, `${letter(column)}${index}`)).join("")}</row>`;
}
function clock(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) throw new Error("Invalid attendance clock");
  const [, h, m, s = "0"] = match;
  if (+h > 23 || +m > 59 || +s > 59) throw new Error("Invalid attendance clock");
  return (+h * 3600 + +m * 60 + +s) / DAY_SECONDS;
}
function duration(value: number | null | undefined) {
  if (value == null) return null;
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid attendance duration");
  return value / DAY_SECONDS;
}
function serial(iso: string) {
  const timestamp = Date.parse(`${iso}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== iso) throw new Error("Invalid attendance date");
  return timestamp / 86400000 + 25569;
}
function dateLabel(iso: string) { return `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`; }
function sheetDates(sheet: PeopleWorkbookSheet) {
  const start = sheet.period?.start ?? `${sheet.month}-01`;
  const end = sheet.period?.end ?? new Date(Date.UTC(Number(sheet.month.slice(0, 4)), Number(sheet.month.slice(5)), 0)).toISOString().slice(0, 10);
  const count = serial(end) - serial(start) + 1;
  if (count < 1 || count > 31) throw new Error("Attendance exports support up to 31 days");
  const dates = Array.from({ length: count }, (_, index) => new Date((serial(start) + index - 25569) * 86400000).toISOString().slice(0, 10));
  const seen = new Set<string>();
  for (const day of sheet.days) {
    serial(day.date);
    if (seen.has(day.date) || !dates.includes(day.date)) throw new Error("Duplicate or out-of-period attendance date");
    seen.add(day.date);
  }
  return dates;
}
function generatedLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid generation timestamp");
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur", day: "2-digit", month: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(date).replace(",", "").replace(/am|pm/g, value => value.toUpperCase());
}
function sheetXml(sheet: PeopleWorkbookSheet) {
  const dates = sheetDates(sheet), byDate = new Map(sheet.days.map(day => [day.date, day]));
  const body: string[] = [], merges = ["A1:D1", "E1:H1", "I1:L1", "N1:P1", "B2:D2", "F2:H2", "J2:L2", "B3:D3", "F3:H3", "J3:L3", "N2:N3", "O2:P3", "A5:A6", "B5:B6", "C5:D5", "E5:H5", ...["I", "J", "K", "L", "M", "N", "O", "P"].map(column => `${column}5:${column}6`)];
  const empty: Value[] = Array(16).fill(null);
  const month = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${dates[0]}T00:00:00Z`)).toUpperCase();
  body.push(row(1, [month, null, null, null, sheet.employee, null, null, null, sheet.outlet, null, null, null, null, sheet.period?.draft === false ? "FINAL" : "DRAFT", null, null], 2, Math.max(32, Math.ceil(Math.max(sheet.employee.length, sheet.outlet.length) / 45) * 20), {12: 10, 13: 17}));
  body.push(row(2, ["Name:", sheet.employee, null, null, "Outlet:", sheet.outlet, null, null, "Period:", `${dates[0]} to ${dates.at(-1)!}`, null, null, null, "Generated on:", generatedLabel(sheet.period?.generatedAt), null], 1, Math.max(18, Math.ceil(Math.max(sheet.employee.length, sheet.outlet.length) / 45) * 15), {12:10,13:1,14:11}));
  // The reference's identification field is retained as an empty layout cell.
  // Attendance exports must not disclose passport/identity numbers.
  body.push(row(3, ["I/C | Passport:", null, null, null, "Staff code:", sheet.staffCode ?? "", null, null, "Employment:", (sheet.employmentType ?? "").replaceAll("_", " ").toUpperCase(), null, null, null, null, null, null], 1, 18, {12:10}));
  body.push(row(4, [], 10, 28));
  body.push(row(5, ["Date", "Day", "WORKING TIME", null, "INFO AS PER FINGERPRINT PUNCH", null, null, null, "Total Working", "OVERTIME", "Short Hours", "PPH\n(Triple Pay)", "Outstanding\nExceptions", "Normal /\nEvents", "Meal\nAllowance", "Remarks"], 12, 27, {12:13}));
  body.push(row(6, [null, null, "AM In", "PM Out", "Time In", "Time Out", "Time In", "Time Out", null, null, null, null, null, null, null, null], 3, 27, {12:13}));
  body.push(row(7, empty, 16, 17, {12:4}));
  const numericRows: Array<Array<number | null>> = [];
  dates.forEach((iso, index) => {
    const day = byDate.get(iso), r = index + 8;
    const punches = (day?.punches ?? []).map(clock);
    const issues = [day?.exceptions, !day && "No source record", punches.length > 4 && "See remarks"].filter(Boolean).join("; ");
    // These are the reviewed OMS results, not a guessed pay/rounding policy.
    // Formula summaries below reference these editable, typed duration inputs.
    const worked = duration(day?.workedSeconds), ot = duration(day?.overtimeSeconds), short = duration(day?.shortHoursSeconds);
    const complete = punches.length === 2 || punches.length === 4;
    const span = (a: number, b: number) => (b - a + 1) % 1;
    const interval = complete && punches.every(value => value != null) ? span(punches[0]!, punches[1]!) + (punches.length === 4 ? span(punches[2]!, punches[3]!) : 0) : null;
    // Use the punch formula only when its cached result matches the existing
    // reviewed export policy. Adjusted/inferred durations remain source inputs.
    const matchesSource = worked != null && interval != null && Math.abs(worked - interval) < 1e-9 && interval <= span(punches[0]!, punches.at(-1)!) + 1e-9;
    const punchFormula = `IF(COUNT(E${r}:H${r})=4,IF(MOD(F${r}-E${r},1)+MOD(H${r}-G${r},1)<=MOD(H${r}-E${r},1)+0.000000001,MOD(F${r}-E${r},1)+MOD(H${r}-G${r},1),""),IF(AND(COUNT(E${r}:F${r})=2,COUNT(G${r}:H${r})=0),MOD(F${r}-E${r},1),""))`;
    const totalWorking: Value = matchesSource ? {formula:punchFormula,value:worked} : worked;
    const values: Value[] = [serial(iso), new Intl.DateTimeFormat("en-MY", { weekday: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)), day?.off ? "OFF" : clock(day?.scheduleStart), day?.off ? null : clock(day?.scheduleEnd), ...Array.from({ length: 4 }, (_, i) => punches[i] ?? null), totalWorking, ot, short, null, issues, day?.event ?? (day?.off ? "OFF" : ""), null, punches.length > 4 ? `All punches: ${(day?.punches ?? []).join(", ")}` : ""];
    numericRows.push([ot, short, null]);
    body.push(row(r, values, 16, Math.max(17, Math.ceil(issues.length / 14) * 14, punches.length > 4 ? 48 : 0), {0:5,2:day?.off?16:6,3:6,4:6,5:6,6:6,7:6,8:7,9:7,10:7,11:7,12:4}));
  });
  let next = dates.length + 8;
  body.push(row(next++, [], 10, 17));
  let begin = 0, week = 1;
  while (begin < dates.length) {
    let end = begin;
    while (end + 1 < dates.length && new Date(`${dates[end]}T00:00:00Z`).getUTCDay() !== 0) end++;
    const values: Value[] = Array(12).fill(null), minutes: Value[] = Array(12).fill(null);
    values[0] = `Total Hours (WEEK ${week++}) ${dateLabel(dates[begin])}-${dateLabel(dates[end])}`;
    minutes[0] = "Total Hours convert to Minutes";
    [9,10,11].forEach((column, position) => {
      const selected = numericRows.slice(begin,end+1).map(values=>values[position]).filter((value):value is number=>value!=null);
      const cache = selected.length ? selected.reduce((sum,value)=>sum+value,0) : null;
      const c=letter(column), range=`${c}${begin+8}:${c}${end+8}`;
      values[column]={formula:`IF(COUNT(${range})=0,"",SUM(${range}))`,value:cache};
      minutes[column]={formula:`IF(ISNUMBER(${c}${next}),${c}${next}*1440,"")`,value:cache==null?null:cache*1440};
    });
    merges.push(`A${next}:I${next}`,`A${next+1}:I${next+1}`);
    body.push(row(next,values,3,19,{9:8,10:8,11:8}));
    body.push(row(next+1,minutes,14,19,{9:15,10:15,11:15}));
    next+=2; begin=end+1;
  }
  body.push(row(next++, [], 10, 52));
  const signatureRow=next;
  for(const column of [0,4,8,12]) {
    merges.push(`${letter(column)}${next}:${letter(column+3)}${next}`);
    merges.push(`${letter(column)}${next+1}:${letter(column+3)}${next+1}`);
  }
  const signatures=[...empty]; ["Prepared By","Checked By","Verified By","Approved By"].forEach((value,index)=>signatures[index*4]=value);
  body.push(row(next++,signatures,3,19));
  body.push(row(next,empty,16,56));
  const worksheetXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:P${next}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="7" topLeftCell="A8" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="17"/><cols>${widths.map((width,i)=>`<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${body.join("")}</sheetData><mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join("")}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.15" right="0.15" top="0.15" bottom="0.15" header="0" footer="0"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="${dates.length<=7?1:0}"/></worksheet>`;
  return {xml:worksheetXml,lastRow:next,signatureRow};
}
function stylesXml() {
  const xf=(format:number,font:number,fill:number,align="center",border=1)=>`<xf numFmtId="${format}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="${align}" vertical="center" wrapText="1"/></xf>`;
  return `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="h:mm am/pm"/><numFmt numFmtId="166" formatCode="[h]:mm"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Arial Narrow"/></font><font><b/><sz val="11"/><name val="Arial Narrow"/></font><font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Arial Narrow"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Arial Narrow"/></font></fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B5D45"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2F0DF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8DCC8"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="18">${xf(0,0,0,"left",0)}${xf(0,1,0,"left")}${xf(0,3,2,"left")}${xf(0,1,3)}${xf(0,0,4)}${xf(164,0,0)}${xf(165,0,0)}${xf(166,0,0)}${xf(166,1,3,"left")}${xf(2,1,3)}${xf(0,0,0,"left",0)}${xf(0,1,0)}${xf(0,2,2)}${xf(0,1,4)}${xf(0,0,5)}${xf(0,0,5,"left")}${xf(0,0,0)}${xf(0,3,2)}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

function safeSheetName(name: string, index: number, used: Set<string>) { const base = name.replace(/[\\/*?:[\]\u0000-\u001F]/g, " ").trim().replace(/^'+|'+$/g, "").slice(0, 31).replace(/'+$/g, "") || `Employee ${index + 1}`; let candidate = base; let suffix = 2; while (used.has(candidate.toLowerCase())) candidate = `${base.slice(0, 27)} ${suffix++}`; used.add(candidate.toLowerCase()); return candidate; }

export function buildPeopleWorkbook(sheets: PeopleWorkbookSheet[]) {
  if (!sheets.length) throw new Error("At least one employee sheet is required.");
  const used = new Set<string>();
  const named = sheets.map((sheet, index) => ({ ...sheet, name: safeSheetName(sheet.name, index, used) }));
  const rendered = named.map(sheetXml);
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Seri Bako OMS</dc:creator><cp:lastModifiedBy>Seri Bako OMS</cp:lastModifiedBy></cp:coreProperties>`;
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Seri Bako OMS</Application><AppVersion>9.2</AppVersion></Properties>`;
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${named.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
    { name: "docProps/core.xml", content: core },
    { name: "docProps/app.xml", content: app },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="24526"/><workbookPr defaultThemeVersion="164011"/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="17640"/></bookViews><sheets>${named.map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets><definedNames>${named.map((sheet,index) => `<definedName name="_xlnm.Print_Area" localSheetId="${index}">${xml("'" + sheet.name.replaceAll("'", "''") + "'!$A$1:$P$" + rendered[index].lastRow)}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="${index}">${xml("'" + sheet.name.replaceAll("'", "''") + "'!$1:$7")}</definedName>`).join("")}</definedNames><calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${named.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", content: stylesXml() },
  ];
  rendered.forEach((sheet, index) => files.push({ name: `xl/worksheets/sheet${index + 1}.xml`, content: sheet.xml }));
  return buildZipArchive(files);
}
