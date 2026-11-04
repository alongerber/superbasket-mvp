import test from 'node:test';import assert from 'node:assert/strict';
import {priceCoverage,comparePrices} from '../public/basket-prices.mjs';
const items=Array.from({length:8},(_,i)=>({id:String(i),name:'מוצר '+i,quantity:1}));
const row=(i,subtotal)=>({id:String(i),price:subtotal,subtotal,quantity:1});
const store=(id,products,extra={})=>({id,products,total:products.length===8?products.reduce((n,p)=>n+p.subtotal,0):null,stale:false,...extra});
test('360.05 versus 53 partial baskets do not create a false 307.05 saving',()=>{
 const six=[row(0,1000),row(1,1000),row(2,1000),row(3,1000),row(4,1000),row(5,300)];
 const a=store('a',[...six,row(6,30705)]),b=store('b',six),result=comparePrices(a,b,items);
 assert.equal(priceCoverage(a,items).subtotal,36005);assert.equal(priceCoverage(b,items).subtotal,5300);
 assert.equal(result.common.length,6);assert.equal(result.leftSubtotal,5300);assert.equal(result.rightSubtotal,5300);assert.equal(result.difference,0);assert.equal(result.full,false);assert.equal(result.excluded.length,2);
 assert.equal(priceCoverage(a,items).total,null);assert.equal(priceCoverage(b,items).total,null);
});
test('equal matched counts still compare only the intersection of product identities',()=>{
 const a=store('a',[row(0,100),row(1,200)]),b=store('b',[row(1,300),row(2,50)]);
 const result=comparePrices(a,b,items);assert.equal(result.common.length,1);assert.equal(result.difference,100);assert.deepEqual(result.common.map(p=>p.item.id),['1']);
});
test('missing prices never become zero and stale prices never form a saving',()=>{
 const a=store('a',[row(0,100)]),b=store('b',[{id:'0',missing:true}]);
 let r=comparePrices(a,b,items);assert.equal(r.difference,null);assert.equal(r.rightSubtotal,null);assert.equal(r.rows[0].right,null);
 r=comparePrices(a,store('b',[row(0,50)],{stale:true}),items);assert.equal(r.comparable,false);assert.equal(r.difference,null);
});
test('complete baskets compare all quantities including approved purchased packages',()=>{
 const a=store('a',items.map((p,i)=>row(i,100))),b=store('b',items.map((p,i)=>({...row(i,200),matched_id:'alternate',purchase_quantity:2})));
 const r=comparePrices(a,b,items);assert.equal(r.full,true);assert.equal(r.difference,800);assert.equal(r.rows[0].right.purchase_quantity,2);
});

test('a valid tiny weighted quantity rounded to zero agorot remains priced',()=>{
 const s=store('a',[{id:'0',price:100,quantity:.001,subtotal:0,weighted:true}]);
 assert.equal(priceCoverage(s,items).priced.length,1);assert.equal(priceCoverage(s,items).subtotal,0);
});
