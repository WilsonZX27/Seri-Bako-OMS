import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import workspaces from './helpers/render-workspaces.cjs';
const { renderDashboard } = workspaces;
test('same-week schedule actions retain distinguishable branch labels and existing links',()=>{
 const pendingApprovals=['Pyramid','Velocity'].map((branch_name,i)=>({id:'schedule-'+i,document_no:'Week of 2026-10-19',step:'Manager Approval',branch_name,href:'/attendance/schedule?branch='+i,age_label:'Today'}));
 const html=renderDashboard('super_admin',{pendingApprovals});
 for(const [i,name] of ['Pyramid','Velocity'].entries()){assert.ok(html.includes(name+' · Review and publish this outlet roster'));assert.ok(html.includes('/attendance/schedule?branch='+i));}
 assert.ok(renderDashboard('super_admin',{pendingApprovals:[{...pendingApprovals[0],branch_name:null}]}).includes('Outlet unavailable'));
});
test('PO and GR keep narrow-canvas scrolling while fitting the 810px desktop sample',()=>{
 for(const route of ['purchase-orders','goods-receivings']){
 const source=fs.readFileSync('src/app/(app)/'+route+'/page.tsx','utf8');
 assert.match(source,/!min-w-\[50rem\]" scrollbar="auto" mobileHidden/);
 assert.match(source,/<TableHead className="w-32">Supplier<\/TableHead>/);
 assert.match(source,/<TableCell className="w-32 max-w-32"><span className="whitespace-normal break-words leading-4">/);
 const header=source.slice(source.indexOf('<TableHeader>'),source.indexOf('</TableHeader>'));
 const remUnits=[...header.matchAll(/className="w-(\d+)/g)].map(m=>Number(m[1]));
 assert.equal(remUnits.reduce((a,b)=>a+b,0)*4,808);
 }
});
