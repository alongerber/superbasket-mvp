import {manifest,catalog,search,publicProduct,apiError} from '../lib/data.mjs';
import {alternatives} from '../lib/alternatives.mjs';
import {categorySearch} from '../lib/categories.mjs';
import {categoryMap} from '../public/taxonomy.mjs';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const category=String(req.query?.category||'');if(category&&!categoryMap.has(category))return res.status(400).json({error:'קטגוריה לא מוכרת'});
 try{
  const q=String(req.query?.q||'').slice(0,120),limit=Math.max(1,Math.min(60,Math.floor(Number(req.query?.limit))||30)),offset=Math.max(0,Math.min(200000,Math.floor(Number(req.query?.offset))||0));
  const m=await manifest(),db=await catalog(m),sourceId=String(req.query?.alternatives_for||'').slice(0,90);
  res.setHeader('Cache-Control','public, max-age=60, s-maxage=120');
  if(sourceId){const source=db.prepare('SELECT * FROM products WHERE id=?').get(sourceId);if(!source)return res.status(404).json({error:'המוצר המקורי לא נמצא'});const rows=alternatives(db,source);return res.json({items:rows.map(p=>({...publicProduct(p),alternative:true,differences:p.differences})),source:publicProduct(source),as_of:m.generated_at,match_type:'suggested-alternative',requires_confirmation:true});}
  if(category){const d=categorySearch(db,category,q,limit,offset);return res.json({...d,items:d.items.map(publicProduct),category,as_of:m.generated_at});}
  const rows=search(db,q,limit+1,offset);res.json({items:rows.slice(0,limit).map(publicProduct),total:m.products,as_of:m.generated_at,has_more:rows.length>limit});
 }catch(e){return apiError(res,e);}
}
