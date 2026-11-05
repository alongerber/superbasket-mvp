// Reviewed against the retailer's official branch accessibility directory, 2026-11-05.
// Keep source metadata for traceability; never infer another branch's city from its name.
const source='https://www.rami-levy.co.il/he/stores-accessibility';
export function verifiedStoreMetadata(store){
 if(store.id==='rami-levy--64'&&store.chain==='rami-levy'&&store.name?.includes('אור עקיבא')&&/^הכרמל\s+1$/.test(store.address?.trim()))return {...store,source_city:store.source_city??store.city,city:'אור עקיבא',city_code:'1020',location_verified_at:'2026-11-05',location_source:source};
 return store;
}
