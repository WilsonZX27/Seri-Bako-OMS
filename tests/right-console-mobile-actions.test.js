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
