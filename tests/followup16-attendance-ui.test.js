const test=require('node:test'),assert=require('node:assert/strict');
const {compile,React,renderToStaticMarkup}=require('./helpers/render-workspaces.cjs');
const wrap=tag=>({children,...props})=>React.createElement(tag,props,children);
const Panel=compile('src/components/attendance/actual-attendance-panel.tsx',{
 '@/components/ui/native-dialog':{NativeDialog:()=>null},
 '@/components/ui/button':{Button:wrap('button')},
 '@/components/ui/input':{Input:wrap('input')},
 '@/components/ui/status-badge':{StatusBadge:({status})=>React.createElement('span',null,status)},
 '@/components/ui/select-control':{SelectControl:()=>null},
 '@/lib/http/read-json-response':{},
 '@/lib/attendance/time':{formatAttendanceTime:()=>''},
}).ActualAttendancePanel;
const props={assignments:[],reports:[],ledger:[{id:'synthetic',staff_id:'s',staffs:{full_name:'Example employee'},transaction_kind:'correction',minutes:120,reason:'Verified balance',status:'pending'}],balances:{s:90},compPeople:[{id:'s',full_name:'Example employee'}],canSubmit:false,canApprove:false,canSubmitComp:false,canApproveComp:true};
test('attendance report view does not render RO balances or correction decision controls',()=>{
 const html=renderToStaticMarkup(React.createElement(Panel,{...props,sections:'reports'}));
 assert.match(html,/Daily attendance reports/);assert.doesNotMatch(html,/Time-off balance|Verified balance|>Approve<|>Reject</);
});
test('RO review reuses pending correction decisions without duplicating the balance directory',()=>{
 const html=renderToStaticMarkup(React.createElement(Panel,{...props,sections:'comp',hideBalances:true}));
 assert.match(html,/RO corrections/);assert.match(html,/Verified balance/);assert.match(html,/>Approve</);assert.match(html,/>Reject</);assert.doesNotMatch(html,/Daily attendance reports|90 min/);
 const denied=renderToStaticMarkup(React.createElement(Panel,{...props,sections:'comp',hideBalances:true,canApproveComp:false}));
 assert.doesNotMatch(denied,/>Approve<|>Reject</);
});
test('shared icon Button exposes native hover help from its existing accessible name; explicit descriptions win',()=>{
 const {Button}=require('./helpers/load-source.cjs')()('src/components/ui/button.tsx');
 const base=renderToStaticMarkup(React.createElement(Button,{'aria-label':'Adjust attendance'},React.createElement('svg',{'aria-hidden':true})));
 assert.match(base,/title="Adjust attendance"/);assert.match(base,/aria-label="Adjust attendance"/);
 const described=renderToStaticMarkup(React.createElement(Button,{'aria-label':'Adjust attendance',title:'Correct punches with an audit reason'}));
 assert.match(described,/title="Correct punches with an audit reason"/);
});
