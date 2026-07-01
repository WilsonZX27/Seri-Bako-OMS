import { ClipboardList, Factory } from "lucide-react";
import { CategoryCardGrid } from "@/components/category-card-grid";
import { PageHeader } from "@/components/ui/page-header";

const productionTools = [
  { href: "/recipes", title: "Recipes", description: "Manage recipe versions, ingredient lines, costing snapshots, and approvals.", icon: ClipboardList, recommendedFor: "kitchen and admin" },
  { href: "/documents?document_type=production_job", title: "Production Jobs", description: "Production job workflow is coming in Sprint 7.", icon: Factory, badge: "Coming soon", disabled: true },
];

export default function ProductionPage() {
  return (
    <>
      <PageHeader title="Production" description="Recipe and future production job tools for Seri Bako kitchen operations." />
      <div className="space-y-5 p-5">
        <p className="sb-section-label">Production tools</p>
        <CategoryCardGrid items={productionTools} />
      </div>
    </>
  );
}
