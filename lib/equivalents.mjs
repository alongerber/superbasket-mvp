import {queryTerms,rankEquivalents,profile,conversion} from '../public/product-equivalence.mjs';
import {search,publicProduct} from './data.mjs';
export function equivalentCandidates(db,source,query='',options={}){
 let candidates;if(query)candidates=search(db,query,600,0);else{const terms=queryTerms(source);if(!terms.length)return [];const match=terms.map(w=>'"'+w.replaceAll('"','')+'"*').join(' OR ');candidates=db.prepare('SELECT p.* FROM product_search f JOIN products p ON p.id=f.id WHERE product_search MATCH ? ORDER BY p.stores DESC LIMIT 1800').all(match);}
 return rankEquivalents(source,candidates,{...options,manualSearch:!!query});
}
export function publicEquivalent(p){return {...publicProduct(p),profile:p.profile||profile(p),conversion:p.conversion,differences:p.differences||[]};}
export function resolveApprovedChoices(db,items){
 const lookup=db.prepare('SELECT * FROM products WHERE id=?');
 return items.map(item=>{if(!item.alternatives?.length)return item;const source=lookup.get(item.id);if(!source)throw Error('המוצר המקורי לא נמצא בקטלוג');if(!source.weighted&&!Number.isInteger(item.quantity))throw Error('למוצר המקורי נדרשת כמות שלמה של אריזות');const choices=[{id:source.id,ratio:1,weighted:!!source.weighted}];for(const approved of item.alternatives){const candidate=lookup.get(approved.id);if(!candidate)throw Error('חלופה מאושרת לא נמצאה בקטלוג');const c=conversion(source,candidate),ratio=approved.manual_ratio??(c.automatic?c.ratio:null);if(!Number.isFinite(ratio)||ratio<=0||ratio>100)throw Error('יש לאשר יחס כמויות לחלופה שגודלה אינו ברור');choices.push({id:candidate.id,ratio,weighted:!!candidate.weighted,manual:approved.manual_ratio!==undefined,require_kg:!!candidate.weighted&&approved.manual_ratio===undefined});}return {...item,choices};});
}
