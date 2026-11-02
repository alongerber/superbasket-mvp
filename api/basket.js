import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const normalize = value => String(value ?? '').toLowerCase().normalize('NFKC').replace(/[״"'.,()\-]/g,' ').replace(/\s+/g,' ').trim();
function parseLine(line) {
  const s = line.trim();
  const prefix = s.match(/^(\d+)\s*(?:x|×|יחידות?\s+)?\s+(.+)$/i);
  const suffix = s.match(/^(.+?)\s*(?:x|×)\s*(\d+)$/i);
  if (prefix) return { query: prefix[2], quantity: Math.min(Number(prefix[1]),99) };
  if (suffix) return { query: suffix[1], quantity: Math.min(Number(suffix[2]),99) };
  return { query: s, quantity: 1 };
}
function findMatch(products, query) {
  const needle = normalize(query);
  if (!needle) return null;
  const exact = products.find(p => normalize(p.name) === needle || String(p.barcode) === needle);
  if (exact) return exact;
  // Do not silently substitute a different brand or package size.
  return null;
}
export default async function handler(req,res) {
  if(req.method !== 'POST') return res.status(405).json({error:'שיטת בקשה לא נתמכת'});
  const {city,items}=req.body||{};
  if(typeof city!=='string'||!city.trim()||city.length>80||!Array.isArray(items)||items.length<1||items.length>40||!items.every(x=>typeof x==='string'&&x.trim()&&x.length<=120)) return res.status(400).json({error:'יש להזין עיר ו-1 עד 40 מוצרים'});
  let snapshot;
  try { snapshot=JSON.parse(await readFile(join(process.cwd(),'public','prices.json'),'utf8')); }
  catch { return res.status(503).json({error:'ממתינים להורדה הראשונה של קובצי המחירים הרשמיים. אין כרגע נתוני אמת זמינים.'}); }
  const basket=items.map(parseLine);
  const stores=(snapshot.stores||[]).filter(s=>normalize(s.city).includes(normalize(city))||normalize(s.name).includes(normalize(city))).map(s=>{
    const matches=basket.map(entry=>({entry,product:findMatch(s.products||[],entry.query)}));
    const missing=matches.filter(x=>!x.product).map(x=>x.entry.query);
    const total=matches.reduce((sum,x)=>sum+(x.product?x.product.price*x.entry.quantity:0),0);
    return {chain_name:s.chain,branch_name:s.name,city:s.city,total:Math.round(total*100)/100,missing_items:missing,matched_count:matches.length-missing.length,requested_count:basket.length,products:matches.filter(x=>x.product).map(x=>({name:x.product.name,price:x.product.price,quantity:x.entry.quantity}))};
  });
  if(!stores.length) return res.status(404).json({error:'אין עדיין סניפים עם נתונים לעיר הזו. הכיסוי הראשוני מוגבל.'});
  res.setHeader('Cache-Control','public, max-age=300');
  return res.status(200).json({data:{stores},as_of:snapshot.updated_at,source:'official-transparency-files',errors:snapshot.errors||[]});
}