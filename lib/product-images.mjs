export function createImageResolver(fetcher=fetch,now=Date.now){
 const cache=new Map(),pending=new Map();let nextRequest=0;
 return async id=>{
  const previous=cache.get(id);if(previous&&previous.expires>now())return previous.value;
  if(pending.has(id))return pending.get(id);
  if(now()<nextRequest)return {image:null,retry_after:Math.ceil((nextRequest-now())/1000),temporary:true};
  nextRequest=now()+6500;
  const task=(async()=>{try{
   const code=/^0{6}\d{8}$/.test(id)?id.slice(6):id.replace(/^0(?=\d{13}$)/,'');
   const r=await fetcher(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=code,image_front_small_url`,{headers:{'User-Agent':'Salik/3.1 (https://superbasket-mvp.vercel.app)'},signal:AbortSignal.timeout(12000)});
   if(!r.ok&&r.status!==404)throw Error('Temporary image service failure');
   const d=await r.json();
   if(d.status!==0&&d.status!==1)throw Error('Unrecognized image response');
   const url=d.product?.image_front_small_url;
   const valid=d.status===1&&String(d.product?.code).padStart(14,'0')===id&&typeof url==='string'&&/^https:\/\/images\.openfoodfacts\.org\/images\/products\//.test(url);
   const value={image:valid?url:null,source:valid?'Open Food Facts':null,source_url:valid?`https://world.openfoodfacts.org/product/${code}`:null,license:valid?'CC BY-SA 3.0':null};
   cache.set(id,{value,expires:now()+(valid?7*86400000:3600000)});while(cache.size>1000)cache.delete(cache.keys().next().value);
   return value;
  }catch{return {image:null,temporary:true,retry_after:60};}finally{pending.delete(id);}})();
  pending.set(id,task);return task;
 };
}
