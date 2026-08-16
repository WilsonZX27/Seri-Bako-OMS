import { PageHeader } from "@/components/ui/page-header";

export default function OutletDailyRecordsLoading() {
  return <>
    <PageHeader title="Outlet Daily Records" description="Loading receiving and wastage records..." />
    <div className="grid gap-4 py-4 xl:grid-cols-[minmax(0,1fr)_18rem]" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
      <span className="sr-only">Loading outlet daily records. Verified quantities will appear when the source data is ready.</span>
      <div className="min-w-0 space-y-4">
        <div className="h-48 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
        <div className="h-44 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
        <div className="h-16 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
        <div className="h-[28rem] animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
      </div>
      <aside className="hidden space-y-4 xl:block">
        <div className="h-32 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
        <div className="h-28 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
        <div className="h-28 animate-pulse rounded-[var(--sb-panel-radius)] border bg-muted/40" />
      </aside>
    </div>
  </>;
}
