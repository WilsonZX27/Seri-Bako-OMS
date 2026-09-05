import { FileSpreadsheet, Upload } from "lucide-react";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection, RightConsoleMount } from "@/components/layout/right-console";
import { StatusBadge } from "@/components/ui/status-badge";
import { OperationalToolList } from "@/components/operational-tool-list";
import { PageHeader } from "@/components/ui/page-header";
import { importEntities, importTemplates } from "@/lib/imports/config";

export default function ImportsPage() {
  const items = [{
    href: "/imports/autocount",
    title: "AutoCount Direct Import",
    description: "Select Supplier, Item, and Location exports together. OMS identifies and links them in one job.",
    icon: FileSpreadsheet,
  }, ...importEntities.map((entity) => {
    const spec = importTemplates[entity];
    return { href: `/imports/${entity}`, title: spec.label, description: spec.description, icon: Upload };
  })];

  const rightRail = <>
      <ConsoleSection title="Import workspace" kind="reference">
        <p className="text-xs text-muted-foreground">Choose one guided import. Each workspace validates records before anything is written.</p>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">Available workspaces</span><StatusBadge status="ready" /></div>
      </ConsoleSection>
      <ConsoleSection title="File access" kind="status">
        <p className="text-xs text-muted-foreground">Imports keep the source file, validation result, and audit history together.</p>
      </ConsoleSection>
    </>;

  return <>
    <PageHeader title="Import Data" description="Choose a guided import workspace for clean, validated records." />
    <WorkspaceGrid tabletCanvas="contained"><OperationalToolList items={items} /><RightConsoleMount hideMobileBar>{rightRail}</RightConsoleMount></WorkspaceGrid>
  </>;
}
