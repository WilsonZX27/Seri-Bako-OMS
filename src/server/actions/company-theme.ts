"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { requirePermission } from "@/server/auth/permissions";
import { safeRedirectWithMessage, rethrowRedirect, formatActionError } from "@/server/actions/error-handling";
import { writeActivityLog } from "@/server/activity/log";
export async function updateCompanyTheme(form: FormData) {
  let saved = false;
  try {
    await requirePermission("company.update");
    const actor = await requireActiveTenantActor({ owner: true });
    const primary = z.string().regex(/^#[0-9a-f]{6}$/i, "Choose a six-digit colour.").parse(form.get("primary"));
    const db = await createClient();
    const { data: company, error: readError } = await db.from("companies").select("*").eq("id", actor.companyId).is("deleted_at", null).single();
    if (readError || !company || !("ui_theme" in company)) throw Error("Company colour saving is not enabled. No colours were saved.");
    const theme = form.get("reset") === "yes" ? null : { version: 1, primary: primary.toLowerCase() };
    const { data, error } = await db.from("companies").update({ ui_theme: theme }).eq("id", actor.companyId).is("deleted_at", null).select("id").single();
    if (error || !data) throw Error(error?.message ?? "Colour save could not be confirmed. Reload before trying again.");
    saved = true;
    await writeActivityLog({ entityType: "company", entityId: actor.companyId, activityType: "theme_updated", message: "Company colours updated" });
    revalidatePath("/", "layout");
    safeRedirectWithMessage("/company", "success", "Company colours saved.");
  } catch (error) {
    rethrowRedirect(error);
    if (saved) {
      revalidatePath("/", "layout");
      safeRedirectWithMessage("/company", "error", "Colours were saved, but activity logging could not be confirmed. Reload before changing them again.");
    }
    safeRedirectWithMessage("/company", "error", formatActionError(error, "Colour save could not be confirmed. Reload before retrying."));
  }
}
