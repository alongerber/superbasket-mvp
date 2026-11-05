import {alternativesKey} from './product-equivalence.mjs';
import {summarize} from './basket-summary.mjs';

export const QUOTE_TTL = 3 * 60 * 1000;
export const scopeKey = request => JSON.stringify([request.city.trim(), [...(request.store_ids || [])].sort(), !!request.include_delivery]);

// Only reuse unit prices for products actually checked in the same scope.
// Missing prices stay missing, and a branch can age out of the ranking.
export function repriceBasket(quote, items, now = Date.now()) {
  if (!items.length || items.some(item => !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 99)) return null;
  const known = new Map(quote.items.map(item => [item.id,item]));
  if(items.some(item=>!known.has(item.id)||alternativesKey(item)!==alternativesKey(known.get(item.id))||(item.alternatives?.length&&item.quantity!==known.get(item.id).quantity)))return null;
  const stores = quote.stores.map(store => {
    const index = new Map(store.products.map(product => [product.id, product]));
    const products = items.map(item => {
      const product = index.get(item.id);
      if (!product || product.missing || !Number.isSafeInteger(product.price) || product.price <= 0) return {...item, missing: true};
      if(item.alternatives?.length)return {...product,...item};
      if (!product.weighted && !Number.isInteger(item.quantity)) return {...item, missing: true, reason: 'נדרשת כמות שלמה למוצר ארוז'};
      return {...product, ...item, subtotal: Math.round(product.price * item.quantity)};
    });
    const missing = products.filter(product => product.missing).map(product => product.id);
    const subtotal = products.reduce((sum, product) => sum + (product.missing ? 0 : product.subtotal), 0);
    const published = Date.parse(store.published_at);
    const stale = !Number.isFinite(published) || now - published > 36 * 3600000 || published > now + 300000;
    return {...store, products, stale, shelf_total: subtotal, total: missing.length ? null : subtotal, missing_items: missing, matched_count: items.length - missing.length, requested_count: items.length};
  });
  stores.sort((a,b) => Number(a.stale)-Number(b.stale) || a.missing_items.length-b.missing_items.length || a.shelf_total-b.shelf_total || a.id.localeCompare(b.id));
  return {...quote, items, stores, ...summarize(stores, items, 0, {split: false})};
}

export function createLiveBasket({load, emit, delay = 350, now = Date.now}) {
  let sequence = 0, controller, timer, cache;
  function cancel() { sequence++; clearTimeout(timer); controller?.abort(); }
  function update(request, {force = false} = {}) {
    cancel();
    const version = sequence;
    request = structuredClone(request);
    if (!request.items.length) { emit({phase: 'empty', data: null}); return; }
    const scope = scopeKey(request);
    if (!force && cache?.scope === scope && now()-cache.at < QUOTE_TTL) {
      const data = repriceBasket(cache.data, request.items, now());
      if (data) { emit({phase: 'ready', data, checkedAt: cache.at}); return; }
    }
    const previous=cache?.scope===scope?cache.data:null;
    emit({phase: 'loading', data: null, previous, progress: {checked: 0}});
    controller = new AbortController();
    const signal = controller.signal;
    timer = setTimeout(async () => {
      try {
        const data = await load(request, progress => {
          if (sequence === version) emit({phase: 'loading', data: null, previous, progress});
        }, signal);
        if (sequence !== version || signal.aborted) return;
        const at = now();
        cache = {scope, at, data};
        emit({phase: 'ready', data: repriceBasket(data, request.items, at), checkedAt: at});
      } catch (error) {
        if (sequence === version && !signal.aborted) emit({phase: 'error', data: null, previous, error: error.message, errorProductId:error.product_id, errorCode:error.code});
      }
    }, force ? 0 : delay);
  }
  return {update, cancel};
}
