import test from 'node:test';
import assert from 'node:assert/strict';
import {productScope,productPrice,recent} from '../lib/product-prices.mjs';
const now=Date.parse('2026-11-03T10:00:00Z');
const stores=Array.from({length:65},(_,i)=>({id:'s'+i,chain:i%2?'a':'b',chain_name:i%2?'רשת א':'רשת ב',name:'סניף '+i,city:i<50?'חיפה':'נשר',address:'רחוב 1',object:'verified',published_at:i===0?'2026-10-01T00:00:00Z':'2026-11-03T08:00:00Z'}));
test('product prices: pagination covers every branch once, including beyond the old 12-branch cutoff',()=>{
 const ids=[];let offset=0;do{const p=productScope(stores,{limit:24,offset},now);assert.equal(p.total,65);ids.push(...p.stores.map(s=>s.id));offset=p.next_offset;}while(offset!==null);
 assert.equal(ids.length,65);assert.equal(new Set(ids).size,65);assert.equal(ids.at(-1),'s0');
});
test('product prices: city, chain and explicit selection have consistent boundaries',()=>{
 const a=productScope(stores,{city:'  חיפה ',chain:'a',limit:24},now);assert.equal(a.total,25);assert.ok(a.stores.every(s=>s.city==='חיפה'&&s.chain==='a'));
 const b=productScope(stores,{city:'חיפה',stores:'s51,s53',chain:'a'},now);assert.equal(b.total,2);assert.deepEqual(b.stores.map(s=>s.id).sort(),['s51','s53']);
 assert.equal(productScope(stores,{city:'אין עיר כזאת'},now).total,0);
 assert.equal(productScope([...stores,{id:'missing',city:'חיפה'}],{},now).total,65);
});
test('product prices: invalid pagination and oversized explicit selections are rejected',()=>{
 for(const query of [{offset:-1},{offset:'abc'},{offset:1.5},{limit:0},{limit:25},{stores:Array(61).fill('s1').join(',')}])assert.throws(()=>productScope(stores,query,now));
});
test('product prices: exact barcode, zero-price removal, provenance and stale status',()=>{
 const snapshot={products:[{id:'exact',price:692},{id:'similar',price:10},{id:'removed',price:0}],history:{exact:[['2026-11-01T10:00:00Z',700],['2026-11-03T08:00:00Z',692]]}};
 assert.equal(productPrice(stores[1],snapshot,'exact',now).price,6.92);
 assert.equal(productPrice(stores[1],snapshot,'exact',now).stale,false);
 assert.equal(productPrice(stores[0],snapshot,'exact',now).stale,true);
 assert.equal(productPrice(stores[1],snapshot,'exact',now).history.length,2);
 assert.equal(productPrice(stores[1],snapshot,'absent',now),null);
 assert.equal(productPrice(stores[1],snapshot,'removed',now),null);
 assert.equal(recent('invalid',now),false);assert.equal(recent('2026-11-05T00:00:00Z',now),false);
});
