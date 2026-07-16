"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function bulkHardDeletePurchaseRequests(formData: FormData) {
  const ids = JSON.parse(String(formData.get("record_ids") ?? "[]")) as string[];
  if (String(formData.get("confirmation") ?? "").trim().toUpperCase() !== "DELETE") redirect("/purchase-requests?bulk_error=Type+DELETE+to+continue");
  const db = await createClient();
  let deleted = 0; let blocked = 0; let failed = 0;
  for (const id of ids) {
    const preview = await db.rpc("preview_phase_one_hard_delete", { record_type: "purchase_request", record_id: id });
    if (preview.error || !(preview.data as { eligible?: boolean })?.eligible) { blocked++; continue; }
    const confirmation = String((preview.data as { confirmation?: string }).confirmation ?? "");
    const result = await db.rpc("hard_delete_phase_one", { record_type: "purchase_request", record_id: id, confirmation });
    if (result.error) failed++; else deleted++;
  }
  revalidatePath("/purchase-requests");
  redirect(`/purchase-requests?bulk_deleted=${deleted}&bulk_blocked=${blocked}&bulk_failed=${failed}`);
}
