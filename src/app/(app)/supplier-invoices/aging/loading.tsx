import { PageHeader } from "@/components/ui/page-header";

export default function Loading() {
  return <>
    <PageHeader title="AP Aging" description="Loading current payables…" />
    <div className="space-y-4 py-4" aria-busy="true">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-14 animate-pulse border bg-muted/40" />)}
      </div>
      <div className="h-24 animate-pulse border bg-muted/40" />
      <div className="h-72 animate-pulse border bg-muted/40" />
    </div>
  </>;
}
