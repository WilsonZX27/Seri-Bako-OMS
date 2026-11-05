import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import postcss from 'postcss';
const css=postcss.parse(fs.readFileSync('src/components/common/UnifiedListHeader.module.css','utf8'));
test('sub390 search owns a full row while controls and result stay on row two',()=>{
 const media=css.nodes.find(n=>n.type==='atrule'&&n.params==='(max-width: 389px)');
 assert.ok(media);
 const rules=Object.fromEntries(media.nodes.map(rule=>[rule.selector,Object.fromEntries(rule.nodes.map(d=>[d.prop,d.value]))]));
 assert.deepEqual(rules['.row .primary'],{'grid-column':'1 / -1','grid-row':'1'});
 assert.equal(rules['.row:has(.searchSubmit) .filterTrigger']['grid-row'],'2');
 assert.equal(rules['.row:has(.filterTrigger) .searchSubmit']['grid-row'],'2');
 assert.equal(rules['.row .result']['grid-row'],'2');
});
test('ordinary widths retain the original single-row geometry',()=>{
 const row=css.nodes.find(n=>n.type==='rule'&&n.selector==='.row');
 assert.ok(row.nodes.some(n=>n.prop==='grid-template-columns'&&n.value==='minmax(0, 1fr) var(--query-control-size) var(--query-control-size) max-content'));
});
