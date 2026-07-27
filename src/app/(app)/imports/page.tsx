import { Upload } from "lucide-react";
import { CategoryCardGrid } from "@/components/category-card-grid";
import { PageHeader } from "@/components/ui/page-header";
import { importEntities, importTemplates } from "@/lib/imports/config";

export default function ImportsPage() {
  const items = importEntities.map((entity) => {
    const spec = importTemplates[entity];
    return { href: `/imports/${entity}`, title: spec.label, description: spec.description, icon: Upload };
  });

  return <>
    <PageHeader title="Import Data" description="Choose a guided import workspace for clean, validated records." />
    <div className="p-3 sm:p-5"><CategoryCardGrid items={items} className="md:grid-cols-2 xl:grid-cols-3" /></div>
  </>;
}
