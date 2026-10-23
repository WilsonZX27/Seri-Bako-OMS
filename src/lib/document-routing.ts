type RoutableDocument = {
  id: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  document_type?: string | null;
};

const entityRoutes: Record<string, string> = {
  asset_maintenance: "/asset-management/maintenance",
  purchase_request: "/purchase-requests",
  purchase_order: "/purchase-orders",
  goods_receiving: "/goods-receivings",
  stock_count: "/stock-counts",
  stock_transfer: "/stock-transfers",
  stock_wastage: "/stock-wastage",
  recipe: "/recipes",
  production_job: "/production/jobs",
  outlet_daily_record: "/outlet-daily-records",
  purchase_return: "/purchase-returns",
  supplier_invoice: "/supplier-invoices",
  supplier: "/suppliers",
  item: "/items",
  staff: "/staffs",
  branch: "/branches",
};

export function getCanonicalDocumentHref(document: RoutableDocument) {
  const entityType = document.related_entity_type ?? document.document_type ?? null;
  const baseRoute = entityType ? entityRoutes[entityType] : null;
  if (baseRoute && document.related_entity_id) return `${baseRoute}/${document.related_entity_id}`;
  return `/documents/${document.id}`;
}

export function getCanonicalEntityHref(entityType?: string | null, entityId?: string | null, fallback = "#") {
  if (!entityType || !entityId) return fallback;
  const baseRoute = entityRoutes[entityType];
  return baseRoute ? `${baseRoute}/${entityId}` : fallback;
}
