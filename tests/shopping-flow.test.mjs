import test from 'node:test';import assert from 'node:assert/strict';
import {draftKey,restoreDraft,groupStoreOptions,previousLine,eventSession} from '../public/shopping-flow.mjs';
import {createNavigation} from '../public/navigation.mjs';
import {shoppingReadiness} from '../public/shopping-guidance.mjs';
import {verifiedStoreMetadata} from '../lib/store-metadata.mjs';
import {basketScope} from '../lib/basket-scope.mjs';
import {purchaseLabel} from '../public/quantity-labels.mjs';
test('draft restores exact selections only for the same lines and quantities',()=>{
 const pending=[{query:'חלב',quantity:2},{query:'אורז',quantity:1}],product={id:'milk-1',name:'milk'};
 const draft={key:draftKey(pending),rows:[product,null]};assert.equal(restoreDraft(pending,draft)[0].selected,product);
 assert.equal(restoreDraft([{...pending[0],quantity:3}],draft)[0].selected,null);
 assert.equal(restoreDraft([...pending].reverse(),draft)[0].selected,null);
});
test('draft cannot hide the price of fully priced cart items',()=>{
 const items=[{id:'milk',quantity:1}],s={id:'a',total:720,stale:false,products:[{id:'milk',price:720,subtotal:720}]};
 const r=shoppingReadiness({stores:[s]},items,s,10);assert.equal(r.cartReady,true);assert.equal(r.ready,false);assert.equal(r.pendingCount,10);
});
test('store groups preserve every branch and prefer the chosen branch without merging unequal totals',()=>{
 const stores=[{id:'a',chain:'one',total:1500},{id:'b',chain:'one',total:1500},{id:'c',chain:'one',total:1600},{id:'d',chain:'two',total:1500}];
 const groups=groupStoreOptions(stores,'b');assert.equal(groups.length,3);assert.equal(groups[0].representative.id,'b');assert.equal(groups.flatMap(g=>g.branches).length,4);
});
test('old row prices never label a changed quantity or changed alternative selection',()=>{
 const item={id:'a',quantity:1},q={items:[item],best:'store',stores:[{id:'store',products:[{...item,price:100,subtotal:100}]}]};
 assert.equal(previousLine(q,item,null).row.subtotal,100);assert.equal(previousLine(q,{...item,quantity:2},null),null);assert.equal(previousLine(q,{...item,alternatives:[{id:'07290000000002'}]},null),null);assert.equal(previousLine(q,{id:'b',quantity:1},null),null);
});
test('automatic quantity edits count as one shopping session, separated by city and time',()=>{
 const a={at:'2026-11-05T10:00:00Z',city:'חיפה'};assert.ok(eventSession(a,{...a,at:'2026-11-05T10:10:00Z'}));assert.ok(!eventSession(a,{...a,at:'2026-11-05T11:10:00Z'}));assert.ok(!eventSession(a,{...a,city:'תל אביב'}));
});
test('official Or Akiva location correction applies narrowly and changes city eligibility',()=>{
 const s={id:'rami-levy--64',chain:'rami-levy',name:'אור עקיבא',city:'חיפה',address:'הכרמל 1',object:'prices'};
 const fixed=verifiedStoreMetadata(s);assert.equal(fixed.city,'אור עקיבא');assert.equal(fixed.source_city,'חיפה');assert.equal(s.city,'חיפה');assert.equal(basketScope([fixed],{city:'חיפה'}).total,0);assert.equal(basketScope([fixed],{city:'אור עקיבא'}).total,1);
 assert.equal(verifiedStoreMetadata({...s,id:'rami-levy--65'}).city,'חיפה');assert.equal(verifiedStoreMetadata({...s,address:'רחוב אחר'}).city,'חיפה');
});
test('singular purchase units are used without changing numeric quantities',()=>{assert.equal(purchaseLabel(1,'אריזות'),'1 אריזה');assert.equal(purchaseLabel(2,'אריזות'),'2 אריזות');assert.equal(purchaseLabel(.5,'ק״ג'),'0.5 ק״ג');});
test('back closes dialogs, restores view scroll and defers navigation until modal history is removed',async()=>{
 let view='search',modal=false;const handlers={},stack=[],win={scrollY:240,scrollTo({top}){this.scrollY=top;},addEventListener(type,fn){handlers[type]=fn;},history:{state:null,replaceState(s){this.state=s;stack[stack.length?stack.length-1:0]=s;},pushState(s){this.state=s;stack.push(s);},back(){queueMicrotask(()=>{stack.pop();this.state=stack.at(-1);handlers.popstate({state:this.state});});}}};
 const nav=createNavigation({win,getView:()=>view,render:n=>view=n,modalOpen:()=>modal,closeModal:()=>{modal=false;}});
 nav.go('basket');assert.equal(win.scrollY,0);win.scrollY=400;nav.opened();modal=true;win.history.back();await Promise.resolve();assert.equal(modal,false);assert.equal(view,'basket');assert.equal(win.scrollY,400);
 nav.opened();modal=true;modal=false;nav.closed();nav.go('categories');assert.equal(view,'basket');await Promise.resolve();assert.equal(view,'categories');win.history.back();await Promise.resolve();assert.equal(view,'basket');assert.equal(win.scrollY,400);win.history.back();await Promise.resolve();assert.equal(view,'search');assert.equal(win.scrollY,240);
});
