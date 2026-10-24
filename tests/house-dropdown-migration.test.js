const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(p,'utf8');
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):entry.name.endsWith('.tsx')?[path.join(dir,entry.name)]:[]);
test('all business dropdown callers use the house component and leave native date/file controls intact',()=>{
 for(const file of files('src'))if(file!=='src/components/ui/select-native.tsx')assert.doesNotMatch(read(file),/SelectNative|<select\b/,file);
 const input=read('src/components/ui/input.tsx');assert.match(input,/type="date"/);
 assert.match(read('src/components/attendance/schedule-workbook-import.tsx'),/type="file"/);
});
test('house dropdown preserves empty option mapping, accessibility, reset and native dialog containment',()=>{
 const source=read('src/components/ui/select-control.tsx');
 assert.match(source,/optionValue === emptyOptionValue \? "" : optionValue/);
 assert.match(source,/value=\{option.value \|\| emptyOptionValue\}/);
 assert.match(source,/aria-invalid=\{ariaInvalid\}/);assert.match(source,/aria-describedby=\{ariaDescribedBy\}/);assert.match(source,/data-pr-field=\{prField\}/);
 assert.match(source,/setResetRevision\(current => current \+ 1\)/);assert.match(source,/if \(!isControlled\) setInternalValue\(fallbackValue\)/);
 assert.match(source,/typeof optionValue !== "string"/);
 assert.match(source,/closest<HTMLElement>\("dialog"\)/);assert.match(source,/container=\{portalContainer \?\? nativeDialogContainer\}/);
});
test('repeated native proxy names resolve to their own visible row control',()=>{
 class Element { constructor(attrs={},previous=null){this.attrs=attrs;this.previousElementSibling=previous;}getAttribute(name){return this.attrs[name]??null;}matches(selector){return selector==='[data-select-control]'&&this.attrs.house===true;} }
 const load=require('./helpers/load-source.cjs')({HTMLElement:Element});
 const {visibleFieldControl}=load('src/lib/field-recovery.ts');
 const first=new Element({house:true}),second=new Element({house:true});
 const proxy=new Element({'aria-hidden':'true'},second);
 assert.equal(visibleFieldControl(proxy),second);assert.notEqual(visibleFieldControl(proxy),first);
 const native=new Element({},second);assert.equal(visibleFieldControl(native),native);
});
