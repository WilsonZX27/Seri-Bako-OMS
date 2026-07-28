"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { supplierInvoicePaymentSchema, supplierInvoiceSchema } from "@/lib/validations/procurement";
import { writeActivityLog } from "@/server/activity/log";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { getCurrentProfile } from "@/server/queries/common";
import { parseBoundedJson } from "@/server/validation/json-input";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function parseSupplierInvoiceId(id: string) {
  return z.string().uuid("The supplier invoice identifier is invalid.").parse(id);
}

async function identity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
}

function parseInvoice(formData: FormData) {
  return supplierInvoiceSchema.parse({
    supplier_invoice_no: formData.get("supplier_invoice_no"),
    supplier_id: formData.get("supplier_id"),
    invoice_date: formData.get("invoice_date"),
    due_date: formData.get("due_date"),
    payment_terms_days: formData.get("payment_terms_days"),
    tax_amount: formData.get("tax_amount") || 0,
    notes: cleanText(formData.get("notes")),
    lines: parseBoundedJson(formData.get("lines"), "invoice lines"),
  });
}

async function saveDraft(invoiceId: string | null, formData: FormData) {
  const payload = parseInvoice(formData);
  const profile = await identity();
  const supabase = await createClient();
  const invoiceNo = invoiceId
    ? String(formData.get("invoice_no") ?? "")
    : await resolveDocumentNumber({ companyId: profile?.company_id, documentType: "supplier_invoice", enteredNumber: null });
  const { data, error } = await supabase.rpc("save_supplier_invoice_draft", {
    p_invoice_id: invoiceId,
    p_invoice_no: invoiceNo,
    p_supplier_invoice_no: payload.supplier_invoice_no,
    p_supplier_id: payload.supplier_id,
    p_invoice_date: payload.invoice_date,
    p_due_date: cleanText(payload.due_date ?? null),
    p_payment_terms_days: payload.payment_terms_days,
    p_tax_amount: payload.tax_amount,
    p_notes: payload.notes ?? null,
    p_lines: payload.lines,
  });
  if (error) throw new Error(error.message);
  return { id: data, invoiceNo };
}

export async function createSupplierInvoice(formData: FormData) {
  await requirePermissionOrRedirect("supplier_invoice.create", "/supplier-invoices/new");
  try {
    if (isMockMode()) redirect("/supplier-invoices");
    const saved = await saveDraft(null, formData);
    const supabase = await createClient();
    const { data: invoice, error } = await supabase.from("supplier_invoices").select("document_id").eq("id", saved.id).single();
    if (error) throw new Error(error.message);
    if (invoice.document_id) await writeActivityLog({ entityType: "document", entityId: invoice.document_id, activityType: "created", message: `Supplier invoice ${saved.invoiceNo} draft created` });
    revalidateWorkspaceState(["/supplier-invoices"]);
    redirect(`/supplier-invoices/${saved.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/supplier-invoices/new", "error", formatActionError(error, "Could not create this supplier invoice."));
  }
}

export async function updateSupplierInvoiceDraft(id: string, formData: FormData) {
  await requirePermissionOrRedirect("supplier_invoice.create", `/supplier-invoices/${id}`);
  try {
    const invoiceId = parseSupplierInvoiceId(id);
    await saveDraft(invoiceId, formData);
    revalidateWorkspaceState(["/supplier-invoices", `/supplier-invoices/${invoiceId}`]);
    safeRedirectWithMessage(`/supplier-invoices/${invoiceId}`, "success", "Draft invoice updated.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/supplier-invoices/${id}`, "error", formatActionError(error, "Could not update this invoice draft."));
  }
}

export async function approveSupplierInvoice(id: string) {
  await requirePermissionOrRedirect("supplier_invoice.approve", `/supplier-invoices/${id}`);
  try {
    const invoiceId = parseSupplierInvoiceId(id);
    const supabase = await createClient();
    const { data: invoiceEvidence, error: evidenceQueryError } = await supabase.from("supplier_invoices").select("document_id").eq("id", invoiceId).single();
    if (evidenceQueryError) throw new Error(evidenceQueryError.message);
    const { count: attachmentCount, error: attachmentError } = invoiceEvidence.document_id
      ? await supabase.from("attachments").select("id", { count: "exact", head: true }).eq("entity_type", "document").eq("entity_id", invoiceEvidence.document_id).eq("status", "active").is("deleted_at", null)
      : { count: 0, error: null };
    if (attachmentError) throw new Error(attachmentError.message);
    if (!attachmentCount) throw new Error("Attach the supplier invoice before sending it to Finance Review.");
    const { data: auditLines, error: auditLinesError } = await supabase
      .from("supplier_invoice_lines")
      .select("invoice_qty,received_qty,previously_invoiced_qty,po_unit_price,invoice_unit_price")
      .eq("supplier_invoice_id", invoiceId);
    if (auditLinesError) throw new Error(auditLinesError.message);
    const discrepancy = (auditLines ?? []).find((line) =>
      Number(line.invoice_qty) !== Number(line.received_qty) - Number(line.previously_invoiced_qty)
      || Math.abs(Number(line.invoice_unit_price) - Number(line.po_unit_price)) > 0.01,
    );
    if (discrepancy) throw new Error("Audit discrepancy: invoice quantity or price does not match the received PO line.");
    const { error } = await supabase.rpc("approve_supplier_invoice", { p_invoice_id: invoiceId });
    if (error) throw new Error(error.message);
    const { data: invoice } = await supabase.from("supplier_invoices").select("invoice_no, document_id").eq("id", invoiceId).single();
    if (invoice?.document_id) {
      await supabase.from("documents").update({ status: "posted", approval_status: "approved", current_step: "Audit Passed" }).eq("id", invoice.document_id);
      await writeActivityLog({ entityType: "document", entityId: invoice.document_id, activityType: "approved", message: `Supplier invoice ${invoice.invoice_no} approved and opened` });
    }
    revalidateWorkspaceState(["/supplier-invoices", `/supplier-invoices/${invoiceId}`]);
    safeRedirectWithMessage(`/supplier-invoices/${invoiceId}`, "success", "Invoice approved and open for payment.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/supplier-invoices/${id}`, "error", formatActionError(error, "Could not approve this invoice."));
  }
}

export async function recordSupplierInvoicePayment(id: string, formData: FormData) {
  await requirePermissionOrRedirect("supplier_invoice.pay", `/supplier-invoices/${id}`);
  try {
    const invoiceId = parseSupplierInvoiceId(id);
    const payload = supplierInvoicePaymentSchema.parse({
      payment_date: formData.get("payment_date"),
      amount: formData.get("amount"),
      payment_method: cleanText(formData.get("payment_method")),
      reference_no: cleanText(formData.get("reference_no")),
      notes: cleanText(formData.get("notes")),
      idempotency_key: formData.get("idempotency_key"),
    });
    const profile = await identity();
    const supabase = await createClient();
    const { data: invoiceEvidence, error: invoiceEvidenceError } = await supabase.from("supplier_invoices").select("document_id").eq("id", invoiceId).single();
    if (invoiceEvidenceError) throw new Error(invoiceEvidenceError.message);
    if (!invoiceEvidence.document_id) throw new Error("A payment document is required before recording payment.");
    const { data: paymentSlips, error: paymentSlipError } = await supabase
      .from("attachments")
      .select("id")
      .eq("entity_type", "document")
      .eq("entity_id", invoiceEvidence.document_id)
      .ilike("file_name", "%Payment Slip%")
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(1);
    if (paymentSlipError) throw new Error(paymentSlipError.message);
    if (!paymentSlips?.length) throw new Error("Attach the Payment Slip before recording payment.");
    const paymentNo = await resolveDocumentNumber({ companyId: profile?.company_id, documentType: "payment_schedule", enteredNumber: null });
    const { data: recordedNo, error } = await supabase.rpc("record_supplier_invoice_payment", {
      p_invoice_id: invoiceId,
      p_payment_no: paymentNo,
      p_payment_date: payload.payment_date,
      p_amount: payload.amount,
      p_payment_method: payload.payment_method ?? null,
      p_reference_no: payload.reference_no ?? null,
      p_notes: payload.notes ?? null,
      p_idempotency_key: payload.idempotency_key,
    });
    if (error) throw new Error(error.message);
    const { data: invoice } = await supabase.from("supplier_invoices").select("invoice_no, document_id").eq("id", invoiceId).single();
    if (invoice?.document_id) await writeActivityLog({ entityType: "document", entityId: invoice.document_id, activityType: "payment_recorded", message: `Payment ${recordedNo} recorded for ${invoice.invoice_no}` });
    revalidateWorkspaceState(["/supplier-invoices", `/supplier-invoices/${invoiceId}`]);
    safeRedirectWithMessage(`/supplier-invoices/${invoiceId}`, "success", `Payment ${recordedNo} recorded.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/supplier-invoices/${id}`, "error", formatActionError(error, "Could not record this payment."));
  }
}

export async function voidSupplierInvoice(id: string, formData: FormData) {
  await requirePermissionOrRedirect("supplier_invoice.void", `/supplier-invoices/${id}`);
  try {
    const invoiceId = parseSupplierInvoiceId(id);
    const reason = z.string().trim().min(1, "A void reason is required.").max(1_000, "Void reason is too long.").parse(formData.get("reason"));
    const supabase = await createClient();
    const { error } = await supabase.rpc("void_supplier_invoice", { p_invoice_id: invoiceId, p_reason: reason });
    if (error) throw new Error(error.message);
    const { data: invoice } = await supabase.from("supplier_invoices").select("invoice_no, document_id").eq("id", invoiceId).single();
    if (invoice?.document_id) {
      await supabase.from("documents").update({ status: "cancelled", approval_status: "cancelled", current_step: "Void" }).eq("id", invoice.document_id);
      await writeActivityLog({ entityType: "document", entityId: invoice.document_id, activityType: "voided", message: `Supplier invoice ${invoice.invoice_no} voided: ${reason}` });
    }
    revalidateWorkspaceState(["/supplier-invoices", `/supplier-invoices/${invoiceId}`]);
    safeRedirectWithMessage(`/supplier-invoices/${invoiceId}`, "success", "Invoice voided.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/supplier-invoices/${id}`, "error", formatActionError(error, "Could not void this invoice."));
  }
}
