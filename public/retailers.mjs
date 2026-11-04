// Official shopping destinations checked 2026-11-03. No cart-transfer API is connected.
export const retailers=Object.freeze([
 {id:'rami-levy',name:'רמי לוי',url:'https://www.rami-levy.co.il/he/'},
 {id:'shufersal',name:'שופרסל',url:'https://www.shufersal.co.il/online/'},
 {id:'victory',name:'ויקטורי',url:'https://www.victoryonline.co.il/'}
]);
// Keep source row IDs for checklist actions, but purchase the branch's selected product.
export function purchaseItems(items,store){
 const rows=new Map((store&&!store.stale?store.products:[]).map(p=>[p.id,p]));
 return items.map(p=>{const row=rows.get(p.id),matched=row&&!row.missing&&row.matched_id;
  const actual=matched?{...p,name:row.matched_name||p.name,quantity:row.purchase_quantity??p.quantity,weighted:!!row.weighted,barcode:/^\d+$/.test(row.matched_id)?row.matched_id:undefined,purchase_label:row.purchase_label||(row.weighted?'ק״ג':'יחידות'),source_name:p.name,matched_id:row.matched_id}:{...p};
  return {...actual,check_key:JSON.stringify([store?.id||'',actual.matched_id||p.id,actual.quantity])};
 });
}
export function shoppingList(items){return items.map(p=>`${p.name} × ${p.quantity}${p.purchase_label?' '+p.purchase_label:p.weighted?' ק״ג':''}${p.barcode?' · ברקוד '+p.barcode:''}`).join('\n');}
