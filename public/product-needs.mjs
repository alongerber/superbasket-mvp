// Versioned, explicit shopping requirements. Exact products are never silently converted.
export const needFamilies=[
 {id:'ribeye',name:'אנטריקוט',pattern:/אנטריקוט|אנטרקוט/,category:'entrecote'},
 {id:'sirloin',name:'סינטה',pattern:/סינטה/,category:'sirloin'},
 {id:'beeffillet',name:'פילה בקר',pattern:/פילה (?:בקר|עגל)/,category:'sirloin'},
 {id:'chickenbreast',name:'חזה עוף',pattern:/חזה עוף/,category:'chicken-breast'},
 {id:'chickenthigh',name:'פרגיות',pattern:/פרגיות|פרגית/,category:'chicken-thigh'}
];
export const freshLabels={fresh:'טרי',frozen:'קפוא',thawed:'מופשר'};
export const boneLabels={regular:'ללא ציון עצם',boneless:'ללא עצם מפורש',bonein:'עם עצם מפורש'};
export const kosherLabels={any:'ללא סינון כשרות',kosher:'כשר לפי תיאור המקור',halak:'חלק לפי תיאור המקור',mahfud:'מחפוד לפי תיאור המקור',rubin:'הרב רובין לפי תיאור המקור',eda:'העדה החרדית לפי תיאור המקור'};
export const cleanName=s=>String(s||'').normalize('NFKC').replace(/[״׳"']/g,'').replace(/\s+/g,' ').trim();
const token=(s,word)=>new RegExp('(?:^|[\\s.,/()-])'+word+'(?:$|[\\s.,/()-])').test(s);
export function attributes(product){
 const name=cleanName(product?.name),family=needFamilies.find(f=>f.pattern.test(name));
 if(!family||needFamilies.filter(f=>f.pattern.test(name)).length!==1)return null;
 // Exclude prepared products, other cuts, very thin strips, and explicit mixed-meat products.
 const plain=name.replace(/לא\s*מעובד/g,'');
 if(/המבורגר|בורגר|קבב|נקניק|קציצ|שווארמה|שוארמה|אצבעות|אסאדו|רצועות|שיפוד|קוביות|טחון|מוקפץ|רוסטביף|דנבר|מתובל|תיבול|מעושן|מעובד|חטיפי|דק\s*דק|מינוט|מוכן|מבושל|צלי|סויה|טבעוני|תחליף/.test(plain))return null;
 const states=[token(name,'טרי(?:ה|ים|ות)?')?'fresh':null,/קפוא/.test(name)?'frozen':null,/מופשר/.test(name)?'thawed':null].filter(Boolean);
 if(states.length!==1)return null; // Missing or contradictory state never guessed from "אנטריקוט".
 const withBone=/עם\s+עצ(?:ם|מות)?(?:\s|$)|(?:^|\s)ע\s*ע(?:\s|$)|(?:^|\s)ע\.ע\.?/.test(name);
 const withoutBone=/ללא\s+ע(?:צם|צמות)?(?:\s|$)|בלי\s+עצם|(?:^|\s)ל\s*ע(?:\s|$)/.test(name);
 if(withBone&&withoutBone)return null;
 const cert=/מחפוד/.test(name)?'mahfud':/רובין/.test(name)?'rubin':/העדה\s+החרדית/.test(name)?'eda':null;
 const nonKosher=/לא\s*כשר/.test(name),halak=!nonKosher&&!/לא\s*חלק/.test(name)&&token(name,'חלק');
 if([/מחפוד/.test(name),/רובין/.test(name),/העדה\s+החרדית/.test(name)].filter(Boolean).length>1)return null;
 return {family:family.id,freshness:states[0],bone:withBone?'bonein':withoutBone?'boneless':'regular',kosher:nonKosher?'none':cert||(halak?'halak':/כשר|מוכשר/.test(name)?'kosher':'unknown'),cert,halak};
}
export function needId(spec){return `need:v1-${spec.family}-${spec.freshness}-${spec.bone}-${spec.kosher}`;}
export function parseNeed(id){
 const match=/^need:v1-([a-z]+)-(fresh|frozen|thawed)-(regular|boneless|bonein)-(any|kosher|halak|mahfud|rubin|eda)$/.exec(String(id));
 if(!match||!needFamilies.some(f=>f.id===match[1]))return null;
 return {family:match[1],freshness:match[2],bone:match[3],kosher:match[4]};
}
export function needProduct(specOrId){
 const spec=typeof specOrId==='string'?parseNeed(specOrId):parseNeed(needId(specOrId));if(!spec)return null;
 const family=needFamilies.find(f=>f.id===spec.family),name=family.name+' '+freshLabels[spec.freshness]+(spec.bone==='boneless'?' ללא עצם':spec.bone==='bonein'?' עם עצם':'')+(spec.kosher==='halak'?' חלק':spec.kosher==='any'?'':' · '+kosherLabels[spec.kosher].replace(' לפי תיאור המקור',''));
 return {id:needId(spec),name,weighted:true,unit:'ק״ג',barcode:null,identity:{kind:'shopping_need',chain:null,code:needId(spec)},need:spec,comparison_note:'התאמה לפי סוג ותיאור, לא מוצר זהה. השם המקורי מוצג בכל סניף.'};
}
export function suggestNeed(product){if(parseNeed(product?.id))return null;const a=attributes(product);return product?.weighted&&a&&a.kosher!=='none'&&!(a.cert&&a.halak)&&!(/בדצ|מהדרין|עטרה|בית יוסף|רבנות|לנדא/.test(cleanName(product.name))&&!a.cert)?needProduct({...a,kosher:a.kosher==='unknown'?'any':a.kosher}):null;}
export function matchesNeed(product,spec){
 if(!product?.weighted)return false;
 const a=attributes(product);if(!a||a.family!==spec.family||a.freshness!==spec.freshness||a.bone!==spec.bone)return false;
 if(spec.kosher==='any')return true;
 if(a.kosher==='none')return false;
 if(spec.kosher==='kosher')return ['kosher','halak','mahfud','rubin','eda'].includes(a.kosher);
 if(spec.kosher==='halak')return a.halak;
 return a.cert===spec.kosher;
}
// Compare only a declared kilogram sale unit. Unknown/unit/100g values need source verification.
export function hasKilogramUnit(product){return !!product?.weighted&&/^(?:1\s*)?(?:קילוגרם|קילו|קג|kg)$/i.test(cleanName(product.unit));}
export function chooseNeedProduct(snapshot,spec){return snapshot.products.filter(p=>matchesNeed(p,spec)&&hasKilogramUnit(p)&&Number.isSafeInteger(p.price)&&p.price>0).sort((a,b)=>a.price-b.price||a.id.localeCompare(b.id))[0]||null;}
export function queryNeeds(query='',category=''){
 const name=cleanName(query);if(/^\d+$/.test(name)||name.includes(':'))return [];
 const family=needFamilies.find(f=>name?f.pattern.test(name):f.category===category);if(!family)return [];
 if(/המבורגר|בורגר|קבב|נקניק|אצבעות|שיפוד|רצועות|טחון|קוביות|רוסטביף|מתובל|דקדק/.test(name))return [];
 const states=Object.keys(freshLabels).filter(state=>state==='fresh'?token(name,'טרי(?:ה|ים|ות)?'):name.includes(freshLabels[state]));
 const detected=attributes({name:name+(states.length?'':' טרי')});
 // Specific unknown qualifiers (brands, origin, certifications) are handled in the configurator,
 // never interpreted as permission to drop them from a typed shopping list.
 return (states.length?states:['fresh','frozen']).map(freshness=>needProduct({family:family.id,freshness,bone:detected?.bone||'regular',kosher:detected?.kosher&&['kosher','halak','mahfud','rubin','eda'].includes(detected.kosher)?detected.kosher:'any'}));
}
