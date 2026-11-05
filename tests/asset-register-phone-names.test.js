import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import createLoader from './helpers/load-source.cjs';
const load=createLoader();const {AssetRegisterRows}=load('src/components/asset-workspace-lists.tsx');
const asset={id:'fixture',asset_code:'SB-0001',item_name:'Clock In Punch Card Machine',current_details:{}};const longLocation='Kwan Kee Store @ Sunway Pyramid';
function render(holdings){return renderToStaticMarkup(React.createElement(AssetRegisterRows,{assets:[asset],holdings,locations:new Map([['location',longLocation]])}));}
test('actual phone register keeps full names and locations visible without changing registered quantities or link',()=>{const html=render([{asset_id:'fixture',location_id:'location',quantity:3}]);assert.match(html,/<strong class="block whitespace-normal break-words text-sm font-medium"[^>]*>Clock In Punch Card Machine/);assert.match(html,/<small class="block whitespace-normal break-words text-xs text-muted-foreground"[^>]*>Kwan Kee Store @ Sunway Pyramid/);assert.match(html,/Registered quantity: 3/);assert.match(html,/href="\/asset-management\/assets\/fixture"/);});
test('no accessible holding stays unknown rather than becoming a zero quantity',()=>{const html=render([]);assert.match(html,/No accessible holding/);assert.doesNotMatch(html,/Registered quantity: 0/);});
export {render};
