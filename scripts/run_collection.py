"""Publish coherent progress every five minutes, retaining resumable branch snapshots."""
import json,os,subprocess,sys
from datetime import datetime,timezone
from pathlib import Path
from collection_control import supervise
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.snapshots'
def command(args,cwd=ROOT):return subprocess.run(args,cwd=cwd,check=True)
def publish():
 if not any(OUT.glob('checkpoint-*.json')) and not (OUT/'manifest.json').exists():return
 command(['python','scripts/fetch_prices.py','--export-only']);command(['python','scripts/validate_data.py'])
 m=json.loads((OUT/'manifest.json').read_bytes());paths=['manifest.json','vercel.json']+['objects/'+m['catalog']]+['objects/'+s['object'] for s in m['stores'] if s.get('object')]
 spec=OUT/'.publish-paths';spec.write_text('\n'.join(sorted(set(paths)))+'\n')
 command(['git','config','user.name','superbasket-bot'],OUT);command(['git','config','user.email','superbasket-bot@users.noreply.github.com'],OUT)
 # Working checkpoints may advance during export; only the manifest is a published checkpoint.
 command(['git','rm','--cached','--ignore-unmatch','--','checkpoint-*.json'],OUT)
 command(['git','add','--pathspec-from-file=.publish-paths'],OUT)
 changed=subprocess.run(['git','diff','--cached','--quiet'],cwd=OUT).returncode
 if changed:
  command(['git','commit','-m',f"Verified official prices: {m['priced_stores']} branches"],OUT);command(['git','push','origin','HEAD:price-data'],OUT)
 print(f"Published {m['priced_stores']} branches, {m['price_records']} prices",flush=True)
def main():
 seconds=int(os.getenv('COLLECTION_MAX_SECONDS','2400'))
 state={'status':'running','started_at':datetime.now(timezone.utc).isoformat(),'max_seconds':seconds}
 def save_state():
  tmp=OUT/'collector-state.tmp';tmp.write_text(json.dumps(state));tmp.replace(OUT/'collector-state.json')
 save_state()
 process=subprocess.Popen([sys.executable,'scripts/fetch_prices.py','--workers','8'],cwd=ROOT)
 try:state['status']=supervise(process,seconds,publish)
 finally:
  if process.poll() is None:process.terminate();process.wait(timeout=15)
 state['finished_at']=datetime.now(timezone.utc).isoformat();save_state()
 publish()
 print('Collection terminal state:',state['status'],flush=True)
 if state['status']=='failed':raise SystemExit(process.returncode or 1)
if __name__=='__main__':main()
