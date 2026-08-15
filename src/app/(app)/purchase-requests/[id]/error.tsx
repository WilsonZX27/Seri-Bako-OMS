"use client";

import { RecordDetailError } from "@/components/ui/record-detail-error";

export default function PurchaseRequestDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RecordDetailError error={error} reset={reset} recordLabel="Purchase request" collectionLabel="purchase requests" collectionHref="/purchase-requests" />;
}
