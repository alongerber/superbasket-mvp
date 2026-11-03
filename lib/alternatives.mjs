import {alternativeTerms,rankAlternatives} from '../public/product-identity.mjs';
export function alternatives(db,source){
 const terms=alternativeTerms(source.name),word=terms[0];if(!word)return [];
 const query='"'+word.replaceAll('"','')+'"*';
 const candidates=db.prepare('SELECT p.* FROM product_search f JOIN products p ON p.id=f.id WHERE product_search MATCH ? AND p.weighted=? ORDER BY p.stores DESC LIMIT 500').all(query,Number(Boolean(source.weighted)));
 return rankAlternatives(source,candidates);
}
