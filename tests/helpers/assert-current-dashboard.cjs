const assert=require('node:assert/strict'),fs=require('node:fs'),postcss=require('postcss');
const {compile,roles,summary,renderDashboard,React,renderToStaticMarkup}=require('./render-workspaces.cjs');
exports.hierarchy=()=>{
 const html=renderDashboard('super_admin',{pendingApprovals:[{id:'fixture',document_no:'PR/FIXTURE',href:'/purchase-requests/fixture',step:'Finance Review',supplier_names:['Fixture supplier'],branch_name:'Fixture branch',updated_at:'2026-10-23',line_count:1,estimated_total:12}]});
 assert.match(html,/data-dashboard-panel-body/);assert.match(html,/Actions awaiting you/);assert.match(html,/PR\/FIXTURE/);assert.match(html,/Fixture supplier/);assert.match(html,/Fixture branch/);
 assert.equal((html.match(/data-dashboard-pending-row/g)||[]).length,1);
 const css=postcss.parse(fs.readFileSync('src/app/design-system-v2.css','utf8'));let layoutMin=false,attentionSurface=false;css.walkRules(r=>{r.walkDecls(d=>{if(r.selector.endsWith(' [data-dashboard-layout]')&&d.prop==='min-width'&&d.value==='0')layoutMin=true;if(r.selector.endsWith(' [data-dashboard-attention-summary]')&&d.prop==='background')attentionSurface=true;if(r.selector.endsWith(' [data-dashboard-layout]')&&d.prop==='background')assert.fail('outer dashboard must not introduce a nested coloured canvas');});});assert.ok(layoutMin);assert.ok(attentionSurface);
 const outlet=renderDashboard('outlet_staff');assert.match(outlet,/Today&#x27;s completion/);
};
exports.compactAttention=()=>{
 for(const role of roles){const html=renderDashboard(role);if(role==='kitchen')assert.match(html,/Kitchen staff workspace/);else if(role.startsWith('outlet_'))assert.match(html,/Today&#x27;s completion/);else assert.match(html,/data-dashboard-attention-summary/);assert.doesNotMatch(html,/DashboardRoleMicroChart|roleChartItems/);if(!['kitchen','outlet_supervisor','outlet_staff'].includes(role))assert.match(html,/focus-visible:ring-inset/);const hrefs=[...html.matchAll(/href="([^"]+)"/g)].map(x=>x[1]);assert.ok(hrefs.length);assert.equal(html.includes('data-dashboard-payables'),role==='super_admin'||role==='finance');}
};
exports.tabletOwner=()=>{
 for(const role of roles){const captured=[];const component=compile('src/components/dashboard-workspace.tsx',{'@/components/layout/workspace-layout':{WorkspaceGrid:p=>{captured.push(p);return React.createElement('main',null,p.children,p.rightRail);}}}).DashboardWorkspace;
 const html=renderToStaticMarkup(React.createElement(component,{summary:summary(role)}));assert.equal(captured.length,1);assert.equal(captured[0].tabletRailMode,'split');assert.equal(captured[0].tabletRailBreakpoint,'md');assert.equal((html.match(/<h2[^>]*>Actions<\/h2>/g)||[]).length,1);assert.doesNotMatch(html,/Workspace context|Recent Activity/);}
};
