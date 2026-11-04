const test=require('node:test'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const load=require('./helpers/load-source.cjs')();const {OutletDailyRecordForm}=load('src/components/outlet-daily-record-form.tsx');
const product={id:'test',product_code:'TEST',product_name:'Synthetic carryover',category:'food',daily_tracking:'food_carryover',selling_unit:'PCS',status:'active'};
for(const ready of [false,true])test('carryover dependency banner and input lock: '+ready,()=>{
const html=renderToStaticMarkup(React.createElement(OutletDailyRecordForm,{formId:'synthetic',action:async()=>{},branches:[],products:[product],recordDate:'2026-11-04',carryoverWastageReady:ready}));
assert.equal(html.includes('Read-only preview: next-day Wastage saving is not enabled yet.'),!ready);
const input=html.match(/<input[^>]*name="wastage_qty"[^>]*>/)[0];assert.equal(input.includes('disabled=""'),!ready);
});
test('unaffected daily-only record is not disabled by missing carryover schema',()=>{
const html=renderToStaticMarkup(React.createElement(OutletDailyRecordForm,{formId:'synthetic',action:async()=>{},branches:[],products:[{...product,daily_tracking:'food_daily'}],recordDate:'2026-11-04',carryoverWastageReady:false}));assert.equal(html.includes('Read-only preview:'),false);
});
