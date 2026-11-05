import {alternativesKey} from './product-equivalence.mjs';
export const draftKey=rows=>JSON.stringify(rows.map(r=>[String(r.query).normalize('NFKC').trim(),r.quantity]));
export function restoreDraft(pending,draft){
 return pending.map((r,i)=>({...r,selected:draft?.key===draftKey(pending)&&draft.rows?.[i]?.id?draft.rows[i]:null}));
}
export function groupStoreOptions(stores,selectedId){
 const groups=new Map();
 for(const store of stores){const key=JSON.stringify([store.chain||store.chain_name,store.total]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(store);}
 return [...groups.values()].map(branches=>({branches,representative:branches.find(s=>s.id===selectedId)||branches[0]}));
}
// A previous quote is contextual information, never a price for a changed basket.
export function previousLine(previous,item,storeId){
 const original=previous?.items.find(p=>p.id===item.id);
 if(!original||original.quantity!==item.quantity||alternativesKey(original)!==alternativesKey(item))return null;
 const store=previous.stores.find(s=>s.id===storeId)||previous.stores.find(s=>s.id===previous.best);
 const row=store?.products.find(p=>p.id===item.id);
 return row&&!row.missing&&Number.isSafeInteger(row.subtotal)?{store,row}:null;
}
export function eventSession(previous,current){
 return previous&&current.city===previous.city&&Date.parse(current.at)-Date.parse(previous.at)<30*60000;
}
