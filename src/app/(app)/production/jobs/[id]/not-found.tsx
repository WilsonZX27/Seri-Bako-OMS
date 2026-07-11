import { EmptyState } from "@/components/ui/empty-state";

export default function ProductionJobNotFound() {
  return <EmptyState title="Production job not found" description="This job may have been removed or you may not have access to it." action={{ href: "/production/jobs", label: "Back to production jobs" }} />;
}
