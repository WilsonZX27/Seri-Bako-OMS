import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const output = {exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/ui/table.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText, {
  exports:output.exports,
  require:name => name === '@/lib/utils' ? {cn:(...parts)=>parts.filter(Boolean).join(' ')} : name === 'next/link' ? {default:'a'} : require(name),
});
const {OperationalList} = output.exports;
for (const breakpoint of ['md','xl','2xl']) test(`hint follows ${breakpoint} list visibility and accessible description`,()=>{
  const html=renderToStaticMarkup(React.createElement(OperationalList,{ariaLabel:'Products',showOpenHint:true,showUntil:breakpoint},'row'));
  assert.match(html,/Double-tap or double-click/);
  assert.match(html,/press Enter/);
  const id=html.match(/<p id="([^"]+)"/)[1];
  assert.ok(html.includes(`aria-describedby="${id}"`));
  assert.equal(html.split(`${breakpoint}:hidden`).length-1,2);
});
test('existing callers retain no hint by default',()=>{
 const html=renderToStaticMarkup(React.createElement(OperationalList,{ariaLabel:'Existing'},'row'));
 assert.doesNotMatch(html,/Double-tap|aria-describedby|<p/);
});
test('actual callers scope hints to nonempty editable lists',()=>{
 const products=fs.readFileSync('src/app/(app)/products/page.tsx','utf8');
 const uom=fs.readFileSync('src/app/(app)/uom-conversions/page.tsx','utf8');
 assert.match(products,/showOpenHint=\{canCreate && productsPage.rows.length > 0\}/);
 assert.match(uom,/showOpenHint=\{Boolean\(permissions\["uom_conversions.update"\]\) && page.rows.length > 0\}/);
});
