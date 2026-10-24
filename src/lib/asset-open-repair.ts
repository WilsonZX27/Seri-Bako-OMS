import type { OpenAssetRepair } from "@/server/queries/asset-open-repairs";
/** An existing repair remains an exception; checking today never closes it. */
export function openRepairInspectionFields(repairs:OpenAssetRepair[]) {
 return Object.fromEntries(repairs.flatMap(row=>{
  const result=/^(Damaged|Missing|Needs Maintenance|Other):/.exec(row.description??"")?.[1]??"Needs Maintenance";
  return [[`result_${row.asset_id}`,result],[`remark_${row.asset_id}`,(row.description||`Open repair · ${row.status} · Ref ${row.id.slice(0,8)}`).slice(0,4000)]];
 }));
}
