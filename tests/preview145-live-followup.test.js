const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const load=require('./helpers/load-source.cjs')();
const ia=load('src/lib/information-architecture.ts');
test('nested workspaces use their own most-specific identity without changing IA order or employee details',()=>{
 const order=ia.informationArchitecture.map(x=>x.href).join('|');
 for(const item of ia.informationArchitecture)assert.equal(ia.getIaItemForPath(item.href)?.href,item.href);
 assert.equal(ia.getIaItemForPath('/people/ro').label,'RO Management');
 assert.equal(ia.getIaItemForPath('/people/employee-id').label,'Employees');
 assert.equal(ia.getIaItemForPath('/people/ro-other').label,'Employees');
 assert.equal(ia.informationArchitecture.map(x=>x.href).join('|'),order);
});
test('actual RO breadcrumb resolves RO Management while employee detail keeps Employees',()=>{
 const {compile,React,renderToStaticMarkup}=require('./helpers/render-workspaces.cjs');
 for(const [path,expected]of [['/people/ro','RO Management'],['/people/employee-id','Employees']]){
  const {Breadcrumbs}=compile('src/components/layout/breadcrumbs.tsx',{'react':{...React,useState:()=>[null,()=>{}],useEffect:()=>{}},'next/navigation':{usePathname:()=>path},'next/link':({children,...props})=>React.createElement('a',props,children),'@/lib/information-architecture':ia});
  const html=renderToStaticMarkup(React.createElement(Breadcrumbs));assert.ok(html.includes(expected));if(path==='/people/ro')assert.doesNotMatch(html,/Employees|>Ro</);
 }
});
test('only the mobile primary slot imposes48px; secondary controls and desktop defaults remain scoped',()=>{
 const source=fs.readFileSync('src/components/layout/right-console.tsx','utf8');
 assert.match(source,/data-mobile-primary-slot className="min-w-0 \[&>\*\]:h-12 \[&>\*\]:w-full"/);
 assert.doesNotMatch(source,/data-mobile-primary-slot className="[^"]*h-11/);
 assert.match(source,/md:hidden xl:hidden/);
 const button=fs.readFileSync('src/components/ui/button.tsx','utf8');assert.match(button,/var\(--sb-control-height\)/);assert.doesNotMatch(button,/\[&>\*\]:h-12/);
});
