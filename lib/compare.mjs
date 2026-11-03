// Integer agorot throughout. No automatic name matching or silent substitutions.
export function validateItems(items){
 if(!Array.isArray(items)||!items.length||items.length>200)throw Error('יש לבחור בין 1 ל־200 מוצרים');
 const map=new Map();for(const item of items){
  if(!item||typeof item.id!=='string'||item.id.length>90||!/^([0-9]{14}|[a-z0-9-]+:[a-zA-Z0-9._-]+)$/.test(item.id)||!Number.isFinite(item.quantity)||item.quantity<=0||item.quantity>99)throw Error('מוצר או כמות לא תקינים');
  const quantity=Math.round(((map.get(item.id)?.quantity||0)+item.quantity)*1000)/1000;
  if(quantity>99)throw Error('הכמות המרבית למוצר היא 99');map.set(item.id,{id:item.id,quantity});
 }return [...map.values()];
}
export function compareBranch(store,data,items,now=Date.now()){
 const index=new Map(data.products.map(p=>[p.id,p]));let shelfTotal=0;
 const products=items.map(entry=>{const p=index.get(entry.id);if(!p||!Number.isSafeInteger(p.price)||p.price<=0)return {...entry,missing:true};
  if(!p.weighted&&!Number.isInteger(entry.quantity))return {...entry,missing:true,reason:'נדרשת כמות שלמה למוצר ארוז'};
  const subtotal=Math.round(p.price*entry.quantity);shelfTotal+=subtotal;
  const promotions=(data.promotions||[]).filter(p=>p.items?.some(i=>(i.gtin||i.item_code?.padStart(14,'0'))===entry.id)).slice(0,6).map(p=>({id:p.promotion_id,description:p.description,start:p.start_time,end:p.end_time,club:p.club_id,coupon:p.is_coupon,min_qty:p.min_qty,min_purchase_amount:p.min_purchase_amount,restrictions:p.additional_restrictions,remarks:p.remarks,calculated:false}));
  return {...entry,name:p.name,price:p.price,subtotal,weighted:p.weighted,updated_at:p.updated_at,promotions};});
 const missing=products.filter(p=>p.missing).map(p=>p.id);
 const published=Date.parse(store.published_at);const stale=!Number.isFinite(published)||now-published>36*3600000||published>now+300000;
 return {id:store.id,chain:store.chain,chain_name:store.chain_name,branch_name:store.name,city:store.city,address:store.address,published_at:store.published_at,checked_at:store.checked_at,source_files:store.source_files,stale,shelf_total:shelfTotal,total:missing.length?null:shelfTotal,missing_items:missing,matched_count:products.length-missing.length,requested_count:products.length,products,promotions_calculated:false};
}
export {summarize} from '../public/basket-summary.mjs';
