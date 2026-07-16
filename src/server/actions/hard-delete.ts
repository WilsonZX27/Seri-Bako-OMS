"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDocumentAttachmentPaths, removeDocumentAttachmentPaths } from "@/server/storage/document-attachments";

export async function hardDeletePhaseOne(recordType: string, recordId: string, formData: FormData) {
  const confirmation = String(formData.get("confirmation") ?? "");
  const db = await createClient();
  const preview = await db.rpc("preview_phase_one_hard_delete", { record_type: recordType, record_id: recordId });
  const documentId = (preview.data as { snapshot?: { document_id?: string } } | null)?.snapshot?.document_id;
  const attachmentPaths = documentId ? await getDocumentAttachmentPaths(db, documentId) : { paths: [], error: null };
  const { error } = await db.rpc("hard_delete_phase_one", { record_type: recordType, record_id: recordId, confirmation });
  const routes: Record<string, string> = { purchase_request: "/purchase-requests", supplier: "/suppliers", item: "/items", product: "/products", recipe: "/recipes" };
  const listRoute = routes[recordType] ?? "/dashboard";
  if (error) redirect(`${listRoute}?error=${encodeURIComponent(error.message)}`);
  const cleanupFailures = attachmentPaths.error ? [attachmentPaths.error] : await removeDocumentAttachmentPaths(db, attachmentPaths.paths);
  revalidatePath("/purchase-requests"); revalidatePath("/suppliers"); revalidatePath("/items"); revalidatePath("/products"); revalidatePath("/recipes");
  const message = cleanupFailures.length ? `Record permanently deleted. Storage cleanup requires attention: ${cleanupFailures.join("; ")}` : "Record permanently deleted.";
  redirect(`${listRoute}?success=${encodeURIComponent(message)}`);
}
