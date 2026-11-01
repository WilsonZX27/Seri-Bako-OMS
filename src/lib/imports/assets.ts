import { assetMasterFields } from "@/lib/asset-master";
export const assetImportHeaders = ["Asset ID", "Item Name", "Location ID", "Qty", ...assetMasterFields.map(field=>field.key)];
export type AssetImportRow = { key: string; values: Record<string,string> };
export type AssetImportIssue = { row: number; errors: string[] };
export function validateAssetImport(rows: AssetImportRow[], locations: string[], automaticId: boolean): AssetImportIssue[] {
 if (!rows.length || rows.length>100) throw new Error("Upload between 1 and 100 asset rows.");
 const keys=new Set<string>(), codes=new Map<string,number>();
 return rows.map(({key,values},index)=>{
  const errors:string[]=[]; const code=(values['Asset ID']??'').trim(), name=(values['Item Name']??'').trim(), qty=(values.Qty??'').trim();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)||keys.has(key)) errors.push('Invalid or repeated import request key. Reload this file.'); keys.add(key);
  if(Object.keys(values).some(k=>!assetImportHeaders.includes(k)))errors.push('Unsupported columns. Use the asset template.');
  if(Object.values(values).some(v=>typeof v!=='string'||v.length>1000))errors.push('A cell is too long or invalid.');
  if(code === "EXAMPLE-ONLY") errors.push("Remove the example row before importing.");
  if(code&&!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,79}$/.test(code))errors.push('Invalid Asset ID.');
  if(!code&&!automaticId)errors.push('Asset ID is required: automatic numbering is unavailable.');
  if(code){const prior=codes.get(code.toLowerCase());if(prior)errors.push(`Asset ID duplicates row ${prior}.`);else codes.set(code.toLowerCase(),index+2);}
  if(!name||name.length>200)errors.push('Item Name is required (maximum 200 characters).');
  if(!locations.includes(values['Location ID']))errors.push('Location ID must exactly match an available location.');
  if(qty&&(!/^\d+$/.test(qty)||!Number.isSafeInteger(Number(qty))||Number(qty)>2147483647))errors.push('Qty must be a whole nonnegative number, or blank for unknown.');
  for(const field of assetMasterFields){const v=values[field.key]?.trim();if(!v)continue;if(field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))errors.push(`${field.label}: use YYYY-MM-DD text.`);if(field.type==='number'&&!/^\d+(\.\d{1,2})?$/.test(v))errors.push(`${field.label}: use a nonnegative amount with at most two decimals.`);}
  if(values['Warranty Start Date']&&values['Warranty End Date']&&values['Warranty Start Date']>values['Warranty End Date'])errors.push('Warranty end must follow its start.');
  return {row:index+2,errors};
 });
}

/** Quote CSV text and prevent spreadsheet formula interpretation on export. */
export function assetImportCsv(cells: string[]) {
  return cells.map(value => {
    const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? "'" + value : value;
    return '"' + safe.replaceAll('"', '""') + '"';
  }).join(',');
}

export function assetImportResultsCsv(rows: AssetImportRow[], saved: Record<string,string>, outcomes: Record<string,string>) {
 return assetImportCsv(['File row','Asset ID supplied','Item name','Result','Asset record ID','Request key'])+'\r\n'+rows.map((r,i)=>assetImportCsv([String(i+2),r.values['Asset ID']||'',r.values['Item Name'],saved[r.key]?'Registered':outcomes[r.key]||'Result unconfirmed — retry with same key',saved[r.key]||'',r.key])).join('\r\n');
}
