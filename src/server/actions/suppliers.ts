"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { supplierSchema } from "@/lib/validations/supplier";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function createSupplier(formData: FormData) {
  try {
    await requirePermissionOrRedirect("suppliers.create", "/suppliers/new");
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
    const writeSupabase = createAdminClient();
    if (parsed.supplier_code) {
      const { data: archivedMatch, error: archivedError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("supplier_code", parsed.supplier_code)
        .eq("status", "inactive")
        .limit(1)
        .maybeSingle();
      if (archivedError) throw new Error(archivedError.message);
      if (archivedMatch) {
        safeRedirectWithMessage(`/suppliers/${archivedMatch.id}`, "error", "An archived supplier with the same code already exists. Restore it instead of creating a duplicate.");
      }
    }
      const { error } = await writeSupabase.from("suppliers").insert(parsed);
    if (error) throw new Error(error.message);

    revalidatePath("/suppliers");
    redirect("/suppliers");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/suppliers/new", "error", formatActionError(error, "Could not create this supplier."));
  }
}

export async function updateSupplier(id: string, formData: FormData) {
  await requirePermissionOrRedirect("suppliers.update", `/suppliers/${id}`);
  if (isMockMode()) {
    redirect("/suppliers");
  }

  const parsed = supplierSchema.omit({ status: true }).parse({
    supplier_code: cleanText(formData.get("supplier_code")),
    name: formData.get("name"),
    contact_person: cleanText(formData.get("contact_person")),
    phone: cleanText(formData.get("phone")),
    email: cleanText(formData.get("email")),
    address: cleanText(formData.get("address")),
    payment_terms_days: formData.get("payment_terms_days"),
  });

  try {
    const writeSupabase = createAdminClient();
    const { error } = await writeSupabase.from("suppliers").update(parsed).eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/suppliers");
    redirect("/suppliers");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/suppliers/${id}`, "error", formatActionError(error, "Could not update this supplier."));
  }
}

export async function deleteSupplier(id: string) {
  try {
    await requirePermissionOrRedirect("suppliers.update", "/suppliers");
    if (isMockMode()) {
      redirect("/suppliers");
    }

    const writeSupabase = createAdminClient();
    const { error } = await writeSupabase
      .from("suppliers")
      .update({ status: "inactive" })
      .eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/suppliers");
    redirect("/suppliers?success=Supplier%20deactivated.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/suppliers", "error", formatActionError(error, "Supplier could not be saved. Please contact the Super Admin / Owner."));
  }
}

export async function restoreSupplier(id: string) {
  try {
    await requirePermissionOrRedirect("suppliers.update", `/suppliers/${id}`);
    if (isMockMode()) {
      redirect("/suppliers");
    }

    const writeSupabase = createAdminClient();
    const { error } = await writeSupabase
      .from("suppliers")
      .update({ status: "active" })
      .eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/suppliers");
    redirect(`/suppliers/${id}?success=Supplier%20restored.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/suppliers/${id}`, "error", formatActionError(error, "Could not restore this supplier."));
  }
}
