import { BarcodeScanWorkflow } from "@/components/barcode-workflows/barcode-scan-workflow";

export default function StockCountsScanPage() {
  return (
    <BarcodeScanWorkflow
      title="Stock Count Scan"
      description="Scan item barcode, confirm theoretical stock, enter physical quantity, then continue to the next item."
      mode="stock_count"
    />
  );
}
