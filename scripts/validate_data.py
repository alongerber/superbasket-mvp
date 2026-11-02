import gzip,hashlib,json,os
from pathlib import Path
root=Path(os.getenv('DATA_DIR','.snapshots'));m=json.loads((root/'manifest.json').read_bytes());assert m['schema']==2
count=0;ids=set()
for s in m['stores']:
 assert s['id'] not in ids;ids.add(s['id'])
 if not s.get('object'):continue
 path=root/'objects'/s['object'];raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()==path.name.split('.')[0]
 obj=json.loads(gzip.decompress(raw));assert obj['id']==s['id'];assert obj['sources'];assert len(obj['products'])==s['price_count']
 assert all(isinstance(p['price'],int) and p['price']>=0 and p['name'] for p in obj['products'])
 assert len({p['id'] for p in obj['products']})==len(obj['products']);count+=len(obj['products'])
assert count==m['price_records'];print('Verified',len(ids),'known branches;',count,'real price rows')
