import type { LooseSupabase } from "@/lib/supabase/loose";

/** UI-only Preview: shared database must not enable unapproved feature contracts. */
export async function assetFeatureCapabilities(db: LooseSupabase) {
  // Deliberately do not invoke the readiness RPC, even if the shared DB has it.
  void db;
  return { automaticId: false, transferBatch: false };
}
