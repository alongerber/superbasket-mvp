import {packageMeasure} from './product-equivalence.mjs';
const measure=p=>p.profile?.measure??packageMeasure(p);
const number=n=>new Intl.NumberFormat('he-IL',{maximumFractionDigits:3}).format(n);
export function saleUnit(p,n){return p.weighted?(measure(p)?.weighted?'ק״ג':n===1?'יחידת מכירה במשקל':'יחידות מכירה במשקל'):n===1?'אריזה':'אריזות';}
export function quantityLabel(p,n){
 const size=measure(p),base=`${number(n)} ${saleUnit(p,n)}`;
 // Weight already describes the amount being bought; only packaged goods have a size per pack.
 return base+(!p.weighted&&size?.label?' של '+size.label:'');
}
export function replacementLabel(source,sourceQuantity,candidate,purchaseQuantity){
 if(purchaseQuantity===null)return 'בחרו כמה לקנות במקום הכמות שברשימה';
 const original=quantityLabel(source,sourceQuantity),replacement=quantityLabel(candidate,purchaseQuantity);
 const a=measure(source),b=measure(candidate),sameAmount=sourceQuantity===purchaseQuantity&&!!source.weighted===!!candidate.weighted&&a&&b&&a.basis===b.basis&&a.amount===b.amount;
 return replacement===original||sameAmount?'לרכישה: '+replacement:replacement+' במקום '+original;
}

export const countLabel=(n,singular,plural)=>`${number(n)} ${n===1?singular:plural}`;
export function purchaseLabel(n,label){return countLabel(n,n===1?({"יחידות":"יחידה","אריזות":"אריזה","מוצרים":"מוצר","כוסות":"כוס","כפות":"כף","כפיות":"כפית"}[label]||label):label,label);}
export function replacementAmount(source,sourceQuantity,candidate,purchaseQuantity){
 const a=measure(source),b=measure(candidate);
 if(!a||!b||a.basis!==b.basis||!Number.isFinite(purchaseQuantity)||purchaseQuantity<=0)return '';
 const total=b.amount*purchaseQuantity,wanted=a.amount*sourceQuantity,extra=Math.round((total-wanted)*1000)/1000;
 const amount=value=>b.basis==='mass'?(value>=1000?number(value/1000)+' ק״ג':number(value)+' גרם'):b.basis==='volume'?(value>=1000?number(value/1000)+' ליטר':number(value)+' מ״ל'):purchaseLabel(value,'יחידות');
 if(candidate.weighted&&Math.abs(extra)<.001)return '';
 return 'סה״כ '+amount(total)+(extra>.001?' · '+amount(extra)+' מעבר לכמות המקורית':extra<-.001?' · פחות '+amount(-extra)+' מהכמות המקורית':'');
}
