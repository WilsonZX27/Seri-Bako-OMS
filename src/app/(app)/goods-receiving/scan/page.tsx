import { BarcodeScanWorkflow } from "@/components/barcode-workflows/barcode-scan-workflow";

export default function GoodsReceivingScanPage() {
  return (
    <BarcodeScanWorkflow
      title="Goods Receiving Scan Mode"
      description="Scan delivered item barcode, match it to the PO line, and enter received quantity."
      mode="goods_receiving"
    />
  );
}
