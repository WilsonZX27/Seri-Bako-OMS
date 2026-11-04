const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const load=require('./helpers/load-source.cjs')();
const settings=load('src/lib/outlet-sales-channel-settings.ts');
async function render(config){const exports={},log=[];vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/(app)/outlet-daily-records/settings/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){
 if(name==='react/jsx-runtime')return require(name);
 if(name==='next/link')return {default:({children,href})=>React.createElement('a',{href},children)};
 if(name==='@/server/auth/permissions')return {requirePermission:async permission=>assert.equal(permission,'outlet_daily_record.view'),getPermissionMap:async()=>({})};
 if(name==='@/server/queries/outlet-sales-channel-settings')return {getOutletSalesChannelSettings:async()=>{if(config instanceof Error)throw config;return config;}};
 if(name==='@/server/observability/logger')return {logServerError:error=>log.push(error)};
 if(name==='@/lib/outlet-sales-channels')return load('src/lib/outlet-sales-channels.ts');
 if(name==='@/lib/outlet-sales-channel-settings')return settings;
 return new Proxy({}, {get:()=>({children})=>React.createElement('div',null,children)});
 }});return {html:renderToStaticMarkup(await exports.default()),log};}
test('Settings summary uses saved active names/order without changing monetary keys',async()=>{const config=settings.defaultSalesChannelSettings();config.channels.reverse();config.channels.find(c=>c.key==='visa').label='Renamed card';config.channels.find(c=>c.key==='master').active=false;config.channels.find(c=>c.key==='credit_card').active=true;const before=JSON.stringify(config);const {html}=await render(config);assert.match(html,/Renamed card/);assert.doesNotMatch(html,/>Cards: Visa|Master/);assert.ok(html.indexOf('FEEDME_CARD')<html.indexOf('Renamed card'));assert.match(html,/Credit Card \(legacy\)/);assert.equal(JSON.stringify(config),before);});
test('Settings empty active groups and read failure do not show stale defaults',async()=>{const config=settings.defaultSalesChannelSettings();config.channels.forEach(c=>c.active=false);assert.match((await render(config)).html,/None enabled/);const {html,log}=await render(new Error('fixture read failure'));assert.match(html,/Sales channel settings unavailable/);assert.match(html,/Manage sales channels/);assert.doesNotMatch(html,/Cards:|Visa|Master/);assert.equal(log.length,1);});
