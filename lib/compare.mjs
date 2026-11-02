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
 return {id:store.id,chain_name:store.chain_name,branch_name:store.name,city:store.city,address:store.address,published_at:store.published_at,checked_at:store.checked_at,source_files:store.source_files,stale,shelf_total:shelfTotal,total:missing.length?null:shelfTotal,missing_items:missing,matched_count:products.length-missing.length,requested_count:products.length,products,promotions_calculated:false};
}
export function summarize(rows,items,extraStopCost=0){
 const complete=rows.filter(s=>!s.stale&&s.total!==null).sort((a,b)=>a.total-b.total||a.id.localeCompare(b.id));
 const best=complete[0]||null;const worst=complete.at(-1)||null;
 const eligible=rows.filter(s=>!s.stale&&s.matched_count>0);let split=null;
 // Exact exhaustive optimum among one or TWO stores, no exponential basket search.
 for(let a=0;a<eligible.length;a++)for(let b=a+1;b<eligible.length;b++){
  const pair=[eligible[a],eligible[b]],indexes=pair.map(s=>new Map(s.products.filter(p=>!p.missing).map(p=>[p.id,p])));let subtotal=0;const assignments=[];
  for(const item of items){const candidates=pair.map((s,i)=>({store_id:s.id,product:indexes[i].get(item.id)})).filter(x=>x.product).sort((a,b)=>a.product.subtotal-b.product.subtotal);if(!candidates.length)break;const chosen=candidates[0];subtotal+=chosen.product.subtotal;assignments.push({id:item.id,quantity:item.quantity,store_id:chosen.store_id,subtotal:chosen.product.subtotal});}
  if(assignments.length!==items.length||new Set(assignments.map(a=>a.store_id)).size<2)continue;
  const total=subtotal+extraStopCost;
  if((!best||total<best.total)&&(!split||total<split.total))split={stores:pair.map(s=>({id:s.id,name:s.chain_name+' · '+s.branch_name})),subtotal,extra_stop_cost:extraStopCost,total,saving:best?best.total-total:null,assignments};
 }
 return {best:best?.id||null,savings:best&&worst?worst.total-best.total:null,baseline:worst?.id||null,split,complete_count:complete.length};
}
