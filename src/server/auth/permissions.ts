import { isMockMode, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";

export async function hasPermission(permission: string) {
  if (isMockMode()) {
    return mockProfile.role === "admin" || permission.endsWith(".read");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_permission", { permission });
  if (error) return false;
  return Boolean(data);
}

export async function requirePermission(permission: string) {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    throw new Error(`Missing permission: ${permission}`);
  }
}
