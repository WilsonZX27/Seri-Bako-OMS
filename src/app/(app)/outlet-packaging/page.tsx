import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SectionLoadingState, ErrorState } from "@/components/ui/system-states";
import { logServerError } from "@/server/observability/logger";
import { ConsoleSection } from "@/components/layout/right-console";
import { OutletPackagingReport } from "@/components/outlet-packaging-report";
import { RetryButton } from "@/components/ui/retry-button";
import { getOutletPackagingReport } from "@/server/queries/outlet-packaging";

async function Report({ days }: { days: 7 | 30 }) {
  // Read only the selected period. Product and outlet filters stay local.
  try { const report = await getOutletPackagingReport(days); return <OutletPackagingReport report={report} days={days} />; } catch(error) { logServerError(error,{source:"page.outletPackaging"}); return <WorkspaceGrid><ErrorState title="Packaging report could not load" description="Try again to load stock and usage for this period." action={<RetryButton />} /></WorkspaceGrid>; }
}

export default async function OutletPackagingPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: rawDays } = await searchParams;
  const days = rawDays === "30" ? 30 : 7;
  return <>
    <PageHeader title="Packaging Usage" />
    <Suspense fallback={<WorkspaceGrid rightRail={<ConsoleSection title="Packaging actions"><SectionLoadingState label="Loading report coverage"/></ConsoleSection>}><div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"><section className="sb-work-surface"><SectionLoadingState label="Loading latest packaging stock"/></section><section className="sb-work-surface"><SectionLoadingState label="Loading packaging usage trend"/></section></div></WorkspaceGrid>}>
      <Report days={days} />
    </Suspense>
  </>;
}
