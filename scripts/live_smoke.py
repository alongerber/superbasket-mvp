"""Read-only production API checks against published, real source data."""
import httpx,time,json
BASE='https://superbasket-mvp.vercel.app'
with httpx.Client(base_url=BASE,timeout=65) as c:
 def get(path,**kw):
  r=c.get(path,**kw);r.raise_for_status();return r.json()
 t=time.monotonic();status=get('/api/status');assert status['priced_stores']>1
 catalog=get('/api/catalog',params={'q':'חלב','limit':12});assert catalog['items'];p=next(p for p in catalog['items'] if p['barcode'])
 exact=get('/api/catalog',params={'q':p['id']});assert exact['items'][0]['id']==p['id']
 stores=[s['id'] for s in status['stores'] if s['has_prices'] and s['chain']!='wolt'][:12]
 detail=get('/api/product',params={'id':p['id'],'stores':','.join(stores)});assert detail['prices']
 ids=[s['store_id'] for s in detail['prices']];r=c.post('/api/basket',json={'items':[{'id':p['id'],'quantity':3}],'store_ids':ids,'extra_stop_cost':10});r.raise_for_status();basket=r.json()
 expected={s['store_id']:round(s['price']*100)*3 for s in detail['prices']}
 assert all(s['total']==expected[s['id']] for s in basket['stores']);assert basket['best']
 r=c.post('/api/basket',json={'items':[{'id':'00000000000000','quantity':1}],'store_ids':ids[:2]});r.raise_for_status();missing=r.json();assert missing['best'] is None and all(s['total'] is None for s in missing['stores'])
 assert c.post('/api/basket',json={'items':[]}).status_code==400
 manifest=get('/manifest.webmanifest');assert manifest['display']=='standalone'
 for path in ['/','/app.css','/app.js','/sw.js','/icon-192.png','/icon-512.png']:
  r=c.get(path);r.raise_for_status();assert len(r.content)>100
 print(json.dumps({'production':BASE,'checks':'pass','branches':status['priced_stores'],'products':status['products'],'price_records':status['price_records'],'barcode':p['id'],'verified_basket_stores':len(basket['stores']),'seconds':round(time.monotonic()-t,2)},ensure_ascii=False))
