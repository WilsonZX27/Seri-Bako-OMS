import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// React cache is scoped to one server render. A later request still verifies
// the session with Auth; no identity or permission is shared between users.
export const getCurrentAuthUser = cache(async function getCurrentAuthUser() {
  const supabase = await createClient();
  return supabase.auth.getUser();
});
