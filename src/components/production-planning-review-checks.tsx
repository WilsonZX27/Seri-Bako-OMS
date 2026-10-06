import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { REVIEW_CHECK_GROUPS, type PlanReviewCheck } from "@/lib/production-planning/review-checks";
import type { PlanningProduct, PlanningBranch } from "@/lib/production-planning/types";

type Props = { hasPlan: boolean; dirty: boolean; checks: PlanReviewCheck[]; products: PlanningProduct[]; outlets: PlanningBranch[]; date: string; kitchenId: string; onProduct?: (id:string)=>void };
export function PlanningReviewChecks({hasPlan,dirty,checks,products,outlets,date,kitchenId,onProduct}: Props) {
 const affected=new Set(checks.map(c=>c.productId)).size;
 const short=(check:PlanReviewCheck)=>{
  const text=check.message;
  if(text.startsWith("Set the tray yield"))return "Tray yield";
  if(text.startsWith("Confirm the outlet minimum"))return "Outlet minimum";
  if(text.startsWith("Enter a quantity"))return "Outlet quantity";
  if(text.startsWith("Complete outlet quantities"))return "Production quantity";
  if(text.startsWith("Enter a whole"))return "Whole trays";
  if(text.startsWith("Enter a valid quantity"))return "Kitchen retention";
  if(text.startsWith("Include the full"))return "Event quantity";
  if(text.startsWith("Add"))return "Manager reason";
  if(text.startsWith("Allocate the remaining"))return "Unallocated output";
  if(text.startsWith("Allocation exceeds"))return "Production shortfall";
  return text;
 };

 return <ConsoleSection title="Plan checks"><div className="space-y-2 text-xs">
  {dirty?<p>Save changes before review.</p>:null}
  {!hasPlan?<p>Set tray yields, outlet minimums and routes in Settings.</p>:checks.length?<>
   <p className="font-medium">{affected} products need attention</p>
   {REVIEW_CHECK_GROUPS.map(group=>{const items=checks.filter(c=>c.category===group.category);const count=new Set(items.map(c=>c.productId)).size;return items.length?<details key={group.category} className="border-b last:border-0"><summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-3"><span>{group.label}</span><strong className="tabular-nums">{count} products</strong></summary><div className="max-h-64 overflow-y-auto pb-3"><p className="mb-2 text-muted-foreground">{items.length} fields to complete</p><ul className="divide-y">{Array.from(new Set(items.map(c=>c.productId))).map(id=>{
 const product=products.find(p=>p.id===id); const productChecks=items.filter(c=>c.productId===id);
 const labels=Array.from(new Set(productChecks.map(short))).map(text=>{const matching=productChecks.filter(c=>short(c)===text);return `${text}${matching.length>1?` ×${matching.length}`:""}`;});
 const full=productChecks.map(c=>`${c.branchId?`${outlets.find(o=>o.id===c.branchId)?.branch_name??"Outlet"}: `:""}${c.message}`).join("\n");
 return <li className="py-2" key={id} title={full}><div className="flex items-center justify-between gap-2"><strong>{product?.product_code??"Product"}</strong>{onProduct&&group.category!=="configuration"?<button type="button" className="min-h-9 underline" aria-label={`Find ${product?.product_code??"product"} in plan`} onClick={()=>onProduct(id)}>Find</button>:null}</div><p className="mt-1 text-muted-foreground">{labels.join(" · ")}</p></li>;
 })}</ul></div></details>:null;})}
   {checks.some(check=>check.category==="configuration")?<Button asChild variant="outline" className="w-full"><Link href={`/production/planning?date=${date}&kitchen=${kitchenId}&view=settings`}>Open Settings</Link></Button>:null}
  </>:!dirty?<p>Ready for review.</p>:null}
 </div></ConsoleSection>;
}
