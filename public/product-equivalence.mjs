import {classifyProduct,categoryPath} from './taxonomy.mjs';
import {hasKilogramUnit} from './product-needs.mjs';
export const normalized=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[״׳"']/g,'').replace(/([\u0590-\u05ff])([a-z])/g,'$1 $2').replace(/([a-z])([\u0590-\u05ff])/g,'$1 $2').replace(/\s+/g,' ').trim();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const known=v=>v&&!/^(?:לא ידוע|unknown|ללא|none|0)$/i.test(v);
const compiled=new Map();
const word=(s,w)=>{if(!compiled.has(w))compiled.set(w,new RegExp('(?:^|[^\\p{L}\\p{N}])(?:'+w+')(?:$|[^\\p{L}\\p{N}])','u'));return compiled.get(w).test(s);};
const unitMap={קג:['mass',1000],קילוגרם:['mass',1000],קילו:['mass',1000],kg:['mass',1000],גרם:['mass',1],גר:['mass',1],ג:['mass',1],g:['mass',1],ליטר:['volume',1000],ליטרים:['volume',1000],ל:['volume',1000],l:['volume',1000],מל:['volume',1],מיליליטר:['volume',1],ml:['volume',1],יחידות:['count',1],יחידה:['count',1],יח:['count',1],גלילים:['count',1],גליל:['count',1],שקיקים:['count',1],קפסולות:['count',1]};
const amountPattern=/(\d+(?:[.,]\d+)?)\s*(קילוגרם|מיליליטר|ליטרים|ליטר|גרם|קילו|יחידות|יחידה|גלילים|גליל|שקיקים|קפסולות|קג|מל|kg|ml|גר|יח|ג|ל|g|l)(?=$|[^\p{L}])/gu;
export function packageMeasure(product){
 if(product.weighted)return hasKilogramUnit(product)?{basis:'mass',amount:1000,label:'ק״ג',weighted:true}:null;
 const name=normalized(product.name),measures=[...name.matchAll(amountPattern)];
 if(measures.length!==1)return null; // multiple sizes/net-drained weights need a human decision
 const m=measures[0],value=Number(m[1].replace(',','.')),unit=unitMap[m[2]];if(!unit||value<=0)return null;
 // Retailer descriptions can contain a shipping-case count for a single consumer barcode
 // (e.g. "אפרופו כלפ.36*50גרם", sold at the single 50g price). A name alone
 // cannot establish that the sale unit is the entire case. Never multiply it silently.
 if(/[×*]|\bx\s*\d|\d\s*x\s*\d/i.test(name)||/\d\s*[-–]\s*\d/.test(name)||/מארז|שישיה|שישייה|שלישיה|רביעיה|רביעייה|זוג/.test(name))return null;
 return {basis:unit[0],amount:value*unit[1],label:m[0],weighted:false};
}
// Extra semantic guards enrich suggestions; every catalog product still supports explicit choices.
const kinds=[
 ['eggs',/ביצים|ביצי מאכל/],['toiletpaper',/נייר טואלט|ניר טואלט/],['papertowel',/מגבות נייר|מגבת נייר|נייר סופג/],
 ['potato',/תפוח אדמה|תפוחי אדמה|תפוא/],['tomato',/עגבני/],['cucumber',/מלפפון|מלפפונ/],['onion',/בצל/],['carrot',/גזר/],['eggplant',/חציל/],['zucchini',/קישוא/],['sweetpotato',/בטטה/],['pepper',/פלפל/],['lettuce',/חסה/],['cabbage',/כרוב(?!ית)/],['cauliflower',/כרובית/],['broccoli',/ברוקולי/],['apple',/תפוח/],['pear',/אגס/],['banana',/בננ/],['orange',/תפוז/],['lemon',/לימון/],['avocado',/אבוקדו/],['grapes',/ענבים/],['strawberry',/תות/],
 ['whitecheese',/גבינ[הת]? לבנ/],['cottage',/קוטג/],['creamcheese',/גבינ[הת]? שמנת|נפוליאון|סימפוניה/],['yellowcheese',/גבינ[הת]? צהוב|עמק/],['mozzarella',/מוצרלה/],['feta',/פטה/],['bulgariancheese',/בולגרית/],['milk',/חלב/],['yogurt',/יוגורט|יוגור/],['butter',/חמאה/],['margarine',/מרגרינה|מחמאה/],['cream',/שמנת/],
 ['oliveoil',/שמן זית/],['canolaoil',/שמן קנולה/],['sunfloweroil',/שמן חמניות/],['cornoil',/שמן תירס/],['flour',/קמח/],['semolina',/סולת/],['sugar',/סוכר/],['salt',/מלח/],['rice',/אורז/],['pasta',/פסטה|ספגטי|פנה|מקרוני|ברילה|אטריות|נודלס/],['lentils',/עדשים/],['beans',/שעועית/],['hummus',/חומוס/],['tahini',/טחינה/],['ketchup',/קטשופ/],['mayonnaise',/מיונז/],['honey',/דבש/],['coffee',/קפה|נסקפה|אספרסו/],['tea',/תה |תה$|חליטה/],['water',/מים מינרל|נביעות|מי עדן/],['cola',/קולה/],['soda',/סודה/],['chocolate',/שוקולד|שוקול/],
 ['shampoo',/שמפו/],['hairconditioner',/מרכך שיער/],['dishsoap',/נוזל כלים|סבון כלים/],['laundrydetergent',/אבקת כביסה|נוזל כביסה|גל כביסה|קפסולות כביסה/],['fabricconditioner',/מרכך כביסה/],['bleach',/אקונומיקה/],['soap',/סבון|רחצה/],['toothpaste',/משחת שיניים|משחת שינים/],['toothbrush',/מברשת שיניים|מברשת שינים/],['deodorant',/דאודורנט|דאודור/],['diapers',/חיתול|פמפרס|האגיס/],['wipes',/מגבונים/],['battery',/סוללות|סוללה/],
 ['ribeye',/אנטריקוט|אנטרקוט/],['sirloin',/סינטה/],['fillet',/פילה בקר|פילה עגל/],['chickenbreast',/חזה עוף/],['chickenthigh',/פרגיות|פרגית/],['salmon',/סלמון/]
];
const kindFor=(name,category)=>{
 const relevant=kinds.filter(([key])=>['vegetables','fruit','herbs'].includes(category)?['potato','tomato','cucumber','onion','carrot','eggplant','zucchini','sweetpotato','pepper','lettuce','cabbage','cauliflower','broccoli','apple','pear','banana','orange','lemon','avocado','grapes','strawberry'].includes(key):!['potato','tomato','cucumber','onion','carrot','eggplant','zucchini','sweetpotato','pepper','lettuce','cabbage','cauliflower','broccoli','apple','pear','banana','orange','lemon','avocado','grapes','strawberry'].includes(key));
 return relevant.find(([,r])=>r.test(name))?.[0];
};

// Descriptive attributes are source-name signals, never an ingredient/certification guarantee.
const axes=[
 ['קמח',[['matza','מצה'],['selfraising','תופח'],['corn','תירס'],['almond','שקדים'],['bread','לחם'],['pizza','פיצה'],['cake','עוגות']]],
 ['קפה',[['instant','נמס'],['ground','טורקי|שחור'],['beans','פולים'],['decaf','נטול קפאין']]],
 ['שמן זית',[['extra','כתית מעולה'],['refined','מעודן']]],
 ['גז',[['carbonated','מוגז|מוגזים|סודה']]],
 ['סוללות',[['aaa','aaa'],['aa','aa'],['c','c'],['d','d'],['ninevolt','9v']]],
 ['מוצר שיער',[['normal','רגיל'],['dry','יבש'],['oily','שומני'],['dandruff','קשקשים'],['colored','צבוע']]],
 ['ביצים',[['xl','xl'],['l','l'],['m','m'],['s','s']]],
 ['מצב המוצר',[['fresh','טרי(?:ה|ים|ות)?'],['frozen','קפוא(?:ה|ים|ות)?'],['thawed','מופשר(?:ת|ים|ות)?']]],
 ['עצם',[['boneless','ללא עצם|בלי עצם|לע'],['bonein','עם עצם|עע']]],
 ['ללא לקטוז',[['free','ללא לקטוז|נטול לקטוז']]],['ללא גלוטן',[['free','ללא גלוטן|נטול גלוטן']]],
 ['סוכר',[['free','ללא סוכר|נטול סוכר|זירו|zero'],['noadded','ללא תוספת סוכר'],['diet','דיאט']]],
 ['טבעוני',[['vegan','טבעוני(?:ת)?']]],['אורגני',[['organic','אורגני(?:ת)?']]],
 ['דגן',[['whole','מלא(?:ה)?'],['white','לבן|לבנה'],['rye','שיפון'],['spelt','כוסמין']]],
 ['כשרות בשם',[['halak','חלק'],['mahfud','מחפוד'],['rubin','רובין'],['badatz','בדצ'],['mehadrin','מהדרין'],['kosher','כשר|מוכשר'],['nonkosher','לא כשר']]],
 ['טעם / זן',[['vanilla','וניל'],['chocolate','שוקולד|שוקו'],['strawberry','תות'],['lemon','לימון'],['apple','תפוח'],['mint','מנטה'],['orange','תפוז'],['natural','טבעי'],['basmati','בסמטי'],['persian','פרסי'],['jasmine','יסמין'],['brown','חום'],['red','אדום']]],
 ['חלב / בסיס',[['soy','סויה'],['oat','שיבולת'],['almond','שקדים'],['coconut','קוקוס'],['goat','עזים|עז'],['sheep','כבשים']]],
 ['בשר / דג',[['chicken','עוף'],['turkey','הודו'],['beef','בקר'],['veal','עגל'],['lamb','טלה|כבש'],['salmon','סלמון'],['tilapia','אמנון|מושט'],['tuna','טונה']]],
 ['צורת המוצר',[['powder','אבקה|אבקת'],['liquid','נוזל|ג׳ל|גל'],['capsules','קפסולות'],['tablets','טבליות'],['spray','ספריי|תרסיס'],['minced','טחון'],['sliced','פרוס|פרוסות'],['smoked','מעושן'],['prepared','מוכן|מבושל|מתובל'],['burger','המבורגר|בורגר|קבב'],['sausage','נקניק|נקניקיות']]],
 ['שימוש',[['dishwasher','מדיח'],['laundry','כביסה'],['conditioner','מרכך'],['handwash','כלים'],['dog','כלב|כלבים'],['cat','חתול|חתולים']]]
];
const profiles=new WeakMap();
export function profile(product){
 if(profiles.has(product))return profiles.get(product);
 const name=normalized(product.name),category=/ביצים|ביצי מאכל/.test(name)?'eggs':classifyProduct(product),features={};
 const kind=kindFor(name,category);if(kind)features['סוג מוצר']=[kind];
 for(const [label,values] of axes){const found=values.filter(([,pattern])=>word(name,pattern)).map(([key])=>key);if(found.length)features[label]=found.sort();}
 const percentages=[...name.matchAll(/\d+(?:[.,]\d+)?\s*%/g)].map(m=>m[0].replace(/\s/g,'').replace(',','.')).sort();if(percentages.length)features['אחוזים']=percentages;
 const stage=name.match(/(?:^|\s)(?:שלב|מידה|מספר|מס\.?|size|stage)\s*([0-9]+\+?|[smlx]{1,3})/i);if(stage)features['מידה / שלב']=[stage[1]];
 const maker=normalized(product.manufacturer),measure=packageMeasure(product);
 const result={category,categoryName:categoryPath(category).at(-1)?.name||'ללא סיווג',manufacturer:known(maker)?maker:null,measure,features};profiles.set(product,result);return result;
}
export function conversion(source,candidate){
 const a=packageMeasure(source),b=packageMeasure(candidate);
 if(!a||!b)return {automatic:false,reason:'גודל או יחידת מכירה לא ברורים בשם המקור. צריך לאשר יחס כמויות.'};
 if(a.basis!==b.basis)return {automatic:false,reason:'יחידות שונות — צריך לקבוע כמה יחידות חלופה מחליפות יחידה מקורית.'};
 return {automatic:true,ratio:a.amount/b.amount,reason:`${a.label} במקור ↔ ${b.label} בחלופה`,basis:a.basis};
}
export function differences(source,candidate){
 const a=profile(source),b=profile(candidate),changes=[];
 if(a.category!==b.category)changes.push('קטגוריה אחרת: '+b.categoryName);
 for(const key of new Set([...Object.keys(a.features),...Object.keys(b.features)]))if(!same(a.features[key]||[],b.features[key]||[]))changes.push(key+' שונה או לא צוין באחד השמות');
 if(a.manufacturer!==b.manufacturer)changes.push(!a.manufacturer||!b.manufacturer?'יצרן לא צוין באחד המקורות':'פרטי היצרן שונים בין המקורות');
 if(!a.measure||!b.measure)changes.push('גודל אריזה לא זוהה בוודאות');else if(a.measure.basis!==b.measure.basis||a.measure.amount!==b.measure.amount)changes.push('גודל אריזה / יחידת מכירה שונים');
 const extra=queryTerms(candidate).filter(w=>!queryTerms(source).includes(w));if(extra.length)changes.push('תיאור נוסף בחלופה: '+extra.slice(0,5).join(' · '));
 return changes;
}
export function queryTerms(source){
 const p=profile(source),makerWords=(p.manufacturer||'').split(/\s+/);return [...new Set(normalized(source.name).replace(/\d+(?:[.,]\d+)?\s*%?/g,' ').replace(/[^\p{L}\s]/gu,' ').split(/\s+/).filter(w=>w.length>1&&!makerWords.includes(w)&&!['גרם','קג','ליטר','מל','יחידות','מארז','בדצ','שומן','לא','ידוע','ארוז','ארוזה','ארוזים','שקית','שקיות','בשקיות','תבנית','קרטון','בקרטון','קופסה','בקבוק','במגש','תנובה','שטראוס','עלית','אסם','שופרסל','טרה','רמי','לוי'].includes(w)))].slice(0,10);
}
export function rankEquivalents(source,candidates,{keepSize=false,keepSpecs=true,keepMaker=false,manualSearch=false}={}){
 const base=profile(source),words=queryTerms(source);
 return candidates.filter(p=>p.id!==source.id).map(p=>{const candidate=profile(p),shared=queryTerms(p).filter(w=>words.includes(w)).length,matchingCategory=base.category===candidate.category,matchingSpecs=same(base.features,candidate.features),sizeMatch=base.measure&&candidate.measure&&base.measure.basis===candidate.measure.basis&&base.measure.amount===candidate.measure.amount,makerMatch=base.manufacturer&&base.manufacturer===candidate.manufacturer;
 const allowed=(!keepSize||sizeMatch)&&(!keepSpecs||matchingSpecs)&&(!keepMaker||makerMatch)&&(manualSearch||matchingCategory&&(shared>0));
 return {...p,profile:candidate,conversion:conversion(source,p),differences:differences(source,p),score:shared*10+(matchingCategory?30:0)+(matchingSpecs?20:0)+(sizeMatch?10:0),allowed};}).filter(p=>p.allowed).sort((a,b)=>b.score-a.score||b.stores-a.stores||a.id.localeCompare(b.id));
}
const validId=id=>typeof id==='string'&&/^([0-9]{14}|[a-z0-9-]+:[0-9]{1,30})$/.test(id);
export function normalizeAlternatives(input,sourceId){
 if(input===undefined)return [];
 if(!Array.isArray(input)||input.length>20)throw Error('אפשר לאשר עד 20 חלופות לכל מוצר');
 const seen=new Set([sourceId]);return input.map(p=>{if(!p||!validId(p.id)||seen.has(p.id))throw Error('חלופה לא תקינה או כפולה');seen.add(p.id);if(p.manual_ratio!==undefined&&(!Number.isFinite(p.manual_ratio)||p.manual_ratio<.001||p.manual_ratio>100))throw Error('יחס הכמויות לחלופה אינו תקין');return {id:p.id,...(p.manual_ratio!==undefined?{manual_ratio:p.manual_ratio}:{})};}).sort((a,b)=>a.id.localeCompare(b.id));
}
export const alternativesKey=item=>JSON.stringify(normalizeAlternatives(item.alternatives,item.id));
export const requestItem=p=>({id:p.id,quantity:p.quantity,...(p.alternatives?.length?{alternatives:normalizeAlternatives(p.alternatives,p.id)}:{})});
export function purchaseQuantity(quantity,ratio,weighted){const n=quantity*ratio;return weighted?Math.ceil((n-1e-9)*1000)/1000:Math.ceil(n-1e-9);}
export function approvedPrice(index,entry){
 const candidates=(entry.choices||[]).flatMap(choice=>{const p=index.get(choice.id);if(!p||!Number.isSafeInteger(p.price)||p.price<=0||Boolean(p.weighted)!==choice.weighted||(choice.require_kg&&!hasKilogramUnit(p)))return [];const quantity=purchaseQuantity(entry.quantity,choice.ratio,p.weighted);if(!Number.isFinite(quantity)||quantity<=0||quantity>10000)return [];return [{product:p,purchase_quantity:quantity,subtotal:Math.round(p.price*quantity),choice}];});
 return candidates.sort((a,b)=>a.subtotal-b.subtotal||Number(b.product.id===entry.id)-Number(a.product.id===entry.id)||a.product.id.localeCompare(b.product.id))[0]||null;
}
