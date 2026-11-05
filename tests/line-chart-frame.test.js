import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
const loadDependency=createRequire(import.meta.url);
function renderChart(observed,compact=false,requestedHeight=260){let state=0;const exp={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/ui/interactive-line-chart.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exp,require:name=>name==='react'?{...React,useId:()=> 'chart-preview',useRef:()=>({current:null}),useEffect:()=>{},useState:initial=>[state++===0?observed:initial,()=>{}]}:loadDependency(name)});return exp.InteractiveLineChart({points:[{id:'a',label:'Day1',value:2,previewValue:'2',previewDetails:[]},{id:'b',label:'Day2',value:4,previewValue:'4',previewDetails:[]}],compact,width:760,height:requestedHeight,inset:{top:18,right:18,bottom:28,left:58},maximum:4,ariaLabel:'Trend'});}
test('actual chart frame cannot grow from observed SVG height, including the Production runaway sample',()=>{for(const h of [260,288,67140]){const tree=renderChart({width:348,height:h});assert.equal(tree.props.style.height,288);assert.ok(!tree.props.className.includes('h-full'));const svg=React.Children.toArray(tree.props.children)[0];assert.equal(svg.props.viewBox,`0 0 348 ${h}`);assert.match(svg.props['aria-label'],/Trend/);}});
test('compact and caller-requested heights keep their independent frame contracts',()=>{assert.equal(renderChart({width:348,height:999},true,120).props.style.height,160);assert.equal(renderChart({width:810,height:999},false,420).props.style.height,420);});
export {renderChart};
