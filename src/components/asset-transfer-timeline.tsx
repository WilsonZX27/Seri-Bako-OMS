import { Clock3 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type Update = { id: string; created_at: string; author_name?: string | null; source_data: Record<string, unknown> };
export function AssetTransferTimeline({ history, groupBatchEvents = false }: { history: Update[]; groupBatchEvents?: boolean }) {
  if (!history.length) return <p className="pb-3 text-sm text-muted-foreground">No status updates recorded.</p>;
  const seen = new Set<string>();
  const events = history.filter(update => {
    if (!groupBatchEvents) return true;
    const key = JSON.stringify([update.created_at, update.author_name, update.source_data["Actor ID"], update.source_data["Status Before"], update.source_data["Status After"], update.source_data.Comment]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  return <ol className="ml-2 border-l border-[var(--sb-border-soft)]">{events.map(update => {
    const status = String(update.source_data["Status After"] ?? "updated");
    return <li key={update.id} className="relative pb-5 pl-5 text-sm last:pb-0"><Clock3 aria-hidden="true" className="absolute -left-2.5 top-0.5 size-5 bg-[var(--sb-surface)] text-muted-foreground"/><p className="break-words font-medium">Transfer {status}</p><p className="mt-0.5 break-words text-muted-foreground">{update.author_name || "Unrecorded author"} · {formatDateTime(update.created_at)}</p>{update.source_data.Comment ? <p className="mt-1 whitespace-pre-wrap break-words text-xs">{String(update.source_data.Comment)}</p> : null}</li>;
  })}</ol>;
}
