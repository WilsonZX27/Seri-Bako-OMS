"use server";

import { revalidatePath } from "next/cache";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { z } from "zod";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

const documentIdSchema = z.string().uuid("This document reference is invalid.");
const attachmentIdSchema = z.string().uuid("This attachment reference is invalid.");
const commentIdSchema = z.string().uuid("This comment reference is invalid.");
const documentRemarksSchema = z.string().trim().max(2_000, "Remarks are too long.");

function parseDocumentId(value: string) {
  return documentIdSchema.parse(value);
}

async function currentIdentity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  const actor = await requireActiveTenantActor();
  return { company_id: actor.companyId, id: actor.staffId };
}

export async function addDocumentComment(documentId: string, formData: FormData) {
  documentId = parseDocumentId(documentId);
  await requirePermission("documents.comment");
  const commentText = documentRemarksSchema.nullable().parse(cleanText(formData.get("comment_text")));
  if (!commentText) return;
  const profile = await currentIdentity();

  if (!isMockMode()) {
    const supabase = await createClient();
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .eq("company_id", profile?.company_id ?? "")
      .maybeSingle();
    if (documentError) throw new Error(documentError.message);
    if (!document) throw new Error("Document was not found or is outside your workspace.");
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

async function hasExpectedAttachmentSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const startsWith = (...expected: number[]) => expected.every((value, index) => bytes[index] === value);
  if (file.type === "application/pdf") return startsWith(37, 80, 68, 70, 45); // %PDF-
  if (file.type === "image/png") return startsWith(137, 80, 78, 71, 13, 10, 26, 10);
  if (file.type === "image/jpeg") return startsWith(255, 216, 255);
  if (file.type === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (file.type.includes("openxmlformats-officedocument")) return startsWith(80, 75); // OOXML is a ZIP container.
  return true; // Plain text and CSV are intentionally handled as inert downloads.
}

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
    if (!(await hasExpectedAttachmentSignature(uploadedFile))) throw new Error("Attachment content does not match its file type.");
    const parsedDocumentId = documentIdSchema.safeParse(documentId);
    if (!parsedDocumentId.success) throw new Error("This document reference is invalid.");
    const profile = await currentIdentity();
    if (!profile?.company_id || !profile.id) throw new Error("An active staff profile is required.");
    const attachmentLabel = z.string().trim().min(3, "Name this attachment before uploading.").max(180, "Attachment name is too long.").parse(formData.get("file_name"));
    const fileName = attachmentLabel;

    if (!isMockMode()) {
      const supabase = await createClient();
      const { data: document, error: documentError } = await supabase
        .from("documents")
        .select("id")
        .eq("id", parsedDocumentId.data)
        .eq("company_id", profile.company_id)
        .maybeSingle();
      if (documentError) throw new Error(documentError.message);
      if (!document) throw new Error("Document was not found or is outside your workspace.");
      const safeName = uploadedFile.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "attachment";
      const storagePath = `${profile.company_id}/${parsedDocumentId.data}/${crypto.randomUUID()}-${safeName}`;
      // Materialize the Web File before passing it to the storage client. In
      // Node's server-action runtime, forwarding File's stream directly can
      // trigger `transformAlgorithm is not a function` and abort the request.
      const uploadBody = Buffer.from(await uploadedFile.arrayBuffer());
      const { error: uploadError } = await supabase.storage.from("document-attachments").upload(storagePath, uploadBody, { contentType: uploadedFile.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const { error } = await supabase.from("attachments").insert({
        company_id: profile.company_id,
        entity_type: "document",
        entity_id: parsedDocumentId.data,
        file_name: fileName.slice(0, 180),
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
  documentId = parseDocumentId(documentId);
  attachmentId = attachmentIdSchema.parse(attachmentId);
  await requirePermissionOrRedirect("documents.attach", `/documents/${documentId}`);
  try {
    if (!isMockMode()) {
      const actor = await requireActiveTenantActor();
      const supabase = await createClient();
      const [{ data: document, error: documentError }, { data: attachment, error: attachmentError }] = await Promise.all([
        supabase.from("documents").select("status").eq("id", documentId).eq("company_id", actor.companyId).maybeSingle(),
        supabase.from("attachments").select("storage_path").eq("id", attachmentId).eq("entity_id", documentId).eq("company_id", actor.companyId).maybeSingle(),
      ]);
      if (documentError) throw new Error(documentError.message);
      if (attachmentError) throw new Error(attachmentError.message);
      if (!document || !attachment) throw new Error("Document or attachment was not found or is outside your workspace.");
      if (!new Set(["draft", "pending_approval"]).has(document.status) && actor.roleCode !== "super_admin") throw new Error("Only an Owner can remove an attachment after review has started.");
      const { error } = await supabase.from("attachments").update({ status: "archived", deleted_at: new Date().toISOString() }).eq("id", attachmentId).eq("entity_id", documentId).eq("company_id", actor.companyId);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "attachment_archived", message: "Attachment archived" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/documents/${documentId}`, "error", formatActionError(error, "Could not archive this attachment."));
  }
  revalidatePath("/", "layout");
}

export async function archiveDocumentComment(documentId: string, commentId: string) {
  documentId = parseDocumentId(documentId);
  commentId = commentIdSchema.parse(commentId);
  await requirePermissionOrRedirect("documents.comment", `/documents/${documentId}`);
  try {
    if (!isMockMode()) {
      const actor = await requireActiveTenantActor({ owner: true });
      const supabase = await createClient();
      const { data: document, error: documentError } = await supabase.from("documents").select("id").eq("id", documentId).eq("company_id", actor.companyId).maybeSingle();
      if (documentError) throw new Error(documentError.message);
      if (!document) throw new Error("Document was not found or is outside your workspace.");
      const { error } = await supabase.from("document_comments").update({ deleted_at: new Date().toISOString() }).eq("id", commentId).eq("document_id", documentId).is("deleted_at", null);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "comment_archived", message: "Comment archived by Owner" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/documents/${documentId}`, "error", formatActionError(error, "Could not archive this comment."));
  }
  revalidatePath("/", "layout");
}

export async function submitDocument(documentId: string) {
  documentId = parseDocumentId(documentId);
  await requirePermission("documents.submit");
  if (!isMockMode()) { const { error } = await (await createClient()).rpc("transition_document_atomic", { p_document_id: documentId, p_action: "submit", p_remarks: null }); if (error) throw new Error(error.message); }
  revalidatePath("/documents"); revalidatePath(`/documents/${documentId}`);
}

export async function approveDocument(documentId: string, formData: FormData) {
  documentId = parseDocumentId(documentId);
  await requirePermission("documents.approve");
  const remarks = documentRemarksSchema.nullable().parse(cleanText(formData.get("remarks"))) ?? "Approved";
  if (!isMockMode()) { const { error } = await (await createClient()).rpc("transition_document_atomic", { p_document_id: documentId, p_action: "approve", p_remarks: remarks }); if (error) throw new Error(error.message); }
  revalidatePath("/documents"); revalidatePath(`/documents/${documentId}`);
}

export async function rejectDocument(documentId: string, formData: FormData) {
  documentId = parseDocumentId(documentId);
  await requirePermission("documents.approve");
  const remarks = documentRemarksSchema.nullable().parse(cleanText(formData.get("remarks")));
  if (!remarks) throw new Error("Rejection remarks are required.");
  if (!isMockMode()) { const { error } = await (await createClient()).rpc("transition_document_atomic", { p_document_id: documentId, p_action: "reject", p_remarks: remarks }); if (error) throw new Error(error.message); }
  revalidatePath("/documents"); revalidatePath(`/documents/${documentId}`);
}

export async function postDocument(documentId: string) {
  documentId = parseDocumentId(documentId);
  await requirePermission("documents.update");
  if (!isMockMode()) { const { error } = await (await createClient()).rpc("transition_document_atomic", { p_document_id: documentId, p_action: "post", p_remarks: null }); if (error) throw new Error(error.message); }
  revalidatePath("/documents"); revalidatePath(`/documents/${documentId}`);
}

export async function cancelDocument(documentId: string) {
  documentId = parseDocumentId(documentId);
  await requirePermission("documents.update");
  if (!isMockMode()) { const { error } = await (await createClient()).rpc("transition_document_atomic", { p_document_id: documentId, p_action: "cancel", p_remarks: null }); if (error) throw new Error(error.message); }
  revalidatePath("/documents"); revalidatePath(`/documents/${documentId}`);
}
