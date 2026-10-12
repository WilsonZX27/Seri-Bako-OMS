/** Conservative nonzero floor, not a sales forecast or an asserted merchandising minimum. */
export function estimateNonzeroMinimum(movements:number[]):number {
 const valid=movements.filter(value=>Number.isFinite(value)&&value>=0).sort((a,b)=>a-b);
 return Math.max(1,Math.ceil(valid.length?valid[Math.floor((valid.length-1)*0.25)]:1));
}
export function isRiceBowl(name:string):boolean { return /^Mini .+ Rice Bowl Kuih$/i.test(name.trim()); }
