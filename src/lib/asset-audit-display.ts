import { formatDateOnly, formatDateTime } from "@/lib/utils";
/** Display reference only: never allocates or rewrites a stored identifier. */
export function assetDisplayReference(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const references=value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
  return references?.length ? `Ref ${references.map(reference=>reference.slice(0,8).toUpperCase()).join(" / ")}` : value;
}
export function assetAuditRows(data: Record<string, unknown>) {
  return Object.entries(data).filter(([key,value])=>!key.startsWith("_") && value!==null && value!=="").map(([key,value])=>{
    const text=String(value);
    const civil=/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/.exec(text);
    const reference=assetDisplayReference(text);
    const technical=reference!==text || Boolean(civil);
    let display=reference;
    // Imported civil timestamps have no timezone; do not invent a UTC instant.
    if(civil)display=`${civil[3]}/${civil[2]}/${civil[1]} ${civil[4]}:${civil[5]}:${civil[6]}`;
    else if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}.*(?:Z|[+-]\d{2}:?\d{2})$/.test(text))display=formatDateTime(text.replace(" ","T"));
    else if(/^\d{4}-\d{2}-\d{2}$/.test(text))display=formatDateOnly(text);
    return {key,display,technical,raw:text};
  });
}
