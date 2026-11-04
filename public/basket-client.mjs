import {summarize} from './basket-summary.mjs';
// Every page participates in the final ranking and two-store split calculation.
export async function collectBasket(fetchPage,request,onProgress=()=>{},signal){
 const rows=[],errors=[],seen=new Set();let offset=0,snapshot,total,checked=0,omitted=false;
 do{
  signal?.throwIfAborted();
  const d=await fetchPage({...request,offset,limit:request.page_size===24?24:12,...(snapshot?{as_of:snapshot}:{})});
  signal?.throwIfAborted();
  if(snapshot&&snapshot!==d.as_of)throw Error('המחירונים התעדכנו בזמן הבדיקה. יש להשוות שוב.');
  if(!Number.isInteger(d.total_stores)||d.total_stores<0||(total!==undefined&&total!==d.total_stores)||d.offset!==offset||d.checked_stores!==d.stores.length+d.errors.length)throw Error('התקבלה השוואה לא שלמה. נסו שוב.');
  snapshot=d.as_of;total=d.total_stores;
  for(const row of [...d.stores,...d.errors]){if(!row.id||seen.has(row.id))throw Error('סניף חזר פעמיים בבדיקה. נסו שוב.');seen.add(row.id);}
  rows.push(...d.stores);errors.push(...d.errors);checked+=d.checked_stores;omitted||=d.promotion_details_omitted;
  if(d.next_offset!==null&&(!Number.isInteger(d.next_offset)||d.next_offset<=offset||d.next_offset!==checked||d.next_offset>=total))throw Error('טווח ההשוואה השתנה. נסו שוב.');
  offset=d.next_offset;onProgress({checked,total,errors:errors.length});
 }while(offset!==null);
 if(checked!==total)throw Error('לא כל הסניפים נבדקו. נסו שוב.');
 if(!rows.length)throw Error('מחירוני הסניפים לא נטענו. נסו שוב בעוד רגע.');
 rows.sort((a,b)=>Number(a.stale)-Number(b.stale)||a.missing_items.length-b.missing_items.length||a.shelf_total-b.shelf_total||a.id.localeCompare(b.id));
 return {stores:rows,errors,total_stores:total,checked_stores:checked,as_of:snapshot,items:request.items,promotion_details_omitted:omitted,...summarize(rows,request.items,Math.round(request.extra_stop_cost*100),{split:request.compute_split!==false})};
}
