// Actual component/export GET with synthetic identity/query adapters. No real auth/data writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),ts=require('typescript'),Module=require('node:module'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test'),esbuild=require(process.env.OMS_LOCAL_ESBUILD),{id,payslipRow}=require('../../tests/fixtures/payslip-export.cjs');
const out=path.resolve('handoff/payslip-export-candidate-20261101');fs.mkdirSync(out,{recursive:true});
const load=require('../../tests/helpers/load-source.cjs')({Buffer,process}),exportsModule={};
const pdf=new Module('payslip-pdf.ts',module);pdf.paths=module.paths;pdf.require=n=>n==='./payslip-export'?load('src/lib/attendance/payslip-export.ts'):require(n);pdf._compile(ts.transpileModule(fs.readFileSync('src/lib/attendance/payslip-pdf.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,'payslip-pdf.ts');
const rows=[payslipRow(),payslipRow({id:id(5),version:2,state:'draft',approved_at:null,released_at:null}),payslipRow({id:id(6),version:1,state:'superseded'})];let people=true;
const mocks={
 'next/server':{NextResponse:class extends Response{static json(body,options){return new Response(JSON.stringify(body),{...options,headers:{...options?.headers,'content-type':'application/json'}});}}},
 '@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({companyId:id(2),staffId:id(3)})},
 '@/lib/supabase/loose':{looseSupabase:x=>x},
 '@/lib/supabase/server':{createClient:async()=>({rpc:async()=>({data:people,error:null}),from:()=>{let selected;const q={select:()=>q,eq:(field,value)=>{if(field==='id')selected=value;return q;},maybeSingle:async()=>({data:rows.find(row=>row.id===selected)??null,error:null})};return q;}})},
 '@/lib/attendance/payslip-export':load('src/lib/attendance/payslip-export.ts'),
 '@/lib/attendance/payslip-workbook':load('src/lib/attendance/payslip-workbook.ts'),
 '@/lib/attendance/payslip-pdf':pdf.exports,
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/people/payslips/export/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsModule,URL,Uint8Array,require:n=>mocks[n]??require(n)});
(async()=>{
 const bundle=await esbuild.build({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';import{PayslipWorkspace}from'./src/components/attendance/payslip-workspace';createRoot(document.getElementById('root')).render(<PayslipWorkspace/>);",resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},tsconfig:'tsconfig.json'});
 const css=fs.readdirSync('.next/static/css').filter(x=>x.endsWith('.css')).map(x=>fs.readFileSync('.next/static/css/'+x,'utf8')).join('\n');
 const server=http.createServer(async(req,res)=>{try{
  if(req.url==='/bundle.js'){res.setHeader('content-type','application/javascript');res.end(bundle.outputFiles[0].text);return;}
  if(req.url.startsWith('/api/people/payslips/export?')){const response=await exportsModule.GET(new Request('http://localhost'+req.url));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
  if(req.url==='/api/people/payslips'){assert.equal(req.method,'GET');res.setHeader('content-type','application/json');res.end(JSON.stringify({people,items:people?rows:rows.filter(x=>x.state==='released')}));return;}
  if(req.url==='/api/attendance/confirmations'){res.setHeader('content-type','application/json');res.end('{"items":[]}');return;}
  res.setHeader('content-type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'\nhtml,body{height:auto!important;overflow:visible!important}.fixture-shell{height:auto!important;max-height:none!important;overflow:visible!important}</style><main class="fixture-shell sb-workspace-canvas mx-auto min-h-screen max-w-5xl p-4"><h1 class="mb-4 text-xl font-semibold">Synthetic payslip export review</h1><div id="root"></div></main><script>globalThis.process={env:{NODE_ENV:"development"},browser:true}</script><script src="/bundle.js"></script>');
 }catch(e){res.statusCode=500;res.end(String(e));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
 try{const page=await browser.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.goto(base);try{await page.getByRole('link',{name:'Download draft Excel',exact:true}).waitFor();}catch(e){fs.writeFileSync(out+'/ui-failure.txt',JSON.stringify({errors,body:await page.locator('body').innerText()},null,2));throw e;}
  for(const width of [390,820,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:out+`/workspace-${width}.png`,fullPage:true});}
  const event=page.waitForEvent('download');await page.getByRole('link',{name:'Download Excel',exact:true}).click();await(await event).saveAs(out+'/http-released.xlsx');
  const pdfEvent=page.waitForEvent('download');await page.getByRole('link',{name:'Download draft PDF',exact:true}).click();await(await pdfEvent).saveAs(out+'/http-draft.pdf');
  assert.equal((await page.request.get(base+`/api/people/payslips/export?id=${id(1)}&version=2&format=xlsx`)).status(),409);
  assert.equal((await page.request.get(base+`/api/people/payslips/export?id=${id(6)}&version=1&format=pdf`)).status(),409);
  people=false;assert.equal((await page.request.get(base+`/api/people/payslips/export?id=${id(5)}&version=2&format=pdf`)).status(),404);
  await page.reload();assert.equal(await page.getByRole('link',{name:'Download draft Excel',exact:true}).count(),0);await page.getByRole('link',{name:'Download Excel',exact:true}).waitFor();await page.setViewportSize({width:390,height:1000});await page.screenshot({path:out+'/employee-390.png',fullPage:true});assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/ui-result.json',JSON.stringify({passed:true,checks:['actual component at390/820/1440 without horizontal overflow','real native-anchor XLSX and draft PDF download through actual GET','superseded and stale version409','employee draft export404; employee UI only released actions'],limits:['synthetic identity and query adapters','component harness with current built CSS; not full authenticated app/production acceptance']},null,2));console.log('PASS synthetic actual-component download and responsive checks');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
