const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const loader = require('./helpers/load-source.cjs');
const load = loader();
const {receivedDisplay,wastageDisplay,supplierDisplay} = load('src/lib/operational-value-display.ts');
const {OperationalValue} = load('src/components/operational-value.tsx');
const {Field} = load('src/components/ui/field.tsx');
const base = {total_received:null,received_pending_lines:3,received_zero_with_sent:false,total_wastage:0,wastage_percent:null,status:'draft'};
test('receipt display distinguishes pending, unavailable, recorded zero and suspicious zero',()=>{
  assert.equal(receivedDisplay(base).value,'Pending');
  assert.equal(receivedDisplay(base).detail,'3 lines');
  assert.equal(receivedDisplay({...base,received_pending_lines:1}).detail,'1 line');
  assert.equal(receivedDisplay({...base,received_pending_lines:0}).value,'Unavailable');
  assert.equal(receivedDisplay({...base,total_received:0}).value,'0');
  assert.equal(receivedDisplay({...base,total_received:0,received_zero_with_sent:true}).value,'0 · verify');
});
test('unfinished wastage keeps not-final meaning; final receipt/rate are explicit',()=>{
  assert.equal(wastageDisplay(base).detail,'Not final');
  assert.equal(wastageDisplay({...base,status:'reviewed'}).detail,'Pending receipt');
  assert.equal(wastageDisplay({...base,status:'reviewed',received_pending_lines:0}).detail,'—');
  assert.equal(wastageDisplay({...base,status:'evening_completed',wastage_percent:12.34}).detail,'12.3% rate');
});
test('supplier no-lines and unavailable are not falsely described as pending assignment',()=>{
  for(const [state,expected] of [['no_lines','—'],['details_unavailable','Supplier details unavailable'],['assignment_required','Supplier assignment required'],['assigned','Fixture Supplier']])assert.equal(supplierDisplay({supplier_state:state,supplier_names:['Fixture Supplier']}),expected);
});
test('same metric renderer preserves both value and qualifier in table and compact contexts',()=>{
  for(const display of [receivedDisplay(base),wastageDisplay(base)]){
    const value=React.createElement(OperationalValue,{display});
    const table=renderToStaticMarkup(React.createElement('table',null,React.createElement('tbody',null,React.createElement('tr',null,React.createElement('td',null,value)))));
    const compact=renderToStaticMarkup(React.createElement('dl',null,React.createElement('dd',null,value)));
    const text=s=>s.replace(/<[^>]*>/g,'');
    assert.equal(text(table),text(compact));assert.ok(text(compact).includes(display.detail));
  }
});
test('Field names the control and merges existing help, description and error without losing IDs',()=>{
  const render=error=>renderToStaticMarkup(React.createElement(Field,{label:'Branch',description:'Choose location',error},React.createElement('select',{id:'branch','aria-describedby':'existing-help'},React.createElement('option',null,'Fixture'))));
  const html=render('Required');
  assert.match(html,/for="branch"/);assert.match(html,/<select id="branch"/);assert.match(html,/aria-invalid="true"/);
  const ids=html.match(/aria-describedby="([^"]+)"/)[1].split(' ');
  assert.equal(ids[0],'existing-help');assert.equal(ids.length,3);
  for(const id of ids.slice(1))assert.ok(html.includes(`id="${id}"`));
  const clean=render(undefined);assert.equal(clean.match(/aria-describedby="([^"]+)"/)[1].split(' ').length,2);assert.doesNotMatch(clean,/role="alert"/);
});
function focusHarness(){
 const document={activeElement:null};
 const el=(name,{tabIndex=0,hidden=false,disabled=false,rect=true,visibility='visible'}={})=>({name,tabIndex,visibility,matches:()=>hidden||disabled,closest:()=>null,getClientRects:()=>rect?[{}]:[],focus(){document.activeElement=this;}});
 const hidden=el('hidden',{hidden:true}),disabled=el('disabled',{disabled:true}),negative=el('negative',{tabIndex:-1}),invisible=el('invisible',{rect:false}),first=el('first'),last=el('last');
 const dialog={contains:e=>[hidden,disabled,negative,invisible,first,last].includes(e),querySelectorAll:()=>[hidden,disabled,negative,invisible,first,last],focus(){document.activeElement=this;}};
 const api=loader({document,getComputedStyle:e=>({visibility:e.visibility})})('src/lib/dialog-focus.ts');
 return {document,dialog,first,last,negative,hidden,...api};
}
test('dialog skips hidden/disabled/non-tab stops and traps both directions including outside focus',()=>{
 const h=focusHarness();h.focusDialog(h.dialog);assert.equal(h.document.activeElement,h.first);
 const event=shiftKey=>({key:'Tab',shiftKey,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}});
 h.containDialogTab(event(true),h.dialog);assert.equal(h.document.activeElement,h.last);
 h.containDialogTab(event(false),h.dialog);assert.equal(h.document.activeElement,h.first);
 h.document.activeElement={};h.containDialogTab(event(false),h.dialog);assert.equal(h.document.activeElement,h.first);
 h.document.activeElement={};h.containDialogTab(event(true),h.dialog);assert.equal(h.document.activeElement,h.last);
});
test('empty dialog has a safe focus fallback and nested prevented Tab is respected',()=>{
 const h=focusHarness();h.dialog.querySelectorAll=()=>[];h.focusDialog(h.dialog);assert.equal(h.document.activeElement,h.dialog);
 h.containDialogTab({key:'Tab',defaultPrevented:false,preventDefault(){}},h.dialog);assert.equal(h.document.activeElement,h.dialog);
 h.document.activeElement=h.last;h.containDialogTab({key:'Tab',defaultPrevented:true,preventDefault(){throw Error('nested handler already owns this');}},h.dialog);assert.equal(h.document.activeElement,h.last);
});

test('dialog accepts visible programmatic title focus but rejects hidden or external targets',()=>{
 const h=focusHarness();
 h.focusDialog(h.dialog,h.negative);assert.equal(h.document.activeElement,h.negative);
 h.focusDialog(h.dialog,h.hidden);assert.equal(h.document.activeElement,h.first);
 h.focusDialog(h.dialog,{});assert.equal(h.document.activeElement,h.first);
});
