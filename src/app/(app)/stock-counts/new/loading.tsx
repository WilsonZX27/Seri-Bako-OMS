import { LoaderCircle } from "lucide-react";

export default function NewStockCountLoading() {
  return <div className="flex min-h-[18rem] items-center justify-center p-6" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
    <span className="flex items-center gap-2 text-sm text-[var(--sb-text-muted)]"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />Preparing the count workspace…</span>
    <span className="sr-only">Preparing stock count lines from the latest verified source data.</span>
  </div>;
}
