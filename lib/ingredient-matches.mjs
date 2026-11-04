const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const processed=['כבוש','כבושה','כבושים','חמוץ','חמוצים','רוטב','מיץ','תרכיז','סירופ','עוגה','עוגיות','משקה','חטיף','בטעם','מיונז','במיונז','טחינה','בטחינה','קלוי','קלויים','מלח','במלח','חומץ','בחומץ','יבש','יבשים','מיובש','מיובשים','תבלין','סלט','סלטי','ריבה'];
// A fresh ingredient should not prefer a processed product merely because it is
// packaged and the recipe expresses the ingredient as a count instead of kg.
export function rankIngredientCandidates(ingredient,products){
 const query=normalize(ingredient.query),name=normalize(ingredient.name),wanted=new Set((query+' '+name).split(' ')),fresh=ingredient.group==='produce';
 const scored=products.flatMap(product=>{
  const label=normalize(product.name),words=label.split(' ');
  if(fresh&&processed.some(word=>words.includes(word)&&!wanted.has(word)))return [];
  const exact=label===query||label===name,starts=label.startsWith(query+' ')||label.startsWith(name+' ');
  const preferredWeight=fresh||['g','kg'].includes(ingredient.unit);
  return [{product,score:(exact?100:starts?40:0)+(Boolean(product.weighted)===preferredWeight?10:0)}];
 });
 return scored.sort((a,b)=>b.score-a.score||b.product.stores-a.product.stores).map(row=>row.product);
}
