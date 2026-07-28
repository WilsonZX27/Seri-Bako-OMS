import { Upload } from "lucide-react";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OperationalToolList } from "@/components/operational-tool-list";
import { PageHeader } from "@/components/ui/page-header";
import { importEntities, importTemplates } from "@/lib/imports/config";

export default function ImportsPage() {
  const items = importEntities.map((entity) => {
    const spec = importTemplates[entity];
    return { href: `/imports/${entity}`, title: spec.label, description: spec.description, icon: Upload };
  });

  return <>
    <PageHeader title="Import Data" description="Choose a guided import workspace for clean, validated records." />
    <WorkspaceGrid tabletCanvas="contained"><OperationalToolList items={items} /></WorkspaceGrid>
  </>;
}
