// Input diagnostics are evidence-based hints, not claims that a product was recognized.
export function canonicalBarcode(value){
 const code=String(value||'').replace(/[\s-]/g,'');if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code))return null;
 const digits=[...code].map(Number);let sum=0;for(let i=digits.length-2,weight=3;i>=0;i--,weight=weight===3?1:3)sum+=digits[i]*weight;
 return (10-sum%10)%10===digits.at(-1)?code.padStart(14,'0'):null;
}
export function inspectList(text,{confidence=null,fromPhoto=false}={}){
 const entries=String(text||'').split(/\n|;/).map((raw,index)=>({raw:raw.trim(),line:index+1})).filter(r=>r.raw);
 const lines=entries.map(entry=>{
  const clean=entry.raw.normalize('NFKC').replace(/^\s*(?:[•*–-]\s*|\d{1,3}[.)]\s+)/,'').trim();
  const suffix=clean.match(/^(.+?)\s*[x×]\s*(-?\d+(?:[.,]\d+)?)$/i),prefix=clean.match(/^(-?\d+(?:[.,]\d+)?)\s*[x×]\s*(.+)$/i);
  const query=(suffix?suffix[1]:prefix?prefix[2]:clean).trim(),quantity=Number((suffix?.[2]||prefix?.[1]||'1').replace(',','.'));
  const letters=(query.match(/\p{L}/gu)||[]).length,characters=query.replace(/\s/g,'').length,symbols=(query.match(/[^\p{L}\p{N}\s%"'׳״.,()-]/gu)||[]).length;
  const barcode=canonicalBarcode(query);let code=null,reason=null;
  if(!Number.isFinite(quantity)||quantity<=0||quantity>99){code='quantity';reason='הכמות צריכה להיות גדולה מ־0 ועד 99. אפשר לתקן את המספר שאחרי ×.';}
  else if(!query){code='empty_name';reason='יש כמות, אבל חסר שם המוצר.';}
  else if(!barcode&&/^\d[\d\s-]*$/.test(query)){code='barcode';reason='נקראו מספרים בלי שם מוצר. אם זה ברקוד, בדקו שכל הספרות מופיעות ותקינות.';}
  else if(!barcode&&(letters<2||symbols>Math.max(1,characters*.18)||letters/Math.max(1,characters)<.35)){code='unreadable';reason='נקראו בעיקר ספרות או סימנים, בלי שם מוצר ברור. תקנו את השורה או צלמו שוב.';}
  else if(!barcode&&query.length>120){code='too_long';reason='השורה ארוכה מדי. הפרידו את המוצרים לשורות, או השאירו רק שם ואריזה.';}
  else if(fromPhoto&&!barcode&&Number.isFinite(confidence)&&confidence<55){code='low_confidence';reason='הקריאה מהצילום אינה בטוחה. בדקו ותקנו את שם המוצר לפני החיפוש.';}
  return {...entry,query:barcode||query,quantity,barcode,valid:!code,code,reason};
 });
 const valid=lines.filter(r=>r.valid),issues=lines.filter(r=>!r.valid);
 return {lines,valid,issues,empty:!lines.length,too_many:lines.length>200,low_confidence:fromPhoto&&Number.isFinite(confidence)&&confidence<55};
}
const packaging=/^(רכיבים|אלרגנים|אנרגיה|קלוריות|חלבונים|פחמימות|נתרן|שומנים|תוקף|לשמור|אחסון|יצרן|יבואן|ברקוד|ingredients|nutrition|energy|allergens|www\.|https?:)/i;
export function productPhotoQueries(text){
 const lines=String(text||'').split('\n').map(s=>s.replace(/[^\p{L}\p{N}\s%"'׳״.-]/gu,' ').replace(/\s+/g,' ').trim()).filter(s=>s&&s.length<=100&&!packaging.test(s)&&inspectList(s).valid.length);
 return [...new Set(lines)].sort((a,b)=>Number(/[א-ת]/.test(b))-Number(/[א-ת]/.test(a))||a.length-b.length).slice(0,8);
}
export function readBarcodesFromText(text){
 return [...new Set((String(text||'').match(/\b(?:\d[ -]?){7,13}\d\b/g)||[]).map(canonicalBarcode).filter(Boolean))];
}
