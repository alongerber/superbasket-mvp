export function identity(product){
 const split=String(product?.id||'').indexOf(':');
 return split>0?{kind:'retailer_code',chain:String(product.id).slice(0,split),code:String(product.id).slice(split+1)}:{kind:'barcode',chain:null,code:product?.barcode||product?.id||''};
}
export function alternativeTerms(name){
 const words=String(name||'').normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>1);
 return [...new Set(words)].slice(0,8);
}
export function rankAlternatives(source,candidates){
 const origin=identity(source),terms=alternativeTerms(source.name),main=terms[0];if(!main)return [];
 const attributes=[['טרי','קפוא','מופשר'],['עגל','בקר','כבש','עוף'],['חלק','מוכשר']];
 const prepared=['המבורגר','המבורגרים','בורגר','קבב','נקניק','נקניקיות'];
 const preparedType=name=>alternativeTerms(name).find(word=>prepared.includes(word))||null;
 const ranked=candidates.filter(p=>p.id!==source.id&&(!origin.chain||identity(p).chain!==origin.chain)&&Boolean(p.weighted)===Boolean(source.weighted)&&preparedType(p.name)===preparedType(source.name)&&alternativeTerms(p.name).some(w=>w.startsWith(main)||main.startsWith(w))).map(p=>{
  const words=alternativeTerms(p.name),overlap=terms.filter(w=>words.includes(w)).length;
  const differences=attributes.flatMap(group=>{const from=group.find(w=>terms.includes(w)),to=group.find(w=>words.includes(w));return from&&to&&from!==to?[`${from} ← ${to}`]:[];});
  for(const cut of ['אצבעות','אסאדו','טחון','קוביות'])if(words.includes(cut)!==terms.includes(cut))differences.push('תיאור החיתוך שונה: '+cut);
  if(/עם עצם/.test(p.name)&&!/עם עצם/.test(source.name))differences.push('בתיאור החלופה: עם עצם');
  return {...p,alternative:true,differences,score:overlap*10-differences.length*8+(words[0]===main?4:0)};
 });
 // Keep several chains visible instead of filling the first screen with one chain.
 ranked.sort((a,b)=>a.differences.length-b.differences.length||b.score-a.score||b.stores-a.stores);
 const first=[],rest=[],seen=new Set();for(const p of ranked){const chain=identity(p).chain||'barcode';if(!seen.has(chain)){seen.add(chain);first.push(p);}else rest.push(p);}
 return [...first,...rest].slice(0,24);
}
