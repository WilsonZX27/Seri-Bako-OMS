import { createClient } from "@/lib/supabase/server";

export async function getSetupStatus() {
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
