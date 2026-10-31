"use server";
import { z } from "zod";
import { requirePermission } from "@/server/auth/permissions";
import { getBranchesForSelect, getItemsForSelect } from "@/server/queries/common";
import { createClient } from "@/lib/supabase/server";
import { isMockMode } from "@/lib/mock-mode";
import type { StockCountSeedLine } from "@/server/queries/stock-counts";

/** Read-only: selecting an extra line must not create a count or change branch scope. */
export async function previewStockCountItem(branchId: string, itemId: string): Promise<{line?: StockCountSeedLine; error?: string}> {
  try {
    await requirePermission("stock_count.create");
    if (!isMockMode() && (!z.uuid().safeParse(branchId).success || !z.uuid().safeParse(itemId).success)) throw new Error("Choose a valid branch and item.");
    const [branches, items] = await Promise.all([getBranchesForSelect({restrictToActorScope:true}), getItemsForSelect()]);
    if (!branches.some(branch=>branch.id===branchId)) throw new Error("This branch is unavailable for your account.");
    const item=items.find(item=>item.id===itemId);
    if (!item) throw new Error("This item is no longer available. Choose another item.");
    let balance=0;
    if (!isMockMode()) {
      const db=await createClient();
      const { data: activeItem, error: itemError } = await db.from("items").select("id").eq("id",itemId).eq("status","active").is("deleted_at",null).maybeSingle();
      if (itemError || !activeItem) throw new Error("This item is no longer available. Choose another item.");
      const {data,error}=await db.from("stock_balances_summary").select("current_qty").eq("branch_id",branchId).eq("item_id",itemId).maybeSingle();
      if(error) throw new Error("The starting balance could not be loaded. Try again; your count is unchanged.");
      balance=Number(data?.current_qty ?? 0);
      if(!Number.isFinite(balance)) throw new Error("The starting balance is invalid. Try again.");
    }
    return {line:{item_id:item.id,item_code:item.item_code,item_name:item.item_name,theoretical_qty:balance,physical_qty:null,prefill_source:"ledger_balance",uom:item.base_unit}};
  } catch(error) { return {error:error instanceof Error ? error.message : "Could not load this item. Try again."}; }
}
