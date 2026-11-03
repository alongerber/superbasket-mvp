import {manifest,branch,mapLimit,apiError} from '../lib/data.mjs';
import {validateItems,compareBranch,summarize} from '../lib/compare.mjs';
import {basketScope} from '../lib/basket-scope.mjs';
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 let items;try{items=validateItems(req.body?.items);}catch(e){return res.status(400).json({error:e.message});}
 const extra=Number(req.body.extra_stop_cost??0);
 if(!Number.isFinite(extra)||extra<0||extra>1000)return res.status(400).json({error:'עלות עצירה נוספת אינה תקינה'});
 try{basketScope([],req.body);}catch(e){return res.status(400).json({error:e.message});}
 try{
  const m=await manifest();
  if(req.body.as_of&&req.body.as_of!==m.generated_at)return res.status(409).json({error:'המחירונים התעדכנו בזמן הבדיקה. לחצו שוב על השוואה לקבלת תוצאה מאותו עדכון.',code:'SNAPSHOT_CHANGED'});
  const scope=basketScope(m.stores,req.body);
  if(!scope.total)return res.status(404).json({error:'עדיין אין מחירונים מאומתים באזור שבחרת. אפשר לבחור סניפים במסך הכיסוי.'});
  const results=await mapLimit(scope.stores,4,async s=>{try{return compareBranch(s,await branch(s),items);}catch{return {id:s.id,error:'מחירון הסניף לא נטען'};}});
  const errors=results.filter(r=>r.error),rows=results.filter(r=>!r.error).sort((a,b)=>Number(a.stale)-Number(b.stale)||a.missing_items.length-b.missing_items.length||a.shelf_total-b.shelf_total);
  let promotionDetailsOmitted=false;
  if(Buffer.byteLength(JSON.stringify(rows))>3500000){promotionDetailsOmitted=true;for(const s of rows)for(const p of s.products){delete p.promotions;delete p.name;delete p.updated_at;}}
  res.setHeader('Cache-Control','no-store');res.json({stores:rows,promotion_details_omitted:promotionDetailsOmitted,...summarize(rows,items,Math.round(extra*100)),errors,total_stores:scope.total,checked_stores:scope.stores.length,offset:scope.offset,next_offset:scope.next_offset,partial:scope.offset>0||scope.next_offset!==null,as_of:m.generated_at,currency:'ILS',amount_unit:'agorot',source:'official-transparency-files',promotions_calculated:false});
 }catch(e){return apiError(res,e);}
}
