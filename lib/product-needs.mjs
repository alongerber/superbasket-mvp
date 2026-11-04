import {needProduct,queryNeeds,matchesNeed,hasKilogramUnit} from '../public/product-needs.mjs';
const caches=new WeakMap();
export function catalogNeeds(db,query='',category=''){
 const suggestions=queryNeeds(query,category);if(!suggestions.length)return [];
 let rows=caches.get(db);if(!rows){rows=db.prepare('SELECT id,name,weighted,unit FROM products WHERE weighted=1').all();caches.set(db,rows);}
 return suggestions.map(p=>({...p,matched_products:rows.filter(r=>hasKilogramUnit(r)&&matchesNeed(r,p.need)).length})).filter(p=>p.matched_products>0);
}
export {needProduct};
