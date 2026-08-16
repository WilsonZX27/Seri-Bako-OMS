import { LoaderCircle } from "lucide-react";

export default function StockCountsLoading() {
  return <div className="flex min-h-[18rem] items-center justify-center p-6" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
    <span className="flex items-center gap-2 text-sm text-[var(--sb-text-muted)]"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />Preparing stock counts…</span>
    <span className="sr-only">Loading stock count records. Empty values will remain blank until verified source data is available.</span>
  </div>;
}
