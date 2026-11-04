import {needProduct} from '../public/product-needs.mjs';
import {manifest,catalog,publicProduct,branch,mapLimit,apiError} from '../lib/data.mjs';
import {productScope,productPrice} from '../lib/product-prices.mjs';
export default async function handler(req,res) {
  if(req.method && req.method !== 'GET') return res.status(405).json({error:'GET only'});
  const query=req.query || {}, id=String(query.id || '').slice(0,90);
  if(!id) return res.status(400).json({error:'יש לבחור מוצר'});
  try { productScope([],query); } catch(e) { return res.status(400).json({error:e.message}); }
  try {
    const m=await manifest(), db=await catalog(m), p=needProduct(id)||db.prepare('SELECT * FROM products WHERE id=?').get(id);
    if(!p) return res.status(404).json({error:'המוצר לא נמצא'});
    const product=p.need?p:publicProduct(p);if(product.identity.chain)product.identity.chain_name=m.stores.find(s=>s.chain===product.identity.chain)?.chain_name||product.identity.chain;
    const scope=productScope(m.stores.filter(s=>!product.identity.chain||s.chain===product.identity.chain),query);
    const rows=await mapLimit(scope.stores,4,async s=>{
      try {return {price:productPrice(s,await branch(s),id)};}
      catch {return {error:{store_id:s.id,store_name:s.chain_name+' · '+s.name}};}
    });
    const prices=rows.map(r=>r.price).filter(Boolean).sort((a,b)=>Number(a.stale)-Number(b.stale)||a.price-b.price);
    res.setHeader('Cache-Control','no-store');
    res.json({product,prices,errors:rows.filter(r=>r.error).map(r=>r.error),
      checked_stores:scope.stores.length,missing_prices:rows.filter(r=>!r.error&&!r.price).length,
      total_stores:scope.total,offset:scope.offset,next_offset:scope.next_offset,as_of:m.generated_at,
      history_note:'ההיסטוריה מתחילה בקליטה הראשונה; אין השלמה של נתונים קודמים.'});
  } catch(e) {return apiError(res,e);}
}
