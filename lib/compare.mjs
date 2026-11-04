import {normalizeAlternatives,alternativesKey,approvedPrice} from '../public/product-equivalence.mjs';
import {parseNeed,chooseNeedProduct,attributes,hasKilogramUnit} from '../public/product-needs.mjs';
// Integer agorot. Exact IDs stay exact; only explicitly selected needs permit type matching.
export function validateItems(items){
 if(!Array.isArray(items)||!items.length||items.length>200)throw Error('יש לבחור בין 1 ל־200 מוצרים');
 const map=new Map();for(const item of items){
  if(!item||typeof item.id!=='string'||item.id.length>90||!/^([0-9]{14}|[a-z0-9-]+:[a-zA-Z0-9._-]+)$/.test(item.id)||!Number.isFinite(item.quantity)||item.quantity<=0||item.quantity>99)throw Error('מוצר או כמות לא תקינים');
  if(item.id.startsWith('need:')&&!parseNeed(item.id))throw Error('הגדרת סוג המוצר אינה תקינה');
  const alternatives=normalizeAlternatives(item.alternatives,item.id);if(alternatives.length&&parseNeed(item.id))throw Error('לסוג מוצר משתמשים במסנני הסוג');
  if(map.has(item.id)&&alternativesKey(map.get(item.id))!==alternativesKey({id:item.id,alternatives}))throw Error('אותו מוצר מופיע עם חלופות שונות');
  const quantity=Math.round(((map.get(item.id)?.quantity||0)+item.quantity)*1000)/1000;
  if(quantity<=0)throw Error('הכמות המזערית היא 0.001');
  if(quantity>99)throw Error('הכמות המרבית למוצר היא 99');map.set(item.id,{id:item.id,quantity,...(alternatives.length?{alternatives}:{})});
 }return [...map.values()];
}
export function compareBranch(store,data,items,now=Date.now()){
 const index=new Map(data.products.map(p=>[p.id,p]));let shelfTotal=0;
 const products=items.map(entry=>{const {choices,alternatives,...requested}=entry;const need=parseNeed(entry.id),approved=entry.choices?approvedPrice(index,entry):null,p=entry.choices?approved?.product:need?chooseNeedProduct(data,need):index.get(entry.id);if(!p||!Number.isSafeInteger(p.price)||p.price<=0)return {...requested,missing:true};
  if(!approved&&!p.weighted&&!Number.isInteger(entry.quantity))return {...requested,missing:true,reason:'נדרשת כמות שלמה למוצר ארוז'};
  const subtotal=approved?approved.subtotal:Math.round(p.price*entry.quantity);shelfTotal+=subtotal;
  const promotions=(data.promotions||[]).filter(promotion=>promotion.items?.some(i=>(i.gtin||i.item_code?.padStart(14,'0'))===p.id)).slice(0,6).map(p=>({id:p.promotion_id,description:p.description,start:p.start_time,end:p.end_time,club:p.club_id,coupon:p.is_coupon,min_qty:p.min_qty,min_purchase_amount:p.min_purchase_amount,restrictions:p.additional_restrictions,remarks:p.remarks,calculated:false}));
  return {...requested,...(approved?{match_kind:'approved_alternative',matched_id:p.id,matched_name:p.name,matched_unit:p.unit,purchase_quantity:approved.purchase_quantity,purchase_label:p.weighted?(hasKilogramUnit(p)?'ק״ג':'יחידות מכירה'):'אריזות',quantity_ratio:approved.choice.ratio,manual_conversion:!!approved.choice.manual}:{}),...(need?{match_kind:'shopping_need',matched_id:p.id,matched_name:p.name,matched_attributes:attributes(p),matched_unit:p.unit}:{}),name:p.name,price:p.price,subtotal,weighted:p.weighted,updated_at:p.updated_at,promotions};});
 const missing=products.filter(p=>p.missing).map(p=>p.id);
 const published=Date.parse(store.published_at);const stale=!Number.isFinite(published)||now-published>36*3600000||published>now+300000;
 return {id:store.id,chain:store.chain,chain_name:store.chain_name,branch_name:store.name,city:store.city,address:store.address,published_at:store.published_at,checked_at:store.checked_at,source_files:store.source_files,stale,shelf_total:shelfTotal,total:missing.length?null:shelfTotal,missing_items:missing,matched_count:products.length-missing.length,requested_count:products.length,products,promotions_calculated:false};
}
export {summarize} from '../public/basket-summary.mjs';
