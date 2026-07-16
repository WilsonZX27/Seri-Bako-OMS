"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default function ErrorState({ reset }: { reset: () => void }) {
  return <>
    <PageHeader title="AP Aging" description="Current payables could not be loaded." />
    <div className="border bg-card p-4 text-center">
      <EmptyState title="AP Aging is unavailable" description="Retry the report. If the problem continues, confirm that the latest AP Aging report migration is applied." />
      <Button onClick={reset} size="sm">Retry</Button>
    </div>
  </>;
}
