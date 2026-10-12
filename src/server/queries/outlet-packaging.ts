import { cache } from "react";
import { todayInKualaLumpur } from "@/lib/business-date";
import { isMockMode } from "@/lib/mock-mode";
import { looseSupabase } from "@/lib/supabase/loose";
import { createClient } from "@/lib/supabase/server";

export type PackagingUsageRow = {
  id: string;
  date: string;
  branchId: string;
  branch: string;
  product: string;
  code: string;
  unit: string;
  received: number | null;
  usage: number | null;
  closing: number | null;
  status: string;
};

export type PackagingReport = {
 opening?: PackagingUsageRow[]; rows: PackagingUsageRow[]; latest: PackagingUsageRow[]; today: string;
 products: Array<{ id: string; code: string; name: string; unit: string }>;
 outlets: Array<{ id: string; name: string }>;
};
// Request-scoped deduplication only: never reuse authorization or report data across requests.
export const getOutletPackagingReport = cache(async function getOutletPackagingReport(days: 7 | 30): Promise<PackagingReport> {
 const today=todayInKualaLumpur();
 if(isMockMode())return {rows:[],latest:[],products:[],outlets:[],today};
 const db=looseSupabase(await createClient());
 const result=await db.rpc("get_outlet_packaging_report",{p_end_date:today,p_days:days});
 if(result.error)throw new Error(result.error.message);
 const report=result.data as PackagingReport|null;
 if(!report||!Array.isArray(report.rows)||!Array.isArray(report.latest)||!Array.isArray(report.products)||!Array.isArray(report.outlets))throw new Error("Packaging report could not be verified.");
 const seen=new Map<string,PackagingUsageRow>(),cohorts=new Map<string,string>();
 for(const row of report.rows) {
   if(!row.id) continue;
   if(seen.has(row.id) && JSON.stringify(seen.get(row.id))!==JSON.stringify(row)) throw new Error("Conflicting packaging source rows.");
   const key=`${row.branchId}:${row.code}:${row.date}`;
   if(cohorts.has(key) && cohorts.get(key)!==row.id) throw new Error("Duplicate completed packaging records. Review the original records.");
   seen.set(row.id,row);cohorts.set(key,row.id);
 }
 return {...report,rows:report.rows.filter((row,index,rows)=>!row.id || rows.findIndex(item=>item.id===row.id)===index)};
});
