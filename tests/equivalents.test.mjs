import test from 'node:test';import assert from 'node:assert/strict';
import {packageMeasure,profile,conversion,rankEquivalents,normalizeAlternatives,purchaseQuantity,requestItem} from '../public/product-equivalence.mjs';
import {compareBranch,validateItems,summarize} from '../lib/compare.mjs';
import {repriceBasket} from '../public/live-basket.mjs';
import {validateShared,basketKey} from '../public/shopping-experience.mjs';
const p=(id,name,extras={})=>({id,name,weighted:false,stores:100,...extras});
const A='07290000000001',B='07290000000002',C='07290000000003';
const store=id=>({id,chain:id,chain_name:id,published_at:new Date().toISOString()});
test('package sizes use the package name, not the reference-price unit field',()=>{
 assert.equal(packageMeasure(p(A,'גבינה לבנה 5% 250 גרם',{unit:'100 גרם'})).amount,250);
 assert.equal(packageMeasure(p(A,'חלב 3% 1 ליטר')).amount,1000);
 assert.equal(packageMeasure(p(A,'נייר טואלט 30 גלילים')).amount,30);
 assert.equal(packageMeasure(p(A,'מים 6×1.5 ליטר')).amount,9000);
 assert.equal(packageMeasure(p(A,'יוגורט 150 גרם × 4')).amount,600);
 for(const name of ['טונה 160 גרם מסונן 112 גרם','מארז מים 1.5 ליטר','חיתולים בייבי סופרים','מוצר 36.6×50גרם'])assert.equal(packageMeasure(p(A,name)),null,name);
 assert.equal(packageMeasure(p(A,'עגבניה',{weighted:true,unit:'לא ידוע'})),null);
 assert.equal(packageMeasure(p(A,'עגבניה',{weighted:true,unit:'1קילוגרם'})).amount,1000);
});
test('different dimensions never get an automatic conversion',()=>{
 assert.equal(conversion(p(A,'מוצר 500 גרם'),p(B,'מוצר 500 מל')).automatic,false);
 assert.equal(conversion(p(A,'מוצר 1 קג'),p(B,'מוצר 250 גרם')).ratio,4);
 assert.equal(conversion(p(A,'נייר טואלט 30 גלילים'),p(B,'נייר טואלט 40 גלילים')).ratio,.75);
});
test('universal suggestions preserve explicit percentages, variants, size/stage and intended use',()=>{
 const cases=[
 ['גבינה לבנה 5% 250 גרם','גבינה לבנה 5% 500 גרם','גבינה לבנה 9% 250 גרם'],
 ['חלב 3% ללא לקטוז 1 ליטר','חלב 3% ללא לקטוז 2 ליטר','חלב 3% 1 ליטר'],
 ['אורז בסמטי 1 קג','אורז בסמטי 5 קג','אורז פרסי 1 קג'],
 ['קפה נמס 200 גרם','קפה נמס 100 גרם','קפה טורקי 200 גרם'],
 ['מים מינרליים 1.5 ליטר','מים מינרליים 2 ליטר','מים מינרליים מוגזים 1.5 ליטר'],
 ['שמן זית כתית מעולה 750 מל','שמן זית כתית מעולה 1 ליטר','שמן קנולה 750 מל'],
 ['סוללות AAA 8 יחידות','סוללות AAA 4 יחידות','סוללות AA 8 יחידות'],
 ['חיתולים מידה 4 40 יחידות','חיתולים מידה 4 50 יחידות','חיתולים מידה 5 40 יחידות'],
 ['מטרנה שלב 1 700 גרם','מטרנה שלב 1 400 גרם','מטרנה שלב 2 700 גרם'],
 ['נוזל כלים לימון 750 מל','נוזל כלים לימון 1 ליטר','נוזל כביסה לימון 750 מל'],
 ['קמח 1 קג','קמח 500 גרם','סולת 1 קג'],
 ['מזון חתולים יבש 1 קג','מזון חתולים יבש 2 קג','מזון כלבים יבש 1 קג'],
 ['תפוח אדמה אדום','תפוח אדמה אדום ארוז','עגבניה אדום'],
 ['שמפו לשיער רגיל 700 מל','שמפו לשיער רגיל 500 מל','שמפו לשיער יבש 700 מל']
 ];
 for(const [source,good,bad] of cases){const result=rankEquivalents(p(A,source),[p(B,good),p(C,bad)]);assert.deepEqual(result.map(p=>p.id),[B],source);}
});
test('eggs are not baking trays, and manufacturer-only overlap is not a product match',()=>{
 const source=p(A,'ביצים L תבנית 12 יחידות');assert.equal(profile(source).category,'eggs');
 assert.deepEqual(rankEquivalents(source,[p(B,'תבנית ביצים L 12 יחידות'),p(C,'תבנית אינגליש 12 יחידות')]).map(p=>p.id),[B]);
 assert.deepEqual(rankEquivalents(p(A,'קמח בשקיות 1 קג'),[p(B,'תה בשקיות'),p(C,'סולת בשקיות 1 קג')]),[]);
});
test('unclassified goods still support catalog search and explicitly chosen alternatives',()=>{
 const source=p(A,'מוצרמיוחד 12 יחידות'),candidate=p(B,'מוצרמיוחד 24 יחידות');
 assert.equal(profile(source).category,'unclassified');assert.equal(rankEquivalents(source,[candidate]).length,1);
 assert.equal(normalizeAlternatives([{id:B}],A)[0].id,B);
 assert.equal(conversion(source,candidate).ratio,.5);
});
test('only explicit approval supplies alternatives; malformed and duplicate choices are rejected',()=>{
 assert.deepEqual(validateItems([{id:A,quantity:1}]),[{id:A,quantity:1}]);
 const approved=validateItems([{id:A,quantity:1,alternatives:[{id:B},{id:C,manual_ratio:2}]}]);assert.equal(approved[0].alternatives.length,2);
 for(const alternatives of [[{id:A}],[{id:B},{id:B}],[{id:'need:fake'}],[{id:B,manual_ratio:0}],Array(21).fill({id:B})])assert.throws(()=>normalizeAlternatives(alternatives,A));
 assert.throws(()=>validateItems([{id:A,quantity:1,alternatives:[{id:B}]},{id:A,quantity:2}]));
 assert.equal(requestItem({id:A,quantity:1,alternatives:[{id:B}],name:'x'}).alternatives[0].id,B);
});
const choices=[{id:A,ratio:1,weighted:false},{id:B,ratio:2,weighted:false},{id:C,ratio:.5,weighted:false}];
const prices=[p(A,'אורז 1 קג',{price:1000}),p(B,'אורז 500 גרם',{price:600}),p(C,'אורז 2 קג',{price:1500})];
test('basket picks lowest payable cost, not the smallest package sticker price',()=>{
 const item={id:A,quantity:1,alternatives:[{id:B},{id:C}],choices};let row=compareBranch(store('one'),{products:prices},[item]);assert.equal(row.total,1000);assert.equal(row.products[0].matched_id,A);assert.equal(row.products[0].alternatives,undefined);assert.equal(row.products[0].choices,undefined);
 row=compareBranch(store('one'),{products:prices},[{...item,quantity:2}]);assert.equal(row.total,1500);assert.equal(row.products[0].matched_id,C);assert.equal(row.products[0].purchase_quantity,1);assert.equal(row.products[0].quantity,2);
 row=compareBranch(store('two'),{products:prices.filter(p=>p.id!==A)},[item]);assert.equal(row.total,1200);assert.equal(row.products[0].matched_id,B);assert.equal(row.products[0].purchase_quantity,2);
 assert.equal(compareBranch(store('strict'),{products:prices.filter(p=>p.id!==A)},[{id:A,quantity:1}]).total,null);
});
test('weighted alternate buys exact mass; branch unit ambiguity never receives automatic kg conversion',()=>{
 const entry={id:A,quantity:3,alternatives:[{id:B}],choices:[{id:A,ratio:1,weighted:false},{id:B,ratio:.25,weighted:true,require_kg:true}]};
 let row=compareBranch(store('a'),{products:[p(B,'גבינה במשקל',{price:4000,weighted:true,unit:'1 קילוגרם'})]},[entry]);assert.equal(row.total,3000);assert.equal(row.products[0].purchase_quantity,.75);
 row=compareBranch(store('a'),{products:[p(B,'גבינה במשקל',{price:4000,weighted:true,unit:'יחידה'})]},[entry]);assert.equal(row.total,null);
 assert.equal(purchaseQuantity(3,.1,false),1);assert.equal(purchaseQuantity(3,.1,true),.3);
});
test('changed quantities or approved sets invalidate quotes; saved same-quantity quotes retain rounded package cost',()=>{
 const item={id:A,quantity:1,alternatives:[{id:B},{id:C}]};const row=compareBranch(store('one'),{products:prices.filter(p=>p.id!==A)},[{...item,choices}]);const quote={items:[item],stores:[row]};
 assert.equal(repriceBasket(quote,[item]).stores[0].total,1200);
 assert.equal(repriceBasket(quote,[{...item,quantity:2}]),null);
 assert.equal(repriceBasket(quote,[{id:A,quantity:1}]),null);
 assert.equal(repriceBasket(quote,[{...item,alternatives:[{id:B,manual_ratio:1}]}]),null);
});
test('sharing, watch keys and split assignments keep approved identity and purchase quantities',()=>{
 const item={...p(A,'אורז 1 קג'),quantity:1,alternatives:[{id:B,manual_ratio:2}]};
 assert.deepEqual(validateShared([item]).items[0].alternatives,item.alternatives);
 assert.notEqual(basketKey([item]),basketKey([{...item,alternatives:[]}]));
 const basket=[{...item,choices},{id:'07290000000004',quantity:1}];
 const a=compareBranch(store('a'),{products:[p(B,'אורז 500 גרם',{price:100}),p('07290000000004','מלח',{price:5000})]},basket);
 const b=compareBranch(store('b'),{products:[p(A,'אורז 1 קג',{price:5000}),p('07290000000004','מלח',{price:100})]},basket);
 const split=summarize([a,b],basket,0).split;assert.equal(split.total,300);assert.equal(split.assignments[0].matched_id,B);assert.equal(split.assignments[0].purchase_quantity,2);
});

test('checkout and checklists use purchased alternative and reset when branch choice changes',async()=>{
 const {purchaseItems,shoppingList}=await import('../public/retailers.mjs');
 const original={id:A,name:'אורז 1 קג',quantity:2,barcode:A};
 const branch={id:'a',products:[{id:A,matched_id:B,matched_name:'אורז 2 קג',purchase_quantity:1,purchase_label:'אריזות',weighted:false}]};
 const item=purchaseItems([original],branch)[0];assert.equal(item.id,A);assert.equal(item.name,'אורז 2 קג');assert.equal(item.quantity,1);assert.equal(item.barcode,B);
 assert.match(shoppingList([item]),/2 קג × 1 אריזות/);assert.notEqual(item.check_key,purchaseItems([original],null)[0].check_key);
 assert.equal(purchaseItems([original],{...branch,stale:true})[0].name,original.name);
});
