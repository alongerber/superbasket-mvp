"""National official-file collector. Atomic branch snapshots, source times and history."""
import argparse,concurrent.futures,gzip,hashlib,json,os,re,sqlite3,threading,fcntl
from datetime import datetime,timedelta,timezone
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo
import israeli_prices as ilp
from israeli_prices.core.http import HttpClient
from official_adapters import FilteredShufersal
TZ=ZoneInfo('Asia/Jerusalem');ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.getenv('DATA_DIR',str(ROOT/'.snapshots')));OUT.mkdir(parents=True,exist_ok=True);(OUT/'objects').mkdir(exist_ok=True)
def now():return datetime.now(timezone.utc).isoformat()
def stamp(v):
 if v is None:return None
 return (v.replace(tzinfo=TZ) if v.tzinfo is None else v).astimezone(timezone.utc).isoformat()
def norm(v):return re.sub(r'\s+',' ',re.sub(r'[^\w\s%]',' ',str(v or '').lower())).strip()
def sid(v):return str(int(v)) if str(v).isdigit() else str(v)
def dump(v):return json.dumps(v,ensure_ascii=False,separators=(',',':'),default=str).encode()
def read_json(p,default):
 try:return json.loads(p.read_bytes())
 except (OSError,ValueError):return default
def read_object(key):return json.loads(gzip.decompress((OUT/'objects'/key).read_bytes()))
def put_object(v):
 data=gzip.compress(dump(v),compresslevel=6,mtime=0);key=hashlib.sha256(data).hexdigest()+'.json.gz';p=OUT/'objects'/key
 if not p.exists():p.write_bytes(data)
 return key
def source(ref,payload=None):return {'file':ref.name,'published_at':stamp(ref.published_at),'sha256':hashlib.sha256(payload).hexdigest() if payload else None}
def listing(a,kind):
 latest={};cutoff=datetime.now(TZ).replace(tzinfo=None)-timedelta(hours=36)
 for ref in a.iter_files(file_type=kind):
  if ref.published_at and ref.published_at<cutoff:break
  if ref.store_id is not None:latest.setdefault(sid(ref.store_id),ref)
 return latest
def price_rows(parsed,chain):
 rows={}
 for p in parsed.items:
  if not p.name or p.price is None or not p.price.is_finite() or p.price<=0:continue
  barcode=p.gtin if not p.is_weighted else None;key=barcode or f'{chain}:{p.item_code}'
  rows[key]={'id':key,'barcode':barcode,'name':p.name,'price':int((p.price*100).quantize(Decimal('1'))),'updated_at':stamp(p.price_update_time),'weighted':bool(p.is_weighted),'unit':p.unit_of_measure,'manufacturer':p.manufacturer,'allow_discount':p.allow_discount,'source_status':p.status}
 return rows

def collect_chain(info,old_stores,max_stores=0):
 result={'id':info.slug,'name':info.name_he or info.name,'portal':info.portal_url,'checked_at':now(),'discovered':0,'priced':0,'errors':[],'status':'blocked'}
 previous={s['id']:s for s in old_stores if s['chain']==info.slug};stores=dict(previous);client=HttpClient(timeout=30,retries=2)
 try:
  if not info.implemented:raise ValueError('No working adapter for this official portal')
  a=FilteredShufersal(client) if info.slug=='shufersal' else ilp.get_adapter(info.slug,client)
  try:
   ref=a.latest(ilp.FileType.STORES);metadata=ilp.parse(a.download(ref));result['stores_source']=source(ref)
   for s in metadata.stores:
    key=f'{info.slug}--{sid(s.store_id)}';stores[key]={**previous.get(key,{}),'id':key,'chain':info.slug,'chain_name':result['name'],'store_id':s.store_id,'name':s.name or s.store_id,'city':s.city or '','address':s.address or '','portal':info.portal_url,'metadata_verified':True}
   result['discovered']=len(metadata.stores)
  except Exception as exc:result['errors'].append('Stores: '+str(exc)[:220])
  full=listing(a,ilp.FileType.PRICE_FULL)
  try:delta={} if info.slug=='shufersal' else listing(a,ilp.FileType.PRICE)
  except Exception as exc:delta={};result['errors'].append('Price updates: '+str(exc)[:220])
  try:promos={} if info.slug=='shufersal' else listing(a,ilp.FileType.PROMO_FULL)
  except Exception as exc:promos={};result['errors'].append('Promotions: '+str(exc)[:220])
  for store_id in full:
   key=f'{info.slug}--{store_id}';stores.setdefault(key,{'id':key,'chain':info.slug,'chain_name':result['name'],'store_id':store_id,'name':f'סניף {store_id}','city':'','address':'','portal':info.portal_url,'metadata_verified':False})
  result['listed_price_files']=len(full)
  candidates=sorted(full.items(),key=lambda pair:(previous.get(f'{info.slug}--{pair[0]}',{}).get('checked_at') or '',pair[0]))
  if max_stores:candidates=candidates[:max_stores]
  checkpoint_lock=threading.Lock()
  def collect_one(pair):
   store_id,ref=pair
   key=f'{info.slug}--{store_id}';store=stores[key]
   try:
    prior=read_object(previous[key]['object']) if previous.get(key,{}).get('object') and (OUT/'objects'/previous[key]['object']).exists() else None
    update=delta.get(store_id)
    if info.slug=='shufersal':
     # Refresh expiring signed URLs just before downloading each branch.
     ref=a.latest(ilp.FileType.PRICE_FULL,store_id=store_id)
     try:update=a.latest(ilp.FileType.PRICE,store_id=store_id)
     except ilp.FileNotFound:update=None
    if update and (not update.published_at or not ref.published_at or update.published_at<=ref.published_at):update=None
    expected=[r.name for r in (ref,update) if r];old_sources=prior.get('sources',[]) if prior else []
    if prior and [s['file'] for s in old_sources]==expected:products={p['id']:p for p in prior['products']};sources=old_sources
    else:
     payload=a.download(ref);parsed=ilp.parse(payload)
     if parsed.store_id is not None and sid(parsed.store_id)!=store_id:raise ValueError('Source branch ID mismatch')
     if parsed.chain_id and info.chain_id and parsed.chain_id!=info.chain_id:raise ValueError('Source chain ID mismatch')
     products=price_rows(parsed,info.slug);sources=[source(ref,payload)]
     if not products:raise ValueError('Empty full file; previous snapshot retained')
     if update:
      payload=a.download(update);parsed=ilp.parse(payload)
      if parsed.store_id is not None and sid(parsed.store_id)!=store_id:raise ValueError('Delta branch ID mismatch')
      products.update(price_rows(parsed,info.slug));sources.append(source(update,payload))
    published_at=sources[-1]['published_at'];history=prior.get('history',{}) if prior else {}
    for p in products.values():
     points=history.setdefault(p['id'],[])
     if not points or points[-1][1]!=p['price']:points.append([published_at or now(),p['price']])
     history[p['id']]=points[-90:]
    promotion_rows=[];promo_source={};promo_error=None
    try:
     pr=promos.get(store_id)
     if info.slug=='shufersal':
      try:pr=a.latest(ilp.FileType.PROMO_FULL,store_id=store_id)
      except ilp.FileNotFound:pr=None
     if pr:
      if prior and prior.get('promo_source',{}).get('file')==pr.name:promotion_rows=prior['promotions'];promo_source=prior['promo_source']
      else:
       payload=a.download(pr);pf=ilp.parse(payload);promotion_rows=[p.model_dump(mode='json') for p in pf.promotions];promo_source=source(pr,payload)
     else:promo_error='No current promotion file'
    except Exception as exc:promo_error=str(exc)[:160]
    obj={'id':key,'products':list(products.values()),'sources':sources,'history':history,'promotions':promotion_rows,'promo_source':promo_source,'promotion_error':promo_error,'published_at':published_at}
    store.update({'object':put_object(obj),'published_at':published_at,'ingested_at':now(),'checked_at':now(),'price_count':len(products),'error':None,'promotion_count':len(promotion_rows),'promotion_error':promo_error,'source_files':[s['file'] for s in sources]})
    print(f'OK {key}: {len(products)} prices',flush=True)
   except Exception as exc:store.update({'checked_at':now(),'error':str(exc)[:240]});print(f'FAIL {key}: {str(exc)[:150]}',flush=True)
   with checkpoint_lock:
    tmp=OUT/f"checkpoint-{info.slug}.tmp"
    tmp.write_bytes(dump({"chain":result,"stores":list(stores.values())}));tmp.replace(OUT/f"checkpoint-{info.slug}.json")
  with concurrent.futures.ThreadPoolExecutor(max_workers=3) as downloads:
   list(downloads.map(collect_one,candidates))
  result['priced']=sum(bool(s.get('object')) for s in stores.values());result['failed_stores']=sum(bool(s.get('error')) for s in stores.values())
  result['status']='partial' if result['errors'] or result['failed_stores'] or result['priced']<len(stores) else 'ok'
 except Exception as exc:result['errors'].append(str(exc)[:260])
 finally:client.close()
 (OUT/f'checkpoint-{info.slug}.json').write_bytes(dump({'chain':result,'stores':list(stores.values())}))
 print(f"CHAIN {info.slug}: {result['priced']} priced / {len(stores)} known",flush=True)
 return result,list(stores.values())

def export_catalog(stores,target):
 cities=read_json(ROOT/'data/cities.json',{}).get('cities',{})
 for store in stores:
  city=str(store.get('city') or '').strip()
  if city.isdigit() and sid(city) in cities:
   store['city_code']=city;store['city']=cities[sid(city)]
  elif city:store['city']=city

 path=OUT/'catalog.sqlite'
 if path.exists():path.unlink()
 db=sqlite3.connect(path);db.executescript('''PRAGMA journal_mode=OFF;PRAGMA synchronous=OFF;
 CREATE TABLE products(id TEXT PRIMARY KEY,barcode TEXT,name TEXT NOT NULL,search TEXT NOT NULL,min_price INTEGER,max_price INTEGER,stores INTEGER,weighted INTEGER,unit TEXT,manufacturer TEXT);
 CREATE VIRTUAL TABLE product_search USING fts5(id UNINDEXED,name,tokenize='unicode61');
 CREATE TABLE stores(id TEXT PRIMARY KEY,data TEXT NOT NULL);''')
 sql='INSERT INTO products VALUES(?,?,?,?,?,?,1,?,?,?) ON CONFLICT(id) DO UPDATE SET min_price=min(min_price,excluded.min_price),max_price=max(max_price,excluded.max_price),stores=stores+1'
 for s in stores:
  db.execute('INSERT INTO stores VALUES(?,?)',(s['id'],json.dumps(s,ensure_ascii=False)))
  if s.get('object'):
   data=read_object(s['object']);db.executemany(sql,[(p['id'],p.get('barcode'),p['name'],norm(p['name']),p['price'],p['price'],int(p.get('weighted',False)),p.get('unit'),p.get('manufacturer')) for p in data['products'] if p['price']>0])
  db.commit()
 db.execute('INSERT INTO product_search SELECT id,search FROM products');count=db.execute('SELECT count(*) FROM products').fetchone()[0];db.commit();db.execute('VACUUM');db.close()
 compressed=gzip.compress(path.read_bytes(),compresslevel=6,mtime=0);key=hashlib.sha256(compressed).hexdigest()+'.sqlite.gz';(OUT/'objects'/key).write_bytes(compressed);target.update({'catalog':key,'products':count});path.unlink()

def main():
 p=argparse.ArgumentParser();p.add_argument('--chains');p.add_argument('--max-stores',type=int,default=0);p.add_argument('--workers',type=int,default=6);p.add_argument('--export-only',action='store_true');args=p.parse_args()
 old=read_json(OUT/'manifest.json',{'stores':[],'chains':[]})
 for checkpoint in OUT.glob('checkpoint-*.json'):
  c=read_json(checkpoint,{})
  if not c:continue
  old['stores']=[s for s in old['stores'] if s['chain']!=c['chain']['id']]+c['stores']
  old['chains']=[s for s in old['chains'] if s['id']!=c['chain']['id']]+[c['chain']]
 selected=args.chains.split(',') if args.chains else None;chains=[c for c in ilp.list_chains() if not selected or c.slug in selected];results=[]
 if args.export_only:
  for path in OUT.glob('checkpoint-*.json'):
   c=read_json(path,{});results.append((c['chain'],c['stores']))
 else:
  with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
   for f in concurrent.futures.as_completed([pool.submit(collect_chain,c,old['stores'],args.max_stores) for c in chains]):results.append(f.result())
 changed={r[0]['id'] for r in results};stores=[s for s in old['stores'] if s['chain'] not in changed]+[s for _,ss in results for s in ss];cr=[c for c in old['chains'] if c['id'] not in changed]+[r[0] for r in results]
 m={'schema':2,'generated_at':now(),'stores':sorted(stores,key=lambda s:s['id']),'chains':sorted(cr,key=lambda c:c['id']),'registered_chains':len(ilp.list_chains()),'schedule_hours':3,'source':'official-transparency-files','priced_stores':sum(bool(s.get('object')) for s in stores),'price_records':sum(s.get('price_count',0) for s in stores)}
 if not m['priced_stores']:raise SystemExit('No verified prices; retaining previous manifest')

 for c in m['chains']:
  ss=[s for s in stores if s['chain']==c['id']];c['priced']=sum(bool(s.get('object')) for s in ss);c['failed_stores']=sum(bool(s.get('error')) for s in ss)
 with (OUT/'export.lock').open('w') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX)
  export_catalog(stores,m);(OUT/'manifest.tmp').write_bytes(dump(m));(OUT/'manifest.tmp').replace(OUT/'manifest.json');print(json.dumps({k:v for k,v in m.items() if k not in ('chains','stores')},ensure_ascii=False),flush=True)
  keep={m['catalog'],old.get('catalog')}|{s.get('object') for s in stores+old['stores']}
  if not args.export_only:
   for path in (OUT/'objects').iterdir():
    if path.name not in keep:path.unlink()
if __name__=='__main__':main()
