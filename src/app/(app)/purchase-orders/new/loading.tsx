import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";

function Skeleton({ className }: { className: string }) {
  return <div className={`sb-skeleton ${className}`} />;
}

export default function NewPurchaseOrderLoading() {
  const sidePanel = (
    <div className="space-y-3" aria-hidden="true">
      <ConsoleSection title="PO Actions">
        <Skeleton className="h-10 w-full" />
      </ConsoleSection>
      <ConsoleSection title="PO Summary">
        <div className="space-y-3">
          {[0, 1, 2].map((row) => <div key={row} className="flex justify-between gap-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-12" /></div>)}
        </div>
      </ConsoleSection>
    </div>
  );

  return (
    <div aria-busy="true" aria-live="polite" data-purchase-order-loading>
      <span className="sr-only" role="status">Preparing a new purchase order…</span>
      <header className="sticky top-0 z-20 border-b border-[var(--border-muted)] bg-[var(--workspace-bg)] px-4 py-2" aria-hidden="true">
        <Skeleton className="h-5 w-40" />
        <div className="mt-3 grid grid-cols-6 gap-3 rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-white px-4 py-3">
          {[0, 1, 2, 3, 4, 5].map((step) => <Skeleton key={step} className="h-3 w-full" />)}
        </div>
      </header>
      <WorkspaceGrid documentMode tabletRailMode="split" className="min-w-0 p-3" rightRail={sidePanel} hideMobileConsole>
        <div className="min-w-0 space-y-3" aria-hidden="true">
          <section className="sb-work-surface overflow-hidden">
            <div className="border-b border-[var(--sb-border-soft)] bg-white px-3 py-3"><Skeleton className="h-4 w-28" /></div>
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3">
              <Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full md:col-span-2" />
              <Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full md:col-span-3" />
            </div>
          </section>
          <section className="sb-work-surface overflow-hidden">
            <div className="border-b border-[var(--sb-border-soft)] bg-white px-3 py-3"><Skeleton className="h-4 w-24" /></div>
            <div className="hidden grid-cols-[minmax(12rem,1.65fr)_112px_100px_112px_40px] gap-2 border-b bg-[var(--sb-surface-muted)] px-3 py-2 md:grid">
              {["w-full", "w-20", "w-12", "w-20", "w-8"].map((width, index) => <Skeleton key={index} className={`h-3 ${width}`} />)}
            </div>
            <div className="hidden grid-cols-[minmax(12rem,1.65fr)_112px_100px_112px_40px] gap-2 p-3 md:grid">
              {["w-full", "w-full", "w-full", "w-full", "w-9"].map((width, index) => <Skeleton key={index} className={`h-10 ${width}`} />)}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2 p-3 md:hidden">
              <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-9" />
              <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_minmax(5rem,0.8fr)_minmax(0,1fr)] gap-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
            </div>
            <div className="flex justify-end border-t px-3 py-2"><Skeleton className="h-9 w-24" /></div>
          </section>
        </div>
      </WorkspaceGrid>
    </div>
  );
}
