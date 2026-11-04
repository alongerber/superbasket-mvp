import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveBasket,repriceBasket,QUOTE_TTL} from '../public/live-basket.mjs';
import {compareBranch} from '../lib/compare.mjs';
const now=Date.parse('2026-11-04T08:00:00Z');
const items=[{id:'07290000000001',quantity:1},{id:'07290000000002',quantity:1}];
const store=(id,prices)=>compareBranch({id,chain_name:id,name:id,published_at:new Date(now-1000).toISOString()},{products:prices.map((price,i)=>({id:items[i].id,price,weighted:false}))},items,now);
const quote=()=>({items,stores:[store('a',[100,1000]),store('b',[300,300]),store('partial',[50])],errors:[],checked_stores:3,total_stores:3,as_of:'snapshot'});
const request=()=>({city:'חיפה',store_ids:[],items,extra_stop_cost:0});
const tick=()=>new Promise(resolve=>setTimeout(resolve,8));
test('cart totals use one branch, rerank on quantity changes and never sum cross-store minima',()=>{
 const first=repriceBasket(quote(),items,now);assert.equal(first.best,'b');assert.equal(first.stores.find(s=>s.id==='b').total,600);
 const more=repriceBasket(quote(),[{...items[0],quantity:10},items[1]],now);assert.equal(more.best,'a');assert.equal(more.stores.find(s=>s.id==='a').total,2000);assert.equal(more.stores.find(s=>s.id==='a').products[0].subtotal,1000);
 assert.equal(more.stores.find(s=>s.id==='partial').total,null);assert.equal(more.split,null);
});
test('removal can complete a formerly partial store, while new products require a new quote',()=>{
 const result=repriceBasket(quote(),[items[0]],now);assert.equal(result.best,'partial');assert.equal(result.stores.find(s=>s.id==='partial').total,50);
 assert.equal(repriceBasket(quote(),[{id:'07290000000003',quantity:1}],now),null);
});
test('weighted amounts round in agorot; fractional packages and aged prices cannot win',()=>{
 const q=quote();q.stores[0].products[0].weighted=true;q.stores[0].products[0].price=1999;
 const result=repriceBasket(q,[{...items[0],quantity:.75}],now);assert.equal(result.stores.find(s=>s.id==='a').total,1499);assert.equal(result.stores.find(s=>s.id==='b').total,null);
 assert.equal(repriceBasket(q,items,now+37*3600000).best,null);
 assert.equal(repriceBasket(q,[{...items[0],quantity:0}],now),null);
});
test('automatic cart coalesces edits and instantly reprices quantities without another request',async()=>{
 const states=[];let calls=0;const live=createLiveBasket({delay:1,now:()=>now,load:async()=>{calls++;return quote();},emit:state=>states.push(state)});
 live.update(request());live.update(request());await tick();assert.equal(calls,1);assert.equal(states.at(-1).phase,'ready');
 live.update({...request(),items:[{...items[0],quantity:10},items[1]]});assert.equal(states.at(-1).data.best,'a');assert.equal(calls,1);
 live.update({...request(),items:[]});assert.equal(states.at(-1).phase,'empty');assert.equal(states.at(-1).data,null);live.cancel();
});
test('a changed area, delivery setting or expired quote invalidates cached totals',async()=>{
 let time=now,calls=0;const states=[];const live=createLiveBasket({delay:1,now:()=>time,load:async()=>{calls++;return quote();},emit:s=>states.push(s)});
 live.update(request());await tick();
 live.update({...request(),city:'נשר'});assert.equal(states.at(-1).data,null);await tick();assert.equal(calls,2);
 live.update({...request(),city:'נשר',include_delivery:true});await tick();assert.equal(calls,3);
 time+=QUOTE_TTL+1;live.update({...request(),city:'נשר',include_delivery:true});assert.equal(states.at(-1).phase,'loading');await tick();assert.equal(calls,4);live.cancel();
});
test('late replies and progress from superseded carts cannot replace the active basket',async()=>{
 const pending=[],states=[];const live=createLiveBasket({delay:1,now:()=>now,load:(req,progress)=>new Promise(resolve=>pending.push({req,progress,resolve})),emit:s=>states.push(s)});
 live.update(request());await tick();live.update({...request(),city:'נשר'});await tick();
 pending[1].resolve(quote());await tick();const count=states.length;
 pending[0].progress({checked:99});pending[0].resolve(quote());await tick();assert.equal(states.length,count);assert.equal(states.at(-1).phase,'ready');live.cancel();
});
test('network failure clears prices and a forced retry can recover',async()=>{
 const states=[];let fail=true;const live=createLiveBasket({delay:1,now:()=>now,load:async()=>{if(fail)throw Error('network failed');return quote();},emit:s=>states.push(s)});
 live.update(request());await tick();assert.equal(states.at(-1).phase,'error');assert.equal(states.at(-1).data,null);
 fail=false;live.update(request(),{force:true});await tick();assert.equal(states.at(-1).phase,'ready');live.cancel();
});
