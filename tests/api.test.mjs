import test from 'node:test';import assert from 'node:assert/strict';import {resolve} from 'node:path';import {existsSync} from 'node:fs';
process.env.DATA_DIR=resolve('.snapshots');
const enabled=existsSync(resolve('.snapshots/manifest.json'));
async function call(name,req){let status=200,data,headers={};const res={setHeader:(k,v)=>headers[k]=v,status(n){status=n;return this},json(v){data=v;return this}};await(await import('../api/'+name+'.js')).default({method:'GET',query:{},...req},res);return {status,data,headers}}
test('live API: search names, exact barcode and pagination',{skip:!enabled},async()=>{const r=await call('catalog',{query:{q:'חלב',limit:'12'}});assert.equal(r.status,200);assert.ok(r.data.items.length);assert.equal(r.data.items[0].name.startsWith('חלב'),true);const p=r.data.items.find(p=>p.barcode);const exact=await call('catalog',{query:{q:p.id}});assert.equal(exact.data.items.length,1);assert.equal(exact.data.items[0].id,p.id)});
test('live API: honest coverage counts and no stock guarantee',{skip:!enabled},async()=>{const r=await call('status',{});assert.equal(r.status,200);assert.equal(r.data.priced_stores,r.data.stores.filter(s=>s.has_prices).length);assert.equal(r.data.price_records,r.data.stores.reduce((n,s)=>n+(s.price_count||0),0))});
test('API input validation prevents empty area, invalid item and unbounded stores',async()=>{const a=await call('basket',{method:'POST',body:{items:[]}});assert.equal(a.status,400);const b=await call('basket',{method:'POST',body:{items:[{id:'07290000000001',quantity:1}]}});assert.equal(b.status,400);const c=await call('basket',{method:'GET'});assert.equal(c.status,405)});
test('product API rejects invalid paging, absent IDs and non-GET requests',async()=>{
 for(const query of [{},{id:'exact',limit:'1000'},{id:'exact',offset:'-1'}])assert.equal((await call('product',{query})).status,400);
 assert.equal((await call('product',{method:'POST',query:{id:'exact'}})).status,405);
});
test('live product API: city and chain filtering, full paging, exact ID and honest missing counts',{skip:!enabled},async()=>{
 const found=await call('catalog',{query:{q:'חלב',limit:'1'}});const id=found.data.items[0].id;
 const seen=new Set();let offset=0,total,checked=0;
 do{const r=await call('product',{query:{id,city:'חיפה',limit:'24',offset:String(offset)}});assert.equal(r.status,200);const d=r.data;assert.equal(d.product.id,id);total=d.total_stores;checked+=d.checked_stores;assert.equal(d.checked_stores,d.prices.length+d.missing_prices+d.errors.length);for(const row of d.prices){assert.equal(row.city,'חיפה');assert.ok(row.price>0);assert.ok(!seen.has(row.store_id));seen.add(row.store_id);}offset=d.next_offset;}while(offset!==null);
 assert.equal(checked,total);assert.ok(total>12);
 const filtered=await call('product',{query:{id,city:'חיפה',chain:'rami-levy',limit:'24'}});assert.ok(filtered.data.prices.every(p=>p.chain==='rami-levy'));assert.equal(filtered.data.next_offset,null);
});
test('live basket API: all city pages retain exact totals and report snapshot changes',{skip:!enabled},async()=>{
 const {collectBasket}=await import('../public/basket-client.mjs');const p=(await call('catalog',{query:{q:'חלב',limit:'1'}})).data.items[0];
 const d=await collectBasket(async body=>{const r=await call('basket',{method:'POST',body});assert.equal(r.status,200);return r.data;},{city:'חיפה',items:[{id:p.id,quantity:2}],extra_stop_cost:10});
 assert.ok(d.checked_stores>12);assert.equal(d.checked_stores,d.stores.length+d.errors.length);for(const s of d.stores)for(const product of s.products)if(!product.missing)assert.equal(product.subtotal,product.price*2);
 const changed=await call('basket',{method:'POST',body:{city:'חיפה',items:[{id:p.id,quantity:1}],as_of:'obsolete'}});assert.equal(changed.status,409);assert.equal(changed.data.code,'SNAPSHOT_CHANGED');
});
test('live weighted-product API explains retailer identity and only scans that retailer',{skip:!enabled},async()=>{const r=await call('product',{query:{id:'shufersal:7290000913636',city:'חיפה',limit:'24'}});assert.equal(r.status,200);assert.equal(r.data.product.identity.kind,'retailer_code');assert.equal(r.data.product.identity.chain_name,'שופרסל');assert.ok(r.data.prices.length);assert.ok(r.data.prices.every(p=>p.chain==='shufersal'));assert.equal(r.data.next_offset,null);});
test('live alternatives remain distinct, require approval and include multiple other chains',{skip:!enabled},async()=>{const r=await call('catalog',{query:{alternatives_for:'shufersal:7290000913636'}});assert.equal(r.status,200);assert.equal(r.data.requires_confirmation,true);assert.ok(r.data.items.length);assert.ok(r.data.items.every(p=>p.weighted&&p.identity.chain!=='shufersal'&&p.alternative));assert.ok(new Set(r.data.items.map(p=>p.identity.chain)).size>1);});
