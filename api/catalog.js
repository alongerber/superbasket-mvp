import {manifest,catalog,search,publicProduct,apiError} from '../lib/data.mjs';
import {alternatives} from '../lib/alternatives.mjs';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 try{
  const q=String(req.query?.q||'').slice(0,120),limit=Math.max(1,Math.min(60,Math.floor(Number(req.query?.limit))||30)),offset=Math.max(0,Math.min(5000,Math.floor(Number(req.query?.offset))||0));
  const m=await manifest(),db=await catalog(m),sourceId=String(req.query?.alternatives_for||'').slice(0,90);
  res.setHeader('Cache-Control','public, max-age=60, s-maxage=120');
  if(sourceId){const source=db.prepare('SELECT * FROM products WHERE id=?').get(sourceId);if(!source)return res.status(404).json({error:'המוצר המקורי לא נמצא'});const rows=alternatives(db,source);return res.json({items:rows.map(p=>({...publicProduct(p),alternative:true,differences:p.differences})),source:publicProduct(source),as_of:m.generated_at,match_type:'suggested-alternative',requires_confirmation:true});}
  res.json({items:search(db,q,limit,offset).map(publicProduct),total:m.products,as_of:m.generated_at,has_more:true});
 }catch(e){return apiError(res,e);}
}
