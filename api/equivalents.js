import {manifest,catalog,apiError} from '../lib/data.mjs';
import {equivalentCandidates,publicEquivalent} from '../lib/equivalents.mjs';
import {profile,conversion,differences} from '../public/product-equivalence.mjs';
export default async function handler(req,res){
 if(req.method&&req.method!=='GET')return res.status(405).json({error:'GET only'});
 const q=req.query||{},id=String(q.id||''),offset=Number(q.offset||0),limit=Number(q.limit||20),search=String(q.q||'').trim();
 if(!/^([0-9]{14}|[a-z0-9-]+:[0-9]{1,30})$/.test(id)||!Number.isInteger(offset)||offset<0||offset>2000||!Number.isInteger(limit)||limit<1||limit>40||search.length>120)return res.status(400).json({error:'בקשת חלופות לא תקינה'});
 try{const m=await manifest(),db=await catalog(m),source=db.prepare('SELECT * FROM products WHERE id=?').get(id);if(!source)return res.status(404).json({error:'המוצר לא נמצא במאגר'});
 const options={keepSize:q.keep_size==='1',keepSpecs:q.keep_specs!=='0',keepMaker:q.keep_maker==='1'},all=equivalentCandidates(db,source,search,options);
 const selected=String(q.selected||'').split(',').filter(Boolean);if(selected.length>20||selected.some(id=>!/^([0-9]{14}|[a-z0-9-]+:[0-9]{1,30})$/.test(id)))return res.status(400).json({error:'רשימת החלופות אינה תקינה'});
 const lookup=db.prepare('SELECT * FROM products WHERE id=?'),approved=selected.map(id=>lookup.get(id)).filter(Boolean).map(p=>publicEquivalent({...p,profile:profile(p),conversion:conversion(source,p),differences:differences(source,p)}));
 res.setHeader('Cache-Control','no-store');res.json({source:publicEquivalent(source),items:all.slice(offset,offset+limit).map(publicEquivalent),selected:approved,total_candidates:all.length,has_more:offset+limit<all.length,requires_confirmation:true,classification:'source_name_inference',as_of:m.generated_at});
 }catch(e){return apiError(res,e)}
}
