const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('@playwright/test');
const base='http://localhost:3190',out='outputs/qa/component-states',f=JSON.parse(fs.readFileSync('outputs/wilson-qa/full-stack/fixture-private.json'));
(async()=>{const b=await chromium.launch(),p=await b.newPage({viewport:{width:390,height:900}}),a=f.accounts.find(x=>x.slug==='people'),results=[];try{
await p.goto(base+'/login');await p.locator('[name=email]').fill(a.email);await p.locator('[name=password]').fill(a.password);await p.getByRole('button',{name:/sign in/i}).click();await p.waitForURL(u=>u.pathname!='/login');
for(const kind of ['confirmations','payslips']){
 const endpoint=kind==='confirmations'?'/api/attendance/confirmations':'/api/people/payslips',url=base+'/attendance/'+kind,live=await(await p.request.get(base+endpoint)).json();assert.ok(live.items.length);
 for(const mode of ['loading','error','empty','long']){
  let release;const gate=new Promise(r=>release=r);let data=structuredClone(live);
  if(mode==='empty')data.items=[];
  if(mode==='long'){
   data.items=data.items.slice(0,1);
   if(kind==='confirmations'){let item=data.items[0];item.employee='Synthetic '+ 'VeryLongEmployeeName'.repeat(8);item.days.forEach(d=>{d.outlet='Synthetic '+ 'LongOutlet'.repeat(15);d.statuses=['long_unbroken_status'.repeat(8)]});item.events=[{action:'dispute',actor:'Synthetic reviewer',recorded_at:'2026-10-14T12:00:00Z',reason:'Reference'.repeat(110),branch_id:null}];}
   else{data.people=false;data.items[0].detail=[{kind:'earning',label:'A'.repeat(120),amount:999999999}];data.items[0].earnings=999999999;data.items[0].deductions=0;}
  }
  const handler=async r=>{if(mode==='loading')await gate;await r.fulfill({status:mode==='error'?503:200,json:mode==='error'?{message:'The service is temporarily unavailable. Reload to retry.'}:data});};
  await p.route('**'+endpoint+'*',handler);await p.goto(url);
  if(mode==='loading')await p.getByRole('status').filter({hasText:/Loading/}).waitFor();
  else if(mode==='error')await p.locator('main').getByRole('alert').waitFor();
  else if(mode==='empty')await p.getByText(kind==='confirmations'?'No attendance confirmations yet.':'No payslips yet.',{exact:true}).waitFor();
  else{await p.locator('main').getByText(kind==='confirmations'?data.items[0].employee:'A'.repeat(120),{exact:true}).waitFor();if(kind==='confirmations')await p.locator('main details summary').first().click();}
  for(const width of [390,820]){await p.setViewportSize({width,height:900});let overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(mode==='long'){const visibleText=p.locator('main').getByText(kind==='confirmations'?data.items[0].employee:'A'.repeat(120),{exact:true});assert.equal(await visibleText.evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'Long content must wrap rather than clip');if(kind==='payslips'){const amount=p.getByText('MYR 999999999.00',{exact:true}).first();const rect=await amount.boundingBox();assert.ok(rect.x>=0 && rect.x+rect.width<=width,'Line amount must remain visible');}}const file=`${kind}-${mode}-${width}.png`;await p.screenshot({path:out+'/'+file,fullPage:true});results.push({kind,mode,width,overflow,screenshot:file,injection:'GET response only; business writes not submitted'});}
  release();if(mode==='loading')await p.getByRole('status').filter({hasText:/Loading/}).waitFor({state:'hidden'});await p.unroute('**'+endpoint+'*',handler);await p.goto(url);await p.locator('main').getByText(kind==='confirmations'?'People → Staff → Supervisor → Manager → People':'Enter verified MYR amounts. Tax, rates and allowances are not inferred.',{exact:true}).waitFor();
  if(mode==='error')assert.equal(await p.locator('main').getByRole('alert').count(),0);
  fs.writeFileSync(out+'/client-states.json',JSON.stringify(results,null,2));
 }
}
console.log(JSON.stringify(results));}finally{await b.close()}})().catch(e=>{console.error(String(e.message).split('\n')[0]);process.exitCode=1});
