import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { REVIEW_CHECK_GROUPS, type PlanReviewCheck } from "@/lib/production-planning/review-checks";
import type { PlanningProduct, PlanningBranch } from "@/lib/production-planning/types";

type Props = { hasPlan: boolean; dirty: boolean; checks: PlanReviewCheck[]; products: PlanningProduct[]; outlets: PlanningBranch[]; date: string; kitchenId: string };
export function PlanningReviewChecks({hasPlan,dirty,checks,products,outlets,date,kitchenId}: Props) {
 const affected=new Set(checks.map(c=>c.productId)).size;
 const label=(check:PlanReviewCheck)=>`${products.find(product=>product.id===check.productId)?.product_code??"Product"}${check.branchId?` · ${outlets.find(outlet=>outlet.id===check.branchId)?.branch_name??"Outlet"}`:""}: ${check.message}`;
 return <ConsoleSection title="Plan checks"><div className="space-y-2 text-xs">
  {dirty?<p>Save changes before review.</p>:null}
  {!hasPlan?<p>Set tray yields, outlet minimums and routes in Settings.</p>:checks.length?<>
   <p className="font-medium">{affected} products need attention</p>
   {REVIEW_CHECK_GROUPS.map(group=>{const items=checks.filter(c=>c.category===group.category);const count=new Set(items.map(c=>c.productId)).size;return items.length?<details key={group.category} className="border-b last:border-0"><summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-3"><span>{group.label}</span><strong className="tabular-nums">{count} products</strong></summary><div className="max-h-64 overflow-y-auto pb-3"><p className="mb-2 text-muted-foreground">{items.length} fields to complete</p><ul className="divide-y">{items.map((check,index)=><li className="py-2" key={index}>{label(check)}</li>)}</ul></div></details>:null;})}
   {checks.some(check=>check.category==="configuration")?<Button asChild variant="outline" className="w-full"><Link href={`/production/planning?date=${date}&kitchen=${kitchenId}&view=settings`}>Open Settings</Link></Button>:null}
  </>:!dirty?<p>Ready for review.</p>:null}
 </div></ConsoleSection>;
}
