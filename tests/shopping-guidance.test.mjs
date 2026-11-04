import test from 'node:test';
import assert from 'node:assert/strict';
import {shoppingReadiness,quantityRatio,replacementQuantity,previewPrice} from '../public/shopping-guidance.mjs';
const items=[{id:'a',name:'milk',quantity:1},{id:'b',name:'rice',quantity:2}];
const store=(id,rows,extra={})=>({id,stale:false,total:rows.some(r=>r.missing)?null:rows.reduce((n,r)=>n+r.subtotal,0),products:rows,...extra});
const row=(id,subtotal)=>({id,price:subtotal,subtotal});
test('completion focuses on missing lines, and distinguishes prices elsewhere',()=>{
 const a=store('a',[row('a',10),{id:'b',missing:true}]),b=store('b',[row('b',20)]),d=shoppingReadiness({stores:[a,b]},items,a);
 assert.equal(d.ready,false);assert.equal(d.count,1);assert.equal(d.priced,1);assert.equal(d.issues[0].item.id,'b');assert.equal(d.issues[0].elsewhere,1);
});
test('unresolved list lines prevent calling a priced subset a full shopping list',()=>{
 const s=store('a',[row('a',10),row('b',20)]);assert.equal(shoppingReadiness({stores:[s]},items,s).ready,true);
 const d=shoppingReadiness({stores:[s]},items,s,3);assert.equal(d.ready,false);assert.equal(d.count,3);assert.equal(d.issues.length,0);
});
test('stale, absent and invalid prices cannot complete a basket',()=>{
 const s=store('a',[row('a',10),row('b',20)],{stale:true});assert.equal(shoppingReadiness({stores:[s]},items,s).issues.length,2);
 assert.equal(shoppingReadiness(null,items,null).count,2);
 assert.equal(shoppingReadiness(null,[],null).ready,false);
});
test('purchase quantity is converted internally and whole packages round upward',()=>{
 assert.equal(quantityRatio(3,2),2/3);assert.equal(replacementQuantity(3,{weighted:false,conversion:{automatic:true,ratio:1}},2/3),2);
 assert.equal(replacementQuantity(3,{weighted:false,conversion:{automatic:true,ratio:.5}}),2);
 assert.equal(replacementQuantity(2,{weighted:true,conversion:{automatic:false}},.625),1.25);
 assert.equal(replacementQuantity(1,{weighted:false,conversion:{automatic:false}}),null);
 for(const args of [[0,1],[1,0],[1,1.5],[1,100],[1,NaN],[1,.0001,true]])assert.throws(()=>quantityRatio(...args));
});
test('preview uses actual priced row in chosen branch, else cheapest fresh row only',()=>{
 const q={stores:[store('stale',[row('a',1)],{stale:true}),store('cheap',[row('a',500)]),store('chosen',[row('a',800)]),store('missing',[{id:'a',missing:true}])]};
 assert.equal(previewPrice(q,'a','chosen').row.subtotal,800);assert.equal(previewPrice(q,'a','missing').store.id,'cheap');assert.equal(previewPrice(q,'x'),null);
});
