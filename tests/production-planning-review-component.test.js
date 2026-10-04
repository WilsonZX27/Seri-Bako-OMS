const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const logic={exports:{}};vm.runInNewContext(compile('src/lib/production-planning/review-checks.ts'),logic);
const context={exports:{},require:n=>{
 if(n==='react/jsx-runtime')return require(n);
 if(n==='next/link')return {default:p=>React.createElement('a',p,p.children)};
 if(n.endsWith('/button'))return {Button:p=>p.asChild?p.children:React.createElement('button',null,p.children)};
 if(n.endsWith('/right-console'))return {ConsoleSection:p=>React.createElement('section',null,React.createElement('h2',null,p.title),p.children)};
 if(n.endsWith('/review-checks'))return logic.exports;throw Error(n);
}};vm.runInNewContext(compile('src/components/production-planning-review-checks.tsx'),context);
const props={hasPlan:true,dirty:false,products:[{id:'p',product_code:'SC01'}],outlets:[{id:'b',branch_name:'Gurney Plaza'}],date:'2026-10-05',kitchenId:'k'};
const render=patch=>renderToStaticMarkup(React.createElement(context.exports.PlanningReviewChecks,{...props,...patch}));
test('actual review component keeps each precise check in a closed accessible group and links to the current Settings',()=>{
 const checks=[{productId:'p',category:'configuration',message:'Set yield.'},{productId:'p',branchId:'b',category:'quantities',message:'Enter quantity.'},{productId:'p',branchId:'b',category:'reasons',message:'Add reason.'},{productId:'p',category:'balance',message:'Allocate remainder.'}];
 const html=render({checks});assert.equal((html.match(/<details>/g)||[]).length,4);assert.equal((html.match(/<li>/g)||[]).length,4);assert.ok(!html.includes('<details open'));assert.match(html,/SC01 · Gurney Plaza: Enter quantity/);assert.match(html,/min-h-11/);assert.match(html,/date=2026-10-05&amp;kitchen=k&amp;view=settings/);assert.ok(!html.includes('checks before review'));
});
test('ready and unsaved states stay truthful without showing empty groups or a configuration action',()=>{
 const html=render({checks:[],dirty:true});assert.match(html,/Save changes before review/);assert.ok(!html.includes("Ready for review"));assert.match(render({checks:[]}),/Ready for review/);assert.ok(!html.includes('<details'));assert.ok(!html.includes('Open Settings'));
 const empty=render({checks:[],hasPlan:false});assert.ok(!empty.includes('Ready for review'));assert.match(empty,/Set tray yields/);
});
