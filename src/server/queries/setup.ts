import { createClient } from "@/lib/supabase/server";
import { isMockMode } from "@/lib/mock-mode";

export async function getSetupStatus() {
  if (isMockMode()) {
    return { hasAdmin: true, user: { id: "mock-user-admin", email: "mock@example.com" } };
  }

  const supabase = await createClient();
  const [{ data: userResult }, { data: hasAdmin, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("has_admin_staff_assignment"),
  ]);

  if (error) throw new Error(error.message);

  return {
    hasAdmin: Boolean(hasAdmin),
    user: userResult.user,
  };
}
