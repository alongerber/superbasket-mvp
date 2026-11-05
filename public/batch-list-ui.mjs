import {draftKey,restoreDraft} from './shopping-flow.mjs';
import {quantityLabel,countLabel} from './quantity-labels.mjs';
const normalized=s=>String(s).normalize('NFKC').replace(/[״׳"']/g,'').replace(/\s+/g,' ').trim();
export function initBatchList({api,getPending,setPending,getCart,setCart,read,write,openModal,closeModal,navigate,esc,toast}){
 let generation=0,rows=[],active=0,ctxEdit=()=>{};
 const $=id=>document.getElementById(id);
 const save=()=>write('listDraft',{key:draftKey(rows),rows:rows.map(r=>r.selected)});
 const nextRow=()=>{const i=rows.findIndex(r=>!r.selected);active=i<0?-1:i;};
 function render(){
  if(!$('batchRows'))return;
  const focus=document.activeElement?.dataset.batchQuery,selection=focus!==undefined?document.activeElement.selectionStart:null;
  const ready=rows.filter(r=>r.selected&&!r.loading&&!r.error).length;
  $('batchCount').textContent=`${ready} מתוך ${rows.length} מוכנים · הבחירות נשמרות אוטומטית`;
  $('applyBatch').disabled=!ready;
  $('applyBatch').textContent=ready?`הוספת ${countLabel(ready,'מוצר','מוצרים')} לסל`:'בחרו מוצר כדי להמשיך';
  $('batchRows').innerHTML=rows.map((r,i)=>`<article class="batch-row ${r.selected?'resolved':''} ${active===i?'active':''}" id="batch-row-${i}"><button class="batch-title" data-batch-open="${i}" aria-expanded="${active===i}"><span><b>${esc(r.query)} × ${r.quantity}</b><small>${r.selected?esc(r.selected.name):r.loading?'מחפשים התאמות…':r.error?'החיפוש לא נטען':r.choices.length?'בחירת המותג והאריזה':'צריך לדייק את שם המוצר'}</small></span><span>${r.selected?'✓':i+1}</span></button>${active===i?`<div class="batch-options"><div class="batch-search"><input data-batch-query="${i}" value="${esc(r.query)}" aria-label="תיקון ${esc(r.query)}"><button class="outline" data-batch-search="${i}">חיפוש</button></div><label class="batch-amount">כמות לרכישה <input type="number" data-batch-quantity="${i}" min="0.001" max="99" step="0.001" value="${r.quantity}"></label>${r.error?'<p class="notice">לא הצלחנו לטעון את הקטלוג. הבחירה הקודמת נשמרה; נסו לחפש שוב.</p>':!r.loading&&!r.choices.length?'<p class="notice">נסו שם קצר יותר או ברקוד. אפשר להשאיר את השורה להמשך.</p>':''}${r.choices.slice(0,r.expanded?8:3).map((p,j)=>`<button class="batch-choice ${r.selected?.id===p.id?'selected':''}" data-batch-pick="${i}:${j}"><span><b>${esc(p.name)}</b><small>${esc(quantityLabel(p,r.quantity))}</small></span><span>${r.selected?.id===p.id?'✓':'בחירה'}</span></button>`).join('')}${r.choices.length>3?`<button class="text-btn" data-batch-more="${i}">${r.expanded?'פחות אפשרויות':'עוד '+(r.choices.length-3)+' אפשרויות'}</button>`:''}<button class="text-btn" data-batch-skip="${i}">להשאיר להמשך ←</button></div>`:''}</article>`).join('');
  if(focus!==undefined){const input=$('batchRows').querySelector(`[data-batch-query="${focus}"]`);input?.focus({preventScroll:true});if(selection!==null)input?.setSelectionRange(selection,selection);}
 }
 async function lookup(i,version){
  const r=rows[i],request=(r.request||0)+1;r.request=request;r.loading=true;r.error=false;render();
  try{const d=await api('catalog?q='+encodeURIComponent(r.query)+'&limit=8');if(version!==generation||r.request!==request)return;r.choices=d.items;
   if(r.selected){let found=d.items.find(p=>p.id===r.selected.id);if(!found){const exact=await api('catalog?q='+encodeURIComponent(r.selected.id)+'&limit=8');if(version!==generation||r.request!==request)return;found=exact.items.find(p=>p.id===r.selected.id);}r.selected=found||null;}
   if(!r.selected){const exact=d.items.filter(p=>p.id===r.query||p.barcode===r.query||normalized(p.name)===normalized(r.query));r.selected=exact.length===1&&(exact[0].weighted||Number.isInteger(r.quantity))?exact[0]:null;}
  }catch{if(version!==generation||r.request!==request)return;r.error=true;}
  finally{if(version===generation&&r.request===request){r.loading=false;save();render();}}
 }
 async function open(){
  const pending=getPending();if(!pending.length){closeModal();navigate('basket');return;}
  const version=++generation;rows=restoreDraft(pending,read('listDraft',null)).map(r=>({...r,choices:[],loading:true}));nextRow();
  openModal('<div class="detail-eyebrow">הרשימה שלך</div><h2>בוחרים מוצר, ממשיכים הלאה</h2><p>רק שורה אחת פתוחה בכל פעם. אפשר לסגור ולחזור — הבחירות נשמרות.</p><p id="batchCount" role="status"></p><div id="batchRows"></div><div class="batch-footer"><button id="applyBatch" class="primary wide" disabled>בוחרים מוצרים</button><button id="returnToList" class="text-btn">עריכת הרשימה</button></div>');render();
  $('batchRows').oninput=e=>{if(e.target.dataset.batchQuery!==undefined){const r=rows[Number(e.target.dataset.batchQuery)];r.query=e.target.value;r.selected=null;r.request=(r.request||0)+1;r.loading=false;r.choices=[];setPending(rows.map(({query,quantity})=>({query,quantity})));save();render();}};
  $('batchRows').onchange=e=>{if(e.target.dataset.batchQuantity===undefined)return;const r=rows[Number(e.target.dataset.batchQuantity)],n=Number(e.target.value);if(!Number.isFinite(n)||n<=0||n>99||(!r.selected?.weighted&&!Number.isInteger(n)&&r.selected)){toast('בחרו כמות תקינה; למוצר ארוז נדרשות אריזות שלמות.');render();return;}r.quantity=n;setPending(rows.map(({query,quantity})=>({query,quantity})));save();render();};
  $('batchRows').onclick=e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.dataset.batchOpen!==undefined){active=active===Number(b.dataset.batchOpen)?-1:Number(b.dataset.batchOpen);render();return;}
   if(b.dataset.batchMore!==undefined){const r=rows[Number(b.dataset.batchMore)];r.expanded=!r.expanded;render();return;}
   if(b.dataset.batchSkip!==undefined){const start=Number(b.dataset.batchSkip);active=rows.findIndex((r,i)=>i>start&&!r.selected);render();return;}
   if(b.dataset.batchSearch!==undefined){const i=Number(b.dataset.batchSearch),r=rows[i];r.query=r.query.trim();if(!r.query)return;r.selected=null;r.expanded=false;setPending(rows.map(({query,quantity})=>({query,quantity})));save();lookup(i,generation);return;}
   if(b.dataset.batchPick!==undefined){const [i,j]=b.dataset.batchPick.split(':').map(Number),r=rows[i],p=r.choices[j];if(!p.weighted&&!Number.isInteger(r.quantity))return toast('למוצר הזה בוחרים מספר אריזות שלם. עדכנו את הכמות מעל האפשרויות.');r.selected=p;save();nextRow();render();if(active>=0)$('batch-row-'+active)?.scrollIntoView({block:'nearest',behavior:'smooth'});}
  };
  $('returnToList').onclick=()=>{generation++;save();ctxEdit(rows.map(r=>`${r.query} × ${r.quantity}`).join('\n'));};
  $('applyBatch').onclick=()=>{
   const selected=rows.filter(r=>r.selected&&!r.loading&&!r.error),next=structuredClone(getCart());
   for(const r of selected){const p=r.selected,found=next.find(x=>x.id===p.id),quantity=Math.round(((found?.quantity||0)+r.quantity)*1000)/1000;if(quantity>99||!Number.isFinite(quantity)||quantity<=0)return toast('הכמות של '+p.name+' חורגת מ־99. תקנו את הרשימה.');if(found)found.quantity=quantity;else next.push({id:p.id,name:p.name,quantity,weighted:p.weighted,barcode:p.barcode,unit:p.unit});}
   if(next.length>200)return toast('הסל מוגבל ל־200 מוצרים');rows=rows.filter(r=>!selected.includes(r));setPending(rows.map(({query,quantity})=>({query,quantity})));save();setCart(next);generation++;closeModal();navigate('basket');toast(`${countLabel(selected.length,'מוצר נוסף','מוצרים נוספו')}${rows.length?' · '+rows.length+' שורות נשמרו להמשך':''}`);
  };
  let cursor=0;await Promise.all(Array.from({length:Math.min(4,rows.length)},async()=>{while(cursor<rows.length&&version===generation){const i=cursor++;await lookup(i,version);}}));
 }
 return {open,onEdit:fn=>ctxEdit=fn};
}
