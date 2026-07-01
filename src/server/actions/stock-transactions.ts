"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { stockTransactionSchema } from "@/lib/validations/stock-transaction";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { resolveDefaultLocation } from "@/server/inventory/locations";
import { getCurrentProfile } from "@/server/queries/common";

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

async function identity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
}

async function createLinkedDocument(transactionNo: string, relatedEntityId: string) {
  const profile = await identity();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      company_id: profile?.company_id ?? null,
      document_no: transactionNo,
      document_type: "stock_transaction",
      title: `Stock Transaction ${transactionNo}`,
      status: "posted",
      approval_status: "not_required",
      current_step: "Posted to ledger",
      related_entity_type: "stock_transaction",
      related_entity_id: relatedEntityId,
      posted_at: new Date().toISOString(),
      created_by: profile?.id ?? null,
      updated_by: profile?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("document_revisions").insert({ document_id: data.id, revision_no: 1, change_summary: "Initial stock transaction posted.", changed_by: profile?.id ?? null });
  return data.id;
}

export async function createStockTransaction(formData: FormData) {
  await requirePermission("stock_transactions.create");
  if (isMockMode()) {
    redirect("/stock-transactions");
  }

  const parsed = stockTransactionSchema.parse({
    item_id: formData.get("item_id"),
    branch_id: formData.get("branch_id"),
    location_id: formData.get("location_id"),
    transaction_type: formData.get("transaction_type"),
    transaction_date: formData.get("transaction_date"),
    direction: formData.get("direction"),
    quantity: formData.get("quantity"),
    unit_cost: formData.get("unit_cost") || null,
    remarks: cleanText(formData.get("remarks")),
    from_location_id: formData.get("from_location_id"),
    to_location_id: formData.get("to_location_id"),
  });

  const supabase = await createClient();
  const profile = await identity();
  const locationId = await resolveDefaultLocation(parsed.branch_id, parsed.location_id);
  const quantityIn = parsed.direction === "in" ? parsed.quantity : 0;
  const quantityOut = parsed.direction === "out" ? parsed.quantity : 0;
  const unitCost = parsed.unit_cost ?? 0;
  const transactionNo = `ST-${Date.now().toString().slice(-8)}`;
  const { data: location } = await supabase.from("locations").select("branch_id").eq("id", locationId).maybeSingle();

  const { data, error } = await supabase.from("stock_transactions").insert({
    transaction_no: transactionNo,
    branch_id: parsed.branch_id ?? location?.branch_id ?? null,
    item_id: parsed.item_id,
    location_id: locationId,
    transaction_type: parsed.transaction_type,
    transaction_date: parsed.transaction_date,
    quantity_in: quantityIn,
    quantity_out: quantityOut,
    unit_cost: unitCost,
    total_cost: Math.max(quantityIn, quantityOut) * unitCost,
    status: "posted",
    posted_at: new Date().toISOString(),
    posted_by: profile?.id ?? null,
    remarks: parsed.remarks || null,
    from_location_id: parsed.from_location_id || null,
    to_location_id: parsed.to_location_id || null,
    created_by: profile?.id ?? null,
  }).select("id").single();

  if (error) throw new Error(error.message);
  const documentId = await createLinkedDocument(transactionNo, data.id);
  const [{ error: updateError }, { error: lineError }] = await Promise.all([
    supabase.from("stock_transactions").update({ document_id: documentId }).eq("id", data.id),
    supabase.from("stock_transaction_lines").insert({
      stock_transaction_id: data.id,
      stock_entity_type: "item",
      item_id: parsed.item_id,
      branch_id: parsed.branch_id ?? location?.branch_id ?? null,
      location_id: locationId,
      quantity_in: quantityIn,
      quantity_out: quantityOut,
      unit_cost: unitCost,
      reference_type: "stock_transaction",
      reference_id: data.id,
      remarks: parsed.remarks || null,
      created_by: profile?.id ?? null,
    }),
  ]);
  if (updateError) throw new Error(updateError.message);
  if (lineError) throw new Error(lineError.message);
  await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "posted", message: `Stock transaction ${transactionNo} posted to ledger` });

  revalidatePath("/stock-transactions");
  revalidatePath("/stock-balance");
  revalidatePath("/stock-balances");
  revalidatePath("/stock-card");
  revalidatePath("/inventory");
  revalidatePath("/low-stock");
  revalidatePath("/dashboard");
  redirect("/stock-transactions");
}
