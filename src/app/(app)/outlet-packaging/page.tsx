import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OutletPackagingReport } from "@/components/outlet-packaging-report";
import { getOutletPackagingReport } from "@/server/queries/outlet-packaging";

export default async function OutletPackagingPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: rawDays } = await searchParams;
  const days = rawDays === "30" ? 30 : 7;
  const report = await getOutletPackagingReport(days);
  return <>
    <PageHeader title="Packaging Usage" contentWidth="wide" />
    <WorkspaceGrid tabletCanvas="wide" hideMobileConsole hideDesktopConsole>
      <OutletPackagingReport report={report} days={days} />
    </WorkspaceGrid>
  </>;
}
