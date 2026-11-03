const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
export function recent(time, now = Date.now()) {
  const date = Date.parse(time);
  return Number.isFinite(date) && date <= now + 300000 && now - date <= 36 * 3600000;
}
// Page source branches rather than matches, so absent prices and errors remain visible.
export function productScope(stores, query = {}, now = Date.now()) {
  const offset = Number(query.offset ?? 0), limit = Number(query.limit ?? 12);
  if (!Number.isInteger(offset) || offset < 0 || offset > 20000 || !Number.isInteger(limit) || limit < 1 || limit > 24) throw Error('טווח הסניפים אינו תקין');
  const ids = String(query.stores || '').split(',').filter(Boolean);
  if (ids.length > 60) throw Error('אפשר לבחור עד 60 סניפים');
  const city = normalize(String(query.city || '').slice(0, 80)), chain = String(query.chain || '').slice(0, 80);
  const filtered = stores.filter(s => s.object && (!ids.length || ids.includes(s.id)) &&
    (ids.length || !city || normalize(s.city) === city || (!normalize(s.city) && normalize(s.name + ' ' + s.address).includes(city))) &&
    (!chain || s.chain === chain));
  filtered.sort((a,b) => Number(recent(b.published_at, now)) - Number(recent(a.published_at, now)) ||
    String(a.chain_name + ' ' + a.name + ' ' + a.id).localeCompare(String(b.chain_name + ' ' + b.name + ' ' + b.id), 'he'));
  return { stores: filtered.slice(offset, offset + limit), total: filtered.length, offset, limit,
    next_offset: offset + limit < filtered.length ? offset + limit : null };
}
export function productPrice(store, snapshot, id, now = Date.now()) {
  const item = snapshot.products.find(p => p.id === id);
  if (!item || !Number.isInteger(item.price) || item.price <= 0) return null;
  return {store_id:store.id, store_name:store.chain_name+' · '+store.name,
    chain:store.chain, chain_name:store.chain_name, branch_name:store.name,
    city:store.city, address:store.address, price:item.price/100,
    published_at:store.published_at, checked_at:store.checked_at,
    stale:!recent(store.published_at, now),
    history:(snapshot.history?.[id] || []).filter(([,price]) => Number.isInteger(price) && price > 0).slice(-90).map(([time,price]) => ({time,price:price/100}))};
}
