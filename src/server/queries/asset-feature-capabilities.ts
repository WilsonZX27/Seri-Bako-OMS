import type { LooseSupabase } from "@/lib/supabase/loose";
const ASSET_BATCH_CREATION_ENABLED = true;
// Default OFF. A deployment opt-in is scoped to one verified company and still
// requires the authenticated database capability/allocator contract below.
export async function assetFeatureCapabilities(db: LooseSupabase, companyId?: string) {
  const ASSET_NUMBERING_ENABLED = Boolean(companyId
    && process.env.ASSET_NUMBERING_COMPANY_ID === companyId
    && process.env.ASSET_NUMBERING_RELEASE === "verified-allocator-v1");
  const result = await db.rpc("asset_feature_capabilities");
  if (result.error) {
    if (["PGRST202","42883","42501"].includes((result.error as {code?:string}).code ?? "")) return {automaticId:false,transferBatch:false,transferBatchRead:false};
    throw new Error("Asset transfer support could not be verified.");
  }
  const value=result.data as {version?:unknown;transfer_batch?:unknown;transfer_batch_revision?:unknown;automatic_id?:unknown;automatic_id_revision?:unknown}|null;
  const batchReady=value?.version===3 && value.transfer_batch===true && value.transfer_batch_revision===1;
  const numberingReady=value?.version===3 && value.automatic_id===true && value.automatic_id_revision===1;
  return {automaticId:ASSET_NUMBERING_ENABLED && numberingReady,transferBatch:ASSET_BATCH_CREATION_ENABLED && batchReady,transferBatchRead:batchReady};
}
