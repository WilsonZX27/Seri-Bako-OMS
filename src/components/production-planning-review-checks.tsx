import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { REVIEW_CHECK_GROUPS, type PlanReviewCheck } from "@/lib/production-planning/review-checks";
import type { PlanningProduct, PlanningBranch } from "@/lib/production-planning/types";

type Props = { hasPlan: boolean; dirty: boolean; checks: PlanReviewCheck[]; products: PlanningProduct[]; outlets: PlanningBranch[]; date: string; kitchenId: string };
export function PlanningReviewChecks({hasPlan,dirty,checks,products,outlets,date,kitchenId}: Props) {
 const label=(check:PlanReviewCheck)=>`${products.find(product=>product.id===check.productId)?.product_code??"Product"}${check.branchId?` · ${outlets.find(outlet=>outlet.id===check.branchId)?.branch_name??"Outlet"}`:""}: ${check.message}`;
 return <ConsoleSection title="Plan checks"><div className="space-y-2 text-xs">
  {dirty?<p>Save changes before review.</p>:null}
  {!hasPlan?<p>Set tray yields, outlet minimums and routes in Settings.</p>:checks.length?<>
   <p>Complete the items below before review.</p>
   {REVIEW_CHECK_GROUPS.map(group=>{const items=checks.filter(check=>check.category===group.category);return items.length?<details key={group.category}><summary className="min-h-11 cursor-pointer py-3">{group.label} · {items.length}</summary><ul className="space-y-2">{items.map((check,index)=><li key={index}>{label(check)}</li>)}</ul></details>:null;})}
   {checks.some(check=>check.category==="configuration")?<Button asChild variant="outline"><Link href={`/production/planning?date=${date}&kitchen=${kitchenId}&view=settings`}>Open Settings</Link></Button>:null}
  </>:!dirty?<p>Ready for review.</p>:null}
 </div></ConsoleSection>;
}
