const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const load=require('./helpers/load-source.cjs')();
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/production-planning-product-rules.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:exportsObject,require(name){
 if(name==='react'||name==='react/jsx-runtime')return require(name);
 if(name==='@/lib/production-planning/minimum-estimate')return load('src/lib/production-planning/minimum-estimate.ts');
 if(name==='@/lib/utils')return {formatDateOnly:x=>x};
 if(name.endsWith('/input'))return {Input:props=>React.createElement('input',props)};
 if(name.endsWith('/select-control'))return {SelectControl:()=>null};
 if(name.endsWith('/table'))return new Proxy({},{get:()=>({children})=>React.createElement('div',null,children)});
 return new Proxy({},{get:()=>({children})=>React.createElement('div',null,children)});
}});
function html(value,name='Black Sesame Bun',basis='on_order'){return renderToStaticMarkup(React.createElement(exportsObject.PlanningProductRules,{showHidden:false,onShowHidden(){},products:[{id:'p',product_name:name,product_code:'BB01'}],availability:{p:{available_from:null,available_until:null}},onAvailability(){},outletId:'o',yields:{p:value},basis:{p:basis},minimums:{},onYield(){},onBasis(){},onMinimum(){}}));}
test('non-rice yield editor remains an input at 1, subsequent values, zero and blank',()=>{for(const value of ['2','1','3','0',''])for(const basis of ['on_order','manual','same_day']){const result=html(value,undefined,basis);assert.match(result,/aria-label="Black Sesame Bun batch yield"/);assert.match(result,new RegExp(`value="${value}"`));assert.doesNotMatch(result,/By piece/);}});
test('rice bowl exact quantity rule and positive-yield validation remain unchanged',()=>{assert.doesNotMatch(html('1','Mini Chicken Rice Bowl Kuih'),/batch yield/);assert.match(html('0'),/min="0.01"/);assert.match(html('0'),/step="0.01"/);});
