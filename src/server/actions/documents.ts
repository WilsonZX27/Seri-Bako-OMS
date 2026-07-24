"use server";

import { revalidatePath } from "next/cache";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { getCurrentProfile } from "@/server/queries/common";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

async function currentIdentity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
}

export async function addDocumentComment(documentId: string, formData: FormData) {
  await requirePermission("documents.comment");
  const commentText = cleanText(formData.get("comment_text"));
  if (!commentText) return;
  const profile = await currentIdentity();

  if (!isMockMode()) {
    const supabase = await createClient();
    const { error } = await supabase.from("document_comments").insert({
      document_id: documentId,
      comment_text: commentText,
      created_by: profile?.id ?? null,
    });
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "comment_added", message: "Comment added" });
  }
  revalidatePath(`/documents/${documentId}`);
}

const allowedAttachmentTypes = new Set([
  "application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain", "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function addDocumentAttachment(
  documentId: string,
  _state: { error: string | null; success: string | null },
  formData: FormData,
) {
  try {
    await requirePermission("documents.attach");
    const file = formData.get("file");
    const uploadedFile = file instanceof File && file.size > 0 ? file : null;
    if (!uploadedFile) throw new Error("Choose a file to upload.");
    if (uploadedFile.size > 10 * 1024 * 1024) throw new Error("Attachment must be 10 MB or smaller.");
    if (!allowedAttachmentTypes.has(uploadedFile.type)) throw new Error("This file type is not supported.");
    const profile = await currentIdentity();
    if (!profile?.company_id || !profile.id) throw new Error("An active staff profile is required.");
    const attachmentLabel = cleanText(formData.get("file_name"));
    const fileName = attachmentLabel ?? uploadedFile.name;

    if (!isMockMode()) {
      const supabase = await createClient();
      const safeName = uploadedFile.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "attachment";
      const storagePath = `${profile.company_id}/${documentId}/${crypto.randomUUID()}-${safeName}`;
      // Materialize the Web File before passing it to the storage client. In
      // Node's server-action runtime, forwarding File's stream directly can
      // trigger `transformAlgorithm is not a function` and abort the request.
      const uploadBody = Buffer.from(await uploadedFile.arrayBuffer());
      const { error: uploadError } = await supabase.storage.from("document-attachments").upload(storagePath, uploadBody, { contentType: uploadedFile.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const { error } = await supabase.from("attachments").insert({
        company_id: profile.company_id,
        entity_type: "document",
        entity_id: documentId,
        file_name: fileName,
        file_type: uploadedFile.type,
        file_size: uploadedFile.size,
        storage_path: storagePath,
        file_url: null,
        uploaded_by: profile.id,
        created_by: profile.id,
        updated_by: profile.id,
      });
      if (error) {
        await supabase.storage.from("document-attachments").remove([storagePath]);
        throw new Error(error.message);
      }
      await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "attachment_uploaded", message: `Attachment ${fileName} uploaded` });
    }
    revalidatePath("/", "layout");
    return { error: null, success: `${fileName} uploaded.` };
  } catch (error) {
    return { error: formatActionError(error, "Could not upload this attachment."), success: null };
  }
}

export async function archiveDocumentAttachment(documentId: string, attachmentId: string) {
  await requirePermissionOrRedirect("documents.attach", `/documents/${documentId}`);
  try {
    if (!isMockMode()) {
      const supabase = await createClient();
      const [{ data: document, error: documentError }, { data: attachment, error: attachmentError }] = await Promise.all([
        supabase.from("documents").select("status").eq("id", documentId).single(),
        supabase.from("attachments").select("storage_path").eq("id", attachmentId).eq("entity_id", documentId).single(),
      ]);
      if (documentError) throw new Error(documentError.message);
      if (attachmentError) throw new Error(attachmentError.message);
      if (!new Set(["draft", "pending_approval"]).has(document.status)) throw new Error("Attachments can only be removed while the document is draft or pending approval.");
      if (attachment.storage_path) {
        const { error: storageError } = await supabase.storage.from("document-attachments").remove([attachment.storage_path]);
        if (storageError) throw new Error(storageError.message);
      }
      const { error } = await supabase.from("attachments").update({ status: "archived", deleted_at: new Date().toISOString() }).eq("id", attachmentId).eq("entity_id", documentId);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "attachment_archived", message: "Attachment archived" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/documents/${documentId}`, "error", formatActionError(error, "Could not archive this attachment."));
  }
  revalidatePath("/", "layout");
}

export async function submitDocument(documentId: string) {
  await requirePermission("documents.submit");
  if (!isMockMode()) { const { error } = await (await createClient()).rpc("transition_document_atomic", { p_document_id: documentId, p_action: "submit", p_remarks: null }); if (error) throw new Error(error.message); }
  revalidatePath("/documents"); revalidatePath(`/documents/${documentId}`);
}

export async function approveDocument(documentId: string, formData: FormData) {
  await requirePermission("documents.approve");
  const remarks = cleanText(formData.get("remarks")) ?? "Approved";
  if (!isMockMode()) { const { error } = await (await createClient()).rpc("transition_document_atomic", { p_document_id: documentId, p_action: "approve", p_remarks: remarks }); if (error) throw new Error(error.message); }
  revalidatePath("/documents"); revalidatePath(`/documents/${documentId}`);
}

export async function rejectDocument(documentId: string, formData: FormData) {
  await requirePermission("documents.approve");
  const remarks = cleanText(formData.get("remarks"));
  if (!remarks) throw new Error("Rejection remarks are required.");
  if (!isMockMode()) { const { error } = await (await createClient()).rpc("transition_document_atomic", { p_document_id: documentId, p_action: "reject", p_remarks: remarks }); if (error) throw new Error(error.message); }
  revalidatePath("/documents"); revalidatePath(`/documents/${documentId}`);
}

export async function postDocument(documentId: string) {
  await requirePermission("documents.update");
  if (!isMockMode()) { const { error } = await (await createClient()).rpc("transition_document_atomic", { p_document_id: documentId, p_action: "post", p_remarks: null }); if (error) throw new Error(error.message); }
  revalidatePath("/documents"); revalidatePath(`/documents/${documentId}`);
}

export async function cancelDocument(documentId: string) {
  await requirePermission("documents.update");
  if (!isMockMode()) { const { error } = await (await createClient()).rpc("transition_document_atomic", { p_document_id: documentId, p_action: "cancel", p_remarks: null }); if (error) throw new Error(error.message); }
  revalidatePath("/documents"); revalidatePath(`/documents/${documentId}`);
}
