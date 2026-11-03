import {aiAvailability} from '../public/planner-capabilities.mjs';
import {manifest,catalog,search,publicProduct} from '../lib/data.mjs';
import {validateRequest,templatePlan,normalizePlan} from '../public/planning.mjs';
import {generateShoppingPlan,requestToken} from '../lib/shopping-ai.mjs';
import {createHash} from 'node:crypto';
const visits=new Map();
function limited(req){const key=createHash('sha256').update(String(req.headers?.['x-forwarded-for']||'local').split(',')[0]).digest('hex'),now=Date.now();if(visits.size>2000)for(const [k,v]of visits)if(now-v.at>60000)visits.delete(k);const v=visits.get(key);if(!v||now-v.at>60000){visits.set(key,{at:now,n:1});return false;}return ++v.n>8;}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method==='GET')return res.json({mode:'free-model-only',ai_ready:aiAvailability.ready,availability_reason:aiAvailability.reason,ai_configured:!!requestToken(req),provider:'NVIDIA',retention_note:'בקשות AI נשלחות ל־NVIDIA, שעשויה לשמור אותן לשיפור המודל.'});if(req.method!=='POST')return res.status(405).json({error:'POST only'});const body=req.body||{};if(JSON.stringify(body).length>16000)return res.status(413).json({error:'הבקשה ארוכה מדי'});const origin=req.headers?.origin,host=req.headers?.host;if(origin&&host){try{if(new URL(origin).host!==host)return res.status(403).json({error:'יש לשלוח את הבקשה מתוך האתר'});}catch{return res.status(403).json({error:'מקור בקשה לא תקין'});}}
 if(!['generate','match','template'].includes(body.action))return res.status(400).json({error:'פעולת תכנון לא תקינה'});
 try{
  if(body.action==='match'){const plan=normalizePlan({ingredients:body.ingredients}),m=await manifest(),db=await catalog(m);const items=plan.ingredients.map(item=>{let found=search(db,item.query,12);if(!found.length&&item.query.split(' ').length>1)found=search(db,item.query.split(' ').slice(0,2).join(' '),12);const weighted=['g','kg'].includes(item.unit);found.sort((a,b)=>Number(b.weighted===Number(weighted))-Number(a.weighted===Number(weighted))||b.stores-a.stores);return {...item,candidates:found.slice(0,5).map(publicProduct)};});return res.json({items,as_of:m.generated_at,requires_confirmation:true});}
  const request=validateRequest(body);if(request.mode==='recipe'&&!request.recipe)throw Error('הדביקו מתכון או כתבו מה רוצים להכין.');if(body.action==='template')return res.json(templatePlan(request));if(limited(req))return res.status(429).json({error:'בוצעו כמה בקשות ברצף. נסו שוב בעוד דקה.',code:'RATE_LIMITED'});
  const plan=await generateShoppingPlan(request,{token:requestToken(req)});return res.json(plan);
 }catch(e){const ai=body.action!=='match'&&body.action!=='template';return res.status(e.code?503:ai?422:400).json({error:e.message||'התכנון לא הושלם',code:e.code||'INVALID_PLAN',fallback_available:ai,...(e.provider_status?{provider_status:e.provider_status,provider_code:e.provider_code,setup_reason:e.setup_reason}:{})});}
}
