const test=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/asset-master.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const changes=context.exports.assetMasterHistoryChanges;

test('the first imported master edit compares effective source values, not empty overrides',()=>{
  const source={Brand:'Original brand','Purchase Date':'2026-10-01T00:00:00','Purchase Price':0};
  const history={Operation:'update','Name Before':'Tray','Name After':'Renamed tray','Details Before':{},'Details After':{Brand:'Original brand','Purchase Date':'2026-10-01','Purchase Price':'0'}};
  assert.deepEqual(JSON.parse(JSON.stringify(changes(source,history))),[{label:'Item name',before:'Tray',after:'Renamed tray'}]);
  history['Details After'].Brand='';
  assert.deepEqual(JSON.parse(JSON.stringify(changes(source,history))).at(-1),{label:'Brand',before:'Original brand',after:''});
});
test('registration distinguishes unknown quantities, zero and no prior record',()=>{
  const history={Operation:'create',Code:'SB-SYNTHETIC',Name:'Tray',Quantity:null,Details:{Brand:'Synthetic brand'}};
  assert.equal(changes({},history).find(row=>row.label==='Initial physical quantity').after,'Unknown');
  history.Quantity=0;
  const row=changes({},history).find(row=>row.label==='Initial physical quantity');
  assert.equal(row.after,'0');assert.equal(row.before,null);
});
