"use server";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { requirePermission } from "@/server/auth/permissions";
import { getAssetRegistration } from "@/server/queries/assets";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { validateAssetImport, type AssetImportRow } from "@/lib/imports/assets";
import { assetMasterFields } from "@/lib/asset-master";
import { saveAssetMaster } from "@/server/actions/assets";
async function check(rows:AssetImportRow[]) {
 await requireActiveTenantActor({owner:true}); await requirePermission('assets.manage');
 const catalog=await getAssetRegistration();if(!catalog.active)throw Error('Asset registration is not active.');
 return {catalog,issues:validateAssetImport(rows,catalog.locations.map(l=>l.id),catalog.automaticId)};
}
export async function previewAssetImport(rows:AssetImportRow[]) {
 const {issues}=await check(rows);const db=looseSupabase(await createClient());const actor=await requireActiveTenantActor({owner:true});
 const codes=[...new Set(rows.filter((_,i)=>!issues[i].errors.length).map(row=>row.values['Asset ID']?.trim().toLowerCase()).filter((code):code is string=>Boolean(code)))];
 const existing=new Set<string>();
 for(let offset=0;offset<codes.length;offset+=50){
  // Validated IDs cannot contain PostgREST filter delimiters. Escape LIKE wildcards.
  const filters=codes.slice(offset,offset+50).map(code=>`asset_code.ilike.${code.replace(/[\\%_]/g,'\\$&')}`).join(',');
  const found=await db.from('assets').select('asset_code').eq('company_id',actor.companyId).or(filters).limit(50);
  if(found.error||found.data===null)throw Error('Existing Asset IDs could not be checked. No rows were imported.');
  for(const asset of found.data)existing.add(String(asset.asset_code).toLowerCase());
 }
 for(let i=0;i<rows.length;i++)if(existing.has(rows[i].values['Asset ID']?.trim().toLowerCase()))issues[i].errors.push('Asset ID already exists. Existing assets will not be overwritten.');
 return issues;
}
export async function confirmAssetImport(rows:AssetImportRow[]) {
 const {issues,catalog}=await check(rows);if(issues.some(r=>r.errors.length))return {results:[],stoppedKey:null,message:'Fix all validation errors before importing. No rows were submitted.'};
 const results:{key:string;assetId:string}[]=[];
 // Each existing RPC is atomic and idempotent. Stop on the first failure; retries retain row keys.
 for(const row of rows){const form=new FormData();form.set('client_key',row.key);form.set('item_name',row.values['Item Name']);form.set('asset_code',row.values['Asset ID']??'');form.set('code_mode',!row.values['Asset ID']?.trim()&&catalog.automaticId?'sequence':'manual');form.set('location_id',row.values['Location ID']);form.set('quantity',row.values.Qty??'');form.set('reason','Asset Excel import');for(const field of assetMasterFields)form.set(`detail_${field.key}`,row.values[field.key]??'');const result=await saveAssetMaster({ok:false,message:''},form);if(!result.ok||!result.assetId)return {results,stoppedKey:row.key,message:`Stopped at ${row.values['Item Name']}: ${result.message}`};results.push({key:row.key,assetId:result.assetId});}
 return {results,stoppedKey:null,message:'All reviewed rows were registered.'};
}
