const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
const forms=[];
const styles=new Proxy({}, {get:(_target,key)=>typeof key==='string'?key:undefined});
const context={exports:{},require:n=>{if(n.endsWith('.module.css'))return {__esModule:true,default:styles};if(n==='@/components/ui/select-control')return {SelectControl:({options=[],ariaLabel,value,onValueChange})=>React.createElement('select',{'aria-label':ariaLabel,value,onChange:e=>onValueChange?.(e.target.value)},options.map(o=>React.createElement('option',{key:o.value,value:o.value},o.label)))};if(n==='react/jsx-runtime'){const runtime=require(n);return {...runtime,jsx:(type,props,...args)=>{if(type==='form')forms.push(props);return runtime.jsx(type,props,...args);},jsxs:(type,props,...args)=>{if(type==='form')forms.push(props);return runtime.jsxs(type,props,...args);}};}if(n==='@/lib/dialog-focus')return require('./helpers/load-source.cjs')()('src/lib/dialog-focus.ts');if(['react','react/jsx-runtime','react-dom','lucide-react'].includes(n))return require(n);if(n==='next/link')return {default:p=>React.createElement('a',p)};if(n.endsWith('/input'))return {Input:p=>React.createElement('input',p)};if(n.endsWith('/button'))return {Button:p=>React.createElement('button',p)};if(n.endsWith('/utils'))return {cn:(...a)=>a.filter(Boolean).join(' ')};throw Error(n);}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/common/UnifiedListHeader.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,context);
function html(extra={}){return renderToStaticMarkup(React.createElement(context.exports.UnifiedListHeader,{phoneOnly:true,phoneMode:'inline',resetHref:'/report',...extra},[1,2,3].map(n=>React.createElement('select',{key:n,'aria-label':`Filter ${n}`,defaultValue:'a'},[React.createElement('option',{key:'a',value:'a'},'A'),React.createElement('option',{key:'b',value:'b'},'B')]))));}
test('inline multi-filter phone reports do not reserve a blank primary row',()=>{const result=html();assert.ok(!result.includes('class="unified-list-row"'));assert.equal((result.match(/<select/g)||[]).length,3);assert.match(result,/unified-list-inline-fields/);});
test('a phone result count still owns a visible primary row including a genuine zero',()=>{assert.match(html({resultCount:0}),/unified-list-row/);assert.match(html({resultCount:0}),/<strong>0<\/strong>/);});

for(const phoneOnly of [true,false])test(`query header forwards local submit ownership on ${phoneOnly?'phone':'desktop'}`,()=>{
 let calls=0;forms.length=0;html({phoneOnly,onSubmit:event=>{calls++;event.preventDefault();}});
 let disabled=false;const event={defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},currentTarget:{querySelectorAll(){disabled=true;return [];}}};
 forms.at(-1).onSubmit(event);assert.equal(calls,1);assert.equal(event.defaultPrevented,true);assert.equal(disabled,false);
});

test('daily compact header retains date and branch controls without duplicate branch fields',()=>{
 const Input=p=>React.createElement('input',p);
 const Select=p=>React.createElement('select',{name:p.name,'aria-label':p.ariaLabel,defaultValue:p.value??p.defaultValue},p.options.map(o=>React.createElement('option',{key:o.value,value:o.value},o.label)));
 const result=renderToStaticMarkup(React.createElement(context.exports.UnifiedListHeader,{phoneOnly:true,compactPinnedFields:['branch'],resetHref:'/outlet-daily-records',resultCount:687},[
  React.createElement(Input,{key:'date',name:'date',type:'date',defaultValue:'2026-10-20'}),
  React.createElement(Select,{key:'branch',name:'branch',value:'all',ariaLabel:'Branch',options:[{value:'all',label:'All branches'}]}),
  React.createElement(Select,{key:'status',name:'status',value:'all',ariaLabel:'Status',options:[{value:'all',label:'All statuses'}]})
 ]));
 assert.match(result,/type="date"/);assert.match(result,/unified-list-pinned-control/);
 assert.equal((result.match(/name="branch"/g)||[]).length,1);
 assert.match(result,/type="hidden" name="status" value="all"/);
 assert.match(result,/unified-list-filter-label/);assert.match(result,/<strong>687<\/strong>/);
});

test('daily GET form preserves populated date, pinned branch and hidden secondary filters exactly once',()=>{
 const Select=p=>React.createElement('select',{name:p.name,value:p.value,defaultValue:p.defaultValue,onChange:()=>{},'aria-label':p.ariaLabel},p.options.map(o=>React.createElement('option',{key:o.value,value:o.value},o.label)));
 forms.length=0;
 const result=renderToStaticMarkup(React.createElement(context.exports.UnifiedListHeader,{phoneOnly:true,compactPinnedFields:['branch'],resetHref:'/outlet-daily-records',resultCount:0},[
  React.createElement('input',{key:'date',name:'date',type:'date',defaultValue:'2026-10-23'}),
  React.createElement(Select,{key:'branch',name:'branch',value:'branch-a',ariaLabel:'Branch',options:[{value:'all',label:'All branches'},{value:'branch-a',label:'Fixture A'}]}),
  React.createElement(Select,{key:'status',name:'status',value:'morning_recorded',ariaLabel:'Status',options:[{value:'all',label:'All statuses'},{value:'morning_recorded',label:'In Progress'}]}),
  React.createElement('input',{key:'qty',type:'hidden',name:'qty_sent',value:'missing'})
 ]));
 assert.equal((result.match(/<form\b/g)||[]).length,1);
 assert.ok(!forms[0].method || forms[0].method.toLowerCase()==='get');
 assert.match(result,/aria-haspopup="dialog"/);assert.match(result,/aria-expanded="false"/);
 const values=new URLSearchParams();
 for(const input of result.matchAll(/<input\b[^>]*>/g)){const name=input[0].match(/name="([^"]+)"/)?.[1];if(name)values.append(name,input[0].match(/value="([^"]*)"/)?.[1]??'');}
 for(const select of result.matchAll(/<select\b[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){const selected=select[2].match(/<option[^>]*value="([^"]*)"[^>]*selected=""/);assert.ok(selected);values.append(select[1],selected[1]);}
 assert.deepEqual(Object.fromEntries(values),{date:'2026-10-23',status:'morning_recorded',qty_sent:'missing',branch:'branch-a'});
 for(const key of ['date','branch','status','qty_sent'])assert.equal(values.getAll(key).length,1,`${key} submitted once`);
 assert.match(result,/<strong>0<\/strong>/);
});
