import test from 'node:test';
import assert from 'node:assert/strict';
import {basketScope} from '../lib/basket-scope.mjs';
import {collectBasket} from '../public/basket-client.mjs';
import {compareBranch} from '../lib/compare.mjs';
const items=[{id:'07290000000001',quantity:1},{id:'07290000000002',quantity:2}];
const stores=Array.from({length:73},(_,i)=>({id:'chain--'+String(i).padStart(3,'0'),object:'snapshot',chain:'chain',name:'branch'+i,chain_name:'רשת',city:'חיפה',published_at:new Date().toISOString()}));
const rows=stores.map((s,i)=>compareBranch(s,{products:items.map((p,j)=>({...p,price:i===70?(j?100:400):i===72?(j?400:100):500,weighted:false}))},items));
function page(request){const scope=basketScope(stores,request);return {stores:scope.stores.map(s=>rows.find(r=>r.id===s.id)),errors:[],as_of:'one-snapshot',total_stores:scope.total,checked_stores:scope.stores.length,offset:scope.offset,next_offset:scope.next_offset};}
test('city basket checks every branch past 60 and finds best and split across page boundaries',async()=>{
 const progress=[];const d=await collectBasket(async q=>page(q),{city:'חיפה',items,extra_stop_cost:1},p=>progress.push(p));
 assert.equal(d.checked_stores,73);assert.equal(d.stores.length,73);assert.equal(d.best,stores[70].id);assert.equal(d.split.subtotal,300);assert.equal(d.split.extra_stop_cost,100);assert.equal(d.split.total,400);assert.equal(d.split.saving,200);assert.equal(progress.length,7);assert.equal(progress.at(-1).checked,73);
});
test('scope preserves city and explicit selection, excludes delivery and rejects invalid pagination',()=>{
 assert.equal(basketScope([...stores,{...stores[0],id:'wolt--1',chain:'wolt'}],{city:'חיפה'}).total,73);
 assert.equal(basketScope(stores,{city:'לא חיפה'}).total,0);
 assert.equal(basketScope(stores,{city:'לא חיפה',store_ids:[stores[72].id]}).total,1);
 for(const body of [{city:'חיפה',offset:-1},{city:'חיפה',limit:100},{store_ids:stores.map(s=>s.id)}])assert.throws(()=>basketScope(stores,body));
});
test('a failed page of branches does not prevent checking later branches; failures remain explicit',async()=>{
 const d=await collectBasket(async q=>{const d=page(q);if(q.offset===0){d.errors=d.stores.map(s=>({id:s.id,error:'unavailable'}));d.stores=[];}return d;},{city:'חיפה',items,extra_stop_cost:0});
 assert.equal(d.checked_stores,73);assert.equal(d.errors.length,12);assert.equal(d.stores.length,61);assert.equal(d.best,stores[70].id);
});
test('snapshot changes, duplicate branches and incomplete final pages never produce rankings',async()=>{
 for(const fault of ['snapshot','duplicate','incomplete'])await assert.rejects(()=>collectBasket(async q=>{const d=page(q);if(q.offset>0){if(fault==='snapshot')d.as_of='changed';if(fault==='duplicate')d.stores[0]=rows[0];if(fault==='incomplete')d.next_offset=null;}return d;},{city:'חיפה',items,extra_stop_cost:0}));
});
test('cancelled comparison stops before another page can update the result',async()=>{
 const controller=new AbortController();let calls=0;
 await assert.rejects(()=>collectBasket(async q=>{calls++;return page(q);},{city:'חיפה',items,extra_stop_cost:0},()=>controller.abort(),controller.signal),{name:'AbortError'});assert.equal(calls,1);
});

test('automatic basket can use 24-branch pages without losing any branch or final ranking',async()=>{
 const progress=[];const d=await collectBasket(async q=>page(q),{city:'חיפה',items,extra_stop_cost:0,compute_split:false,page_size:24},p=>progress.push(p));
 assert.equal(progress.length,4);assert.equal(d.checked_stores,73);assert.equal(d.best,stores[70].id);assert.equal(d.split,null);
});
