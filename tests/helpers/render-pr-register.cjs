// Isolated SSR of the actual PR page's header/row templates. No queries or actions.
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const load=require('./load-source.cjs')({URLSearchParams});
const table=load('src/components/ui/table.tsx');
const sortable=load('src/components/sortable-table.tsx');
const utilities=load('src/lib/utils.ts');
const documentNumber=load('src/components/document-number.tsx');
const priority=load('src/components/priority-badge.tsx');
const status=load('src/components/ui/status-badge.tsx');
const operational=load('src/lib/operational-value-display.ts');
const icons=require('lucide-react');
const source=ts.createSourceFile('page.tsx',fs.readFileSync('src/app/(app)/purchase-requests/page.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function firstTag(name){let found;function visit(node){if(found)return;if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(source)===name){found=node;return;}ts.forEachChild(node,visit);}visit(source);if(!found)throw Error(`Missing actual PR template ${name}`);return found.getText(source);}
const exportsObject={};
const template=`export function header(filters){return (${firstTag('TableHeader')});}\nexport function row(request){return (${firstTag('DataGridRow')});}`;
vm.runInNewContext(ts.transpileModule(template,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:exportsObject,...table,...sortable,...documentNumber,...priority,...status,...icons,...utilities,...operational,
 BulkSelectAllCheckbox:()=>React.createElement('input',{type:'checkbox','aria-label':'Select all'}),
 BulkSelectRowCheckbox:({id})=>React.createElement('input',{type:'checkbox',value:id,'aria-label':`Select ${id}`}),
 DataGridRow:({children})=>React.createElement('tr',null,children),
 require:name=>{if(name==='react/jsx-runtime')return require(name);throw Error(`Unexpected template import ${name}`);}});
const text=html=>html.replace(/<[^>]+>/g,' ').replaceAll('&amp;','&').replaceAll('&#x27;',"'").replace(/\s+/g,' ').trim();
module.exports=function renderRegister({request,filters={}}={}){
 const headerHtml=renderToStaticMarkup(React.createElement('table',null,exportsObject.header(filters)));
 const rowHtml=request?renderToStaticMarkup(React.createElement('table',null,React.createElement('tbody',null,exportsObject.row(request)))):'';
 return {headerHtml,rowHtml,headers:Array.from(headerHtml.matchAll(/<th(?=\s|>)[^>]*>([\s\S]*?)<\/th>/g),m=>text(m[1])),cells:Array.from(rowHtml.matchAll(/<td(?=\s|>)[^>]*>([\s\S]*?)<\/td>/g),m=>text(m[1]))};
};
