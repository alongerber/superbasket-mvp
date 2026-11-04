import test from 'node:test';
import assert from 'node:assert/strict';
import {attributes,parseNeed,needProduct,suggestNeed,matchesNeed,hasKilogramUnit,chooseNeedProduct,queryNeeds} from '../public/product-needs.mjs';
import {compareBranch,validateItems,summarize} from '../lib/compare.mjs';
import {productPrice} from '../lib/product-prices.mjs';
import {validateShared} from '../public/shopping-experience.mjs';
const fresh=needProduct('need:v1-ribeye-fresh-regular-any');
const meat=(id,name,price=10000,unit='קילוגרם')=>({id,name,price,unit,weighted:true});
const store=id=>({id,chain:id,chain_name:id,name:id,published_at:new Date().toISOString()});
test('freshness must be explicit: ribeye word itself is not a fresh indicator',()=>{
 assert.equal(attributes(meat('a','אנטריקוט')),null);
 assert.equal(attributes(meat('a','אנטריקוט עגל קפוא חלק')).freshness,'frozen');
 for(const name of ['אנטריקוט טרי קפוא','קבב אנטריקוט טרי','אצבעות אנטריקוט טרי','אנטריקוט טרי מעובד','אנטריקוט סינטה טרי'])assert.equal(attributes(meat('a',name)),null,name);
 assert.equal(attributes(meat('a','אנטריקוט טרי לא מעובד')).freshness,'fresh');
});
test('freshness, cut, bone status and explicit kosher constraints remain separate',()=>{
 assert.ok(matchesNeed(meat('a','אנטריקוט טרי'),fresh.need));
 for(const name of ['אנטריקוט קפוא','אנטריקוט מופשר','אנטריקוט טרי ללא עצם','אנטריקוט טרי עם עצם','אנטריקוט עע טרי','סינטה טרי'])assert.equal(matchesNeed(meat('a',name),fresh.need),false,name);
 const halak=parseNeed('need:v1-ribeye-frozen-regular-halak');
 assert.ok(matchesNeed(meat('a','אנטריקוט קפוא חלק'),halak));
 assert.equal(matchesNeed(meat('a','אנטריקוט קפוא כשר'),halak),false);
 assert.equal(matchesNeed(meat('a','אנטריקוט קפוא מחפוד'),halak),false);
 assert.equal(suggestNeed(meat('a','אנטריקוט טרי מחפוד חלק')),null,'never silently drop one explicit kosher constraint');
 assert.equal(suggestNeed(meat('a','אנטריקוט טרי לא כשר')),null);
 assert.equal(attributes(meat('a','אנטריקוט טרי חלקים')).halak,false);
 assert.equal(attributes(meat('a','אנטריקוט טרי מחפוד רובין')),null);
 assert.equal(suggestNeed(fresh),null);
 assert.equal(suggestNeed(meat('a','אנטריקוט טרי מהדרין')),null);
 assert.equal(matchesNeed(meat('a','אנטריקוט קפוא לא חלק'),halak),false);
});
test('only verified kilogram units, positive integer prices and weighted products participate',()=>{
 for(const unit of ['1 קילוגרם','ק״ג','kg','1 קג'])assert.ok(hasKilogramUnit(meat('a','אנטריקוט טרי',100,unit)));
 for(const unit of ['יחידה','לא ידוע','100 גרם','',null])assert.equal(hasKilogramUnit(meat('a','אנטריקוט טרי',100,unit)),false);
 const p=meat('b','אנטריקוט טרי',15000),cheaper=meat('a','סטייק אנטריקוט טרי',12000);
 const snapshot={products:[p,cheaper,meat('wrong','אנטריקוט קפוא',100),meat('unit','אנטריקוט טרי',10,'יחידה'),{...p,id:'pack',weighted:false,price:1},{...p,id:'zero',price:0}]};
 assert.equal(chooseNeedProduct(snapshot,fresh.need).id,'a');
});
test('one chosen need compares different retailer IDs; exact IDs still never substitute',()=>{
 const items=[{id:fresh.id,quantity:1.25},{id:'07290000000001',quantity:2}],packed={id:items[1].id,name:'מוצר ארוז',price:500,weighted:false};
 const a=compareBranch(store('chain-a'),{products:[meat('chain-a:1','אנטריקוט טרי',12000),packed]},items);
 const b=compareBranch(store('chain-b'),{products:[meat('chain-b:9','סטייק אנטריקוט טרי',11000),packed]},items);
 assert.equal(a.total,16000);assert.equal(b.total,14750);assert.equal(summarize([a,b],items).best,'chain-b');
 assert.equal(b.products[0].id,fresh.id);assert.equal(b.products[0].matched_id,'chain-b:9');
 assert.equal(compareBranch(store('chain-a'),{products:[meat('chain-b:9','אנטריקוט טרי',1)]},[{id:'chain-a:1',quantity:1}]).total,null);
 assert.equal(compareBranch(store('chain-a'),{products:[packed]},items).total,null);
});
test('product details use the matched ID for history and expose its original name',()=>{
 const p=meat('chain:1','אנטריקוט טרי',12000);const row=productPrice(store('chain'),{products:[p],history:{[p.id]:[['2026-11-04T08:00:00Z',12000]]}},fresh.id);
 assert.equal(row.price,120);assert.equal(row.matched_name,p.name);assert.equal(row.history[0].price,120);
});
test('canonical need IDs survive sharing and quantities while unknown specs are rejected',()=>{
 assert.equal(validateItems([{id:fresh.id,quantity:.75}])[0].quantity,.75);
 assert.throws(()=>validateItems([{id:fresh.id,quantity:.00001}]));
 for(const id of ['need:v2-ribeye-fresh-regular-any','need:v1-fake-fresh-regular-any','need:v1-ribeye-fresh-regular-madeup']){assert.equal(parseNeed(id),null);assert.throws(()=>validateItems([{id,quantity:1}]))}
 const restored=validateShared([{...fresh,name:'untrusted name',quantity:.75}]).items;assert.equal(restored[0].name,fresh.name);assert.equal(restored[0].quantity,.75);
});
test('search suggestions do not replace exact barcode results and label fresh/frozen separately',()=>{
 assert.deepEqual(queryNeeds('07290000066332'),[]);assert.deepEqual(queryNeeds('shufersal:123'),[]);
 assert.deepEqual(queryNeeds('אנטריקוט').map(p=>p.need.freshness),['fresh','frozen']);
 assert.deepEqual(queryNeeds('אנטריקוט קפוא חלק').map(p=>p.need.kosher),['halak']);
 assert.equal(queryNeeds('קבב אנטריקוט').length,0);
});
