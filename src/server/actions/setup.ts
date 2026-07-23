"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isMockMode } from "@/lib/mock-mode";

export async function runFirstAdminSetup(formData: FormData) {
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

  const submittedToken = String(formData.get("bootstrap_token") ?? "");
  const expectedToken = process.env.SUPABASE_BOOTSTRAP_TOKEN ?? "";
  const tokenMatches = submittedToken.length > 0 && expectedToken.length > 0 && submittedToken.length === expectedToken.length
    && timingSafeEqual(Buffer.from(submittedToken), Buffer.from(expectedToken));
  if (!tokenMatches) {
    redirect(`/setup?error=${encodeURIComponent("An operator bootstrap token is required. Ask the deployment owner to provision the first Owner.")}`);
  }

  const { data: hasAdmin, error: statusError } = await supabase.rpc("has_admin_staff_assignment");
  if (statusError) {
    redirect(`/setup?error=${encodeURIComponent(statusError.message)}`);
  }

  if (hasAdmin) {
    redirect("/setup?completed=1");
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("bootstrap_first_admin", { p_first_owner_user_id: user.id });
  if (error) {
    redirect(`/setup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
