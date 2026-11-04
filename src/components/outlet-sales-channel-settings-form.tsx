"use client";
import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormPendingBridge } from "@/components/ui/submit-button";
import { saveOutletSalesChannelSettings } from "@/server/actions/outlet-sales-channel-settings";
import { orderedSalesChannels, salesChannelSection, type SalesChannelSettings } from "@/lib/outlet-sales-channel-settings";

type SettingsResult = ({ revision: number } | { error: string }) & { attempt: number };

export function OutletSalesChannelSettingsForm({ settings, canEdit }: { settings: SalesChannelSettings; canEdit: boolean }) {
  const [channels, setChannels] = useState(() => orderedSalesChannels(settings));
  const [revision, setRevision] = useState(settings.revision);
  const [result, action, pending] = useActionState(async (previous: SettingsResult | null) => {
    const response = await saveOutletSalesChannelSettings({ revision, channels });
    if ("revision" in response) setRevision(response.revision);
    return { ...response, attempt: (previous?.attempt ?? 0) + 1 };
  }, null);
  function move(index: number, offset: number) {
    setChannels(current => { const next = [...current]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; });
  }
  return <form id="outlet-sales-channel-settings" action={action} className="erp-surface overflow-hidden" aria-label="Sales channel settings">
    <FormPendingBridge formId="outlet-sales-channel-settings" />
    <div className="border-b p-4"><h2 className="text-sm font-semibold">Sales reconciliation channels</h2><p className="mt-2 text-xs text-muted-foreground">Change display names and order, or enable and deactivate existing channels. Order applies within the existing sections. Existing amounts and their original channel keys are preserved.</p></div>
    {result ? <p role={"error" in result ? "alert" : "status"} className="border-b p-3 text-sm">{"error" in result ? result.error : "Channel settings saved."}</p> : null}
    <ol className="divide-y">{channels.map((channel, index) => <li key={channel.key} className="grid gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <label className="grid min-w-0 gap-1 text-xs"><span className="sr-only">Channel display name</span><Input aria-label={`${channel.key} display name`} value={channel.label} maxLength={80} required disabled={!canEdit || pending} onChange={event => setChannels(current => current.map(value => value.key === channel.key ? { ...value, label: event.target.value } : value))} /></label>
      <div className="flex items-center gap-2"><label className="inline-flex min-h-11 items-center gap-2 text-xs"><input key={result?.attempt ?? 0} type="checkbox" aria-label={`${channel.key} enabled`} checked={channel.active} disabled={!canEdit || pending} onChange={event => setChannels(current => current.map(value => value.key === channel.key ? { ...value, active: event.target.checked } : value))} />Enabled</label>{canEdit ? <><Button type="button" variant="outline" size="icon" disabled={pending || index === 0 || salesChannelSection(channels[index - 1].key) !== salesChannelSection(channel.key)} aria-label={`Move ${channel.label} up`} onClick={() => move(index, -1)}><ArrowUp className="size-4" aria-hidden="true" /></Button><Button type="button" variant="outline" size="icon" disabled={pending || index === channels.length - 1 || salesChannelSection(channels[index + 1].key) !== salesChannelSection(channel.key)} aria-label={`Move ${channel.label} down`} onClick={() => move(index, 1)}><ArrowDown className="size-4" aria-hidden="true" /></Button></> : null}</div>
    </li>)}</ol>
  </form>;
}
