export type ScheduleImportRule = { branchId?: string; destinationId?: string; staffId?: string; start?: string; end?: string; year?: string; kind?: ScheduleWorkbookAssignment["assignment_kind"] };
export const scheduleSourceProfile = (name: string) => name.normalize("NFKC").toLowerCase().replace(/\.xlsx$/i, "").replace(/\(\d+\)/g, "").replace(/\b(?:20\d{2}|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/gi, "").replace(/[^\p{L}]+/gu, " ").trim();
export const scheduleRuleKey = (profile: string, type: string, branch: string, value: string) => JSON.stringify([profile,type,branch,normaliseScheduleName(value)]);
export type ScheduleOtResolution = {kind:"shift"|"off"|"ro"|"separate";start?:string;end?:string;breakMinutes?:number;capMinutes?:number;reason:string};
export type ScheduleOtReview = {key:string;sheet:string;employee:string;date:string;value:string;noteOnly:boolean;confirmed:boolean};
const hasOt=(text:string)=>/(?:^|[^A-Z])OT(?:$|[^A-Z])/i.test(text);
export type ScheduleImportCatalog = {
  import_rules?: Record<string, ScheduleImportRule>;
  fingerprint_exempt_staff?: string[];
  can_manage_exemptions?: boolean;
  import_history?: Array<{id:string;fileName:string;createdAt:string;outcomes:Array<{branch_id:string;assignments:number}>}>;
  branches: Array<{ id: string; name: string; status: string }>;
  staff: Array<{ id: string; name: string; staff_code?: string | null; aliases?: string[]; branch_id: string; home_branch_id?: string | null; eligibility?: Array<{ from: string; to: string | null }> }>;
  current_assignments: Array<Record<string, unknown>>;
};

export type ScheduleWorkbookAssignment = {
  staff_id: string;
  work_date: string;
  assignment_kind: "shift" | "off" | "ph" | "al" | "mc" | "upl" | "ro" | "oil";
  shift_template_id: string | null;
  custom_start?: string;
  custom_end?: string;
  custom_crosses_midnight?: boolean;
  custom_break_seconds?: number;
  custom_maximum_recognised_seconds?: number;
  custom_reason?: string;
  work_site_label?: string | null;
};

export type ScheduleWorkbookIssue = {
  sheet: string;
  employee?: string;
  date?: string;
  value?: string;
  reason: string;
  suggestedWeekStart?: string;
  message: string;
};

export type ScheduleWorkbookPreview = {
  fileName: string;
  fileHash: string;
  weekStart: string;
  weekEnd: string;
  outlets: Array<{ branchId: string; branchName: string; status: string; assignments: ScheduleWorkbookAssignment[] }>;
  issues: ScheduleWorkbookIssue[];
  destinationReviews: Array<{key:string;sheet:string;row:number;date:string;value:string;selected:string;candidates:Array<{id:string;name:string}>}>;
  shiftConflicts: Array<{key: string; employee: string; date: string; selected: string; choices: Array<{key: string; label: string}>}>;
  notes: Array<{sheet:string;range:string;text:string;fill:string;font:string;columnHeaders:string[];relatedCells:string[]}>;
  notices: string[];
  employeeMatches: ScheduleEmployeeMatch[];
  assignmentSources: Array<{ staffId: string; date: string; branchId: string; sources: Array<{ sheet: string; row: number; kind: "shift" | "destination_marker" }> }>;
  assignmentCount: number;
  sheets: string[];
  files: Array<{name:string;hash:string;profile:string}>;
  sheetBranches: Record<string,string>;
  reusableRules: Record<string,ScheduleImportRule>;
  namedShifts: Array<{key:string;sheet:string;label:string}>;
  resolved: string[];
  otReviews: ScheduleOtReview[];
  untimedDuties: Array<{branchId:string;staffId:string;date:string;label:string;sheet:string}>;
  missingEndTimes: string[];
  missingEndTimeSources: Array<{key:string;sheet:string;start:string}>;
};

export type ScheduleEmployeeMatch = {
  key: string; ruleKey?: string; sheet: string; row: number; branchId: string;
  employee: string; staffCode: string; staffId: string | null;
  method: "staff_id" | "name" | "keywords" | "manual" | "unresolved";
  reason: string; candidates: string[];
};

// Numeric display padding is not an identity distinction. Ambiguous canonical
// IDs remain unresolved instead of picking the first catalogue entry.
export const normaliseScheduleStaffCode = (value: unknown) => {
  const text = String(value ?? "").normalize("NFKC").trim().toUpperCase();
  return /^\d+$/.test(text) ? text.replace(/^0+(?=\d)/, "") : text;
};
export const normaliseScheduleName = (value: unknown) => String(value ?? "")
  .normalize("NFKC").toLowerCase().replace(/[\p{P}\p{S}]/gu, " ").replace(/\s+/g, " ").trim()
  .replace(/(?<=\p{Script=Han})\s+(?=\p{Script=Han})/gu, "");
function nameKeywordsMatch(source: string, target: string) {
  const a = normaliseScheduleName(source), b = normaliseScheduleName(target);
  if (!a || !b) return false;
  if (a === b) return true;
  const short = a.length <= b.length ? a : b, long = a.length <= b.length ? b : a;
  // Whole words only. Short/common fragments are never enough for auto matching.
  const words = short.split(" "), available = new Set(long.split(" "));
  return words.every(word => available.has(word)) &&
    (words.length === 1 ? /^[a-z]{4,}$/i.test(short) : words.join("").length >= 5);
}
export function matchScheduleEmployee(
  source: { employee: string; staffCode: string; branchId: string },
  people: ScheduleImportCatalog["staff"], manualStaffId?: string,
): Pick<ScheduleEmployeeMatch, "staffId" | "method" | "reason" | "candidates"> {
  const authorisedPeople = [...new Map(people.map(p => [p.id,p])).values()];
  const scoped = [...new Map(people.filter(p => p.branch_id === source.branchId).map(p => [p.id, p])).values()];
  const names = (p: typeof scoped[number]) => [p.name, ...(p.aliases ?? [])];
  const exact = scoped.filter(p => names(p).some(n => normaliseScheduleName(n) === normaliseScheduleName(source.employee) && normaliseScheduleName(n)));
  const keywords = scoped.filter(p => names(p).some(n => nameKeywordsMatch(source.employee, n)));
  const code = normaliseScheduleStaffCode(source.staffCode);
  const ids = code ? scoped.filter(p => normaliseScheduleStaffCode(p.staff_code) === code) : [];
  const candidates = [...new Set([...ids, ...exact, ...keywords].map(p => p.id))];
  const unresolved = (reason: string) => ({ staffId: null, method: "unresolved" as const, reason, candidates });
  if (manualStaffId) {
    const person = scoped.find(p => p.id === manualStaffId);
    return person ? { staffId: person.id, method: "manual", reason: "Employee selected for this source row.", candidates } : unresolved("Selected employee is no longer available at this outlet. Choose again.");
  }
  if (code) {
    if (authorisedPeople.filter(p => normaliseScheduleStaffCode(p.staff_code) === code).length > 1) return unresolved("Staff ID belongs to multiple employees. Choose the correct employee.");
    if (!ids.length) return unresolved("Staff ID was not found at this outlet. Confirm the employee.");
    const person = ids[0];
    if (exact.some(p => p.id !== person.id) || (source.employee && !names(person).some(n => nameKeywordsMatch(source.employee,n))))
      return unresolved("Staff ID and name disagree. Confirm the employee.");
    return { staffId: person.id, method: "staff_id", reason: "Matched by Staff ID; name is compatible.", candidates };
  }
  if (exact.length > 1) return unresolved("Several employees have this name. Choose the correct employee.");
  if (exact.length === 1) return {staffId: exact[0].id, method: "name", reason: "Matched by normalised name.", candidates};
  if (authorisedPeople.filter(p => names(p).some(n => nameKeywordsMatch(source.employee,n))).length > 1) return unresolved("Name keywords match several employees. Choose the correct employee.");
  if (keywords.length === 1) return {staffId: keywords[0].id, method: "keywords", reason: "Matched by unique whole-name keywords.", candidates};
  return unresolved("No matching employee at this outlet. Choose an employee.");
}

export const SCHEDULE_SHEET_BRANCHES: Record<string, string> = {
  "GURNEY PLAZA": "Gurney Plaza",
  QUEENSBAY: "Queensbay Mall",
  PUBLIKA: "Kwan Kee @ Publika",
  "IOI PUCHONG": "IOI Mall Puchong",
  "JAKEL SQUARE": "Jakel Mall",
  TRX: "TRX",
  "PETALING STREET": "Kwan Kee Store @ Petaling Street",
  "SUNWAY PYRAMID": "Kwan Kee Store @ Sunway Pyramid",
  "MID VALLEY": "Kwan Kee Store @ Mid Valley",
  VELOCITY: "Kwan Kee Store @ Sunway Velocity",
};
const KINDS: Record<string, ScheduleWorkbookAssignment["assignment_kind"]> = {
  "M/C": "mc", OFF: "off", "OFF DAY": "off", PH: "ph", AL: "al", MC: "mc", UPL: "upl", RO: "ro", OIL: "oil",
};
const BLOCKED = new Set(["CLEAR OT", "LATE"]);
const LOCATION_ALIASES: Record<string, string> = {
  ...SCHEDULE_SHEET_BRANCHES,
  GURNEY: "Gurney Plaza",
  PUBLIKA: "Kwan Kee @ Publika",
  PYRAMID: "Kwan Kee Store @ Sunway Pyramid",
  "SUNWAY PYRAMID": "Kwan Kee Store @ Sunway Pyramid",
  "PETALING STREET": "Kwan Kee Store @ Petaling Street",
  "MID VALLEY OUTLET": "Kwan Kee Store @ Mid Valley",
  "MID VALLEY": "Kwan Kee Store @ Mid Valley",
  "CK ALMA": "CK @ ALMA",
  "CK PJS10": "CK @ PJS10",
  IOI: "IOI Mall Puchong",
  "IOI PUCHONG": "IOI Mall Puchong",
  "SHINE TRX": "TRX",
  TRX: "TRX",
};
const LOCATION_MARKERS = new Set([...Object.keys(LOCATION_ALIASES), "EVENT BUKIT JALIL"]);
const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;
const MAX_XML_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_XML_BYTES = 48 * 1024 * 1024;
const clean = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ");
const cellText = (value: unknown) => value === 0 ? "" : clean(value);
const key = (value: unknown) => clean(value).toLocaleLowerCase();
const addDays = (day: string, amount: number) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};
const columnIndex = (reference: string) => [...reference.replace(/\d+/g, "")].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
const decodeXml = (value: string) => value.replace(/<[^>]+>/g, "").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'");

async function inflateRaw(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Uint8Array(await new Response(new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
}

async function unzip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) if (view.getUint32(index, true) === 0x06054b50) { eocd = index; break; }
  if (eocd < 0) throw new Error("This is not a valid XLSX workbook.");
  const files = new Map<string, string>(), decoder = new TextDecoder();
  let expandedBytes = 0;
  let cursor = view.getUint32(eocd + 16, true);
  for (let entry = 0; entry < view.getUint16(eocd + 10, true); entry += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true), size = view.getUint32(cursor + 20, true), expandedSize = view.getUint32(cursor + 24, true), nameLength = view.getUint16(cursor + 28, true), extraLength = view.getUint16(cursor + 30, true), commentLength = view.getUint16(cursor + 32, true), localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    const required = name === "xl/workbook.xml" || name === "xl/_rels/workbook.xml.rels" || name === "xl/sharedStrings.xml" || name === "xl/styles.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(name);
    if (!required) { cursor += 46 + nameLength + extraLength + commentLength; continue; }
    expandedBytes += expandedSize;
    if (expandedSize > MAX_XML_BYTES || expandedBytes > MAX_TOTAL_XML_BYTES) throw new Error("This workbook is too large to preview safely.");
    const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    const compressed = bytes.slice(start, start + size), content = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (content) files.set(name, decoder.decode(content));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function workbookSheets(files: Map<string, string>) {
  const shared = [...(files.get("xl/sharedStrings.xml") ?? "").matchAll(/<si[\s\S]*?<\/si>/g)].map((match) => decodeXml(match[0]));
  const stylesXml = files.get("xl/styles.xml") ?? "";
  const colourKey = (attributes: string) => {
    const kind = ["rgb", "indexed", "theme", "auto"].find(kind => attributes.includes(`${kind}="`));
    if (!kind) return "";
    const value=attributes.match(new RegExp(`${kind}="([^\"]+)"`))?.[1] ?? "";
    const tint=attributes.match(/tint="([^\"]+)"/)?.[1];
    return `${kind}:${value}${tint ? `;tint:${tint}` : ""}`;
  };
  const fontKeys = [...(stylesXml.match(/<fonts[^>]*>([\s\S]*?)<\/fonts>/)?.[1] ?? "").matchAll(/<font>([\s\S]*?)<\/font>/g)].map(match => colourKey(match[1].match(/<color\s+([^>]+)\/?/i)?.[1] ?? ""));
  const styleFontKeys = [...(stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "").matchAll(/<xf\s+([^>]+)\/?/g)].map(match => fontKeys[Number(match[1].match(/fontId="(\d+)"/)?.[1] ?? 0)] ?? "");
  const fillKeys = [...(stylesXml.match(/<fills[^>]*>([\s\S]*?)<\/fills>/)?.[1] ?? "").matchAll(/<fill>([\s\S]*?)<\/fill>/g)].map((match) => {
    const colour = match[1].match(/<fgColor\s+([^>]+)\/?/i)?.[1] ?? "";
    return colourKey(colour);
  });
  const numberFormats = new Map([...stylesXml.matchAll(/<numFmt\s+([^>]+)\/?/g)].map(m => [Number(m[1].match(/numFmtId="(\d+)"/)?.[1]), decodeXml(m[1].match(/formatCode="([^"]+)"/)?.[1] ?? "")]));
  const styleNumberFormats = [...(stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "").matchAll(/<xf\s+([^>]+)\/?/g)].map(m => numberFormats.get(Number(m[1].match(/numFmtId="(\d+)"/)?.[1])) ?? "");
  const styleFillKeys = [...(stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "").matchAll(/<xf\s+([^>]+)\/?/g)].map((match) => fillKeys[Number(match[1].match(/fillId="(\d+)"/)?.[1] ?? 0)] ?? "");
  const relationships = new Map([...((files.get("xl/_rels/workbook.xml.rels") ?? "").matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g))].map((match) => [match[1], `xl/${match[2].replace(/^\//, "").replace(/^xl\//, "")}`]));
  const workbook = files.get("xl/workbook.xml") ?? "";
  return [...workbook.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*(?:r:id|id)="([^"]+)"[^>]*\/>/g)].map((match) => {
    const xml = files.get(relationships.get(match[2]) ?? "") ?? "", rows = new Map<number, Map<number, string | number>>(), identifiers = new Map<number, Map<number, string>>(), fills = new Map<number, Map<number, string>>(), fontColours = new Map<number, Map<number,string>>(), mergedRanges = new Map<string,string>(), mergedCells = new Map<string, readonly [number, number]>();
    const hiddenRows = new Set<number>(), hiddenColumns = new Set<number>();
    for (const tag of xml.matchAll(/<row\b([^>]*)>/g)) if (/\bhidden="(?:1|true)"/.test(tag[1])) hiddenRows.add(Number(tag[1].match(/\br="(\d+)"/)?.[1]));
    for (const tag of xml.matchAll(/<col\b([^>]*)>/g)) if (/\bhidden="(?:1|true)"/.test(tag[1])) {
      const min = Number(tag[1].match(/\bmin="(\d+)"/)?.[1]), max = Number(tag[1].match(/\bmax="(\d+)"/)?.[1]);
      for (let column = Math.max(1, min); column <= Math.min(16384, max); column++) hiddenColumns.add(column - 1);
    }
    for (const rowMatch of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const row = new Map<number, string | number>(), rowIdentifiers = new Map<number, string>(), rowFills = new Map<number, string>(), rowFonts = new Map<number,string>();
      for (const cell of (rowMatch[2] ?? "").matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const reference = cell[1].match(/\br="([A-Z]+\d+)"/)?.[1];
        if (!reference) continue;
        const type = cell[1].match(/\bt="([^"]+)"/)?.[1], body = cell[2] ?? "", raw = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
        const column = columnIndex(reference), styleIndex = Number(cell[1].match(/\bs="(\d+)"/)?.[1] ?? 0);
        row.set(column, type === "s" ? shared[Number(raw)] ?? "" : type === "inlineStr" || type === "str" ? decodeXml(raw) : raw === "" ? "" : Number.isFinite(Number(raw)) ? Number(raw) : decodeXml(raw));
        const format = styleNumberFormats[styleIndex];
        if ((!type || type === "n") && /^\d+$/.test(raw)) rowIdentifiers.set(column, /^0+$/.test(format) ? raw.padStart(format.length, "0") : raw);
        if (styleFontKeys[styleIndex]) rowFonts.set(column,styleFontKeys[styleIndex]);
        if (styleFillKeys[styleIndex]) rowFills.set(column, styleFillKeys[styleIndex]);
      }
      rows.set(Number(rowMatch[1]), row);
      fills.set(Number(rowMatch[1]), rowFills);
      fontColours.set(Number(rowMatch[1]),rowFonts);
      identifiers.set(Number(rowMatch[1]), rowIdentifiers);
    }
    for (const merged of xml.matchAll(/<mergeCell\s+ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"\s*\/>/g)) {
      const startColumn = columnIndex(`${merged[1]}${merged[2]}`), startRow = Number(merged[2]), endColumn = columnIndex(`${merged[3]}${merged[4]}`), endRow = Number(merged[4]);
      mergedRanges.set(`${startRow}:${startColumn}`,`${merged[1]}${merged[2]}:${merged[3]}${merged[4]}`);
      for (let row = startRow; row <= endRow; row += 1) for (let column = startColumn; column <= endColumn; column += 1) mergedCells.set(`${row}:${column}`, [startRow, startColumn]);
    }
    return { name: decodeXml(match[1]), hidden: /\bstate="(?:hidden|veryHidden)"/.test(match[0]), rows, fills, fontColours, mergedRanges, mergedCells, identifiers, hiddenRows, hiddenColumns };
  });
}

export function scheduleTime(value: unknown) {
  if (typeof value === "string") {
    const normalized = clean(value).replace(/:\s*(AM|PM)$/i, "$1").replace(/^(\d{1,2})(\d{2})(AM|PM)$/i, "$1:$2$3").replace(/^(\d{1,2})(AM|PM)$/i, "$1:00$2");
    const match = normalized.match(/^(\d{1,2})[.:](\d{2})\s*(AM|PM)?$/i);
    if (!match) return null;
    let hour = Number(match[1]); const minute = Number(match[2]);
    if (minute > 59 || (match[3] ? hour < 1 || hour > 12 : hour > 23)) return null;
    if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  if (typeof value !== "number" || value < 0 || value >= 1) return null;
  const minutes = Math.round(value * 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

const time = scheduleTime;
export function scheduleOtResolutionError(decision?:ScheduleOtResolution,noteOnly=false):string|null {
  if(!decision?.reason.trim())return "Enter the special conditions for this case.";
  if(decision.reason.length>1000)return "Keep the instructions within 1,000 characters.";
  if(!["shift","off","ro","separate"].includes(decision.kind)||(noteOnly&&decision.kind!=="separate"))return "Choose how this source item will be handled.";
  if(decision.kind!=="shift")return null;
  if(!time(decision.start)||!time(decision.end))return "Choose both check-in and check-out times.";
  const start=Number(decision.start!.slice(0,2))*60+Number(decision.start!.slice(3)),end=Number(decision.end!.slice(0,2))*60+Number(decision.end!.slice(3));
  const minutes=(end-start+1440)%1440;
  if(!minutes||minutes>960)return "Confirm a working span between 1 minute and 16 hours.";
  if(!Number.isInteger(decision.breakMinutes)||decision.breakMinutes!<0||decision.breakMinutes!>=minutes)return "Break must be a whole number of minutes shorter than the shift.";
  if(!Number.isInteger(decision.capMinutes)||decision.capMinutes!<=0||decision.capMinutes!>1440)return "Enter a paid time limit between 1 and 1,440 minutes.";
  return null;
}

export type ScheduleWorkbookOptions = { otResolutions?:Record<string,ScheduleOtResolution>; rules?: Record<string,ScheduleImportRule>; sheet?: string; branchId?: string; sheetMappings?: Record<string, string>; confirmDateContext?: boolean; endTimes?: Record<string, string>; sheetEndTimes?: Record<string,string>; employeeMappings?: Record<string, string>; shiftSelections?: Record<string, string>; destinationMappings?: Record<string, string> };
export async function parseScheduleWorkbook(file: File, weekStart: string, catalog: ScheduleImportCatalog, options: ScheduleWorkbookOptions = {}): Promise<ScheduleWorkbookPreview> {
  return parseScheduleWorkbooks([file],weekStart,catalog,options);
}

export async function parseScheduleWorkbooks(inputFiles: File[], weekStart: string, catalog: ScheduleImportCatalog, options: ScheduleWorkbookOptions = {}): Promise<ScheduleWorkbookPreview> {
  if (!inputFiles.length || inputFiles.length>10) throw new Error("Choose between 1 and 10 schedule workbooks.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || new Date(`${weekStart}T00:00:00Z`).getUTCDay()!==1) throw new Error("Choose a valid Monday.");
  const files: ScheduleWorkbookPreview["files"]=[], sheets: Array<ReturnType<typeof workbookSheets>[number]&{originalName:string;profile:string;fileHash:string}> = [];
  let totalBytes=0;
  for(const file of [...inputFiles].sort((a,b)=>a.name.localeCompare(b.name))) {
    if(!file.name.toLowerCase().endsWith(".xlsx"))throw new Error("Select .xlsx schedule workbooks.");
    totalBytes+=file.size;if(file.size>MAX_WORKBOOK_BYTES || totalBytes>30*1024*1024)throw new Error("Each workbook must be at most 10 MB, and the batch at most 30 MB.");
    const bytes=new Uint8Array(await file.arrayBuffer()),digest=await crypto.subtle.digest("SHA-256",bytes);
    const hash=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,"0")).join("");
    if(files.some(item=>item.hash===hash))continue;
    const profile=scheduleSourceProfile(file.name);files.push({name:file.name,hash,profile});
    sheets.push(...workbookSheets(await unzip(bytes)).map(sheet=>({...sheet,originalName:sheet.name,name:inputFiles.length>1?`${file.name} ▸ ${sheet.name}`:sheet.name,profile,fileHash:hash})));
  }
  const fileName=files.map(file=>file.name).join(" + ").slice(0,255);
  const batchDigest=await crypto.subtle.digest("SHA-256",new Uint8Array([...files.map(file=>file.hash).sort().join(":")].map(c=>c.charCodeAt(0))));
  const fileHash=files.length===1?files[0].hash:[...new Uint8Array(batchDigest)].map(v=>v.toString(16).padStart(2,"0")).join("");
  const rules={...catalog.import_rules,...options.rules},reusableRules:Record<string,ScheduleImportRule>={},sheetBranches:Record<string,string>={},namedShifts:ScheduleWorkbookPreview["namedShifts"]=[],resolved:string[]=[];
  const issues: ScheduleWorkbookIssue[]=[], staged: Array<{ sheet:string;branchId:string;branchName:string;status:string;employee:string;sourceKey:string;date:string;first:unknown;second:unknown;firstFill:string;secondFill:string;profile:string;otNotes?:string[] }>=[],locationMarkers:Array<{sheet:string;date:string;label:string;fill:string}>=[];
  // A week number is only a sequence key. An explicit dated header anchors it;
  // propagation is accepted only when every visible day agrees with that date.
  const weekHints=new Map<string,string>();
  const headers=(sheet:typeof sheets[number])=>[...sheet.rows].filter(([r])=>r<=4&&!sheet.hiddenRows.has(r)).map(([,row])=>[...row].filter(([c,v])=>c>=1&&!sheet.hiddenColumns.has(c)&&((typeof v==="number"&&v>=1)||/^(\d{1,2})(?:\s+[A-Za-z]+)?(?:\s+\d{4})?$/.test(clean(v))))).filter(row=>row.length>=7);
  const agrees=(sheet:typeof sheets[number],start:string)=>headers(sheet).some(row=>row.slice(0,7).every(([,v],i)=>typeof v==="number"&&v>30000?new Date((v-25569)*86400000).toISOString().slice(0,10)===addDays(start,i):Number(String(v).match(/^\d+/)?.[0])===Number(addDays(start,i).slice(-2))));
  for(const sheet of sheets)for(const row of headers(sheet))for(let i=0;i<7;i++){
    const value=row[i][1];let date:string|null=null;
    if(typeof value==="number"&&value>30000)date=new Date((value-25569)*86400000).toISOString().slice(0,10);
    const m=clean(value).match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+(\d{4}))?$/i);
    if(m)date=`${m[3]??weekStart.slice(0,4)}-${String(["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(m[2].toLowerCase())+1).padStart(2,"0")}-${m[1].padStart(2,"0")}`;
    if(date){const start=addDays(date,-i);if(new Date(`${start}T00:00:00Z`).getUTCDay()===1&&agrees(sheet,start))weekHints.set(sheet.name,start);}
  }
  for(let pass=0;pass<sheets.length;pass++)for(const sheet of sheets){
    if(weekHints.has(sheet.name)||!/^week\s+\d+$/i.test(sheet.originalName))continue;
    const n=Number(sheet.originalName.match(/\d+/)![0]);
    const candidates=sheets.filter(other=>other.profile===sheet.profile&&/^week\s+\d+$/i.test(other.originalName)&&Math.abs(Number(other.originalName.match(/\d+/)![0])-n)===1&&weekHints.has(other.name)).map(other=>addDays(weekHints.get(other.name)!,7*(n-Number(other.originalName.match(/\d+/)![0])))).filter(start=>agrees(sheet,start));
    if(candidates.length&&new Set(candidates).size===1)weekHints.set(sheet.name,candidates[0]);
  }
  const notices: string[] = [];
  const notes: ScheduleWorkbookPreview["notes"] = [];
  const employeeMatches = new Map<string, ScheduleEmployeeMatch>();
  const destinationReviews: ScheduleWorkbookPreview["destinationReviews"] = [];
  const near=(a:string,b:string)=>{
    if(Math.abs(a.length-b.length)>1)return false;
    if(a.length===b.length)return [...a].filter((v,i)=>v!==b[i]).length===1;
    const [short,long]=a.length<b.length?[a,b]:[b,a];
    return [...long].some((_,i)=>long.slice(0,i)+long.slice(i+1)===short);
  };
  const resolveDestination=(label:string,profile:string,branchId:string,sheet:string,row:number,date:string,legacyKey?:string)=>{
    if(LOCATION_MARKERS.has(label))return label;
    const candidates=catalog.branches.filter(branch=>Object.entries(LOCATION_ALIASES).some(([alias,name])=>name===branch.name&&near(label,alias)));
    if(!candidates.length)return label;
    const ruleKey=scheduleRuleKey(profile,"destination",branchId,label);
    const selected=candidates.find(branch=>branch.id===(options.destinationMappings?.[legacyKey??ruleKey]??options.destinationMappings?.[ruleKey]??rules[ruleKey]?.destinationId));
    if(!destinationReviews.some(review=>review.key===(legacyKey??ruleKey)))destinationReviews.push({key:legacyKey??ruleKey,sheet,row,date,value:label,selected:selected?.id??"",candidates:candidates.map(branch=>({id:branch.id,name:branch.name}))});
    if(!selected)return label;
    reusableRules[ruleKey]={branchId,destinationId:selected.id};
    return Object.keys(LOCATION_ALIASES).find(alias=>LOCATION_ALIASES[alias]===selected.name)!;
  };
  const expectedDays = Array.from({ length: 7 }, (_, index) => Number(addDays(weekStart, index).slice(-2)));
  for (const sheet of sheets) {
    if (options.sheet && options.sheet !== sheet.name) continue;
    if (sheet.hidden) {notices.push(`${sheet.name}: hidden sheet skipped. Unhide it in Excel to review and import it.`);continue;}
    if (sheet.hiddenRows.size || sheet.hiddenColumns.size) notices.push(`${sheet.name}: skipped ${sheet.hiddenRows.size} hidden rows and ${sheet.hiddenColumns.size} hidden columns. Review them in Excel if they should be included.`);
    const hintedWeek=weekHints.get(sheet.name);
    if(hintedWeek && hintedWeek!==weekStart && !options.sheet){notices.push(`${sheet.name}: another week (${hintedWeek}) skipped.`);continue;}
    const knownName = SCHEDULE_SHEET_BRANCHES[sheet.originalName.toUpperCase()];
    const sourceName=files.find(file=>file.hash===sheet.fileHash)?.name??"";
    const sourceMonth=sourceName.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i)?.[1].toLowerCase(),sourceYear=sourceName.match(/\b(20\d{2})\b/)?.[1];
    const monthIndex=sourceMonth?["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(sourceMonth)+1:0;
    const contextualDay=(day:number)=>knownName&&monthIndex&&sourceYear?`${sourceYear}-${String(monthIndex).padStart(2,"0")}-${String(day).padStart(2,"0")}`:day;
    const dateValue = (value: unknown) => {
      if (typeof value === "number") return value > 30000 ? new Date((value - 25569) * 86400000).toISOString().slice(0, 10) : Number.isInteger(value) && value >= 1 && value <= 31 ? contextualDay(value) : null;
      const text = clean(value);
      if (/^\d{1,2}$/.test(text)) return contextualDay(Number(text));
      const named = text.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:[a-z]*)(?:\s+(\d{4}))?$/i);
      if (!named) return null;
      const month = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(named[2].toLowerCase()) + 1;
      return `${named[3] ?? weekStart.slice(0,4)}-${String(month).padStart(2,"0")}-${named[1].padStart(2,"0")}`;
    };
    let dateRow = 0, columnStep = 2, window: Array<readonly [number, number]> = [];
    const matchingWindows: Array<{row:number;step:number;columns:Array<readonly [number,number]>}> = [];
    const detectedDates: string[] = [];
    const explicitDates: string[] = [];
    for (const rowNumber of [...sheet.rows.keys()].filter(n => n <= 12 && !sheet.hiddenRows.has(n))) {
      const pairs = [...sheet.rows.get(rowNumber)!].filter(([column, value]) => column >= 1 && !sheet.hiddenColumns.has(column) && dateValue(value) !== null);
      if (pairs.length >= 7) {
        detectedDates.push(...pairs.map(([, value]) => String(dateValue(value))));
        explicitDates.push(...pairs.filter(([,value]) => typeof value === "number" ? value > 30000 : /\b\d{4}$/.test(clean(value))).map(([,value]) => String(dateValue(value))));
      }
      for (let index = 0; index <= pairs.length - 7; index++) {
        const candidate = pairs.slice(index,index+7);
        const step = candidate[1][0] - candidate[0][0];
        if ([1, 2].includes(step) && candidate.every(([column,value],offset) => (offset === 0 || column === candidate[offset-1][0]+step) && (typeof dateValue(value) === "number" ? dateValue(value) === expectedDays[offset] : dateValue(value) === addDays(weekStart,offset)))) {
          matchingWindows.push({row:rowNumber,step,columns:candidate.map(([column,value]) => [column, typeof dateValue(value) === "number" ? Number(dateValue(value)) : Number(String(dateValue(value)).slice(-2))] as const)});
        }
      }
    }
    if(matchingWindows.length>1){
      const first=matchingWindows[0];
      const band=matchingWindows.every(w=>w.step===first.step&&JSON.stringify(w.columns)===JSON.stringify(first.columns)&&Math.abs(w.row-first.row)<=1);
      if(band){matchingWindows.splice(0,matchingWindows.length,first);}
    }
    if (matchingWindows.length > 1) { issues.push({sheet:sheet.name,reason:"ambiguous_date_columns",message:`${sheet.name}: more than one visible seven-day header matches ${weekStart}. Hide obsolete date columns or use one clearly dated table.`}); continue; }
    if (matchingWindows.length === 1) {dateRow=matchingWindows[0].row;columnStep=matchingWindows[0].step;window=matchingWindows[0].columns;}
    const fullDates = [...new Set(explicitDates)].filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date));
    const suggestedWeekStart = fullDates.length === 7 && fullDates.every((date, index) => date === addDays(fullDates[0], index)) && new Date(`${fullDates[0]}T00:00:00Z`).getUTCDay() === 1 ? fullDates[0] : undefined;
    if (!window.length && !options.sheet && /^week\s+\d+$/i.test(sheet.originalName) && sheets.some(other=>other.profile===sheet.profile&&weekHints.get(other.name)===weekStart)) {notices.push(`${sheet.name}: other weekly tab skipped.`);continue;}
    if (!window.length) { issues.push({ suggestedWeekStart, sheet: sheet.name, reason: "date_window_mismatch", message: `${sheet.name}: selected week ${weekStart} through ${addDays(weekStart, 6)} does not match the readable date headers. ${detectedDates.length ? `Workbook dates: ${[...new Set(detectedDates)].slice(0, 14).join(", ")}. Use the original week shown below; no need to leave this dialog.` : "No supported seven-day date header was found. Check the sheet layout."}` }); continue; }
    const branchRule=scheduleRuleKey(sheet.profile,"branch","",knownName?sheet.originalName:"*");
    let mappedBranch=options.sheetMappings?.[sheet.name] ?? (options.sheet===sheet.name?options.branchId:undefined) ?? rules[branchRule]?.branchId;
    if(!mappedBranch&&!knownName){
      if(/pjs[\s-]*(?:ck|10)/i.test(sheet.profile))mappedBranch=catalog.branches.find(b=>/pjs\s*10/i.test(b.name))?.id;
      const votes=new Map<string,Set<string>>();
      for(const [r,row] of sheet.rows){if(r<=dateRow||r>dateRow+20)continue;const name=normaliseScheduleName(row.get(0));if(!name)continue;
        const people=[...new Map(catalog.staff.filter(p=>normaliseScheduleName(p.name)===name).map(p=>[p.id,p])).values()];
        if(people.length!==1)continue;const person=people[0],branch=person.home_branch_id??(catalog.staff.filter(p=>p.id===person.id).length===1?person.branch_id:null);
        if(branch){const set=votes.get(branch)??new Set<string>();set.add(person.id);votes.set(branch,set);}
      }
      const consensus=[...votes].filter(([,people])=>people.size>=2);
      if(!mappedBranch&&consensus.length===1)mappedBranch=consensus[0][0];
    }
    if(mappedBranch==="skip"){notices.push(`${sheet.name}: explicitly excluded from this preview.`);continue;}
    const branch=mappedBranch?catalog.branches.find(b=>b.id===mappedBranch):catalog.branches.find(b=>key(b.name)===key(knownName));
    if(!knownName&&!mappedBranch){issues.push({sheet:sheet.name,reason:"sheet_mapping_required",message:`${sheet.name}: choose its source location once. It will be remembered after import.`});continue;}
    if(!branch){issues.push({sheet:sheet.name,reason:"outlet_not_found",message:`${sheet.name}: matching OMS location is outside the current catalogue.`});continue;}
    const branchName=branch.name;sheetBranches[sheet.name]=branch.id;reusableRules[branchRule]={branchId:branch.id,...(options.confirmDateContext?{year:weekStart.slice(0,4)}:rules[branchRule]?.year?{year:rules[branchRule].year}:{})};
    if (!knownName && !suggestedWeekStart && !options.confirmDateContext && rules[branchRule]?.year!==weekStart.slice(0,4)) { issues.push({sheet: sheet.name, reason:"date_context_required",message:`${sheet.name}: confirm the displayed dates belong to ${weekStart} through ${addDays(weekStart,6)}. Sheet numbers never establish dates.`}); continue; }
    let nameColumn = 0, idColumn: number | null = null;
    for (const [rowNumber, headers] of sheet.rows) {
      if (rowNumber > dateRow + 1 || sheet.hiddenRows.has(rowNumber)) continue;
      for (const [column, value] of headers) {
        if (column >= window[0][0] || sheet.hiddenColumns.has(column)) continue;
        const label = normaliseScheduleName(value);
        if (/^(name|staff name|employee name|person name|姓名|员工姓名)$/.test(label)) nameColumn = column;
        if (/^(staff id|staff code|employee id|employee code|person id|员工编号|工号)$/.test(label)) idColumn = column;
      }
    }
    const cellRef = (column:number,row:number) => {let letters="";for(let n=column+1;n;n=Math.floor((n-1)/26))letters=String.fromCharCode(65+(n-1)%26)+letters;return `${letters}${row}`;};
    const remarkRow=[...sheet.rows].find(([,values])=>/^remarks?\b/i.test(clean(values.get(nameColumn))))?.[0] ?? Infinity;
    const headerPairs=[...sheet.rows.get(dateRow)!].filter(([column,value])=>column>=1 && !sheet.hiddenColumns.has(column) && dateValue(value)!==null);
    const scheduleLastColumn=Math.max(...headerPairs.map(([column])=>column))+columnStep-1;
    for (const [row,values] of sheet.rows) {
      if(row<=dateRow+1 || sheet.hiddenRows.has(row) || (row<remarkRow && clean(values.get(nameColumn)))) continue;
      for(const [column,value] of values) {
        if(column>scheduleLastColumn || sheet.hiddenColumns.has(column) || typeof value!=="string" || !clean(value) || time(value) || /^remarks?$/i.test(clean(value))) continue;
        const fill=sheet.fills.get(row)?.get(column) ?? "",font=sheet.fontColours.get(row)?.get(column) ?? "";
        const range=sheet.mergedRanges.get(`${row}:${column}`) ?? cellRef(column,row);
        const endColumn=columnIndex(range.split(":").at(-1)!);
        const columnHeaders=headerPairs.filter(([c])=>c<=endColumn && c+columnStep-1>=column).map(([,v])=>String(dateValue(v)));
        const relatedCells:string[]=[];
        if(fill) for(const [r,source] of sheet.rows) {
          if(r<=dateRow+1 || r>=remarkRow || sheet.hiddenRows.has(r) || !clean(source.get(nameColumn))) continue;
          for(let c=column;c<=endColumn;c++) if(!sheet.hiddenColumns.has(c) && sheet.fills.get(r)?.get(c)===fill && time(source.get(c))) relatedCells.push(cellRef(c,r));
        }
        notes.push({sheet:sheet.name,range,text:clean(value),fill,font,columnHeaders,relatedCells});
      }
    }
        for (let rowNumber = dateRow + (columnStep === 1 ? 1 : 2); rowNumber <= Math.max(...sheet.rows.keys()); rowNumber += 1) {
      if (sheet.hiddenRows.has(rowNumber)) continue;
      const values = sheet.rows.get(rowNumber) ?? new Map(), fills = sheet.fills.get(rowNumber) ?? new Map(), employee = clean(sheet.hiddenColumns.has(nameColumn) ? undefined : values.get(nameColumn)), staffCode = idColumn === null ? "" : clean(sheet.identifiers.get(rowNumber)?.get(idColumn) ?? values.get(idColumn));
      if (key(employee) === "remark" || /^job scope\b/i.test(employee)) break;
      if (!employee && !staffCode) {
        const notes = window.map(([column], offset) => {
          const anchor = sheet.mergedCells.get(`${rowNumber}:${column}`), anchorValues = anchor ? sheet.rows.get(anchor[0]) : null, anchorFills = anchor ? sheet.fills.get(anchor[0]) : null;
          return { date: addDays(weekStart, offset), value: cellText(values.get(column) === undefined || values.get(column) === "" ? anchorValues?.get(anchor?.[1] ?? -1) : values.get(column)), fill: fills.get(column) ?? anchorFills?.get(anchor?.[1] ?? -1) ?? "" };
        }).filter((note) => note.value);
        for (const note of notes) {
          const label = resolveDestination(note.value.toUpperCase(),sheet.profile,branch.id,sheet.name,rowNumber,note.date);
          if (LOCATION_MARKERS.has(label) && note.fill) locationMarkers.push({ sheet: sheet.name, date: note.date, label, fill: note.fill });
          else issues.push({ sheet: sheet.name, date: note.date, value: note.value, reason: "unattached_schedule_note", message: `${sheet.name} · ${note.date}: “${note.value}” is not attached to a named employee row.` });
        }
        continue;
      }
      if (/^(name|staff name|employee name|person name)$/i.test(employee)) continue;
      if(!window.some(([column])=>cellText(values.get(column))||time(values.get(column))||(columnStep===2&&(cellText(values.get(column+1))||time(values.get(column+1))))))continue;
      const sourceKey = JSON.stringify([sheet.fileHash, sheet.name, rowNumber, branch.id]);
      const ruleKey=scheduleRuleKey(sheet.profile,"employee",branch.id,`${employee}|${normaliseScheduleStaffCode(staffCode)}`);
      const manualStaffId=options.employeeMappings?.[sourceKey]??rules[ruleKey]?.staffId;
      if(manualStaffId)reusableRules[ruleKey]={branchId:branch.id,staffId:manualStaffId};
      employeeMatches.set(sourceKey, {key: sourceKey, ruleKey, sheet: sheet.name, row: rowNumber, branchId: branch.id, employee, staffCode,
        ...matchScheduleEmployee({employee, staffCode, branchId: branch.id}, catalog.staff, manualStaffId)});
      for (let offset = 0; offset < 7; offset += 1) staged.push({ profile:sheet.profile, sheet: sheet.name, branchId: branch.id, branchName, status: branch.status, employee, sourceKey, date: addDays(weekStart, offset), first: values.get(window[offset][0]), second: columnStep === 2 && !sheet.hiddenColumns.has(window[offset][0]+1) ? values.get(window[offset][0] + 1) : undefined, firstFill: fills.get(window[offset][0]) ?? "", secondFill: fills.get(window[offset][0] + 1) ?? "" });
    }
  }
  for(const item of staged){
    const label=cellText(item.first).toUpperCase(),ruleKey=scheduleRuleKey(item.profile,"shift",item.branchId,label),rule=rules[ruleKey];
    if(["MORNING","AFTERNOON","NIGHT"].includes(label)&&catalog.fingerprint_exempt_staff?.includes(employeeMatches.get(item.sourceKey)?.staffId??""))continue;
    if(hasOt(`${cellText(item.first)} ${cellText(item.second)}`))continue;
    if(!cellText(item.second)&&typeof item.first==="string"){
      const parts=clean(item.first).match(/^(\d{1,2}(?:[.:]\d{2})?\s*[AP]M)\s*(?:[-–—]|\s)\s*(\d{1,2}(?:[.:]\d{2})?\s*[AP]M)$/i);
      if(parts&&time(parts[1])&&time(parts[2])){item.first=time(parts[1])!;item.second=time(parts[2])!;resolved.push(`${item.sheet}: explicit same-cell time pair read.`);}
      else if(rule?.start&&rule?.end&&time(rule.start)&&time(rule.end)){item.first=rule.start;item.second=rule.end;reusableRules[ruleKey]=rule;}
      else if(rule?.kind&&Object.values(KINDS).includes(rule.kind)){item.first=Object.keys(KINDS).find(k=>KINDS[k]===rule.kind)!;reusableRules[ruleKey]=rule;}
      else if((label==="MORNING"||label==="AFTERNOON"||label==="NIGHT") && !(catalog.fingerprint_exempt_staff?.includes(employeeMatches.get(item.sourceKey)?.staffId??""))){if(!namedShifts.some(row=>row.key===ruleKey))namedShifts.push({key:ruleKey,sheet:item.sheet,label});}
    }
  }
  const missingEndTimes = new Set<string>();
  const missingEndTimeSources = new Map<string,{key:string;sheet:string;start:string}>();
  for (const item of staged) {
    const start = time(item.first);
    if (start && !cellText(item.second) && !time(item.second)) {
      missingEndTimes.add(start);
      const key = JSON.stringify([item.sheet,start]);
      missingEndTimeSources.set(key,{key,sheet:item.sheet,start});
      const sourceSheet=sheets.find(sheet=>sheet.name===item.sheet)!.originalName;
      const family=/^(?:week\s+\d+|\d{4}-\d{4})$/i.test(sourceSheet)?"weekly":sourceSheet;
      const ruleKey=scheduleRuleKey(item.profile,"end",item.branchId,`${family}|${start}`);
      const end = options.sheetEndTimes?.[key] ?? (options.sheet || sheets.filter(sheet => !sheet.hidden).length === 1 ? options.endTimes?.[start] : undefined) ?? rules[ruleKey]?.end;
      if (end && time(end)) {item.second = end;reusableRules[ruleKey]={branchId:item.branchId,end};}
    }
  }
  for(const item of staged){
    const label=cellText(item.first).toUpperCase();
    if(!label||time(item.first)||cellText(item.second)||KINDS[label]||BLOCKED.has(label)||label==="RESIGN")continue;
    item.first=resolveDestination(label,item.profile,item.branchId,item.sheet,employeeMatches.get(item.sourceKey)!.row,item.date,JSON.stringify([item.sourceKey,item.date]));
  }
  const personKey = (item: typeof staged[number]) => employeeMatches.get(item.sourceKey)?.staffId ?? item.sourceKey;
  const timedByPersonDay = new Map<string, typeof staged>();
  for (const item of staged.filter((row) => time(row.first) && time(row.second))) {
    const personDay = `${personKey(item)}:${item.date}`, rows = timedByPersonDay.get(personDay) ?? [];
    rows.push(item); timedByPersonDay.set(personDay, rows);
  }
  const locationByPersonDay = new Map<string, string>();
  const locationChoices=new Map<string,Set<string>>();
  const conflictingLocations = new Set<string>();
  const recordLocation = (personDay: string, label: string) => {
    const choices=locationChoices.get(personDay)??new Set<string>();choices.add(label);locationChoices.set(personDay,choices);
    const prior = locationByPersonDay.get(personDay);
    if (prior && (LOCATION_ALIASES[prior] ?? prior) !== (LOCATION_ALIASES[label] ?? label)) conflictingLocations.add(personDay);
    locationByPersonDay.set(personDay, label);
  };
  for (const item of staged) {
    const label = cellText(item.first).toUpperCase();
    if (LOCATION_MARKERS.has(label) && !time(item.first) && !cellText(item.second)) {
      recordLocation(`${personKey(item)}:${item.date}`, label);
    }
  }
  for (const marker of locationMarkers) {
    const candidates = staged.filter((item) => item.sheet === marker.sheet && item.date === marker.date && time(item.first) && time(item.second) && (item.firstFill === marker.fill || item.secondFill === marker.fill));
    const employees = [...new Set(candidates.map(personKey))];
    if (employees.length === 1) recordLocation(`${employees[0]}:${marker.date}`, marker.label);
    else issues.push({ sheet: marker.sheet, date: marker.date, value: marker.label, reason: "unattached_schedule_note", message: `${marker.sheet} · ${marker.date}: “${marker.label}” could not be linked to one coloured employee row.` });
  }
  const shiftConflicts: ScheduleWorkbookPreview["shiftConflicts"] = [];
  const suppressedShifts = new Set<string>();
  for(const personDay of conflictingLocations){
    const choices=[...(locationChoices.get(personDay)??[])],selectionKey=`destination:${personDay}`,selected=options.shiftSelections?.[selectionKey];
    const row=staged.find(item=>`${personKey(item)}:${item.date}`===personDay)!;
    shiftConflicts.push({key:selectionKey,employee:row.employee,date:row.date,selected:selected??"",choices:choices.map(label=>({key:label,label:LOCATION_ALIASES[label]??label}))});
    if(selected&&choices.includes(selected)){conflictingLocations.delete(personDay);locationByPersonDay.set(personDay,selected);}
  }
  for(const [personDay,label] of locationByPersonDay){
    if(conflictingLocations.has(personDay))continue;
    const destination=catalog.branches.find(branch=>key(branch.name)===key(LOCATION_ALIASES[label]));
    const timed=timedByPersonDay.get(personDay)??[];
    if(!destination||timed.some(row=>row.branchId===destination.id))continue;
    const unique=new Set(timed.map(row=>JSON.stringify([time(row.first),time(row.second)])));
    if(unique.size!==1)continue;
    const row=timed[0],staffId=personKey(row);
    const authorised=catalog.staff.some(person=>person.id===staffId&&person.branch_id===destination.id&&(person.eligibility??[]).some(range=>range.from<=row.date&&(!range.to||range.to>=row.date)));
    if(!authorised){issues.push({sheet:row.sheet,employee:row.employee,date:row.date,reason:"destination_not_authorised",message:`${row.employee} · ${row.date}: explicit destination ${destination.name} is outside this employee’s scheduling access.`});continue;}
    const routed={...row,branchId:destination.id,branchName:destination.name,status:destination.status};
    staged.push(routed);timedByPersonDay.set(personDay,[routed]);
    for(const original of timed)suppressedShifts.add(`${original.sourceKey}:${original.date}:${original.branchId}`);
    resolved.push(`${row.employee} · ${row.date}: written destination ${destination.name} uses the explicit source hours.`);
  }
  for (const [personDay, rows] of timedByPersonDay) {
    if (rows.length < 2 || conflictingLocations.has(personDay)) continue;
    const label = locationByPersonDay.get(personDay), destination = label ? LOCATION_ALIASES[label] : null;
    const candidates = destination ? rows.filter(row => key(row.branchName) === key(destination)) : rows;
    if (!candidates.length) continue;
    const unique=new Map(candidates.map(row=>[JSON.stringify([row.branchId,time(row.first),time(row.second)]),row]));
    const home=catalog.staff.find(p=>p.id===personKey(rows[0]))?.home_branch_id;
    const destinations=[...unique.values()].filter(row=>row.branchId!==home);
    const automatic=unique.size===1?[...unique.values()][0]:!destination&&home&&destinations.length===1?destinations[0]:null;
    const selected = options.shiftSelections?.[personDay];
    const chosen = automatic ?? (candidates.length === 1 ? candidates[0] : candidates.find(row => row.sourceKey === selected));
    if (candidates.length > 1 && !automatic) {
      shiftConflicts.push({key:personDay,employee:rows[0].employee,date:rows[0].date,selected:chosen?.sourceKey ?? "",choices:candidates.map(row => ({key:row.sourceKey,label:`${row.sheet} · row ${employeeMatches.get(row.sourceKey)!.row} · ${time(row.first)}–${time(row.second)}`}))});
      if (!chosen) issues.push({sheet:rows[0].sheet,employee:rows[0].employee,date:rows[0].date,reason:"multiple_destination_shifts",message:`${rows[0].employee} · ${rows[0].date}: choose the intended shift from the source rows below.`});
    }
    if(automatic)resolved.push(`${rows[0].employee} · ${rows[0].date}: equivalent rows merged / explicit destination retained.`);
    timedByPersonDay.set(personDay, chosen ? [chosen] : []);
    for (const row of rows) if (row !== chosen) suppressedShifts.add(`${row.sourceKey}:${row.date}`);
  }
  const immutableBranchByStaffDay = new Map<string, string>();
  const immutableBranchIds = new Set(catalog.branches.filter((branch) => ["submitted", "published", "locked"].includes(branch.status)).map((branch) => branch.id));
  for (const assignment of catalog.current_assignments) {
    const staffId = String(assignment.staff_id ?? ""), workDate = String(assignment.work_date ?? ""), branchId = String(assignment.branch_id ?? "");
    if (staffId && workDate && immutableBranchIds.has(branchId)) immutableBranchByStaffDay.set(`${staffId}:${workDate}`, branchId);
  }
  const linkedOtNotes=new Set<string>();
  const selectedNoteDates=(note:ScheduleWorkbookPreview["notes"][number])=>[...new Set(note.columnHeaders.map(day=>expectedDays.includes(Number(day))?addDays(weekStart,expectedDays.indexOf(Number(day))):day).filter(day=>day>=weekStart&&day<=addDays(weekStart,6)))];
  for(const note of notes){
    if(!hasOt(note.text))continue;
    const dates=selectedNoteDates(note),relatedRows=new Set(note.relatedCells.map(cell=>Number(cell.match(/\d+$/)?.[0])));
    const linked=staged.filter(item=>item.sheet===note.sheet&&dates.includes(item.date)&&relatedRows.has(employeeMatches.get(item.sourceKey)!.row)&&!suppressedShifts.has(`${item.sourceKey}:${item.date}`)&&!suppressedShifts.has(`${item.sourceKey}:${item.date}:${item.branchId}`)&&time(item.first)&&time(item.second));
    const people=new Set(linked.map(item=>employeeMatches.get(item.sourceKey)?.staffId).filter(Boolean));
    if(people.size!==1||!linked.length)continue;
    for(const item of linked)item.otNotes=[...(item.otNotes??[]),`${note.range}: ${note.text}`];
    linkedOtNotes.add(`${note.sheet}:${note.range}`);
  }
  const otReviews:ScheduleOtReview[]=[];
  const untimedDuties:ScheduleWorkbookPreview["untimedDuties"]=[];
  const outlets = new Map<string, { branchId: string; branchName: string; status: string; assignments: ScheduleWorkbookAssignment[] }>();
  for (const item of staged) {
    if (suppressedShifts.has(`${item.sourceKey}:${item.date}`) || suppressedShifts.has(`${item.sourceKey}:${item.date}:${item.branchId}`)) continue;
    const outlet = outlets.get(item.branchId) ?? { branchId: item.branchId, branchName: item.branchName, status: item.status, assignments: [] };
    outlets.set(item.branchId, outlet);
    const match = employeeMatches.get(item.sourceKey)!;
    const outletStaff = catalog.staff.find((person) => person.branch_id === item.branchId && person.id === match.staffId);
    const staff = outletStaff && (outletStaff.eligibility ?? []).some((range) => range.from <= item.date && (!range.to || range.to >= item.date)) ? outletStaff : null;
    if (!staff) { if (time(item.first) || time(item.second) || cellText(item.first) || cellText(item.second)) issues.push({ sheet: item.sheet, employee: item.employee, date: item.date, reason: outletStaff ? "employee_not_eligible" : "employee_not_found", message: outletStaff ? `${item.sheet} · ${item.employee} · ${item.date}: employee has no active schedulable role for this date.` : `${item.sheet} · row ${match.row} · ${item.employee || match.staffCode}: ${match.reason}` }); continue; }
    if (conflictingLocations.has(`${personKey(item)}:${item.date}`)) {
      issues.push({sheet:item.sheet, employee:item.employee,date:item.date,reason:"conflicting_destinations",message:`${item.employee} · ${item.date}: source rows name different destination outlets. Confirm the intended outlet.`});
      continue;
    }
    const immutableBranchId = immutableBranchByStaffDay.get(`${staff.id}:${item.date}`);
    if (immutableBranchId && immutableBranchId !== item.branchId) continue;
    const start = time(item.first), end = time(item.second), label = cellText(item.first).toUpperCase(), secondText = cellText(item.second);
    const otText=[`${time(item.first)??cellText(item.first)} ${time(item.second)??secondText}`.trim(),...(item.otNotes??[])].join("\n");
    if(hasOt(otText)){
      const otKey=JSON.stringify([item.sourceKey,item.date,"ot"]),decision=options.otResolutions?.[otKey];
      const valid=scheduleOtResolutionError(decision)===null;
      otReviews.push({key:otKey,sheet:item.sheet,employee:item.employee,date:item.date,value:otText,noteOnly:false,confirmed:valid});
      if(!valid){issues.push({sheet:item.sheet,employee:item.employee,date:item.date,value:otText,reason:"ot_confirmation_required",message:`${item.sheet} · ${item.employee} · ${item.date}: OT requires your instructions for this employee day.`});continue;}
      if(decision!.kind==="shift")outlet.assignments.push({staff_id:staff.id,work_date:item.date,assignment_kind:"shift",shift_template_id:null,custom_start:decision!.start,custom_end:decision!.end,custom_crosses_midnight:decision!.end!<=decision!.start!,custom_break_seconds:decision!.breakMinutes!*60,custom_maximum_recognised_seconds:decision!.capMinutes!*60,custom_reason:`OT source reviewed: ${decision!.reason.trim()}`.slice(0,500)});
      else if(decision!.kind!=="separate")outlet.assignments.push({staff_id:staff.id,work_date:item.date,assignment_kind:decision!.kind,shift_template_id:null});
      else notices.push(`${item.employee} · ${item.date}: OT handled separately — ${decision!.reason.trim()}. Existing schedule retained.`);
      continue;
    }
    if (start && end) {
      const sameDay = timedByPersonDay.get(`${personKey(item)}:${item.date}`) ?? [];
      const homeBranchId = staff.home_branch_id ?? item.branchId;
      const locationLabel = locationByPersonDay.get(`${personKey(item)}:${item.date}`) ?? null;
      const locationBranchName = locationLabel ? LOCATION_ALIASES[locationLabel] : null;
      const locationBranchId = locationBranchName ? catalog.branches.find((branch) => key(branch.name) === key(locationBranchName))?.id ?? null : null;
      if (locationBranchId && sameDay.filter(row => row.branchId === locationBranchId).length > 1) {
        issues.push({sheet:item.sheet,employee:item.employee,date:item.date,reason:"multiple_destination_shifts",message:`${item.employee} · ${item.date}: more than one time record exists at ${locationBranchName}. Confirm the intended shift.`});
        continue;
      }
      if (locationBranchId && item.branchId !== locationBranchId) continue;
      const destinationRows = sameDay.filter((row) => row.branchId !== homeBranchId);
      if (!locationLabel && sameDay.length > 1 && item.branchId === homeBranchId && destinationRows.length === 1) continue;
      if (!locationLabel && destinationRows.length > 1) {
        issues.push({ sheet: item.sheet, employee: item.employee, date: item.date, reason: "multiple_destination_shifts", message: `${item.employee} · ${item.date}: more than one destination outlet has working time.` });
        continue;
      }
      const from = Number(start.slice(0, 2)) * 60 + Number(start.slice(3)), to = Number(end.slice(0, 2)) * 60 + Number(end.slice(3)), minutes = to > from ? to - from : to + 1440 - from;
      if (minutes > 960) issues.push({ sheet: item.sheet, employee: item.employee, date: item.date, value: `${start}–${end}`, reason: "suspicious_time_span", message: `${item.sheet} · ${item.employee} · ${item.date}: ${start}–${end} is longer than 16 hours.` });
      else outlet.assignments.push({ staff_id: staff.id, work_date: item.date, assignment_kind: "shift", shift_template_id: null, custom_start: start, custom_end: end, custom_crosses_midnight: end <= start, custom_break_seconds: 0, custom_maximum_recognised_seconds: 86400, custom_reason: "Schedule workbook import", work_site_label: locationLabel && !locationBranchId ? locationLabel : item.branchId === homeBranchId ? null : item.branchName });
    } else if (start || end) issues.push({ sheet: item.sheet, employee: item.employee, date: item.date, value: `${cellText(item.first)} ${secondText}`, reason: "incomplete_time_pair", message: `${item.sheet} · ${item.employee} · ${item.date}: both start and end time are required.` });
    else if (KINDS[label] === "mc" && !secondText) {
      const existing = catalog.current_assignments.find((assignment) => String(assignment.staff_id) === staff.id && String(assignment.work_date) === item.date && String(assignment.branch_id) === item.branchId && String(assignment.assignment_kind) === "shift");
      if (existing) outlet.assignments.push({ staff_id: staff.id, work_date: item.date, assignment_kind: "shift", shift_template_id: existing.shift_template_id ? String(existing.shift_template_id) : null, custom_start: existing.custom_start ? String(existing.custom_start) : undefined, custom_end: existing.custom_end ? String(existing.custom_end) : undefined, custom_crosses_midnight: Boolean(existing.custom_crosses_midnight), custom_break_seconds: existing.custom_break_seconds == null ? undefined : Number(existing.custom_break_seconds), custom_maximum_recognised_seconds: existing.custom_maximum_recognised_seconds == null ? undefined : Number(existing.custom_maximum_recognised_seconds), work_site_label: existing.work_site_label ? String(existing.work_site_label) : null });
      issues.push({ sheet: item.sheet, employee: item.employee, date: item.date, value: label, reason: "actual_attendance_exception", message: `${item.sheet} · ${item.employee} · ${item.date}: MC belongs in actual attendance; the existing scheduled shift ${existing ? "was retained" : "must be reported separately"}.` });
    }
    else if (KINDS[label] && !secondText) outlet.assignments.push({ staff_id: staff.id, work_date: item.date, assignment_kind: KINDS[label], shift_template_id: null });
    else if (["MORNING","AFTERNOON","NIGHT"].includes(label) && catalog.fingerprint_exempt_staff?.includes(staff.id) && !secondText) {untimedDuties.push({branchId:item.branchId,staffId:staff.id,date:item.date,label,sheet:item.sheet});notices.push(`${item.sheet} · ${item.employee} · ${item.date}: ${label} retained as a source note for a fingerprint-exempt employee; no working hours inferred.`);}
    else if (label === "RESIGN" && !secondText) { /* HR marker: the profile's last working date owns future eligibility. */ }
    else if (BLOCKED.has(label)) issues.push({ sheet: item.sheet, employee: item.employee, date: item.date, value: label, reason: "business_instruction", message: `${item.sheet} · ${item.employee} · ${item.date}: “${label}” is not a schedule assignment.` });
    else if (LOCATION_MARKERS.has(label) && !secondText) {
      const destination = LOCATION_ALIASES[label];
      const destinationBranch = catalog.branches.find(branch => key(branch.name) === key(destination));
      const destinationShifts = (timedByPersonDay.get(`${personKey(item)}:${item.date}`) ?? []).filter(row => row.branchId === destinationBranch?.id);
      if (destinationShifts.length !== 1) issues.push({sheet:item.sheet,employee:item.employee,date:item.date,value:label,reason:"destination_shift_required",message:`${item.sheet} · ${item.employee} · ${item.date}: ${label} needs one confirmed shift at ${destination ?? "the destination outlet"}.`});
    }
    else if (label) issues.push({ sheet: item.sheet, employee: item.employee, date: item.date, value: label, reason: "external_time_missing", message: `${item.sheet} · ${item.employee} · ${item.date}: “${label}” needs a destination shift time.` });
  }
  for(const note of notes){
    if(linkedOtNotes.has(`${note.sheet}:${note.range}`)||!hasOt(note.text)||!note.columnHeaders.some(day=>expectedDays.includes(Number(day))||day>=weekStart&&day<=addDays(weekStart,6)))continue;
    const otKey=JSON.stringify([files.find(file=>note.sheet.startsWith(file.name+" ▸ "))?.hash??fileHash,note.sheet,note.range,"ot-note"]),decision=options.otResolutions?.[otKey],confirmed=scheduleOtResolutionError(decision,true)===null;
    const dates=selectedNoteDates(note);
    otReviews.push({key:otKey,sheet:note.sheet,employee:`Workbook note ${note.range}`,date:dates.join(", "),value:note.text,noteOnly:true,confirmed});
    if(!confirmed)issues.push({sheet:note.sheet,reason:"ot_confirmation_required",value:note.text,message:`${note.sheet} · ${note.range}: review the OT note and enter its special handling.`});
  }
  const result = [...outlets.values()];
  const grouped=new Map<string,Array<{outlet:typeof result[number];assignment:ScheduleWorkbookAssignment}>>();
  for(const outlet of result)for(const assignment of outlet.assignments){const k=`${assignment.staff_id}:${assignment.work_date}`;grouped.set(k,[...(grouped.get(k)??[]),{outlet,assignment}]);}
  const keep=new Set<ScheduleWorkbookAssignment>();
  for(const [id,rows] of grouped){
    const homeId=catalog.staff.find(p=>p.id===rows[0].assignment.staff_id)?.home_branch_id;
    const signatures=new Set(rows.map(row=>JSON.stringify(row.assignment)));
    if(signatures.size===1 && rows[0].assignment.assignment_kind!=="shift") {const chosen=rows.find(row=>row.outlet.branchId===homeId)??rows[0];keep.add(chosen.assignment);if(rows.length>1)resolved.push(`${id}: identical leave/rest rows merged.`);continue;}
    const unique=[...new Map(rows.map(row=>[JSON.stringify([row.outlet.branchId,row.assignment]),row])).values()];
    if(unique.length===1){keep.add(unique[0].assignment);if(rows.length>1)resolved.push(`${id}: identical assignments merged.`);continue;}
    const shifts=unique.filter(row=>row.assignment.assignment_kind==="shift"),home=catalog.staff.find(p=>p.id===rows[0].assignment.staff_id)?.home_branch_id;
    if(shifts.length===1&&home&&unique.every(row=>row===shifts[0]||row.outlet.branchId===home)){
      keep.add(shifts[0].assignment);resolved.push(`${id}: destination working shift retained over home placeholder.`);continue;
    }
    const employee=catalog.staff.find(p=>p.id===rows[0].assignment.staff_id)?.name??"Employee";
    const choices=unique.map(row=>({key:JSON.stringify([row.outlet.branchId,row.assignment]),label:`${row.outlet.branchName} · ${row.assignment.assignment_kind} ${row.assignment.custom_start??""}–${row.assignment.custom_end??""}`}));
    const chosen=options.shiftSelections?.[id],index=choices.findIndex(choice=>choice.key===chosen);
    if(index>=0)keep.add(unique[index].assignment);
    else {shiftConflicts.push({key:id,employee,date:rows[0].assignment.work_date,selected:"",choices});issues.push({sheet:options.sheet??"Workbook",date:rows[0].assignment.work_date,reason:"duplicate_assignment",employee,message:`${employee} · ${rows[0].assignment.work_date}: different working/leave assignments require one decision.`});}
  }
  for(const outlet of result)outlet.assignments=outlet.assignments.filter(a=>keep.has(a));
  const assignmentSources: ScheduleWorkbookPreview["assignmentSources"] = result.flatMap(outlet => outlet.assignments.map(assignment => ({
    staffId: assignment.staff_id, date: assignment.work_date, branchId: outlet.branchId,
    sources: staged.filter(item => employeeMatches.get(item.sourceKey)?.staffId === assignment.staff_id && item.date === assignment.work_date &&
      ((time(item.first) === assignment.custom_start && time(item.second) === assignment.custom_end) || Boolean(item.otNotes?.length) || hasOt(`${cellText(item.first)} ${cellText(item.second)}`) || LOCATION_ALIASES[cellText(item.first).toUpperCase()] === outlet.branchName))
      .map(item => ({sheet:item.sheet,row:employeeMatches.get(item.sourceKey)!.row,kind: (LOCATION_MARKERS.has(cellText(item.first).toUpperCase()) ? "destination_marker" : "shift") as "destination_marker" | "shift"})),
  })));
  return { otReviews, untimedDuties, files, sheetBranches, reusableRules, namedShifts, resolved, fileName, fileHash, weekStart, weekEnd: addDays(weekStart, 6), outlets: result, issues, employeeMatches: [...employeeMatches.values()], assignmentSources, notices, shiftConflicts, destinationReviews, notes, sheets: [...new Set([...Object.keys(sheetBranches),...issues.map(issue=>issue.sheet).filter(name=>sheets.some(sheet=>sheet.name===name))])], missingEndTimes: [...missingEndTimes].sort(), missingEndTimeSources:[...missingEndTimeSources.values()], assignmentCount: result.reduce((sum, outlet) => sum + outlet.assignments.length, 0) };
}

export function scheduleImportDisposition(branchId:string, assignment:ScheduleWorkbookAssignment, catalog:ScheduleImportCatalog):"new"|"update"|"unchanged"|"protected" {
  const status=(id:string)=>catalog.branches.find(branch=>branch.id===id)?.status;
  const protectedStatus=(value:string|undefined)=>value!==undefined&&!['draft','returned','rejected','not_started'].includes(value);
  if(protectedStatus(status(branchId)))return 'protected';
  const rows=catalog.current_assignments.filter(row=>row.staff_id===assignment.staff_id&&row.work_date===assignment.work_date);
  if(rows.some(row=>!row.id||Number(row.ro_minutes??0)>0||protectedStatus(status(String(row.branch_id)))))return 'protected';
  if(!rows.length)return 'new';
  const fields=['assignment_kind','shift_template_id','custom_start','custom_end','custom_crosses_midnight','custom_break_seconds','custom_maximum_recognised_seconds','work_site_label'] as const;
  const value=(key:typeof fields[number],v:unknown)=>key==='custom_start'||key==='custom_end'?String(v??'').slice(0,5):key==='custom_crosses_midnight'?Boolean(v):v??null;
  return rows.length===1&&rows[0].branch_id===branchId&&fields.every(key=>value(key,rows[0][key])===value(key,assignment[key]))?'unchanged':'update';
}
