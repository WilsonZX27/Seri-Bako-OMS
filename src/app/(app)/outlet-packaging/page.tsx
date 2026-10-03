import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { SectionLoadingState, Notice } from "@/components/ui/system-states";
import { logServerError } from "@/server/observability/logger";
import { ConsoleSection } from "@/components/layout/right-console";
import { OutletPackagingReport } from "@/components/outlet-packaging-report";
import { getOutletPackagingReport } from "@/server/queries/outlet-packaging";

async function Report({ days }: { days: 7 | 30 }) {
  // Read one bounded month once. Period, outlet and product changes are local.
  try { const report = await getOutletPackagingReport(30); return <OutletPackagingReport key={days} report={report} days={days} />; } catch(error) { logServerError(error,{source:"page.outletPackaging"}); return <WorkspaceGrid><Notice tone="warning" title="Packaging report could not load">Reload to retry. No unverified stock totals are shown.</Notice></WorkspaceGrid>; }
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
