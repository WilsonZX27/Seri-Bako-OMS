const test=require('node:test'),assert=require('node:assert/strict');
const {renderDashboard}=require('./helpers/render-workspaces.cjs');
test('repair summaries omit comments while preserving distinct requests and identity',()=>{
 const actions=['one','two'].map(id=>({id:`maintenance-${id}`,document_no:'Repair',href:`/asset-management?view=maintenance&ticket=${id}`,step:'Open',branch_name:'Fixture branch',updated_at:'2026-10-23',maintenance_asset_name:'Shared asset name',maintenance_description:'PRIVATE COMMENT DISTRACTOR',maintenance_author_name:'Fixture author',maintenance_priority:'Normal'}));
 const html=renderDashboard('super_admin',{pendingApprovals:actions});
 assert.doesNotMatch(html,/PRIVATE COMMENT DISTRACTOR|No issue description/);
 for(const id of ['one','two'])assert.ok(html.includes(`ticket=${id}`));
 assert.equal((html.match(/Shared asset name/g)||[]).length,2);
 assert.match(html,/Fixture branch/);assert.match(html,/Fixture author/);assert.match(html,/Normal/);
});

test('removed repair comment does not leave half the summary track reserved',()=>{
 const css=require('postcss').parse(require('node:fs').readFileSync('src/app/design-system-v2.css','utf8'));let found=false;
 css.walkRules(r=>{if(r.selector==='html[data-design-layer="v2"] .sb-repair-summary')r.walkDecls('grid-template-columns',d=>{assert.equal(d.value,'minmax(0,1fr)');found=true;});});assert.ok(found);
});

test('pipeline odd tail fills the row without hiding unavailable values or compliance',()=>{
 for(const compliance of [null,{issues:2,unavailable:false},{issues:null,unavailable:true}]){
 const html=renderDashboard('super_admin',{compliance,productionSummary:null});const pipeline=html.slice(html.indexOf('data-dashboard-pipeline'));
 const production=pipeline.match(/<a[^>]*href="\/production\/jobs"[^>]*>[\s\S]*?<\/a>/)?.[0];assert.ok(production);
 assert.equal(/class="[^"]*col-span-2/.test(production.split('>')[0]),!compliance);assert.match(production,/Unavailable/i);
 assert.equal(pipeline.includes('Compliance issues'),Boolean(compliance));
 }
});
