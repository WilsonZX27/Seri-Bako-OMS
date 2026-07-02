"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { supplierSchema } from "@/lib/validations/supplier";
import { formatActionError, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function createSupplier(formData: FormData) {
  try {
    if (isMockMode()) {
      redirect("/suppliers");
    }

    const parsed = supplierSchema.parse({
      supplier_code: cleanText(formData.get("supplier_code")),
      name: formData.get("name"),
      contact_person: cleanText(formData.get("contact_person")),
      phone: cleanText(formData.get("phone")),
      email: cleanText(formData.get("email")),
      address: cleanText(formData.get("address")),
      payment_terms_days: formData.get("payment_terms_days"),
      status: formData.get("status") ?? "active",
    });

    const supabase = await createClient();
    if (parsed.supplier_code) {
      const { data: archivedMatch, error: archivedError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("supplier_code", parsed.supplier_code)
        .not("deleted_at", "is", null)
        .limit(1)
        .maybeSingle();
      if (archivedError) throw new Error(archivedError.message);
      if (archivedMatch) {
        safeRedirectWithMessage(`/suppliers/${archivedMatch.id}`, "error", "An archived supplier with the same code already exists. Restore it instead of creating a duplicate.");
      }
    }
    const { error } = await supabase.from("suppliers").insert(parsed);
    if (error) throw new Error(error.message);

    revalidatePath("/suppliers");
    redirect("/suppliers");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/suppliers/new", "error", formatActionError(error, "Could not create this supplier."));
  }
}

export async function updateSupplier(id: string, formData: FormData) {
  if (isMockMode()) {
    redirect("/suppliers");
  }

  const parsed = supplierSchema.parse({
    supplier_code: cleanText(formData.get("supplier_code")),
    name: formData.get("name"),
    contact_person: cleanText(formData.get("contact_person")),
    phone: cleanText(formData.get("phone")),
    email: cleanText(formData.get("email")),
    address: cleanText(formData.get("address")),
    payment_terms_days: formData.get("payment_terms_days"),
    status: formData.get("status") ?? "active",
  });

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update(parsed).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function deleteSupplier(id: string) {
  if (isMockMode()) {
    redirect("/suppliers");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ status: "inactive", deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/suppliers");
  redirect("/suppliers?success=Supplier%20deactivated.");
}

export async function restoreSupplier(id: string) {
  if (isMockMode()) {
    redirect("/suppliers");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ status: "active", deleted_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/suppliers");
  redirect(`/suppliers/${id}?success=Supplier%20restored.`);
}
