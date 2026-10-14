"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/system-states";

export function RecordDetailError({
  error,
  recordLabel,
  collectionLabel,
  collectionHref,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  recordLabel: string;
  collectionLabel: string;
  collectionHref: string;
}) {
  const missingRecord = /Cannot coerce the result to a single JSON object/i.test(error.message);
  const reference = error.digest ? ` Reference: ${error.digest}.` : "";

  return <ErrorState
    title={missingRecord ? `${recordLabel} unavailable` : `${recordLabel} could not be loaded`}
    description={missingRecord
      ? `This ${recordLabel.toLowerCase()} does not exist in the current workspace, has been removed, or is outside your access.`
      : `The request failed before this ${recordLabel.toLowerCase()} could be verified. Do not assume it was removed or changed.${reference}`}
    action={<div className="flex flex-wrap gap-2">
      {!missingRecord ? <Button type="button" className="min-h-11 xl:min-h-9" onClick={() => window.location.reload()}>Retry</Button> : null}
      <Button asChild variant="outline" className="min-h-11 xl:min-h-9"><Link href={collectionHref}>Back to {collectionLabel}</Link></Button>
    </div>}
  />;
}
