import {priceCoverage,pricedLine} from './basket-prices.mjs';
import {purchaseQuantity} from './product-equivalence.mjs';
export function shoppingReadiness(results,items,store,pendingCount=0){
 const coverage=priceCoverage(store,items),issues=coverage.lines.filter(p=>!p.priced||coverage.stale).map(({item})=>{
  const elsewhere=(results?.stores||[]).filter(s=>!s.stale&&s.products.some(p=>p.id===item.id&&pricedLine(p)));
  return {item,elsewhere:elsewhere.length,reason:elsewhere.length?`לבחירה הזאת יש מחיר ב־${elsewhere.length} סניפים שנבדקו, אך לא מחיר עדכני בסניף המוצג.`:'לא נמצא מחיר עדכני לבחירה הזאת בסניפים שנבדקו.'};
 });
 return {issues,pendingCount,count:issues.length+pendingCount,cartReady:coverage.complete,ready:coverage.complete&&pendingCount===0,priced:coverage.priced.length,reference:store};
}
export function quantityRatio(baseQuantity,purchase,weighted=false){
 if(!Number.isFinite(baseQuantity)||baseQuantity<=0||!Number.isFinite(purchase)||purchase<=0||purchase>99||(!weighted&&!Number.isInteger(purchase))||weighted&&Math.abs(purchase*1000-Math.round(purchase*1000))>1e-7)throw Error('בחרו כמות תקינה לרכישה');
 const ratio=purchase/baseQuantity;if(ratio<.001||ratio>100)throw Error('הכמות רחוקה מדי מהכמות המקורית');return ratio;
}
export function replacementQuantity(sourceQuantity,candidate,manualRatio){const ratio=manualRatio??(candidate.conversion?.automatic?candidate.conversion.ratio:null);return ratio===null?null:purchaseQuantity(sourceQuantity,ratio,!!candidate.weighted);}
export function previewPrice(quote,id,preferred){
 const rows=(quote?.stores||[]).filter(s=>!s.stale).flatMap(store=>{const row=store.products.find(p=>p.id===id);return pricedLine(row)?[{store,row}]:[];});
 return rows.find(p=>p.store.id===preferred)||rows.sort((a,b)=>a.row.subtotal-b.row.subtotal||a.store.id.localeCompare(b.store.id))[0]||null;
}
