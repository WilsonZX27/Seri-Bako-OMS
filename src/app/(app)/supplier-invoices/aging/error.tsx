"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";

export default function ErrorState({ reset }: { reset: () => void }) {
  return <>
    <PageHeader title="AP Aging" description="Current payables could not be loaded." />
    <div className="border bg-card p-4 text-center">
      <EmptyState title="AP Aging is unavailable" description="This report is temporarily unavailable. Please retry or contact the Super Admin / Owner." />
      <div className="flex flex-wrap justify-center gap-2"><Button type="button" onClick={reset} size="sm" className="min-h-11 xl:min-h-9">Retry</Button><Button asChild variant="outline" size="sm" className="min-h-11 xl:min-h-9"><Link href="/reports">Back to reports</Link></Button></div>
    </div>
  </>;
}
