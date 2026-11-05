import {quantityLabel} from './quantity-labels.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function quantityControls(p,quantity=0,plus='add',minus='subtract'){
 return `<div class="product-quantity ${quantity?'has-quantity':''}">${quantity?`<button data-${minus}="${esc(p.id)}" aria-label="הפחתת ${esc(p.name)}">−</button><span aria-label="${esc(quantityLabel(p,quantity))} בסל">${quantity}</span>`:''}<button data-${plus}="${esc(p.id)}" aria-label="הוספת ${esc(p.name)}">${quantity?'＋':'＋ הוספה'}</button></div>`;
}
