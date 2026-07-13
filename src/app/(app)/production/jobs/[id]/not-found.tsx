import { NotFoundState } from "@/components/ui/system-states";

export default function ProductionJobNotFound() {
  return <NotFoundState title="Production job not found" description="This job may have been removed or you may not have access to it." action={{ href: "/production/jobs", label: "Back to production jobs" }} />;
}
