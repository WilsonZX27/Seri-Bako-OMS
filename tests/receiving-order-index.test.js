const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load({orders=[],lines=[],suppliers=[],failure=null,source}={}){
 const calls=[],exports={},tables={purchase_orders:orders,purchase_order_lines:lines,suppliers};
 const db={from(table){const call={table,filters:[]};const q=new Proxy({then(resolve,reject){calls.push(call);return Promise.resolve({data:failure===table?null:tables[table],error:failure===table?{message:'failed '+table}:null}).then(resolve,reject);}},{get:(target,key)=>key in target?target[key]:(...args)=>{call.filters.push([key,...args]);return q;}});return q;}};
 vm.runInNewContext(ts.transpileModule(source??fs.readFileSync('src/server/queries/goods-receivings.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>n==='@/lib/mock-mode'?{isMockMode:()=>false}:n==='@/lib/supabase/server'?{createClient:async()=>db}:{}});return {run:exports.getEligiblePurchaseOrders,calls};
}
test('eligible PO index keeps order, exact pending math, supplier fallback and unmatched-line isolation',async()=>{
 const f=load({orders:[{id:'a',supplier_id:'s'},{id:'b',supplier_id:'missing'},{id:'empty'}],suppliers:[{id:'s',name:'Supplier'}],lines:[{purchase_order_id:'a',qty_ordered:5,qty_received:2,qty_cancelled:1},{purchase_order_id:'a',qty_ordered:10,qty_received:10,qty_cancelled:0},{purchase_order_id:'a',qty_ordered:2,qty_received:0,qty_cancelled:3},{purchase_order_id:'b',qty_ordered:1,qty_received:0,qty_cancelled:0},{purchase_order_id:'other',qty_ordered:99,qty_received:0,qty_cancelled:0}]});
 const rows=await f.run();assert.deepEqual(Array.from(rows,x=>[x.id,x.pending_lines,x.pending_qty,x.supplier_name]),[['a',1,2,'Supplier'],['b',1,1,null],['empty',0,0,null]]);
 const query=f.calls[0];assert.ok(query.filters.some(x=>x[0]==='is'&&x[1]==='deleted_at'&&x[2]===null));assert.ok(query.filters.some(x=>x[0]==='in'&&x[1]==='status'&&x[2].join(',')==='approved,sent,partial_received'));
 assert.deepEqual(Array.from(f.calls.find(x=>x.table==='purchase_order_lines').filters.find(x=>x[0]==='in')[2]),['a','b','empty']);
});
test('empty and failed reads retain existing handling without fabricated eligibility',async()=>{
 const empty=load();assert.equal((await empty.run()).length,0);assert.equal(empty.calls.length,1);
 for(const failure of ['purchase_orders','purchase_order_lines','suppliers']){await assert.rejects(load({orders:[{id:'a',supplier_id:'s'}],failure}).run(),new RegExp('failed '+failure));}
});
test('line parent identity inspections stay linear as order count grows',async()=>{
 let reads=0;const count=200,orders=Array.from({length:count},(_,i)=>({id:'o'+i})),lines=Array.from({length:4000},(_,i)=>({get purchase_order_id(){reads++;return 'o'+i%count;},qty_ordered:1,qty_received:0,qty_cancelled:0}));
 const rows=await load({orders,lines}).run();assert.equal(rows.length,count);assert.equal(rows[0].pending_lines,20);assert.ok(reads<lines.length*4,`parent ID reads ${reads}`);
});
module.exports={load};
test('duplicate parents and fractional quantities retain source order without mutating frozen rows',async()=>{
 const orders=Object.freeze([Object.freeze({id:'a'}),Object.freeze({id:'a'}),Object.freeze({id:'b'})]);
 const lines=Object.freeze([Object.freeze({purchase_order_id:'a',qty_ordered:1.5,qty_received:0.25,qty_cancelled:0.5}),Object.freeze({purchase_order_id:'b',qty_ordered:0,qty_received:0,qty_cancelled:0})]);
 const before=JSON.stringify({orders,lines});const result=await load({orders,lines}).run();
 assert.deepEqual(Array.from(result,r=>[r.id,r.pending_lines,r.pending_qty]),[['a',1,0.75],['a',1,0.75],['b',0,0]]);assert.equal(JSON.stringify({orders,lines}),before);
});
