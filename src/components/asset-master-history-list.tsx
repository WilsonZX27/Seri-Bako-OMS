import { assetMasterHistoryChanges } from "@/lib/asset-master";
import { formatDateTime } from "@/lib/utils";

export function AssetMasterHistoryList({ history, source }: { history: { id: string; created_at: string; author_name: string; source_data: Record<string, unknown> }[]; source: Record<string, unknown> }) {
  if (!history.length) return <p className="sb-work-surface p-4 text-sm text-muted-foreground">No master changes recorded.</p>;
  return <ol className="sb-work-surface divide-y">{history.map(update=>{
    const changes = assetMasterHistoryChanges(source, update.source_data);
    const creating = update.source_data.Operation === "create";
    return <li className="min-w-0 p-4" key={update.id}>
      <p className="text-sm font-medium">{creating ? "Asset registered" : "Master updated"}</p>
      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(update.created_at)} · {update.author_name}</p>
      <p className="mt-2 break-words text-sm">{String(update.source_data.Reason ?? "")}</p>
      {changes.length ? <>
        {!creating ? <div aria-hidden="true" className="mt-3 grid grid-cols-2 gap-x-3 text-xs text-muted-foreground sm:grid-cols-3"><span className="hidden sm:block">Field</span><span>Before</span><span>After</span></div> : null}
        <dl className="mt-2 divide-y text-xs">{changes.map(change=><div className={`grid min-w-0 grid-cols-2 gap-x-3 gap-y-1 py-2 ${creating ? "" : "sm:grid-cols-3"}`} key={change.label}><dt className={`font-medium ${creating ? "" : "col-span-2 sm:col-span-1"}`}>{change.label}</dt>{!creating ? <dd className="min-w-0 break-words"><span className="sr-only">Before: </span>{change.before === null ? "Not registered" : change.before || "Not recorded"}</dd> : null}<dd className="min-w-0 break-words"><span className="sr-only">{creating ? "Value: " : "After: "}</span>{change.after || "Not recorded"}</dd></div>)}</dl>
      </> : <p className="mt-3 text-xs text-muted-foreground">No field value changed.</p>}
      <details><summary className="min-h-11 cursor-pointer py-3 text-xs">Original change record</summary><dl className="grid gap-3 text-xs sm:grid-cols-2">{Object.entries(update.source_data).map(([key,value])=><div className="min-w-0" key={key}><dt className="text-muted-foreground">{key}</dt><dd className="whitespace-pre-wrap break-words">{value == null ? "Unknown" : typeof value === "object" ? JSON.stringify(value,null,2) : String(value)}</dd></div>)}</dl></details>
    </li>;
  })}</ol>;
}
