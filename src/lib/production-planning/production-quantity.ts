import type { Allocation, ProductionLine } from "./types";

// JSON decimal quantities must agree with PostgreSQL NUMERIC at whole-tray boundaries.
function decimal(value:number):{units:bigint;scale:number} {
 const [coefficient,exponent="0"]=String(value).toLowerCase().split("e");
 const [whole,fraction=""]=coefficient.split(".");
 const scale=fraction.length-Number(exponent);
 const units=BigInt(whole+fraction);
 return scale<0?{units:units*BigInt(10)**BigInt(-scale),scale:0}:{units,scale};
}
export function automaticTrayCount(line: ProductionLine, allocations: Allocation[]): number | null {
 const destinations=allocations.filter(item=>item.product_id===line.product_id);
 if (!line.yield_per_tray || !Number.isFinite(line.yield_per_tray) || line.yield_per_tray<=0 || !Number.isFinite(line.event_qty) || line.event_qty<0 || destinations.some(item=>item.approved_qty===null || !Number.isFinite(item.approved_qty) || item.approved_qty<0)) return null;
 const values=[decimal(line.yield_per_tray),decimal(line.event_qty),...destinations.map(item=>decimal(item.approved_qty!))];
 const scale=Math.max(...values.map(value=>value.scale));
 const scaled=values.map(value=>value.units*BigInt(10)**BigInt(scale-value.scale));
 const demand=scaled.slice(1).reduce((sum,value)=>sum+value,BigInt(0));
 return Number((demand+scaled[0]-BigInt(1))/scaled[0]);
}
