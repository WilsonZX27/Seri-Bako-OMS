const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const file='src/components/production-planning-workspace.tsx',src=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true,4);let section;
function visit(node){if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(src)==='section'&&node.getText(src).includes('No approved plan available'))section=node;ts.forEachChild(node,visit);}visit(src);
assert.ok(section,'actual empty-state JSX must exist');
const out={};vm.runInNewContext(ts.transpileModule(`export function empty(canManage,date){return (${section.getText(src)})}`,{compilerOptions:{jsx:4,module:1}}).outputText,{exports:out,require,formatDateOnly:()=> '03/11/2026'});
for(const role of ['chef','purchasing','finance'])test(`${role} empty state does not direct unauthorised generation`,()=>{const html=renderToStaticMarkup(out.empty(false,'2026-11-03'));assert.match(html,/No approved plan available/);assert.match(html,/Contact your Manager/);assert.doesNotMatch(html,/Generate a draft|<button|<a /);});
for(const role of ['manager','super_admin'])test(`${role} retains generation guidance`,()=>{const html=renderToStaticMarkup(out.empty(true,'2026-11-03'));assert.match(html,/Generate a draft/);assert.doesNotMatch(html,/No approved plan available/);});
module.exports=out.empty;
