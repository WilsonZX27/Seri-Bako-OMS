const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const {compile,React,renderToStaticMarkup}=require('./helpers/render-workspaces.cjs');
test('actual open account menu uses shared radius without losing personal links or logout owner',()=>{
 let logout=0;const {AccountMenu}=compile('src/components/layout/account-menu.tsx',{'react':{...React,useState:()=>[true,()=>{}],useRef:()=>({current:null}),useEffect:()=>{}},'@/server/actions/auth':{signOut:()=>{logout++;}},'@/components/ui/submit-button':{SubmitButton:({children,...p})=>React.createElement('button',p,children)}});
 const html=renderToStaticMarkup(React.createElement(AccountMenu,{displayName:'Fixture user',roleLabel:'Fixture role',initials:'FU'}));
 assert.match(html,/role="menu" class="[^"]*rounded-\[var\(--sb-panel-radius\)\]/);for(const href of ['/account','/attendance/confirmations','/attendance/payslips'])assert.ok(html.includes(`href="${href}"`));assert.equal((html.match(/role="menuitem"/g)||[]).length,4);assert.equal(logout,0);assert.match(html,/aria-haspopup="menu"/);
});
test('actual profile tabs use shared component and preserve every section and security permission gate',()=>{
 const RealWorkspaceTabs=compile('src/components/ui/workspace-tabs.tsx',{'@/components/ui/workspace-tabs-scroll':{WorkspaceTabsScroll:()=>null},'@/components/ui/intent-prefetch-link':{IntentPrefetchLink:()=>null}}).WorkspaceTabs;
 const text=fs.readFileSync('src/app/(app)/people/[id]/page.tsx','utf8');const ast=ts.createSourceFile('profile.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let node;function visit(n){if(ts.isJsxSelfClosingElement(n)&&n.tagName.getText(ast)==='WorkspaceTabs')node=n;ts.forEachChild(n,visit);}visit(ast);assert.ok(node);
 for(const canEdit of [false,true]){const result={},captured=[];const WorkspaceTabs=p=>{captured.push(p);return React.createElement(RealWorkspaceTabs,p);};const icon=()=>null;
 vm.runInNewContext(ts.transpileModule('export const view=('+node.getText(ast)+');',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:result,require,WorkspaceTabs,UserRound:icon,BriefcaseBusiness:icon,Files:icon,ShieldCheck:icon,id:'fixture-id',activeSection:'employment',permissions:{'staffs.update':canEdit}});
 const html=renderToStaticMarkup(result.view);assert.equal(captured[0].items.length,canEdit?4:3);for(const section of ['overview','employment','compliance'])assert.ok(html.includes(`/people/fixture-id?section=${section}`));assert.equal(html.includes('?section=security'),canEdit);assert.equal((html.match(/aria-current="page"/g)||[]).length,1);assert.match(html,/Employee profile sections/);}
 const shared=fs.readFileSync('src/components/ui/workspace-tabs.tsx','utf8');assert.match(shared,/sb-workspace-tabs sb-work-surface/);assert.match(shared,/h-11 min-h-11/);assert.match(shared,/aria-current/);
});
