import test from 'node:test';import assert from 'node:assert/strict';import {validateItems,compareBranch,summarize} from '../lib/compare.mjs';
const A='07290000000001',B='07290000000002';const items=[{id:A,quantity:2},{id:B,quantity:1}];const t=Date.parse('2026-11-03T08:00:00Z');
const store=(id,prices,time='2026-11-03T07:00:00Z')=>compareBranch({id,chain_name:id,published_at:time},{products:prices.map(([id,price])=>({id,price,name:id})),promotions:[]},items,t);
test('quantities aggregate only identical identifiers, preserving integer money',()=>{assert.deepEqual(validateItems([{id:A,quantity:2},{id:A,quantity:3}]),[{id:A,quantity:5}]);assert.equal(store('a',[[A,105],[B,200]]).total,410)});
test('invalid or zero quantities, unsafe IDs and oversized baskets rejected',()=>{for(const x of [[{id:A,quantity:0}],[{id:A,quantity:Infinity}],[{id:'../../foo',quantity:1}],[],Array(201).fill({id:A,quantity:1})])assert.throws(()=>validateItems(x))});
test('a partial basket never wins against a full basket',()=>{const rows=[store('partial',[[A,1]]),store('complete',[[A,300],[B,400]])];assert.equal(rows[0].total,null);assert.equal(summarize(rows,items).best,'complete')});
test('stale complete baskets excluded from savings and recommendations',()=>{const rows=[store('old',[[A,1],[B,1]],'2026-10-01T00:00:00Z'),store('new',[[A,100],[B,200]])];assert.equal(summarize(rows,items).best,'new');assert.equal(summarize(rows,items).savings,0)});
test('split is complete, quantity aware and includes user travel cost',()=>{const rows=[store('a',[[A,100],[B,1000]]),store('b',[[A,500],[B,100]])];const result=summarize(rows,items,50);assert.equal(result.split.total,350);assert.equal(result.split.saving,750);assert.equal(result.split.assignments.length,2);assert.equal(summarize(rows,items,1000).split,null)});
test('union of two partial stores can complete a basket, but cannot invent savings baseline',()=>{const r=summarize([store('a',[[A,100]]),store('b',[[B,200]])],items,0);assert.equal(r.best,null);assert.equal(r.split.total,400);assert.equal(r.split.saving,null)});
test('no split if even the union has a missing product',()=>{assert.equal(summarize([store('a',[[A,100]]),store('b',[[A,200]])],items).split,null)});
test('unverified promotions never lower displayed shelf totals',()=>{const r=compareBranch({id:'a',published_at:'2026-11-03T07:00:00Z'},{products:[{id:A,price:500}],promotions:[{promotion_id:'p',discounted_price:'0.01',items:[{gtin:A}]}]},[{id:A,quantity:2}],t);assert.equal(r.total,1000);assert.equal(r.products[0].promotions[0].calculated,false)});
test('fractional quantity on packaged products is rejected from the result',()=>{const r=compareBranch({id:'a',published_at:'2026-11-03T07:00:00Z'},{products:[{id:A,price:500,weighted:false}]},[{id:A,quantity:.5}],t);assert.equal(r.total,null)});
test('weighted items calculate rounded agorot',()=>{const r=compareBranch({id:'a',published_at:'2026-11-03T07:00:00Z'},{products:[{id:'chain:1',price:1290,weighted:true}]},[{id:'chain:1',quantity:.375}],t);assert.equal(r.total,484)});

test('invalid publication timestamps cannot enter the recommendation ranking',()=>{
 const row=compareBranch({id:'bad-time',published_at:'not-a-date'},{products:[{id:'07290000000001',price:100,name:'test'}]},[{id:'07290000000001',quantity:1}]);
 assert.equal(row.stale,true);assert.equal(summarize([row],[{id:'07290000000001',quantity:1}]).best,null);
});
