const normalize=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s%]/gu,' ').replace(/\s+/g,' ').trim();
export function basketScope(stores,body={}) {
 const city=normalize(String(body.city||'').slice(0,80)),selected=body.store_ids;
 if(selected!==undefined&&(!Array.isArray(selected)||selected.length>60||selected.some(s=>typeof s!=='string'||s.length>100)))throw Error('בבחירה ידנית אפשר לבחור עד 60 סניפים. להשוואת עיר שלמה חזרו לבחירה לפי עיר.');
 if(!city&&!selected?.length)throw Error('יש לבחור עיר או סניפים להשוואה');
 const offset=Number(body.offset??0),limit=Number(body.limit??12);
 if(!Number.isInteger(offset)||offset<0||offset>20000||!Number.isInteger(limit)||limit<1||limit>24)throw Error('טווח ההשוואה אינו תקין');
 const ids=selected?.length?new Set(selected):null;
 const eligible=stores.filter(s=>s.object&&(body.include_delivery===true||s.chain!=='wolt')&&(ids?ids.has(s.id):normalize(s.city)===city||(!normalize(s.city)&&normalize(s.name+' '+s.address).includes(city)))).sort((a,b)=>a.id.localeCompare(b.id));
 return {stores:eligible.slice(offset,offset+limit),total:eligible.length,offset,next_offset:offset+limit<eligible.length?offset+limit:null};
}
