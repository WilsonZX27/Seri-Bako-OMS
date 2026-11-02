import {PackagingWorkspaceTabs} from "@/components/outlet-packaging-workspace-nav";
import {PaginationControls} from "@/components/sortable-table";
import Link from "next/link";
import {History,Warehouse} from "lucide-react";
import {WorkspaceTabs} from "@/components/ui/workspace-tabs";
import {ConsoleSection} from "@/components/layout/right-console";
import {PageHeader} from "@/components/ui/page-header";
import {WorkspaceGrid} from "@/components/layout/workspace-layout";
import {PackagingStoreForms} from "@/components/packaging-store-forms";
import {getPackagingStoreWorkspace} from "@/server/queries/packaging-stores";
import {formatDateTime,formatNumber} from "@/lib/utils";
export default async function PackagingStores({searchParams}:{searchParams:Promise<{page?:string;view?:string}>}){
 const params=await searchParams;
 const data=await getPackagingStoreWorkspace();
 if(!data)return <><PageHeader title="Packaging settings"/><PackagingWorkspaceTabs canManage/><section className="sb-work-surface p-4"><h2 className="text-sm font-semibold">Store ledger is not enabled</h2><p className="mt-2 text-sm text-muted-foreground">The reviewed database migration must be activated before stores can be added or balances recorded. No stock has been changed.</p><Link href="/outlet-packaging" className="mt-3 inline-block underline">Back to Packaging Stock</Link></section></>;
 const history=params.view==="movements";
 const records=history?data.movements:data.stores;
 const totalPages=Math.max(1,Math.ceil(records.length/10));
 const page=Math.min(totalPages,Math.max(1,Math.floor(Number(params.page)||1)));
 const visibleStores=history?[]:data.stores.slice((page-1)*10,page*10);
 const visibleMovements=history?data.movements.slice((page-1)*10,page*10):[];
 const product=(id:string)=>data.products.find(p=>p.id===id),store=(id:string)=>data.stores.find(s=>s.id===id)?.name??"Unavailable store";
 return <><PageHeader title="Packaging settings" description="Manage independent locations such as warehouses and their packaging stock. These locations are separate from branches and outlets."/><WorkspaceGrid hideMobileConsole rightRail={<ConsoleSection title="Stock guidance"><p className="text-sm text-muted-foreground">Count an opening balance before recording receipts or issues. Locations here are separate from branches and outlets.</p></ConsoleSection>}><div className="space-y-3"><PackagingWorkspaceTabs canManage/><WorkspaceTabs label="Location records" current={history?"movements":"locations"} items={[{id:"locations",href:"/outlet-packaging/stores",label:"Locations and contents",icon:Warehouse},{id:"movements",href:"/outlet-packaging/stores?view=movements",label:"Movement history",icon:History}]}/><PackagingStoreForms data={data}/>{!history?<section className="sb-work-surface divide-y"><h2 className="p-4 text-sm font-semibold">Current store balances</h2>{data.stores.length?visibleStores.map(s=><div className="p-4" key={s.id}><h3 className="text-sm font-semibold">{s.name}</h3>{data.products.map(p=>{const b=data.balances.find(b=>b.store_id===s.id&&b.product_id===p.id);return <div key={p.id} className="flex justify-between gap-3 py-2 text-sm"><span>{p.product_name}</span><span className="tabular-nums">{b?`${formatNumber(b.quantity)} ${p.selling_unit}`:"Not counted"}</span></div>})}</div>):<p className="p-4 text-sm text-muted-foreground">No stores yet. Add a store, then record its opening physical count.</p>}</section>:<section className="sb-work-surface divide-y"><h2 className="p-4 text-sm font-semibold">Recent movements · latest 50</h2>{visibleMovements.map(m=><div key={m.id} className="grid gap-1 p-4 text-sm"><span>{store(m.store_id)} · {product(m.product_id)?.product_name??"Unavailable packaging"}</span><span>{m.kind} · {formatNumber(m.quantity)} → {formatNumber(m.balance_after)} {product(m.product_id)?.selling_unit}</span><span className="text-muted-foreground">{m.reason} · {formatDateTime(m.created_at)}</span></div>)}{!data.movements.length?<p className="p-4 text-sm text-muted-foreground">No movements recorded.</p>:null}</section>}{totalPages>1?<PaginationControls page={page} totalPages={totalPages} totalRows={records.length} searchParams={{view:history?"movements":undefined}}/>:null}</div></WorkspaceGrid></>;
}
