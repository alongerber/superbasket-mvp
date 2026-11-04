import {scopeKey,QUOTE_TTL} from './live-basket.mjs';
export function localMinima(quote,now=Date.now()){
 const prices=new Map();for(const store of quote.stores){const time=Date.parse(store.published_at);if(store.stale||!Number.isFinite(time)||now-time>36*3600000||time>now+300000)continue;for(const p of store.products){if(p.missing||!Number.isSafeInteger(p.price)||p.price<=0)continue;const prev=prices.get(p.id);if(!prev||p.price<prev.price)prices.set(p.id,{price:p.price,chain:store.chain_name,branch:store.branch_name,published_at:store.published_at});}}return prices;
}
export function createLocalPrices({load,emit,now=Date.now,delay=500}){
 let controller,sequence=0,timer;const cache=new Map();
 function cancel(){sequence++;clearTimeout(timer);controller?.abort();}
 function update(request){cancel();const version=sequence,key=scopeKey(request),ids=request.items.map(p=>p.id),cached=cache.get(key);if(cached&&now()-cached.at<QUOTE_TTL&&ids.every(id=>cached.ids.has(id))){emit({phase:'ready',prices:cached.prices,scope:key,checkedAt:cached.at});return;}emit({phase:'loading',prices:new Map(),scope:key});if(!ids.length)return;controller=new AbortController();const signal=controller.signal;timer=setTimeout(async()=>{try{const quote=await load(request,signal);if(version!==sequence||signal.aborted)return;const prices=localMinima(quote,now());cache.set(key,{at:now(),prices,ids:new Set(ids)});while(cache.size>3)cache.delete(cache.keys().next().value);emit({phase:'ready',prices,scope:key,errors:quote.errors.length,checkedAt:now()});}catch(e){if(version===sequence&&!signal.aborted){console.warn('Local price check:',e.message);emit({phase:'error',prices:new Map(),scope:key});}}},delay);}
 return {update,cancel};
}
