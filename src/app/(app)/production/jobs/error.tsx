"use client";

import { EmptyState } from "@/components/ui/empty-state";

export default function ProductionJobsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-5">
      <EmptyState title="Production jobs could not be loaded" description="Try again. If the problem continues, contact an administrator." />
      <div className="flex justify-center"><button type="button" onClick={reset} className="text-sm font-medium text-primary hover:underline">Try again</button></div>
    </div>
  );
}
