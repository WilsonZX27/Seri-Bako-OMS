"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default function ErrorState({ reset }: { reset: () => void }) {
  return <>
    <PageHeader title="Cash Flow Forecast" description="Upcoming supplier payables could not be loaded." />
    <div className="border bg-card p-4 text-center"><EmptyState title="Cash Flow Forecast is unavailable" description="This report is temporarily unavailable. Please retry or contact an administrator." /><Button onClick={reset} size="sm">Retry</Button></div>
  </>;
}
