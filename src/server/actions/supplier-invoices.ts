"use server";

import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { supplierInvoicePaymentSchema, supplierInvoiceSchema } from "@/lib/validations/procurement";
import { writeActivityLog } from "@/server/activity/log";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { getCurrentProfile } from "@/server/queries/common";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

async function identity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
}

async function createLinkedDocument(input: { documentNo: string; relatedEntityId: string }) {
  const profile = await identity();
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").insert({
    company_id: profile?.company_id ?? null,
    document_no: input.documentNo,
    document_type: "supplier_invoice",
    title: `Supplier Invoice ${input.documentNo}`,
    status: "posted",
    approval_status: "not_required",
    current_step: "AP tracking",
    related_entity_type: "supplier_invoice",
    related_entity_id: input.relatedEntityId,
    created_by: profile?.id ?? null,
    updated_by: profile?.id ?? null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  await supabase.from("document_revisions").insert({ document_id: data.id, revision_no: 1, change_summary: "Initial supplier invoice created.", changed_by: profile?.id ?? null });
  return data.id;
}

export async function createSupplierInvoice(formData: FormData) {
  await requirePermissionOrRedirect("supplier_invoice.create", "/supplier-invoices/new");
  try {
    if (isMockMode()) redirect("/supplier-invoices");
    const payload = supplierInvoiceSchema.parse({
      supplier_invoice_no: formData.get("supplier_invoice_no"),
      goods_receiving_id: formData.get("goods_receiving_id"),
      invoice_date: formData.get("invoice_date"),
      due_date: formData.get("due_date"),
      subtotal: formData.get("subtotal"),
      tax_amount: formData.get("tax_amount") || 0,
      total_amount: formData.get("total_amount"),
      notes: cleanText(formData.get("notes")),
    });
    const profile = await identity();
    const supabase = await createClient();
    const { data: grn, error: grnError } = await supabase.from("goods_receivings").select("*").eq("id", payload.goods_receiving_id).single();
    if (grnError) throw new Error(grnError.message);
    if (grn.status !== "posted") throw new Error("Supplier invoice must be linked to a posted GRN.");
    const { data: duplicate } = await supabase.from("supplier_invoices").select("id").eq("supplier_id", grn.supplier_id).eq("supplier_invoice_no", payload.supplier_invoice_no).is("deleted_at", null).maybeSingle();
    if (duplicate) throw new Error("This supplier invoice number already exists for this supplier.");
    const invoiceNo = await resolveDocumentNumber({ companyId: profile?.company_id, documentType: "supplier_invoice", enteredNumber: null });
    const { data, error } = await supabase.from("supplier_invoices").insert({
      company_id: profile?.company_id ?? null,
      invoice_no: invoiceNo,
      supplier_invoice_no: payload.supplier_invoice_no,
      supplier_id: grn.supplier_id,
      purchase_order_id: grn.purchase_order_id,
      goods_receiving_id: grn.id,
      invoice_date: payload.invoice_date,
      due_date: cleanText(payload.due_date ?? null),
      subtotal: payload.subtotal,
      tax_amount: payload.tax_amount,
      total_amount: payload.total_amount,
      status: "unpaid",
      notes: payload.notes,
      created_by: profile?.id ?? null,
      updated_by: profile?.id ?? null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    const documentId = await createLinkedDocument({ documentNo: invoiceNo, relatedEntityId: data.id });
    const { error: updateError } = await supabase.from("supplier_invoices").update({ document_id: documentId }).eq("id", data.id);
    if (updateError) throw new Error(updateError.message);
    await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "created", message: `Supplier invoice ${invoiceNo} created` });
    revalidateWorkspaceState(["/supplier-invoices"]);
    redirect(`/supplier-invoices/${data.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/supplier-invoices/new", "error", formatActionError(error, "Could not create this supplier invoice."));
  }
}

export async function recordSupplierInvoicePayment(id: string, formData: FormData) {
  await requirePermissionOrRedirect("supplier_invoice.pay", `/supplier-invoices/${id}`);
  try {
    const payload = supplierInvoicePaymentSchema.parse({
      payment_date: formData.get("payment_date"),
      amount: formData.get("amount"),
      payment_method: cleanText(formData.get("payment_method")),
      reference_no: cleanText(formData.get("reference_no")),
      notes: cleanText(formData.get("notes")),
    });
    const profile = await identity();
    const supabase = await createClient();
    const { data: invoice, error } = await supabase.from("supplier_invoices").select("*").eq("id", id).single();
    if (error) throw new Error(error.message);
    if (invoice.status === "paid") throw new Error("Paid invoice cannot receive another payment.");
    const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
    if (payload.amount > balance) throw new Error("Payment cannot exceed outstanding balance.");
    const paymentNo = await resolveDocumentNumber({ companyId: profile?.company_id, documentType: "payment_schedule", enteredNumber: null });
    const { error: paymentError } = await supabase.from("supplier_invoice_payments").insert({
      company_id: profile?.company_id ?? null,
      supplier_invoice_id: id,
      payment_no: paymentNo,
      payment_date: payload.payment_date,
      amount: payload.amount,
      payment_method: payload.payment_method,
      reference_no: payload.reference_no,
      notes: payload.notes,
      created_by: profile?.id ?? null,
    });
    if (paymentError) throw new Error(paymentError.message);
    const amountPaid = Number(invoice.amount_paid) + payload.amount;
    const status = amountPaid >= Number(invoice.total_amount) ? "paid" : "partially_paid";
    const { error: updateError } = await supabase.from("supplier_invoices").update({ amount_paid: amountPaid, status, updated_by: profile?.id ?? null }).eq("id", id);
    if (updateError) throw new Error(updateError.message);
    if (invoice.document_id) await writeActivityLog({ entityType: "document", entityId: invoice.document_id, activityType: "payment_recorded", message: `Payment ${paymentNo} recorded for ${invoice.invoice_no}` });
    revalidateWorkspaceState(["/supplier-invoices", `/supplier-invoices/${id}`]);
    safeRedirectWithMessage(`/supplier-invoices/${id}`, "success", `Payment ${paymentNo} recorded.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/supplier-invoices/${id}`, "error", formatActionError(error, "Could not record this payment."));
  }
}
