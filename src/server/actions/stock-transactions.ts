"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { stockTransactionSchema } from "@/lib/validations/stock-transaction";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { getCurrentProfile } from "@/server/queries/common";

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

async function identity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
}

export async function createStockTransaction(formData: FormData) {
  await requirePermissionOrRedirect("stock_transactions.create", "/stock-transactions/new");
  try {
    if (isMockMode()) {
      redirect("/stock-transactions");
    }

    const parsed = stockTransactionSchema.parse({
      item_id: formData.get("item_id"),
      branch_id: formData.get("branch_id"),
      transaction_type: formData.get("transaction_type"),
      transaction_date: formData.get("transaction_date"),
      direction: formData.get("direction"),
      quantity: formData.get("quantity"),
      unit_cost: formData.get("unit_cost") || null,
      remarks: cleanText(formData.get("remarks")),
    });

    const supabase = await createClient();
    const profile = await identity();
    const quantityIn = parsed.direction === "in" ? parsed.quantity : 0;
    const quantityOut = parsed.direction === "out" ? parsed.quantity : 0;
    const unitCost = parsed.unit_cost ?? 0;
    const transactionNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "stock_transaction",
      enteredNumber: null,
    });
    const { error } = await supabase.rpc("post_manual_inventory_movement", {
      p_transaction_no: transactionNo,
      p_branch_id: parsed.branch_id,
      p_item_id: parsed.item_id,
      p_transaction_type: parsed.transaction_type,
      p_transaction_date: parsed.transaction_date,
      p_quantity_in: quantityIn,
      p_quantity_out: quantityOut,
      p_unit_cost: unitCost,
      p_remarks: parsed.remarks || null,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/stock-transactions");
    revalidatePath("/stock-balance");
    revalidatePath("/stock-card");
    revalidatePath("/inventory");
    revalidatePath("/low-stock");
    revalidatePath("/dashboard");
    redirect("/stock-transactions");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/stock-transactions/new", "error", formatActionError(error, "Could not post this stock movement."));
  }
}
