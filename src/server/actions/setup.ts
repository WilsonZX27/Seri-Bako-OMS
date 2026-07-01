"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMockMode } from "@/lib/mock-mode";

export async function runFirstAdminSetup() {
  if (isMockMode()) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: hasAdmin, error: statusError } = await supabase.rpc("has_admin_staff_assignment");
  if (statusError) {
    redirect(`/setup?error=${encodeURIComponent(statusError.message)}`);
  }

  if (hasAdmin) {
    redirect("/setup?completed=1");
  }

  const { error } = await supabase.rpc("bootstrap_first_admin");
  if (error) {
    redirect(`/setup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
