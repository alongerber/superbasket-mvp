"""Verify every currently published immutable snapshot without altering production."""
import concurrent.futures,hashlib,json,os,subprocess,sys,time
from pathlib import Path
import httpx
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.work/production-data';(OUT/'objects').mkdir(parents=True,exist_ok=True)
URL='https://raw.githubusercontent.com/alongerber/superbasket-mvp/price-data'
with httpx.Client(timeout=65) as client:
 response=client.get(URL+'/manifest.json',params={'v':int(time.time()//60)});response.raise_for_status();m=response.json();(OUT/'manifest.json').write_bytes(response.content)
 keys={m['catalog']}|{s['object'] for s in m['stores'] if s.get('object')}
 def download(key):
  path=OUT/'objects'/key
  if not path.exists():
   r=client.get(URL+'/objects/'+key);r.raise_for_status();assert hashlib.sha256(r.content).hexdigest()==key.split('.')[0];path.write_bytes(r.content)
  return key
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(download,keys))
subprocess.run([sys.executable,str(ROOT/'scripts/validate_data.py')],env={**os.environ,'DATA_DIR':str(OUT)},check=True)
print(json.dumps({'generated_at':m['generated_at'],'priced_stores':m['priced_stores'],'products':m['products'],'price_records':m['price_records'],'priced_chains':len({s['chain'] for s in m['stores'] if s.get('object')})},ensure_ascii=False))
