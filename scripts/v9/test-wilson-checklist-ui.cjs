// Isolated component rendering: real TSX and project CSS, synthetic props, no server or DB.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),ts=require('typescript'),{chromium}=require('@playwright/test');
const out='outputs/wilson-qa';fs.mkdirSync(out,{recursive:true});
const cache={};
function load(file){if(cache[file])return cache[file];const module={exports:{}};const req=name=>{
 if(name==='@/components/layout/right-console')return {RightConsoleMount:({children})=>React.createElement('aside',null,children),ConsoleSection:({children})=>React.createElement('div',null,children)};
 if(name==='@/components/asset-unsaved-guard')return {useAssetFormGuard(){}};
 if(name==='@/server/actions/assets')return {submitAssetChecklist:async()=>({ok:false,message:''}),reportAssetMaintenance:async()=>({ok:false,message:''})};
 if(name==='next/navigation')return {usePathname:()=>'/asset-management/locations/synthetic'};
 if(name.startsWith('@/')){let f=path.join('src',name.slice(2));f+=fs.existsSync(f+'.tsx')?'.tsx':'.ts';return load(f);}
 return require(name);
};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:req,console});return cache[file]=module.exports;}
(async()=>{
 const {AssetChecklistForm}=load('src/components/asset-checklist-form.tsx'),{GeneralMaintenanceForm}=load('src/components/general-maintenance-form.tsx');
 const page=fs.readFileSync('src/app/(app)/asset-management/locations/[id]/page.tsx','utf8');
 const section=page.match(/<section className="sb-work-surface min-w-0 p-3 sm:p-4">.*?<\/section>/)[0];
 const source=`const React=require('react');const GeneralMaintenanceForm=require('@/components/general-maintenance-form').GeneralMaintenanceForm;module.exports=function(){const id='00000000-0000-4000-8000-000000000030',data={location:{id,source_name:'Synthetic outlet',kind:'branch',branch_id:'synthetic'}};const randomUUID=()=> '00000000-0000-4000-8000-000000000050';return (${section});}`;
 const m={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require:n=>n==='react'?React:n==='react/jsx-runtime'?require(n):{GeneralMaintenanceForm}});
 const html=renderToStaticMarkup(React.createElement('main',{className:'mx-auto w-full max-w-4xl space-y-4 p-3'},React.createElement(AssetChecklistForm,{locationId:'synthetic',locationName:'Synthetic outlet',assets:[{id:'a',asset_code:'TEST-1',item_name:'Synthetic fitting',current_details:{Category:'Equipment'}}],holdings:[{asset_id:'a',quantity:1}],date:'2026-10-13',today:'2026-10-13',submissionId:'00000000-0000-4000-8000-000000000001'}),React.createElement(m.exports)));
 const css=fs.readFileSync(out+'/tailwind.css','utf8')+fs.readFileSync('src/app/design-system-v2.css','utf8');
 const browser=await chromium.launch();const p=await browser.newPage();const results=[];
 for(const width of [320,390,820,1440]){
  await p.setViewportSize({width,height:1800});await p.setContent(`<html><head><style>${css}</style></head><body>${html}</body></html>`);
  const summary=p.getByText('Other issues / General repair',{exact:true});await summary.click();
  await p.getByLabel('What needs fixing?').fill('Synthetic lamp above the sink needs repair.');
  assert.equal(await p.locator('form form').count(),0);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`overflow ${width}`);
  if(width<1024)assert.ok((await p.getByRole('button',{name:'Send request'}).boundingBox()).height>=44);
  await p.getByRole('button',{name:'Send request'}).scrollIntoViewIfNeeded();
  assert.equal(await p.locator('input[type=file]').isVisible(),true);
  await p.screenshot({path:`${out}/component-${width}.png`,fullPage:true});results.push({width,overflow:false,nestedForms:false});
 }
 await browser.close();fs.writeFileSync(out+'/ui-results.json',JSON.stringify(results,null,2));console.log('4 component viewport checks passed (not authenticated end-to-end).');
})().catch(e=>{console.error(e);process.exitCode=1});
