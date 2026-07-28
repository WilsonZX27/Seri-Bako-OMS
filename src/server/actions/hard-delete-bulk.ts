"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { getDocumentAttachmentPaths, removeDocumentAttachmentPaths } from "@/server/storage/document-attachments";

type Preview = { record_id: string; record_number?: string; status?: string; eligible?: boolean; reason?: string; cascade_safe?: Record<string, unknown>; dependencies?: Record<string, unknown> };

const purchaseRequestIdsSchema = z.array(z.string().uuid("An invalid purchase request was selected.")).min(1, "Select at least one purchase request.").max(100, "Permanent deletion is limited to 100 purchase requests at a time.");

function parsePurchaseRequestIds(value: unknown) {
  if (Array.isArray(value)) return purchaseRequestIdsSchema.parse([...new Set(value.map(String))]);
  if (typeof value !== "string" || value.length > 8_000) throw new Error("The selected purchase requests are invalid.");
  try {
    return purchaseRequestIdsSchema.parse([...new Set(z.array(z.unknown()).parse(JSON.parse(value)).map(String))]);
  } catch {
    throw new Error("The selected purchase requests are invalid.");
  }
}

export async function previewBulkHardDeletePurchaseRequests(recordIds: string[]) {
  await requireActiveTenantActor({ owner: true });
  const db = await createClient();
  const results: Preview[] = [];
  for (const id of parsePurchaseRequestIds(recordIds)) {
    const { data, error } = await db.rpc("preview_phase_one_hard_delete", { record_type: "purchase_request", record_id: id });
    results.push(error ? { record_id: id, eligible: false, reason: error.message } : { ...(data as Preview), record_id: id });
  }
  return results;
}

export async function bulkHardDeletePurchaseRequests(formData: FormData) {
  await requireActiveTenantActor({ owner: true });
  const ids = parsePurchaseRequestIds(formData.get("record_ids"));
  if (String(formData.get("confirmation") ?? "").trim().toUpperCase() !== "DELETE") throw new Error("Type DELETE to continue.");
  const db = await createClient();
  let deleted = 0; let blocked = 0; let failed = 0;
  const details: { record_id: string; reason: string; kind: "blocked" | "failed" }[] = [];
  for (const id of ids) {
    const preview = await db.rpc("preview_phase_one_hard_delete", { record_type: "purchase_request", record_id: id });
    if (preview.error || !(preview.data as { eligible?: boolean })?.eligible) { blocked++; details.push({ record_id: id, reason: preview.error?.message ?? String((preview.data as { reason?: string })?.reason ?? "Permanent deletion is blocked."), kind: "blocked" }); continue; }
    const confirmation = String((preview.data as { confirmation?: string }).confirmation ?? "");
    const documentId = (preview.data as { snapshot?: { document_id?: string } }).snapshot?.document_id;
    const attachmentPaths = documentId ? await getDocumentAttachmentPaths(db, documentId) : { paths: [], error: null };
    const result = await db.rpc("hard_delete_phase_one", { record_type: "purchase_request", record_id: id, confirmation });
    if (result.error) { failed++; details.push({ record_id: id, reason: result.error.message, kind: "failed" }); } else { deleted++; const cleanupFailures = attachmentPaths.error ? [attachmentPaths.error] : await removeDocumentAttachmentPaths(db, attachmentPaths.paths); if (cleanupFailures.length) details.push({ record_id: id, reason: `Storage cleanup requires attention: ${cleanupFailures.join("; ")}`, kind: "failed" }); }
  }
  revalidatePath("/purchase-requests");
  return { deleted, blocked, failed, details };
}
