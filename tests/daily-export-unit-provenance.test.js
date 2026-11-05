import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function variable(file,name,context){const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);let found;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)found=n;ts.forEachChild(n,visit);}visit(ast);assert.ok(found);const out={...context};vm.runInNewContext(ts.transpileModule(`const ${found.getText(ast)}; globalThis.result=${name};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,out);return out.result;}
test('actual historical CSV mapping preserves quantities and existing unit, adding explicit provenance',()=>{
 const lines=[{record_id:'r',product_id:'p',qty_sent:2,qty_sent_confirmed:true,morning_received_provided:true,morning_received_qty:0,wastage_qty:1.5,notes:'Keep historical note'}];
 const rows=variable('src/app/api/export/outlet-daily-records/route.ts','exportRows',{lines,recordById:new Map([['r',{id:'r',branch_id:'b',record_date:'2026-10-01',status:'reviewed',pos_total_sales:12}]]),productById:new Map([['p',{product_code:'P1',product_name:'Original product',selling_unit:'KG'}]]),recipeByProduct:new Map(),latestCostByRecipe:new Map(),canViewWastageCost:false,salesByRecord:new Map([['r',{cash:12}]]),salesChannels:['cash'],branchNames:new Map([['b','Test outlet']]),staffNames:new Map()});
 assert.equal(rows[0].selling_unit,'KG');assert.equal(rows[0].qty_sent,2);assert.equal(rows[0].received,0);assert.equal(rows[0].wastage,1.5);assert.equal(rows[0].line_notes,'Keep historical note');assert.equal(rows[0].pos_total_sales,12);assert.equal(rows[0].channel_total,12);
 assert.equal(rows[0].historical_unit,null);assert.equal(rows[0].historical_unit_status,'unverified');assert.match(rows[0].selling_unit_basis,/Current catalogue/);
 assert.equal(Object.keys(rows[0]).at(-1),'historical_unit_status');
});
for(const historical of [true,false])test('blank template records unit basis without inserting historical quantities: '+historical,()=>{
 const rows=variable('src/app/api/export/outlet-daily-form-template/route.ts','rows',{historical,groups:[{label:'Foods',products:[{product_code:'P1',product_name:'Test',selling_unit:'PCS'}]}]});
 assert.equal(rows[0].unit,'PCS');assert.equal(rows[0].qty_sent,'');assert.equal(rows[0].wastage,'');assert.equal(rows[0].unit_basis,historical?'Current catalogue; historical unit unverified':'Current catalogue for new entry');
});
