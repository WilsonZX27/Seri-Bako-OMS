"use client";

import { RecordDetailError } from "@/components/ui/record-detail-error";

export default function DocumentDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RecordDetailError error={error} reset={reset} recordLabel="Document" collectionLabel="documents" collectionHref="/documents" />;
}
