"use client";

import { RecordDetailError } from "@/components/ui/record-detail-error";

export default function InventoryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RecordDetailError error={error} reset={reset} recordLabel="Inventory summary" collectionLabel="Dashboard" collectionHref="/dashboard" />;
}
