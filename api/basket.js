import {manifest,branch,mapLimit,normalize,apiError} from '../lib/data.mjs';
import {validateItems,compareBranch,summarize} from '../lib/compare.mjs';
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 let items;try{items=validateItems(req.body?.items);}catch(e){return res.status(400).json({error:e.message});}
 const city=String(req.body.city||'').slice(0,80),selected=req.body.store_ids;const extra=Number(req.body.extra_stop_cost??10);
 if(!Number.isFinite(extra)||extra<0||extra>1000)return res.status(400).json({error:'עלות עצירה נוספת אינה תקינה'});
 if(selected!==undefined&&(!Array.isArray(selected)||selected.length>60||selected.some(s=>typeof s!=='string')))return res.status(400).json({error:'יש לבחור עד 60 סניפים'});
 if(!city.trim()&&!selected?.length)return res.status(400).json({error:'יש לבחור עיר או סניפים להשוואה'});
 try{
  const m=await manifest();let stores=m.stores.filter(s=>s.object&&(req.body.include_delivery===true||s.chain!=='wolt'));
  if(selected?.length)stores=stores.filter(s=>selected.includes(s.id));else stores=stores.filter(s=>normalize(s.city)===normalize(city)||(normalize(s.city)===''&&normalize(s.name+' '+s.address).includes(normalize(city))));
  if(!stores.length)return res.status(404).json({error:'עדיין אין מחירונים מאומתים באזור שבחרת. אפשר לבחור סניפים במסך הכיסוי.'});
  if(stores.length>60)return res.status(422).json({error:'נמצאו יותר מ־60 סניפים. בחרו סניפים להשוואה במסנן.',stores:stores.map(s=>({id:s.id,name:s.chain_name+' '+s.name}))});
  const results=await mapLimit(stores,6,async s=>{try{return compareBranch(s,await branch(s),items);}catch{return {id:s.id,error:'מחירון הסניף לא נטען'};}});
  const errors=results.filter(r=>r.error),rows=results.filter(r=>!r.error).sort((a,b)=>Number(a.stale)-Number(b.stale)||a.missing_items.length-b.missing_items.length||a.shelf_total-b.shelf_total);
  if(!rows.length)throw Error('All requested branch downloads failed');
  let promotionDetailsOmitted=false;
  if(Buffer.byteLength(JSON.stringify(rows))>3500000){promotionDetailsOmitted=true;for(const s of rows)for(const p of s.products){delete p.promotions;delete p.name;delete p.updated_at;}}
  res.setHeader('Cache-Control','no-store');res.json({stores:rows,promotion_details_omitted:promotionDetailsOmitted,...summarize(rows,items,Math.round(extra*100)),errors,as_of:m.generated_at,currency:'ILS',amount_unit:'agorot',source:'official-transparency-files',promotions_calculated:false});
 }catch(e){return apiError(res,e);}
}
