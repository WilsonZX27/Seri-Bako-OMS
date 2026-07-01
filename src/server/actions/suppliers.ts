"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { supplierSchema } from "@/lib/validations/supplier";

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function createSupplier(formData: FormData) {
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
  const { error } = await supabase.from("suppliers").insert(parsed);
  if (error) throw new Error(error.message);

  revalidatePath("/suppliers");
  redirect("/suppliers");
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
    revalidatePath("/suppliers");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/suppliers");
}
