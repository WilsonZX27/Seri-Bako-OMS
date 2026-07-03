import { NextResponse } from "next/server";
import { isMockMode, mockDocuments, mockGoodsReceivings, mockItems, mockLocations, mockProducts, mockPurchaseOrders, mockPurchaseRequests, mockRecipes, mockStaffs, mockStockCounts, mockSuppliers } from "@/lib/mock-mode";
import { getCanonicalDocumentHref } from "@/lib/document-routing";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";

type SearchResult = {
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

function matches(values: Array<string | null | undefined>, query: string) {
  return values.some((value) => String(value ?? "").toLowerCase().includes(query));
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (!query) return NextResponse.json({ results: [] });

  if (isMockMode()) {
    const results: SearchResult[] = [
      ...mockItems
        .filter((item) => matches([item.item_code, item.autocount_code, item.item_name, item.barcode, item.internal_barcode, item.supplier_barcode], query))
        .slice(0, 8)
        .map((item) => ({ type: "Item", title: item.item_name, subtitle: item.item_code, href: `/items/${item.id}` })),
      ...mockProducts
        .filter((product) => matches([product.product_code, product.product_name, product.barcode, product.internal_barcode], query))
        .slice(0, 5)
        .map((product) => ({ type: "Product", title: product.product_name, subtitle: product.product_code, href: `/products/${product.id}` })),
      ...mockSuppliers
        .filter((supplier) => matches([supplier.supplier_code, supplier.name, supplier.phone, supplier.email], query))
        .slice(0, 5)
        .map((supplier) => ({ type: "Supplier", title: supplier.name, subtitle: supplier.supplier_code ?? "-", href: `/suppliers/${supplier.id}` })),
      ...mockPurchaseRequests
        .filter((row) => matches([row.request_no, row.status, row.remarks], query))
        .slice(0, 5)
        .map((row) => ({ type: "Purchase Request", title: row.request_no, subtitle: row.status, href: `/purchase-requests/${row.id}` })),
      ...mockPurchaseOrders
        .filter((row) => matches([row.po_no, row.status, row.remarks], query))
        .slice(0, 5)
        .map((row) => ({ type: "Purchase Order", title: row.po_no, subtitle: row.status, href: `/purchase-orders/${row.id}` })),
      ...mockGoodsReceivings
        .filter((row) => matches([row.grn_no, row.status, row.remarks], query))
        .slice(0, 5)
        .map((row) => ({ type: "Goods Receiving", title: row.grn_no, subtitle: row.status, href: `/goods-receivings/${row.id}` })),
      ...mockStockCounts
        .filter((row) => matches([row.count_no, row.status, row.remarks], query))
        .slice(0, 5)
        .map((row) => ({ type: "Stock Count", title: row.count_no, subtitle: row.status, href: `/stock-counts/${row.id}` })),
      ...mockDocuments
        .filter((document) => matches([document.document_no, document.document_type, document.title], query))
        .slice(0, 8)
        .map((document) => ({ type: "Document", title: document.document_no, subtitle: document.title, href: getCanonicalDocumentHref(document) })),
      ...mockLocations
        .filter((location) => matches([location.location_code, location.location_name, location.location_type], query))
        .slice(0, 5)
        .map((location) => ({ type: "Location", title: location.location_name, subtitle: location.location_code, href: `/locations/${location.id}` })),
      ...mockRecipes
        .filter((recipe) => matches([recipe.id, String(recipe.version), recipe.remark], query))
        .slice(0, 5)
        .map((recipe) => ({ type: "Recipe", title: `Recipe v${recipe.version}`, subtitle: recipe.remark ?? "-", href: `/recipes/${recipe.id}` })),
      ...mockStaffs
        .filter((staff) => matches([staff.staff_code, staff.full_name, staff.email], query))
        .slice(0, 5)
        .map((staff) => ({ type: "User", title: staff.full_name, subtitle: staff.staff_code ?? "-", href: `/staffs/${staff.id}` })),
    ];
    return NextResponse.json({ results: results.slice(0, 20) });
  }

  const supabase = await createClient();
  const db = looseSupabase(supabase);
  const [items, products, suppliers, documents, receivings, counts, productionJobs] = await Promise.all([
    supabase.from("items").select("id,item_code,item_name,barcode,internal_barcode").or(`item_code.ilike.%${query}%,item_name.ilike.%${query}%,barcode.ilike.%${query}%,internal_barcode.ilike.%${query}%`).limit(8),
    supabase.from("products").select("id,product_code,product_name,barcode,internal_barcode").or(`product_code.ilike.%${query}%,product_name.ilike.%${query}%,barcode.ilike.%${query}%,internal_barcode.ilike.%${query}%`).limit(5),
    supabase.from("suppliers").select("id,supplier_code,name").or(`supplier_code.ilike.%${query}%,name.ilike.%${query}%`).limit(5),
    supabase.from("documents").select("id,document_no,title,document_type,related_entity_type,related_entity_id").or(`document_no.ilike.%${query}%,title.ilike.%${query}%,document_type.ilike.%${query}%`).limit(8),
    supabase.from("goods_receivings").select("id,grn_no,status,remarks").or(`grn_no.ilike.%${query}%,status.ilike.%${query}%,remarks.ilike.%${query}%`).limit(5),
    supabase.from("stock_counts").select("id,count_no,status,remarks").or(`count_no.ilike.%${query}%,status.ilike.%${query}%,remarks.ilike.%${query}%`).limit(5),
    db.from("production_jobs").select("id,production_job_no,status,remarks").or(`production_job_no.ilike.%${query}%,status.ilike.%${query}%,remarks.ilike.%${query}%`).limit(5),
  ]);

  for (const result of [items, products, suppliers, documents, receivings, counts, productionJobs]) {
    if (result.error) throw new Error(result.error.message);
  }

  const results: SearchResult[] = [
    ...(items.data ?? []).map((item) => ({ type: "Item", title: item.item_name, subtitle: item.item_code, href: `/items/${item.id}` })),
    ...(products.data ?? []).map((product) => ({ type: "Product", title: product.product_name, subtitle: product.product_code, href: `/products/${product.id}` })),
    ...(suppliers.data ?? []).map((supplier) => ({ type: "Supplier", title: supplier.name, subtitle: supplier.supplier_code ?? "-", href: `/suppliers/${supplier.id}` })),
    ...(documents.data ?? []).map((document) => ({ type: "Document", title: document.document_no, subtitle: document.title, href: getCanonicalDocumentHref(document) })),
    ...(receivings.data ?? []).map((receiving) => ({ type: "Goods Receiving", title: receiving.grn_no, subtitle: receiving.status, href: `/goods-receivings/${receiving.id}` })),
    ...(counts.data ?? []).map((count) => ({ type: "Stock Count", title: count.count_no, subtitle: count.status, href: `/stock-counts/${count.id}` })),
    ...((productionJobs.data ?? []) as Array<{ id: string; production_job_no: string; status: string }>).map((job) => ({ type: "Production Job", title: job.production_job_no, subtitle: job.status, href: `/production/jobs/${job.id}` })),
  ];
  return NextResponse.json({ results });
}
