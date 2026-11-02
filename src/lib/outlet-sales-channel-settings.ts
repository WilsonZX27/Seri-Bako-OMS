import { z } from "zod";
import { salesChannels, salesChannelLabels, cardChannels, type SalesChannel } from "@/lib/outlet-sales-channels";

const channelSchema = z.object({ key: z.enum(salesChannels), label: z.string().trim().min(1).max(80), active: z.boolean() }).strict();
export const salesChannelSettingsSchema = z.object({
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  channels: z.array(channelSchema).length(salesChannels.length).superRefine((channels, context) => {
    if (new Set(channels.map(channel => channel.key)).size !== salesChannels.length) context.addIssue({ code: "custom", message: "Every existing channel must appear exactly once." });
    const labels = channels.filter(channel => channel.active).map(channel => channel.label.toLocaleLowerCase("en"));
    if (new Set(labels).size !== labels.length) context.addIssue({ code: "custom", message: "Active channel names must be distinct." });
  }),
});
export type SalesChannelSettings = z.infer<typeof salesChannelSettingsSchema>;
export function defaultSalesChannelSettings(): SalesChannelSettings {
  return { revision: 0, channels: salesChannels.map(key => ({ key, label: salesChannelLabels[key], active: key !== "credit_card" })) };
}
export function salesChannelSection(key: SalesChannel) {
  return key === "voucher" ? 0 : cardChannels.includes(key) ? 1 : key === "credit_card" ? 3 : 2;
}
/** Existing Voucher / Cards / Other / legacy sections keep their established positions. */
export function orderedSalesChannels(settings: SalesChannelSettings) {
  return [...settings.channels].sort((left, right) => salesChannelSection(left.key) - salesChannelSection(right.key));
}
/** Presentation only: inactive historical amounts remain visible; money keys and totals are unchanged. */
export function visibleSalesChannels(settings: SalesChannelSettings, amounts: Partial<Record<SalesChannel, string | number | null>>) {
  return orderedSalesChannels(settings).filter(channel => channel.active || Number(amounts[channel.key] ?? 0) !== 0);
}
