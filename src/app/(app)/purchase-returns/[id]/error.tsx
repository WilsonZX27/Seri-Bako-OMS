"use client";

import { RecordDetailError } from "@/components/ui/record-detail-error";

export default function PurchaseReturnError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RecordDetailError error={error} reset={reset} recordLabel="Purchase return" collectionLabel="returns" collectionHref="/purchase-returns" />;
}
