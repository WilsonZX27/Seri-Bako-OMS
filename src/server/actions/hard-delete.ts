"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { getDocumentAttachmentPaths, removeDocumentAttachmentPaths } from "@/server/storage/document-attachments";

const hardDeleteInputSchema = z.object({
  recordType: z.enum(["purchase_request", "supplier", "item", "product", "recipe"]),
  recordId: z.string().uuid("The record identifier is invalid."),
  confirmation: z.string().trim().min(1, "Type the displayed confirmation to continue.").max(64, "The confirmation is invalid."),
});

export async function hardDeletePhaseOne(recordType: string, recordId: string, formData: FormData) {
  await requireActiveTenantActor({ owner: true });
  const input = hardDeleteInputSchema.parse({
    recordType,
    recordId,
    confirmation: formData.get("confirmation"),
  });
  const db = await createClient();
  const preview = await db.rpc("preview_phase_one_hard_delete", { record_type: input.recordType, record_id: input.recordId });
  const documentId = (preview.data as { snapshot?: { document_id?: string } } | null)?.snapshot?.document_id;
  const attachmentPaths = documentId ? await getDocumentAttachmentPaths(db, documentId) : { paths: [], error: null };
  const { error } = await db.rpc("hard_delete_phase_one", { record_type: input.recordType, record_id: input.recordId, confirmation: input.confirmation });
  const routes: Record<string, string> = { purchase_request: "/purchase-requests", supplier: "/suppliers", item: "/items", product: "/products", recipe: "/recipes" };
  const listRoute = routes[input.recordType];
  if (error) redirect(`${listRoute}?error=${encodeURIComponent(error.message)}`);
  const cleanupFailures = attachmentPaths.error ? [attachmentPaths.error] : await removeDocumentAttachmentPaths(db, attachmentPaths.paths);
  revalidatePath("/purchase-requests"); revalidatePath("/suppliers"); revalidatePath("/items"); revalidatePath("/products"); revalidatePath("/recipes");
  const message = cleanupFailures.length ? `Record permanently deleted. Storage cleanup requires attention: ${cleanupFailures.join("; ")}` : "Record permanently deleted.";
  redirect(`${listRoute}?success=${encodeURIComponent(message)}`);
}
