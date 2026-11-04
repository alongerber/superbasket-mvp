export function summarize(rows,items,extraStopCost=0,{split:calculateSplit=true}={}){
 const complete=rows.filter(s=>!s.stale&&s.total!==null).sort((a,b)=>a.total-b.total||a.id.localeCompare(b.id));
 const best=complete[0]||null;const worst=complete.at(-1)||null;
 const eligible=rows.filter(s=>!s.stale&&s.matched_count>0);let split=null;
 // Exact exhaustive optimum among one or TWO stores, no exponential basket search.
 for(let a=0;calculateSplit&&a<eligible.length;a++)for(let b=a+1;b<eligible.length;b++){
  const pair=[eligible[a],eligible[b]],indexes=pair.map(s=>new Map(s.products.filter(p=>!p.missing).map(p=>[p.id,p])));let subtotal=0;const assignments=[];
  for(const item of items){const candidates=pair.map((s,i)=>({store_id:s.id,product:indexes[i].get(item.id)})).filter(x=>x.product).sort((a,b)=>a.product.subtotal-b.product.subtotal);if(!candidates.length)break;const chosen=candidates[0];subtotal+=chosen.product.subtotal;assignments.push({id:item.id,quantity:item.quantity,store_id:chosen.store_id,subtotal:chosen.product.subtotal});}
  if(assignments.length!==items.length||new Set(assignments.map(a=>a.store_id)).size<2)continue;
  const total=subtotal+extraStopCost;
  if((!best||total<best.total)&&(!split||total<split.total))split={stores:pair.map(s=>({id:s.id,name:s.chain_name+' · '+s.branch_name})),subtotal,extra_stop_cost:extraStopCost,total,saving:best?best.total-total:null,assignments};
 }
 return {best:best?.id||null,savings:best&&worst?worst.total-best.total:null,baseline:worst?.id||null,split,complete_count:complete.length};
}
