"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function hardDeletePhaseOne(recordType: string, recordId: string, formData: FormData) {
  const confirmation = String(formData.get("confirmation") ?? "");
  const db = await createClient();
  const { error } = await db.rpc("hard_delete_phase_one", { record_type: recordType, record_id: recordId, confirmation });
  const routes: Record<string, string> = { purchase_request: "/purchase-requests", supplier: "/suppliers", item: "/items", product: "/products", recipe: "/recipes" };
  const listRoute = routes[recordType] ?? "/dashboard";
  if (error) redirect(`${listRoute}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/purchase-requests"); revalidatePath("/suppliers"); revalidatePath("/items"); revalidatePath("/products"); revalidatePath("/recipes");
  redirect(`${listRoute}?success=${encodeURIComponent("Record permanently deleted.")}`);
}
