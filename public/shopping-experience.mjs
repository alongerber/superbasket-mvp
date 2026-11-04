import {classifyProduct,categoryPath} from './taxonomy.mjs';

export function recommendStore(results, selected) {
  const stores=results?.stores||[];
  if(selected){const chosen=stores.find(s=>s.id===selected);if(chosen)return chosen;}
  const complete=stores.filter(s=>!s.stale&&s.total!==null).sort((a,b)=>a.total-b.total||a.id.localeCompare(b.id));
  if(complete.length)return complete[0];
  // Coverage is the objective here, not an incomparable partial-basket price.
  return stores.filter(s=>!s.stale&&s.matched_count>0).sort((a,b)=>b.matched_count-a.matched_count||a.id.localeCompare(b.id))[0]||null;
}
export function missingDiagnostics(results,store,items){
  return items.filter(p=>!store?.products.some(r=>r.id===p.id&&!r.missing)).map(p=>{
    const priced=(results?.stores||[]).filter(s=>!s.stale&&s.products.some(r=>r.id===p.id&&!r.missing));
    return {...p,pricedBranches:priced.length,reason:priced.length?`יש מחיר ב־${priced.length} סניפים אחרים באזור`:'לא נמצא מחיר עדכני למוצר הזה בסניפים שנבדקו'};
  });
}
export function basketKey(items){return JSON.stringify(items.map(p=>[p.id,p.quantity]).sort((a,b)=>a[0].localeCompare(b[0])));}
export function basketDrop(watch,results,scope){
  if(watch.scope!==scope||watch.key!==basketKey(results.items))return null;
  const store=recommendStore(results);
  if(!store||store.total===null||store.stale)return null;
  const delta=watch.total-store.total;
  return delta>=Math.max(100,watch.threshold)?{delta,total:store.total,store}:null;
}
export function departmentFor(p){return categoryPath(classifyProduct(p))[0]||{id:'other',name:'עוד מוצרים'};}
export function groupedItems(items){const groups=new Map();for(const p of items){const d=departmentFor(p);if(!groups.has(d.id))groups.set(d.id,{...d,items:[]});groups.get(d.id).items.push(p);}return [...groups.values()];}
export function scaleBasket(items,from,to){
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<1||from>50||to>50)throw Error('מספר הסועדים צריך להיות בין 1 ל־50');
  return items.map(p=>({...p,quantity:p.weighted?Math.round(p.quantity*to/from*1000)/1000:Math.ceil(p.quantity*to/from)})).map(p=>{if(p.quantity<=0||p.quantity>99)throw Error('הכמות המחושבת חורגת מהמותר; עדכנו את הסל ידנית');return p;});
}
export function validateShared(input){
  const items=Array.isArray(input)?input:input?.items;
  if(!Array.isArray(items)||!items.length||items.length>200)throw Error('קישור הסל אינו תקין');
  const ids=new Set();
  const clean=items.map(p=>{
    if(!p||typeof p.id!=='string'||!/^([a-z0-9-]+:)?[0-9]{1,30}$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>300||!Number.isFinite(p.quantity)||p.quantity<=0||p.quantity>99||(!p.weighted&&!Number.isInteger(p.quantity)))throw Error('קישור הסל אינו תקין');
    ids.add(p.id);return {id:p.id,name:p.name,quantity:p.quantity,weighted:!!p.weighted,barcode:typeof p.barcode==='string'?p.barcode:undefined};
  });
  return {items:clean,city:!Array.isArray(input)&&typeof input.city==='string'?input.city.slice(0,100):''};
}
