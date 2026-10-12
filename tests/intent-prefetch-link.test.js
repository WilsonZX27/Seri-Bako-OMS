const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
function load(){const calls=[];const context={exports:{},require:n=>{
 if(n==='react')return {useRef:value=>({current:value})};
 if(n==='react/jsx-runtime')return {jsx:(type,props)=>({type,props})};
 if(n==='next/link')return {default:()=>null};
 if(n==='next/navigation')return {useRouter:()=>({prefetch:href=>calls.push(href)})};throw Error(n);
}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/ui/intent-prefetch-link.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return {render:context.exports.IntentPrefetchLink,calls};}
test('route warming waits for intent and deduplicates pointer/focus for the same destination',()=>{const {render,calls}=load();let forwarded=0;const link=render({href:'/outlet-daily-records/insights',onMouseEnter:()=>forwarded++});assert.equal(link.props.prefetch,false);assert.equal(calls.length,0);link.props.onMouseEnter({});link.props.onFocus({});link.props.onMouseEnter({});assert.deepEqual(calls,['/outlet-daily-records/insights']);assert.equal(forwarded,2);});
test('current and external destinations are never eagerly warmed',()=>{const {render,calls}=load();for(const props of [{href:'/production/planning','aria-current':'page'},{href:'https://outside.example'}]){const link=render(props);link.props.onFocus({});link.props.onMouseEnter({});}assert.equal(calls.length,0);});
