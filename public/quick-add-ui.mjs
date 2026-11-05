import {quantityControls} from './product-controls.mjs';
import {countLabel} from './quantity-labels.mjs';
import {quantityLabel} from './quantity-labels.mjs';
export function initQuickAdd({api,getCart,add,changeQuantity,art,hydrate,esc,openProduct,openList,refreshPrices,renderPrices,basketStatus}){
 const $=id=>document.getElementById(id),input=$('basketSearch'),results=$('quickAddResults');
 let sequence=0,timer,controller,items=[],hasMore=false,offset=0,loading=false;
 function stop(){sequence++;clearTimeout(timer);controller?.abort();loading=false;}
 function close(){stop();input.value='';items=[];results.innerHTML='';$('quickAddPanel').hidden=true;document.body.classList.remove('basket-adding');input.setAttribute('aria-expanded','false');}
 function refresh(){
  for(const row of results.querySelectorAll('[data-quick-row]')){const p=items.find(p=>p.id===row.dataset.quickRow),chosen=getCart().find(p=>p.id===row.dataset.quickRow);if(p)row.querySelector('.quick-quantity').innerHTML=quantityControls(p,chosen?.quantity||0,'quick-add','quick-minus');}
  $('quickAddDone').textContent=getCart().length?'לסל · '+(basketStatus()||countLabel(getCart().length,'מוצר','מוצרים')):'חזרה לסל';
 }
 function render(){
  results.innerHTML=items.map(p=>`<article class="quick-add-row" data-quick-row="${esc(p.id)}"><button class="quick-product" data-quick-detail="${esc(p.id)}" aria-label="פרטי ${esc(p.name)}">${art(p)}<span><b>${esc(p.name)}</b><small>${esc(quantityLabel(p,1))}</small></span></button><div class="quick-price product-price" data-catalog-price="${esc(p.id)}"><small>בודקים מחיר…</small></div><div class="quick-quantity"></div></article>`).join('');
  refresh();hydrate(items);renderPrices();
 }
 async function search(append=false){
  const q=input.value.trim();if(!q){close();return;}stop();const version=sequence;controller=new AbortController();const signal=controller.signal;loading=true;
  $('quickAddPanel').hidden=false;document.body.classList.add('basket-adding');input.setAttribute('aria-expanded','true');$('quickAddMore').hidden=true;$('quickAddStatus').textContent='מחפשים מוצרים…';
  if(!append){items=[];offset=0;results.innerHTML='';}
  try{const d=await api('catalog?q='+encodeURIComponent(q)+'&limit=8&offset='+offset,{signal:AbortSignal.any([signal,AbortSignal.timeout(60000)])});if(version!==sequence)return;offset+=d.items.length;items=append?[...items,...d.items]:d.items;hasMore=d.has_more;render();refreshPrices(items);$('quickAddStatus').textContent=items.length?'מוסיפים בלחיצה וממשיכים למוצר הבא':'לא נמצאה התאמה. נסו שם קצר יותר או ברקוד.';$('quickAddMore').hidden=!hasMore;}
  catch(e){if(version!==sequence||signal.aborted)return;$('quickAddStatus').textContent='החיפוש לא נטען. אפשר לנסות שוב.';$('quickAddMore').hidden=true;results.insertAdjacentHTML('beforeend','<button class="outline wide" data-quick-retry>ניסיון נוסף</button>');}
  finally{if(version===sequence)loading=false;}
 }
 input.oninput=()=>{stop();items=[];results.innerHTML='';$('quickAddMore').hidden=true;if(!input.value.trim())return close();$('quickAddPanel').hidden=false;document.body.classList.add('basket-adding');input.setAttribute('aria-expanded','true');$('quickAddStatus').textContent='מחפשים מוצרים…';timer=setTimeout(()=>search(),220);};
 input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();search();}if(e.key==='Escape'){close();input.blur();}};
 input.addEventListener('paste',e=>{const text=e.clipboardData?.getData('text');if(text&&/[\n;]/.test(text)){e.preventDefault();close();openList(text);}});
 results.onclick=e=>{const button=e.target.closest('button');if(!button)return;if(button.hasAttribute('data-quick-retry'))return search();if(button.dataset.quickDetail)return openProduct(button.dataset.quickDetail);const id=button.dataset.quickAdd||button.dataset.quickMinus,p=items.find(p=>p.id===id);if(!p)return;if(button.dataset.quickAdd)add(p);else changeQuantity(id,-1);refresh();};
 $('quickAddMore').onclick=()=>{if(!loading)search(true);};$('quickAddDone').onclick=()=>{close();input.blur();};$('basketAddList').onclick=()=>openList();
 function focus(){document.getElementById('basketAddDock').scrollIntoView({block:'start',behavior:'instant'});input.focus();}
 return {refresh,focus,items:()=>items};
}
