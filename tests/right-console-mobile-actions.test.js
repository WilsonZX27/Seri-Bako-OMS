const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const {Slot}=require('@radix-ui/react-slot');
const source=fs.readFileSync('src/components/layout/right-console.tsx','utf8');
const ast=ts.createSourceFile('right-console.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const selected=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&['isMobilePrimaryAction','withoutMobilePrimaryAction'].includes(node.name?.text)).map(node=>node.getText(ast)).join('\n');
const context={Children:React.Children,cloneElement:React.cloneElement,isValidElement:React.isValidElement};
vm.runInNewContext(ts.transpileModule(selected,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context);
const strip=context.withoutMobilePrimaryAction;
function Action(props){return React.createElement(Slot,null,props.children);}
test('mobile action extraction preserves a single Slot child and renders a secondary link',()=>{
 const original=React.createElement(Action,null,React.createElement('a',{href:'/outlet-daily-records/delivery-orders'},'Delivery orders'));
 const result=strip(original);assert.ok(React.isValidElement(result.props.children));
 assert.match(renderToStaticMarkup(result),/href="\/outlet-daily-records\/delivery-orders"/);
 assert.ok(React.isValidElement(original.props.children));
});
test('nested secondary Slot actions survive removal of a sibling primary action',()=>{
 const tree=React.createElement('section',null,React.createElement('a',{'data-mobile-primary-action':true,href:'/new'},'New'),React.createElement('div',null,React.createElement(Action,null,React.createElement('a',{href:'/existing'},'Existing'))));
 const html=renderToStaticMarkup(strip(tree));assert.ok(!html.includes('/new'));assert.ok(html.includes('/existing'));
});
test('multiple secondary actions remain separate rather than collapsing to the first child',()=>{
 const tree=[React.createElement('button',{key:'one'},'One'),React.createElement('button',{key:'two'},'Two')];
 const result=strip(tree);assert.equal(result.length,2);assert.match(renderToStaticMarkup(React.createElement('div',null,result)),/One.*Two/);
});

test('FAB-page secondary actions retain exports without duplicating the create action',()=>{
 const tree=React.createElement('section',null,React.createElement('a',{'data-mobile-primary-action':true,href:'/purchase-requests/new'},'New PR'),React.createElement('button',null,'Export CSV'));
 const html=renderToStaticMarkup(strip(tree));assert.ok(html.includes('Export CSV'));assert.ok(!html.includes('New PR'));
 // The secondary trigger must survive FAB selection; the sheet must not inherit hidden.
 assert.match(source,/hasCreateFab \? <Button[^>]*data-mobile-secondary-actions/);
 assert.doesNotMatch(source,/hasCreateFab && "hidden"/);
});
test('a nested dialog owns Escape before the action sheet can dismiss itself',()=>{
 let handler;function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='onKeyDown')handler=node.getText(ast);ts.forEachChild(node,visit);}visit(ast);assert.ok(handler);
 class Element {constructor(dialog){this.dialog=dialog;}closest(){return this.dialog;}}
 const parent={},child={},calls=[];const ctx={Element,dialog:parent,document:{querySelector:()=>null},setOpen:v=>calls.push(v),requestAnimationFrame:f=>f(),triggerRef:{current:{focus:()=>calls.push('focus')}}};
 vm.runInNewContext(ts.transpileModule(handler,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
 ctx.onKeyDown({key:'Escape',target:new Element(child),preventDefault:()=>calls.push('prevent')});assert.deepEqual(calls,[]);
 ctx.onKeyDown({key:'Escape',target:new Element(parent),preventDefault:()=>calls.push('prevent')});assert.deepEqual(calls,['prevent',false,'focus']);calls.length=0;ctx.document.querySelector=()=>({});ctx.onKeyDown({key:'Escape',target:new Element(null),preventDefault:()=>calls.push('prevent')});assert.deepEqual(calls,[]);
});
test('secondary floating actions obey the same real-keyboard and loading visibility rules',()=>{
 const css=fs.readFileSync('src/app/design-system-v2.css','utf8');
 assert.match(css,/html\[data-mobile-keyboard-open="true"\][^{]*\[data-mobile-secondary-actions\][^{]*\{\s*visibility: hidden/);
 assert.match(css,/:has\(\[data-page-loading-state\]\)[^{]*\[data-mobile-secondary-actions\][^{]*\{\s*display: none/);
});
test('a page-header create FAB does not suppress secondary actions when the full mobile rail is hidden',()=>{
 assert.match(source,/content && hasCreateFab \? <Button[^>]*data-mobile-secondary-actions/);
 assert.match(source,/open && content && \(!mobileBarHidden \|\| hasCreateFab\)/);
 assert.match(source,/content && !mobileBarHidden && hasCreateFab && primaryHref/);
});
test('extracted primary actions do not leave an empty rendered console section',()=>{
 const section=React.createElement('section',{'data-console-section':true},React.createElement('div',null,React.createElement('h2',null,'Actions')),React.createElement('div',null,React.createElement('button',{'data-mobile-primary-action':true},'New branch')));
 assert.equal(strip(section),null);
 const summary=React.createElement('section',{'data-console-section':true},React.createElement('div',null,'Branch Summary'),React.createElement('div',null,React.createElement('p',null,'Total: 0')));
 assert.match(renderToStaticMarkup(strip(summary)),/Total: 0/);
});
