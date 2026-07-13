"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/system-states";

export default function ProductionJobsError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Production jobs could not be loaded" description="Try again. If the problem continues, contact an administrator." action={<Button type="button" onClick={reset}>Try again</Button>} />;
}
