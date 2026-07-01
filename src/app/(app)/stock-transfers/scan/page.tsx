import { BarcodeScanWorkflow } from "@/components/barcode-workflows/barcode-scan-workflow";

export default function StockTransferScanPage() {
  return <BarcodeScanWorkflow title="Stock Transfer Scan" description="Scan item barcode, confirm quantity, then transfer between locations." mode="stock_transfer" />;
}
