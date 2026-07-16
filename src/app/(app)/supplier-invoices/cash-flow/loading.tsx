import { PageHeader } from "@/components/ui/page-header";

export default function Loading() {
  return <>
    <PageHeader title="Cash Flow Forecast" description="Loading upcoming supplier payables…" />
    <div className="space-y-4 py-4" aria-busy="true">
      <div className="h-12 animate-pulse border bg-muted/40" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-14 animate-pulse border bg-muted/40" />)}</div>
      <div className="h-48 animate-pulse border bg-muted/40" />
      <div className="h-72 animate-pulse border bg-muted/40" />
    </div>
  </>;
}
