import type { LooseSupabase } from "@/lib/supabase/loose";

/** UI-only Preview: manual IDs and legacy single transfers; no shared readiness call. */
export async function assetFeatureCapabilities(db: LooseSupabase) {
  void db;
  return { automaticId: false, transferBatch: false, transferBatchRead: false };
}
