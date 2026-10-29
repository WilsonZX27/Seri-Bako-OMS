import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RetryButton } from "@/components/ui/retry-button";
import { getPackagingStoreWorkspace } from "@/server/queries/packaging-stores";
import { getOutletPackagingReport } from "@/server/queries/outlet-packaging";
import { formatNumber } from "@/lib/utils";
type Report = Awaited<ReturnType<typeof getOutletPackagingReport>>;
export async function PackagingStoreSummary({ days, outletReport }: { days: 7 | 30; outletReport?: Report }) {
  try {
    const [stores, outlets] = await Promise.all([getPackagingStoreWorkspace(), outletReport ?? getOutletPackagingReport(days)]);
    if (!stores) return <section className="sb-work-surface space-y-3 p-4"><h2 className="text-sm font-semibold">Independent stores</h2><p className="text-xs text-muted-foreground">Store balances are unavailable. Outlet balances remain above.</p><Button asChild variant="outline"><Link href="/outlet-packaging/stores">Manage stores</Link></Button></section>;
    const codeByProduct = new Map(outlets.products.map(product => [product.id, product.code]));
    const closingByCode = new Map<string, { total: number; count: number }>();
    for (const row of outlets.latest) { if (row.closing === null) continue; const current = closingByCode.get(row.code) ?? { total: 0, count: 0 }; closingByCode.set(row.code, { total: current.total + row.closing, count: current.count + 1 }); }
    const storeByProduct = new Map<string, { total: number; count: number }>();
    for (const row of stores.balances) { const current = storeByProduct.get(row.product_id) ?? { total: 0, count: 0 }; storeByProduct.set(row.product_id, { total: current.total + Number(row.quantity), count: current.count + 1 }); }
    return <section className="sb-work-surface overflow-hidden" aria-label="Packaging balances">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-3"><div><h2 className="text-sm font-semibold">Packaging balances</h2><p className="mt-1 text-xs text-muted-foreground">Latest counts; uncounted locations are excluded.</p></div><Button asChild variant="outline"><Link href="/outlet-packaging/stores">Manage stores</Link></Button></header>
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-[var(--sb-surface-muted)] text-left text-muted-foreground"><tr><th className="p-3 font-medium">Packaging</th><th className="p-3 text-right font-medium">Outlets counted</th><th className="p-3 text-right font-medium">Stores counted</th><th className="p-3 text-right font-medium">Known balance</th></tr></thead><tbody>{stores.products.map(product => {
        const outlet = closingByCode.get(codeByProduct.get(product.id) ?? ""), store = storeByProduct.get(product.id);
        const known = (outlet?.count ?? 0) + (store?.count ?? 0);
        return <tr key={product.id} className="border-t border-[var(--sb-border-soft)]"><th scope="row" className="p-3 text-left font-medium">{product.product_name}</th><td className="p-3 text-right tabular-nums">{outlet?.count ?? 0} / {outlets.outlets.length}</td><td className="p-3 text-right tabular-nums">{store?.count ?? 0} / {stores.stores.length}</td><td className="whitespace-nowrap p-3 text-right font-semibold tabular-nums">{known ? `${formatNumber((outlet?.total ?? 0) + (store?.total ?? 0))} ${product.selling_unit}` : "Not counted"}</td></tr>;
      })}</tbody></table></div>
    </section>;
  } catch { return <section className="sb-work-surface space-y-2 p-4"><h2 className="text-sm font-semibold">Store balances unavailable</h2><p className="text-xs text-muted-foreground">Retry to include store balances.</p><RetryButton/></section>; }
}
