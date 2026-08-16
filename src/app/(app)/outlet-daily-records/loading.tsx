import { LoaderCircle } from "lucide-react";

export default function OutletDailyRecordsLoading() {
  return <div className="flex min-h-[18rem] items-center justify-center p-6" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
    <span className="flex items-center gap-2 text-sm text-[var(--sb-text-muted)]"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />Preparing outlet records…</span>
    <span className="sr-only">Loading outlet daily records. Verified quantities will appear when the source data is ready.</span>
  </div>;
}
