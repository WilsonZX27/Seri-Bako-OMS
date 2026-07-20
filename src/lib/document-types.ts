const businessLabels: Record<string, string> = {
  purchase_request: "Purchase Request",
  purchase_order: "Purchase Order",
  goods_receiving: "Goods Receiving Note",
  purchase_return: "Purchase Return",
  supplier_invoice: "Supplier Invoice",
  payment: "Payment",
  stock_count: "Stock Count",
  stock_transfer: "Stock Transfer",
  stock_wastage: "Stock Wastage",
  stock_transaction: "Stock Adjustment",
  opening_balance: "Opening Balance",
  production_job: "Production Job",
  outlet_daily_record: "Outlet Daily Record",
};

export function documentTypeLabel(documentType: string) {
  return businessLabels[documentType] ?? documentType.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
