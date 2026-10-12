import { createAdminClient } from "@/lib/supabase/admin";

export async function listAuthUserSummaries() {
  const admin = createAdminClient();
  const users: { id: string; email: string | null; lastSignInAt: string | null }[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...data.users.map((user) => ({
      id: user.id,
      email: user.email ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
    })));
    if (data.users.length < 1000) break;
  }
  return users;
}

export async function getAuthUserSummary(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error?.status === 404) return null;
  if (error) throw new Error(error.message);
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    lastSignInAt: data.user.last_sign_in_at ?? null,
  };
}

export async function findAuthUsersByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return (await listAuthUserSummaries()).filter((user) => user.email?.trim().toLowerCase() === normalized);
}

export function hasUniqueValidAuthLink(
  staff: { auth_user_id?: string | null; email?: string | null; invite_email?: string | null },
  authUsers: Awaited<ReturnType<typeof listAuthUserSummaries>>,
) {
  const normalized = staff.email?.trim().toLowerCase() ?? "";
  if (!staff.auth_user_id || !normalized || (staff.invite_email && staff.invite_email.trim().toLowerCase() !== normalized)) return false;
  const matches = authUsers.filter((user) => user.email?.trim().toLowerCase() === normalized);
  return matches.length === 1 && matches[0].id === staff.auth_user_id;
}
