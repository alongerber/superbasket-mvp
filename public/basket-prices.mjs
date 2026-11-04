// Compare equal requested lines, never unlike partial totals. Amounts are integer agorot.
export const pricedLine=row=>!!row&&!row.missing&&Number.isSafeInteger(row.subtotal)&&row.subtotal>=0&&Number.isSafeInteger(row.price)&&row.price>0;
export function branchLines(store,items){const rows=new Map((store?.products||[]).map(p=>[p.id,p]));return items.map(item=>({item,row:rows.get(item.id),priced:pricedLine(rows.get(item.id))}));}
export function priceCoverage(store,items){
 const lines=branchLines(store,items),priced=lines.filter(p=>p.priced),missing=lines.filter(p=>!p.priced);
 const fresh=!!store&&!store.stale,complete=fresh&&missing.length===0&&lines.length>0&&Number.isSafeInteger(store.total);
 return {lines,priced,missing,complete,stale:!!store?.stale,subtotal:priced.reduce((n,p)=>n+p.row.subtotal,0),total:complete?store.total:null};
}
export function comparePrices(left,right,items){
 const a=priceCoverage(left,items),b=priceCoverage(right,items),rows=a.lines.map((line,i)=>({item:line.item,left:line.priced?line.row:null,right:b.lines[i].priced?b.lines[i].row:null}));
 const common=rows.filter(p=>p.left&&p.right),comparable=!!left&&!!right&&!left.stale&&!right.stale&&common.length>0;
 const leftSubtotal=common.reduce((n,p)=>n+p.left.subtotal,0),rightSubtotal=common.reduce((n,p)=>n+p.right.subtotal,0);
 return {rows,common,excluded:rows.filter(p=>!p.left||!p.right),comparable,leftSubtotal:comparable?leftSubtotal:null,rightSubtotal:comparable?rightSubtotal:null,difference:comparable?rightSubtotal-leftSubtotal:null,full:comparable&&a.complete&&b.complete};
}
