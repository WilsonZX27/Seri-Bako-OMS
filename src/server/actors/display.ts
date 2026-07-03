"server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isMockMode, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_ACTOR = "System";
const UNKNOWN_ACTOR = "Unknown user";

function uniqueActorIds(actorIds: Array<string | null | undefined>) {
  return Array.from(new Set(actorIds.filter((id): id is string => Boolean(id))));
}

function displayName(row: { full_name?: string | null; email?: string | null; invite_email?: string | null }) {
  return row.full_name?.trim() || row.email?.trim() || row.invite_email?.trim() || UNKNOWN_ACTOR;
}

function getOptionalAdminClient() {
  try {
    return createAdminClient();
  } catch (error) {
    if (error instanceof Error && error.message.includes("service role key")) return null;
    throw error;
  }
}

async function queryStaffDisplays(actorIds: string[]) {
  const client = getOptionalAdminClient() ?? (await createClient());
  const displayMap = new Map<string, string>();

  const byStaffId = await client
    .from("staffs")
    .select("id, auth_user_id, full_name, email, invite_email")
    .in("id", actorIds)
    .is("deleted_at", null);
  if (!byStaffId.error) {
    for (const row of byStaffId.data ?? []) {
      const name = displayName(row);
      displayMap.set(row.id, name);
      if (row.auth_user_id) displayMap.set(row.auth_user_id, name);
    }
  }

  const unresolved = actorIds.filter((id) => !displayMap.has(id));
  if (unresolved.length) {
    const byAuthId = await client
      .from("staffs")
      .select("id, auth_user_id, full_name, email, invite_email")
      .in("auth_user_id", unresolved)
      .is("deleted_at", null);
    if (!byAuthId.error) {
      for (const row of byAuthId.data ?? []) {
        const name = displayName(row);
        displayMap.set(row.id, name);
        if (row.auth_user_id) displayMap.set(row.auth_user_id, name);
      }
    }
  }

  return displayMap;
}

export async function resolveActorDisplayMap(actorIds: Array<string | null | undefined>) {
  const ids = uniqueActorIds(actorIds);
  const displayMap = new Map<string, string>();
  if (!ids.length) return displayMap;

  if (isMockMode()) {
    for (const id of ids) displayMap.set(id, mockProfile.full_name);
    return displayMap;
  }

  const staffMap = await queryStaffDisplays(ids);
  for (const [id, name] of staffMap) displayMap.set(id, name);

  for (const id of ids) {
    if (!displayMap.has(id)) {
      console.warn(`Unable to resolve actor display for ${id.slice(0, 8)}.`);
      displayMap.set(id, UNKNOWN_ACTOR);
    }
  }

  return displayMap;
}

export function actorDisplayName(displayMap: Map<string, string>, actorId: string | null | undefined) {
  if (!actorId) return SYSTEM_ACTOR;
  return displayMap.get(actorId) ?? UNKNOWN_ACTOR;
}

export function formatActivityWithActor(message: string, actorName: string) {
  if (!actorName || actorName === SYSTEM_ACTOR) return message;
  return `${actorName}: ${message}`;
}
