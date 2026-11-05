import test from 'node:test';
import assert from 'node:assert/strict';
import {quantityLabel,replacementLabel} from '../public/quantity-labels.mjs';
test('weighted quantities are amounts, never packages of kilograms',()=>{
 const meat={weighted:true,unit:'ק״ג',name:'אנטריקוט טרי'};
 assert.equal(quantityLabel(meat,1),'1 ק״ג');assert.equal(quantityLabel(meat,1.25),'1.25 ק״ג');
 assert.equal(replacementLabel(meat,1,{...meat,name:'סטייק אנטריקוט פרימיום טרי'},1),'לרכישה: 1 ק״ג');
 assert.equal(replacementLabel(meat,1,meat,1.5),'1.5 ק״ג במקום 1 ק״ג');
});
test('package quantities retain size and disclose conversion to another pack size',()=>{
 const half={name:'קמח 500 גרם',weighted:false},whole={name:'קמח 1 קג',weighted:false};
 assert.equal(quantityLabel(half,2),'2 אריזות של 500 גרם');
 assert.equal(replacementLabel(whole,1,half,2),'2 אריזות של 500 גרם במקום 1 אריזה של 1 קג');
 assert.equal(quantityLabel({name:'אפרופו 36*50גרם',weighted:false},1),'1 אריזה');
 assert.equal(replacementLabel(whole,1,half,null),'בחרו כמה לקנות במקום הכמות שברשימה');
});
test('unknown weighted units are not silently called kilograms',()=>{
 assert.equal(quantityLabel({name:'מוצר במשקל',weighted:true,unit:'לא ידוע'},2),'2 יחידות מכירה במשקל');
});
test('replacement amount shows actual package volume and overbuy without repeating weight units',async()=>{
 const {replacementAmount}=await import('../public/quantity-labels.mjs');
 assert.equal(replacementAmount({name:'אורז 1 קג'},1,{name:'אורז 600 גרם'},2),'סה״כ 1.2 ק״ג · 200 גרם מעבר לכמות המקורית');
 assert.equal(replacementAmount({name:'חלב 1 ליטר'},1,{name:'חלב 500 מל'},2),'סה״כ 1 ליטר');
 assert.equal(replacementAmount({name:'לא ידוע'},1,{name:'חלב 500 מל'},2),'');
 assert.equal(replacementAmount({name:'בשר',weighted:true,unit:'קג'},1,{name:'בשר',weighted:true,unit:'קג'},1),'');
});
test('equivalent spellings of package units do not produce a redundant instead-of sentence',()=>{
 assert.equal(replacementLabel({name:'לחם 900 גרם'},1,{name:'לחם 900 ג'},1),'לרכישה: 1 אריזה של 900 ג');
});
