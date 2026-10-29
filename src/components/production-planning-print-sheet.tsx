import type { Allocation, Plan, PlanningBranch, PlanningProduct, ProductionLine } from "@/lib/production-planning/types";
import { formatDateOnly, formatNumber } from "@/lib/utils";

export function ProductionPrintSheet({ companyName="Operations", kitchen, date, plan, products, outlets, allocations, production, dirty }: {
  companyName?:string; kitchen: string; date: string; plan: Plan; products: PlanningProduct[]; outlets: PlanningBranch[];
  allocations: Allocation[]; production: ProductionLine[]; dirty: boolean;
}) {
  const quantity = (value: number | null | undefined) => value == null ? "—" : formatNumber(value);
  const rows = products.flatMap(product => { const line = production.find(row => row.product_id === product.id); return line ? [{ product, line }] : []; });
  return <div className="production-sheet-print hidden"><section className="production-document-page">
    <header className="production-document-header"><div><div className="production-document-brand">{companyName}</div><h1>Production sheet · PCS</h1><p>{kitchen} · Delivery {formatDateOnly(date)} · Version {plan.version}</p></div><strong className="production-document-status">{dirty ? "UNSAVED DRAFT" : plan.status.toUpperCase()}</strong></header>
    <p className="production-document-note">Dash = pending; yield 1 = by piece; trays n/a = not applicable. Other units are shown beside the product.{plan.status !== "approved" || dirty ? " Draft: not released for production." : " Actual dispatch is confirmed separately."}</p>
    <table><colgroup><col style={{width:"7%"}}/><col style={{width:"33%"}}/>{Array.from({length:5+outlets.length},(_,i)=><col key={i} style={{width:`${60/(5+outlets.length)}%`}}/>)}</colgroup><thead><tr>{["Code","Product / unit","Yield","Trays","Produce",...outlets.map(outlet=>outlet.branch_name),"Event","Keep"].map((label,index)=><th key={index}>{label}</th>)}</tr></thead>
      <tbody>{rows.map(({product,line})=><tr key={product.id}><td>{product.product_code}</td><td>{product.product_name}{product.selling_unit!=="PCS"?` (${product.selling_unit})`:""}</td><td>{quantity(line.yield_per_tray)}</td><td>{line.yield_per_tray===1?"n/a":quantity(line.trays)}</td><td className="production-document-total">{quantity(line.trays===null||line.yield_per_tray===null?null:line.trays*line.yield_per_tray)}</td>{outlets.map(outlet=><td key={outlet.id}>{quantity(allocations.find(row=>row.product_id===product.id&&row.branch_id===outlet.id)?.approved_qty)}</td>)}<td>{quantity(line.event_qty)}</td><td>{quantity(line.retained_qty)}</td></tr>)}</tbody>
    </table><footer>{rows.length} products · {outlets.length} outlets</footer>
  </section></div>;
}
