const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./helpers/load-source.cjs')();
const {workspaceNotificationDetail:detail}=load('src/lib/workspace-notification-copy.ts');
test('generic repair navigation prompts and exact repeated titles add no second explanation',()=>{
 assert.equal(detail('Repair needs attention','A repair request needs your attention. Open the request for details.'),null);
 assert.equal(detail('Repair needs attention','Review the maintenance queue.'),null);
 assert.equal(detail('Pending approval',' Pending approval. '),null);
 assert.equal(detail('Repair',null),null);
});
test('specific facts, deadlines and workflow states are preserved verbatim',()=>{
 for(const text of ['High priority · compressor stopped','PR/OCT26/030 is waiting for Purchasing Review.','Expired or due within 30 days.','A repair request failed validation. Open the request for details.'])assert.equal(detail('Update',text),text);
});
const {compile,React,renderToStaticMarkup}=require('./helpers/render-workspaces.cjs');
function tray(){let state=0;const {TopBarActivityMenu}=compile('src/components/layout/top-bar-activity-menu.tsx',{
 'react':{...React,useState:()=>[state++===0?true:[],()=>{}],useRef:()=>({current:null}),useEffect:()=>{}},
 'next/navigation':{usePathname:()=>'/purchase-requests'},
 '@/lib/workspace-notification-copy':{workspaceNotificationDetail:detail},
 '@/components/ui/button':{Button:({children,...props})=>React.createElement('button',props,children)}
 });return renderToStaticMarkup(React.createElement(TopBarActivityMenu,{data:{availability:{pendingActions:true,notifications:true},pendingApprovals:['a','b'].map(id=>({id:'maintenance-'+id,title:'Maintenance follow-up',document_no:'Repair request',href:'/asset-management?ticket='+id,maintenance_asset_name:'Same asset',branch_name:'Fixture location',maintenance_priority:'High',maintenance_description:'COMMENT DISTRACTOR',maintenance_author_name:'PERSON DISTRACTOR'})),notifications:[{id:'n1',title:'Repair needs attention',message:'A repair request needs your attention. Open the request for details.',action_url:'/asset-management?ticket=c'},{id:'n2',title:'Purchasing review',message:'PR/001 is waiting for Purchasing Review.',action_url:'/purchase-requests/pr'}],announcements:[],assignedActivities:[]}}));}
test('actual tray preserves distinct requests, priority, location and destinations with concise copy',()=>{
 const html=tray();for(const id of ['a','b','c'])assert.ok(html.includes('ticket='+id));
 assert.equal((html.match(/Same asset/g)||[]).length,4); // text and full title for two distinct requests
 assert.match(html,/High priority/);assert.match(html,/Fixture location/);
 assert.doesNotMatch(html,/COMMENT DISTRACTOR|PERSON DISTRACTOR|Open the request for details/);
 assert.match(html,/PR\/001 is waiting for Purchasing Review/);assert.match(html,/href="\/purchase-requests\/pr"/);
 assert.match(html,/role="dialog"/);assert.match(html,/Open workspace updates, 4 unread or pending/);assert.match(html,/Mark as read/);
});
