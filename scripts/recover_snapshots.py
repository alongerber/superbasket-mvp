"""One-time recovery of already committed-to-disk branch objects after interruption."""
from fetch_prices import *
bychain={}
for p in (OUT/'objects').glob('*.json.gz'):
 try:
  obj=json.loads(gzip.decompress(p.read_bytes()));chain,store_id=obj['id'].split('--');metadata=read_json(Path('/workspace/scratch/949eb5e6c253/probe')/f'{chain}.json',{});info=next(c for c in ilp.list_chains() if c.slug==chain);raw=next((s for s in metadata.get('stores',[]) if sid(s['store_id'])==store_id),{})
  s={'id':obj['id'],'chain':chain,'chain_name':info.name_he,'store_id':store_id,'name':raw.get('name') or 'סניף '+store_id,'city':raw.get('city') or '','address':raw.get('address') or '','portal':info.portal_url,'metadata_verified':bool(raw),'object':p.name,'published_at':obj.get('published_at'),'ingested_at':datetime.fromtimestamp(p.stat().st_mtime,timezone.utc).isoformat(),'checked_at':datetime.fromtimestamp(p.stat().st_mtime,timezone.utc).isoformat(),'price_count':len(obj['products']),'error':None,'promotion_count':len(obj.get('promotions',[])),'source_files':[x['file'] for x in obj['sources']]}
  bychain.setdefault(chain,{})[s['id']]=s
 except Exception as e:print(e)
for slug,stores in bychain.items():
 path=OUT/f'checkpoint-{slug}.json';old=read_json(path,{'chain':{'id':slug,'name':next(c.name_he for c in ilp.list_chains() if c.slug==slug),'portal':next(c.portal_url for c in ilp.list_chains() if c.slug==slug),'checked_at':now(),'discovered':0,'priced':0,'errors':[],'status':'partial'},'stores':[]})
 merged={s['id']:s for s in old['stores']};merged.update(stores);old['stores']=list(merged.values());old['chain']['priced']=len(stores);path.write_bytes(dump(old));print(slug,len(stores))
