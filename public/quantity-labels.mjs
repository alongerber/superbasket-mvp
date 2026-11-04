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
 return replacement===original?'לרכישה: '+replacement:replacement+' במקום '+original;
}
