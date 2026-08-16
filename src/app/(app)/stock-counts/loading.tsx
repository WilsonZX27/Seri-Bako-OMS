import { PageHeader } from "@/components/ui/page-header";

export default function StockCountsLoading() {
  return <>
    <PageHeader title="Stock Counts" description="Loading physical count records..." />
    <div className="grid gap-4 py-4 xl:grid-cols-[minmax(0,1fr)_18rem]" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
      <span className="sr-only">Loading stock count records. Empty values will remain blank until verified source data is available.</span>
      <div className="min-w-0 space-y-4">
        <div className="h-36 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
        <div className="h-16 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
        <div className="h-[30rem] animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
      </div>
      <aside className="hidden space-y-4 xl:block">
        <div className="h-32 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
        <div className="h-28 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
      </aside>
    </div>
  </>;
}
