import { classifyAutoCountHeaders, type AutoCountParsedFile } from "@/lib/imports/autocount";

function columnIndex(cellRef: string) {
  return [...cellRef.replace(/\d+/g, "")].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function inflateRaw(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzipText(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) { eocd = index; break; }
  }
  if (eocd < 0) throw new Error("Invalid XLSX file.");
  const entries = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const files = new Map<string, string>();
  const decoder = new TextDecoder();
  for (let entry = 0; entry < entries; entry += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(start, start + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (content) files.set(name, decoder.decode(content));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function decodeXml(value: string) {
  return value.replace(/<[^>]+>/g, "").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'");
}

export async function parseAutoCountWorkbook(file: File): Promise<AutoCountParsedFile> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error(`${file.name}: only .xlsx files are supported.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  const archive = await unzipText(bytes);
  const shared = [...(archive.get("xl/sharedStrings.xml") ?? "").matchAll(/<si[\s\S]*?<\/si>/g)].map((match) => decodeXml(match[0]));
  const sheet = archive.get("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error(`${file.name}: the first worksheet could not be read.`);
  const matrix: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const reference = cellMatch[1].match(/\br="([A-Z]+\d+)"/)?.[1];
      if (!reference) continue;
      const type = cellMatch[1].match(/\bt="([^"]+)"/)?.[1];
      const index = columnIndex(reference);
      const body = cellMatch[2] ?? "";
      const raw = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
      row[index] = type === "s" ? shared[Number(raw)] ?? "" : decodeXml(raw);
    }
    if (row.some((value) => String(value ?? "").trim())) matrix.push(row);
  }
  const headers = (matrix[0] ?? []).map((value) => String(value ?? "").trim());
  const type = classifyAutoCountHeaders(headers);
  if (!type) throw new Error(`${file.name}: columns do not match a supported AutoCount Supplier, Item, or Location export.`);
  const rows = matrix.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, String(values[index] ?? "").trim()])));
  return { name: file.name, hash, type, headers, rows };
}
