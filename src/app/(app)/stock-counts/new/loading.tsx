import { PageHeader } from "@/components/ui/page-header";

export default function NewStockCountLoading() {
  return <>
    <PageHeader title="Stock Count" description="Preparing the count workspace..." />
    <div className="grid gap-4 py-4 xl:grid-cols-[minmax(0,1fr)_18rem]" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
      <span className="sr-only">Preparing stock count lines from the latest verified source data.</span>
      <div className="min-w-0 space-y-4">
        <div className="h-16 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
        <div className="h-24 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
        <div className="h-[34rem] animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
      </div>
      <aside className="hidden space-y-4 xl:block">
        <div className="h-24 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
        <div className="h-32 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
      </aside>
    </div>
  </>;
}
