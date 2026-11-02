import gzip,hashlib,json,os,sqlite3,tempfile
from pathlib import Path
root=Path(os.getenv('DATA_DIR','.snapshots'));m=json.loads((root/'manifest.json').read_bytes());assert m['schema']==2
count=0;eligible=0;ids=set();priced=0
for s in m['stores']:
 assert s['id'] not in ids;ids.add(s['id'])
 if not s.get('object'):continue
 path=root/'objects'/s['object'];raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()==path.name.split('.')[0]
 obj=json.loads(gzip.decompress(raw));assert obj['id']==s['id'];assert obj['sources'];assert len(obj['products'])==s['price_count']
 assert all(isinstance(p['price'],int) and p['price']>=0 and p['name'] for p in obj['products'])
 assert len({p['id'] for p in obj['products']})==len(obj['products']);count+=len(obj['products']);eligible+=sum(p['price']>0 for p in obj['products']);priced+=1
assert count==m['price_records'];assert priced==m['priced_stores']
raw=(root/'objects'/m['catalog']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['catalog'].split('.')[0]
with tempfile.NamedTemporaryFile(suffix='.sqlite') as f:
 f.write(gzip.decompress(raw));f.flush()
 db=sqlite3.connect('file:'+f.name+'?mode=ro',uri=True)
 assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
 assert db.execute('SELECT count(*) FROM products').fetchone()[0]==m['products']
 assert db.execute('SELECT count(*) FROM stores').fetchone()[0]==len(ids)
 assert db.execute('SELECT sum(stores) FROM products').fetchone()[0]==eligible
 db.close()
print('Verified',len(ids),'known branches;',priced,'priced branches;',count,'real price rows;',m['products'],'catalog products; SQLite integrity OK')
