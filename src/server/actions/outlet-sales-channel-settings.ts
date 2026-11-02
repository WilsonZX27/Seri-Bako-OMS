"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { salesChannelSettingsSchema, type SalesChannelSettings } from "@/lib/outlet-sales-channel-settings";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";

export async function saveOutletSalesChannelSettings(input: SalesChannelSettings): Promise<{ revision: number } | { error: string }> {
  try { await requireActiveTenantActor({ owner: true }); }
  catch { return { error: "Only an active Owner can change sales channel settings. Your edits remain here." }; }
  try {
    const parsed = salesChannelSettingsSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check channel settings." };
    const db = await createClient();
    const { data, error } = await db.rpc("configure_outlet_sales_channel_settings", { p_expected_revision: parsed.data.revision, p_channels: parsed.data.channels });
    if (error) return { error: error.message.includes("ODR_SETTINGS_CONFLICT") ? "These settings changed in another session. Your edits remain here. Open the latest settings in another tab to compare." : "Sales channel settings were not saved. Your edits remain here; try again." };
    if (typeof data !== "number" || !Number.isSafeInteger(data) || data <= parsed.data.revision) return { error: "Save could not be confirmed. Your edits remain here; check the latest settings before retrying." };
    revalidatePath("/outlet-daily-records/settings/sales");
    return { revision: data };
  } catch { return { error: "Sales channel settings could not be saved. Your edits remain here; try again." }; }
}
