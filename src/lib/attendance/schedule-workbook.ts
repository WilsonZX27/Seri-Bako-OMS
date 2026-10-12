export type ScheduleImportCatalog = {
  branches: Array<{ id: string; name: string; status: string }>;
  staff: Array<{ id: string; name: string; branch_id: string; home_branch_id?: string | null; eligibility?: Array<{ from: string; to: string | null }> }>;
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
  assignmentCount: number;
  sheets: string[];
  missingEndTimes: string[];
};

const SHEET_BRANCHES: Record<string, string> = {
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
  OFF: "off", "OFF DAY": "off", PH: "ph", AL: "al", MC: "mc", UPL: "upl", RO: "ro", OIL: "oil",
};
const BLOCKED = new Set(["CLEAR OT", "LATE"]);
const LOCATION_ALIASES: Record<string, string> = {
  PYRAMID: "Kwan Kee Store @ Sunway Pyramid",
  "SUNWAY PYRAMID": "Kwan Kee Store @ Sunway Pyramid",
  "PETALING STREET": "Kwan Kee Store @ Petaling Street",
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
  const fillKeys = [...(stylesXml.match(/<fills[^>]*>([\s\S]*?)<\/fills>/)?.[1] ?? "").matchAll(/<fill>([\s\S]*?)<\/fill>/g)].map((match) => {
    const colour = match[1].match(/<fgColor\s+([^>]+)\/?/i)?.[1] ?? "";
    return colour.match(/rgb="([^"]+)"/i)?.[1] ?? colour.match(/indexed="([^"]+)"/i)?.[1] ?? colour.match(/theme="([^"]+)"/i)?.[1] ?? "";
  });
  const styleFillKeys = [...(stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "").matchAll(/<xf\s+([^>]+)\/?/g)].map((match) => fillKeys[Number(match[1].match(/fillId="(\d+)"/)?.[1] ?? 0)] ?? "");
  const relationships = new Map([...((files.get("xl/_rels/workbook.xml.rels") ?? "").matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g))].map((match) => [match[1], `xl/${match[2].replace(/^\//, "").replace(/^xl\//, "")}`]));
  const workbook = files.get("xl/workbook.xml") ?? "";
  return [...workbook.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*(?:r:id|id)="([^"]+)"[^>]*\/>/g)].map((match) => {
    const xml = files.get(relationships.get(match[2]) ?? "") ?? "", rows = new Map<number, Map<number, string | number>>(), fills = new Map<number, Map<number, string>>(), mergedCells = new Map<string, readonly [number, number]>();
    for (const rowMatch of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = new Map<number, string | number>(), rowFills = new Map<number, string>();
      for (const cell of rowMatch[2].matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const reference = cell[1].match(/\br="([A-Z]+\d+)"/)?.[1];
        if (!reference) continue;
        const type = cell[1].match(/\bt="([^"]+)"/)?.[1], body = cell[2] ?? "", raw = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
        const column = columnIndex(reference), styleIndex = Number(cell[1].match(/\bs="(\d+)"/)?.[1] ?? 0);
        row.set(column, type === "s" ? shared[Number(raw)] ?? "" : type === "inlineStr" || type === "str" ? decodeXml(raw) : raw === "" ? "" : Number.isFinite(Number(raw)) ? Number(raw) : decodeXml(raw));
        if (styleFillKeys[styleIndex]) rowFills.set(column, styleFillKeys[styleIndex]);
      }
      rows.set(Number(rowMatch[1]), row);
      fills.set(Number(rowMatch[1]), rowFills);
    }
    for (const merged of xml.matchAll(/<mergeCell\s+ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"\s*\/>/g)) {
      const startColumn = columnIndex(`${merged[1]}${merged[2]}`), startRow = Number(merged[2]), endColumn = columnIndex(`${merged[3]}${merged[4]}`), endRow = Number(merged[4]);
      for (let row = startRow; row <= endRow; row += 1) for (let column = startColumn; column <= endColumn; column += 1) mergedCells.set(`${row}:${column}`, [startRow, startColumn]);
    }
    return { name: decodeXml(match[1]), rows, fills, mergedCells };
  });
}

export function scheduleTime(value: unknown) {
  if (typeof value === "string") {
    const normalized = clean(value).replace(/^(\d{1,2})(\d{2})(AM|PM)$/i, "$1:$2$3").replace(/^(\d{1,2})(AM|PM)$/i, "$1:00$2");
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
export type ScheduleWorkbookOptions = { sheet?: string; branchId?: string; confirmDateContext?: boolean; endTimes?: Record<string, string> };
export async function parseScheduleWorkbook(file: File, weekStart: string, catalog: ScheduleImportCatalog, options: ScheduleWorkbookOptions = {}): Promise<ScheduleWorkbookPreview> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Select the Seri Bako .xlsx schedule workbook.");
  if (file.size > MAX_WORKBOOK_BYTES) throw new Error("The schedule workbook must be 10 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer()), digest = await crypto.subtle.digest("SHA-256", bytes);
  const fileHash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  const sheets = await workbookSheets(await unzip(bytes)), issues: ScheduleWorkbookIssue[] = [], staged: Array<{ sheet: string; branchId: string; branchName: string; status: string; employee: string; date: string; first: unknown; second: unknown; firstFill: string; secondFill: string }> = [], locationMarkers: Array<{ sheet: string; date: string; label: string; fill: string }> = [];
  const expectedDays = Array.from({ length: 7 }, (_, index) => Number(addDays(weekStart, index).slice(-2)));
  for (const sheet of sheets) {
    if (options.sheet && options.sheet !== sheet.name) continue;
    const knownName = SHEET_BRANCHES[sheet.name.toUpperCase()];
    const branch = options.sheet === sheet.name && options.branchId
      ? catalog.branches.find(item => item.id === options.branchId)
      : catalog.branches.find(item => key(item.name) === key(knownName));
    if (!knownName && !options.sheet) { issues.push({ sheet: sheet.name, reason: "sheet_mapping_required", message: `${sheet.name}: select this sheet and confirm its OMS outlet and date context before importing.` }); continue; }
    const branchName = branch?.name ?? knownName;
    if (!branch) { issues.push({ sheet: sheet.name, reason: "outlet_not_found", message: `${sheet.name}: matching OMS outlet was not found.` }); continue; }
    const dateValue = (value: unknown) => {
      if (typeof value === "number") return value > 30000 ? new Date((value - 25569) * 86400000).toISOString().slice(0, 10) : Number.isInteger(value) && value >= 1 && value <= 31 ? value : null;
      const text = clean(value);
      if (/^\d{1,2}$/.test(text)) return Number(text);
      const named = text.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:[a-z]*)(?:\s+(\d{4}))?$/i);
      if (!named) return null;
      const month = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(named[2].toLowerCase()) + 1;
      return `${named[3] ?? weekStart.slice(0,4)}-${String(month).padStart(2,"0")}-${named[1].padStart(2,"0")}`;
    };
    let dateRow = 0, columnStep = 2, window: Array<readonly [number, number]> = [];
    const detectedDates: string[] = [];
    const explicitDates: string[] = [];
    for (const rowNumber of [...sheet.rows.keys()].filter(n => n <= 12)) {
      const pairs = [...sheet.rows.get(rowNumber)!].filter(([column, value]) => column >= 1 && dateValue(value) !== null);
      if (pairs.length >= 7) {
        detectedDates.push(...pairs.map(([, value]) => String(dateValue(value))));
        explicitDates.push(...pairs.filter(([,value]) => typeof value === "number" ? value > 30000 : /\b\d{4}$/.test(clean(value))).map(([,value]) => String(dateValue(value))));
      }
      for (let index = 0; index <= pairs.length - 7; index++) {
        const candidate = pairs.slice(index,index+7);
        const step = candidate[1][0] - candidate[0][0];
        if ([1, 2].includes(step) && candidate.every(([column,value],offset) => (offset === 0 || column === candidate[offset-1][0]+step) && (typeof dateValue(value) === "number" ? dateValue(value) === expectedDays[offset] : dateValue(value) === addDays(weekStart,offset)))) {
          dateRow = rowNumber; columnStep = step; window = candidate.map(([column,value]) => [column, typeof dateValue(value) === "number" ? Number(dateValue(value)) : Number(String(dateValue(value)).slice(-2))] as const); break;
        }
      }
      if (window.length) break;
    }
    const fullDates = [...new Set(explicitDates)].filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date));
    const suggestedWeekStart = fullDates.length === 7 && fullDates.every((date, index) => date === addDays(fullDates[0], index)) && new Date(`${fullDates[0]}T00:00:00Z`).getUTCDay() === 1 ? fullDates[0] : undefined;
    if (!window.length) { issues.push({ suggestedWeekStart, sheet: sheet.name, reason: "date_window_mismatch", message: `${sheet.name}: selected week ${weekStart} through ${addDays(weekStart, 6)} does not match the readable date headers. ${detectedDates.length ? `Workbook dates: ${[...new Set(detectedDates)].slice(0, 14).join(", ")}. Use the original week shown below; no need to leave this dialog.` : "No supported seven-day date header was found. Check the sheet layout."}` }); continue; }
    if (!knownName && !suggestedWeekStart && !options.confirmDateContext) { issues.push({sheet: sheet.name, reason:"date_context_required",message:`${sheet.name}: confirm the displayed dates belong to ${weekStart} through ${addDays(weekStart,6)}. Sheet numbers never establish dates.`}); continue; }
    for (let rowNumber = dateRow + (columnStep === 1 ? 1 : 2); rowNumber <= Math.max(...sheet.rows.keys()); rowNumber += 1) {
      const values = sheet.rows.get(rowNumber) ?? new Map(), fills = sheet.fills.get(rowNumber) ?? new Map(), employee = clean(values.get(0));
      if (key(employee) === "remark" || /^job scope\b/i.test(employee)) break;
      if (!employee) {
        const notes = window.map(([column], offset) => {
          const anchor = sheet.mergedCells.get(`${rowNumber}:${column}`), anchorValues = anchor ? sheet.rows.get(anchor[0]) : null, anchorFills = anchor ? sheet.fills.get(anchor[0]) : null;
          return { date: addDays(weekStart, offset), value: cellText(values.get(column) ?? anchorValues?.get(anchor?.[1] ?? -1)), fill: fills.get(column) ?? anchorFills?.get(anchor?.[1] ?? -1) ?? "" };
        }).filter((note) => note.value);
        for (const note of notes) {
          const label = note.value.toUpperCase();
          if (LOCATION_MARKERS.has(label) && note.fill) locationMarkers.push({ sheet: sheet.name, date: note.date, label, fill: note.fill });
          else issues.push({ sheet: sheet.name, date: note.date, value: note.value, reason: "unattached_schedule_note", message: `${sheet.name} · ${note.date}: “${note.value}” is not attached to a named employee row.` });
        }
        continue;
      }
      for (let offset = 0; offset < 7; offset += 1) staged.push({ sheet: sheet.name, branchId: branch.id, branchName, status: branch.status, employee, date: addDays(weekStart, offset), first: values.get(window[offset][0]), second: columnStep === 2 ? values.get(window[offset][0] + 1) : undefined, firstFill: fills.get(window[offset][0]) ?? "", secondFill: fills.get(window[offset][0] + 1) ?? "" });
    }
  }
  const missingEndTimes = new Set<string>();
  for (const item of staged) {
    const start = time(item.first);
    if (start && !cellText(item.second) && !time(item.second)) {
      missingEndTimes.add(start);
      const end = options.endTimes?.[start];
      if (end && time(end)) item.second = end;
    }
  }
  const timedByPersonDay = new Map<string, typeof staged>();
  for (const item of staged.filter((row) => time(row.first) && time(row.second))) {
    const personDay = `${key(item.employee)}:${item.date}`, rows = timedByPersonDay.get(personDay) ?? [];
    rows.push(item); timedByPersonDay.set(personDay, rows);
  }
  const destinationKeys = new Set(timedByPersonDay.keys());
  const locationByPersonDay = new Map<string, string>();
  for (const item of staged) {
    const label = cellText(item.first).toUpperCase();
    if (LOCATION_MARKERS.has(label) && !time(item.first) && !cellText(item.second)) {
      locationByPersonDay.set(`${key(item.employee)}:${item.date}`, label);
    }
  }
  for (const marker of locationMarkers) {
    const candidates = staged.filter((item) => item.sheet === marker.sheet && item.date === marker.date && time(item.first) && time(item.second) && (item.firstFill === marker.fill || item.secondFill === marker.fill));
    const employees = [...new Set(candidates.map((item) => item.employee))];
    if (employees.length === 1) locationByPersonDay.set(`${key(employees[0])}:${marker.date}`, marker.label);
    else issues.push({ sheet: marker.sheet, date: marker.date, value: marker.label, reason: "unattached_schedule_note", message: `${marker.sheet} · ${marker.date}: “${marker.label}” could not be linked to one coloured employee row.` });
  }
  const immutableBranchByStaffDay = new Map<string, string>();
  const immutableBranchIds = new Set(catalog.branches.filter((branch) => ["submitted", "published", "locked"].includes(branch.status)).map((branch) => branch.id));
  for (const assignment of catalog.current_assignments) {
    const staffId = String(assignment.staff_id ?? ""), workDate = String(assignment.work_date ?? ""), branchId = String(assignment.branch_id ?? "");
    if (staffId && workDate && immutableBranchIds.has(branchId)) immutableBranchByStaffDay.set(`${staffId}:${workDate}`, branchId);
  }
  const outlets = new Map<string, { branchId: string; branchName: string; status: string; assignments: ScheduleWorkbookAssignment[] }>();
  for (const item of staged) {
    const outlet = outlets.get(item.branchId) ?? { branchId: item.branchId, branchName: item.branchName, status: item.status, assignments: [] };
    outlets.set(item.branchId, outlet);
    const outletStaff = catalog.staff.find((person) => person.branch_id === item.branchId && key(person.name) === key(item.employee));
    const staff = outletStaff && (outletStaff.eligibility ?? []).some((range) => range.from <= item.date && (!range.to || range.to >= item.date)) ? outletStaff : null;
    if (!staff) { if (time(item.first) || time(item.second) || cellText(item.first) || cellText(item.second)) issues.push({ sheet: item.sheet, employee: item.employee, date: item.date, reason: outletStaff ? "employee_not_eligible" : "employee_not_found", message: outletStaff ? `${item.sheet} · ${item.employee} · ${item.date}: employee has no active schedulable role for this date.` : `${item.sheet} · ${item.employee}: employee is not available at this outlet.` }); continue; }
    const immutableBranchId = immutableBranchByStaffDay.get(`${staff.id}:${item.date}`);
    if (immutableBranchId && immutableBranchId !== item.branchId) continue;
    const start = time(item.first), end = time(item.second), label = cellText(item.first).toUpperCase(), secondText = cellText(item.second);
    if (start && end) {
      const sameDay = timedByPersonDay.get(`${key(item.employee)}:${item.date}`) ?? [];
      const homeBranchId = staff.home_branch_id ?? item.branchId;
      const locationLabel = locationByPersonDay.get(`${key(item.employee)}:${item.date}`) ?? null;
      const locationBranchName = locationLabel ? LOCATION_ALIASES[locationLabel] : null;
      const locationBranchId = locationBranchName ? catalog.branches.find((branch) => key(branch.name) === key(locationBranchName))?.id ?? null : null;
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
    else if (label === "MC" && !secondText) {
      const existing = catalog.current_assignments.find((assignment) => String(assignment.staff_id) === staff.id && String(assignment.work_date) === item.date && String(assignment.branch_id) === item.branchId && String(assignment.assignment_kind) === "shift");
      if (existing) outlet.assignments.push({ staff_id: staff.id, work_date: item.date, assignment_kind: "shift", shift_template_id: existing.shift_template_id ? String(existing.shift_template_id) : null, custom_start: existing.custom_start ? String(existing.custom_start) : undefined, custom_end: existing.custom_end ? String(existing.custom_end) : undefined, custom_crosses_midnight: Boolean(existing.custom_crosses_midnight), custom_break_seconds: existing.custom_break_seconds == null ? undefined : Number(existing.custom_break_seconds), custom_maximum_recognised_seconds: existing.custom_maximum_recognised_seconds == null ? undefined : Number(existing.custom_maximum_recognised_seconds), work_site_label: existing.work_site_label ? String(existing.work_site_label) : null });
      issues.push({ sheet: item.sheet, employee: item.employee, date: item.date, value: label, reason: "actual_attendance_exception", message: `${item.sheet} · ${item.employee} · ${item.date}: MC belongs in actual attendance; the existing scheduled shift ${existing ? "was retained" : "must be reported separately"}.` });
    }
    else if (KINDS[label] && !secondText) outlet.assignments.push({ staff_id: staff.id, work_date: item.date, assignment_kind: KINDS[label], shift_template_id: null });
    else if (label === "RESIGN" && !secondText) { /* HR marker: the profile's last working date owns future eligibility. */ }
    else if (BLOCKED.has(label)) issues.push({ sheet: item.sheet, employee: item.employee, date: item.date, value: label, reason: "business_instruction", message: `${item.sheet} · ${item.employee} · ${item.date}: “${label}” is not a schedule assignment.` });
    else if (label && !locationByPersonDay.has(`${key(item.employee)}:${item.date}`) && !destinationKeys.has(`${key(item.employee)}:${item.date}`)) issues.push({ sheet: item.sheet, employee: item.employee, date: item.date, value: label, reason: "external_time_missing", message: `${item.sheet} · ${item.employee} · ${item.date}: “${label}” needs a destination shift time.` });
  }
  const result = [...outlets.values()];
  const seen = new Set<string>();
  for (const outlet of result) outlet.assignments = outlet.assignments.filter(assignment => {
    const id = `${assignment.staff_id}:${assignment.work_date}`;
    if (seen.has(id)) { issues.push({sheet: options.sheet ?? "Workbook", date:assignment.work_date, reason:"duplicate_assignment",message:`More than one source assignment exists for the same employee and date. Select one sheet before importing.`}); return false; }
    seen.add(id); return true;
  });
  return { fileName: file.name, fileHash, weekStart, weekEnd: addDays(weekStart, 6), outlets: result, issues, sheets: sheets.map(sheet => sheet.name), missingEndTimes: [...missingEndTimes].sort(), assignmentCount: result.reduce((sum, outlet) => sum + outlet.assignments.length, 0) };
}
