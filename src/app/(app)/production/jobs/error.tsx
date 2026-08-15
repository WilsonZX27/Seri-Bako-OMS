"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/system-states";

export default function ProductionJobsError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Production jobs could not be loaded" description="The queue could not be verified. Do not assume there are no production jobs." action={<div className="flex flex-wrap gap-2"><Button type="button" className="min-h-11 xl:min-h-9" onClick={reset}>Try again</Button><Button asChild variant="outline" className="min-h-11 xl:min-h-9"><Link href="/production">Back to production</Link></Button></div>} />;
}
