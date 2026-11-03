// Official shopping destinations checked 2026-11-03. No cart-transfer API is connected.
export const retailers=Object.freeze([
 {id:'rami-levy',name:'רמי לוי',url:'https://www.rami-levy.co.il/he/'},
 {id:'shufersal',name:'שופרסל',url:'https://www.shufersal.co.il/online/'},
 {id:'victory',name:'ויקטורי',url:'https://www.victoryonline.co.il/'}
]);
export function shoppingList(items){return items.map(p=>`${p.name} × ${p.quantity}${p.barcode?' · ברקוד '+p.barcode:''}`).join('\n');}
