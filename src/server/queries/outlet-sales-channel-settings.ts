import { createClient } from "@/lib/supabase/server";
import { defaultSalesChannelSettings, salesChannelSettingsSchema } from "@/lib/outlet-sales-channel-settings";

export async function getOutletSalesChannelSettings(revision?: number) {
  const db = await createClient();
  const { data, error } = revision === undefined ? await db.rpc("get_outlet_sales_channel_settings") : await db.rpc("get_outlet_sales_channel_settings_revision", { p_revision: revision });
  if (error) throw new Error("Sales channel settings could not be loaded. Try again.");
  if (data && typeof data === "object" && !Array.isArray(data) && data.revision === 0 && data.channels === null) return defaultSalesChannelSettings();
  return salesChannelSettingsSchema.parse(data);
}
