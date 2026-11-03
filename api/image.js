import {createImageResolver} from '../lib/product-images.mjs';
const resolveImage=createImageResolver();
export default async function handler(req,res){
 if(req.method&&req.method!=='GET')return res.status(405).json({error:'GET only'});
 const id=String(req.query?.id||'');if(!/^\d{14}$/.test(id))return res.status(400).json({image:null});
 const result=await resolveImage(id);
 res.setHeader('Cache-Control',result.temporary?'no-store':result.image?'public, max-age=86400, s-maxage=604800':'public, max-age=3600');
 return res.json(result);
}
