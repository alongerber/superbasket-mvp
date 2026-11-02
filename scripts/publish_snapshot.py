"""Prepare an isolated price-data checkout from a coherent manifest (no credentials)."""
import json,os,shutil,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1];source=root/'.snapshots';target=root/'.work/data-publish';target.mkdir(parents=True,exist_ok=True)
m=json.loads((source/'manifest.json').read_bytes());(target/'objects').mkdir(exist_ok=True)
keys={m['catalog']}|{s['object'] for s in m['stores'] if s.get('object')}
for k in keys:
 p=target/'objects'/k
 if not p.exists():shutil.copyfile(source/'objects'/k,p)
(target/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,separators=(',',':')))
for c in m['chains']:(target/f"checkpoint-{c['id']}.json").write_text(json.dumps({'chain':c,'stores':[s for s in m['stores'] if s['chain']==c['id']]},ensure_ascii=False,separators=(',',':')))
(target/'vercel.json').write_text('{"ignoreCommand":"exit 0"}\n')
if not (target/'.git').exists():
 subprocess.run(['git','init','-b','price-data'],cwd=target,check=True)
 subprocess.run(['git','remote','add','origin','https://github.com/alongerber/superbasket-mvp.git'],cwd=target,check=True)
subprocess.run(['git','add','manifest.json','objects','vercel.json'],cwd=target,check=True)
subprocess.run(['git','add',*['checkpoint-'+c['id']+'.json' for c in m['chains']]],cwd=target,check=True)
subprocess.run(['git','commit','-m',f"Publish official snapshot: {m['priced_stores']} branches, {m['price_records']} prices"],cwd=target,check=True)
print('Prepared',target,'with',len(keys),'verified objects')
