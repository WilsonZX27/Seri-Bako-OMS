const test = require('node:test');
const assert = require('node:assert/strict');
const { compile, React } = require('./helpers/render-workspaces.cjs');
function fixture(query='search=kit&page=3', defaultStatus='all') {
  const navigations=[];
  const {StatusTabs}=compile('src/components/status-tabs.tsx',{
    react:{...React,useLayoutEffect:()=>{},useRef:()=>({current:null})},
    'next/navigation':{usePathname:()=>'/branches',useSearchParams:()=>new URLSearchParams(query),useRouter:()=>({push:url=>navigations.push(url)})},
    '@/components/ui/select-control':{SelectControl:()=>null},
  });
  return {node:StatusTabs({statuses:['active','archived'],defaultStatus}),navigations};
}
test('status navigation owns its change event, preventing a second GET without status',()=>{
 const {node,navigations}=fixture();let stopped=0;
 node.props.onChange({stopPropagation:()=>stopped++});
 node.props.children.props.onValueChange('archived');
 assert.equal(stopped,1);assert.deepEqual(navigations,['/branches?search=kit&status=archived']);
 assert.equal(node.props.children.props.name,'status');
});
test('all status preserves search and resets pagination; non-all defaults remain explicit',()=>{
 const a=fixture('search=kit&status=active&page=3');a.node.props.children.props.onValueChange('all');assert.deepEqual(a.navigations,['/branches?search=kit']);
 const b=fixture('search=kit&page=3','active');b.node.props.children.props.onValueChange('all');assert.deepEqual(b.navigations,['/branches?search=kit&status=all']);
});
