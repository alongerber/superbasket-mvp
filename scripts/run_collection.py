"""Publish coherent progress every five minutes, retaining resumable branch snapshots."""
import json,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.snapshots'
def command(args,cwd=ROOT):return subprocess.run(args,cwd=cwd,check=True)
def publish():
 if not any(OUT.glob('checkpoint-*.json')):return
 command(['python','scripts/fetch_prices.py','--export-only']);command(['python','scripts/validate_data.py'])
 m=json.loads((OUT/'manifest.json').read_bytes());paths=['manifest.json','vercel.json']+[p.name for p in OUT.glob('checkpoint-*.json')]+['objects/'+m['catalog']]+['objects/'+s['object'] for s in m['stores'] if s.get('object')]
 spec=OUT/'.publish-paths';spec.write_text('\n'.join(sorted(set(paths)))+'\n')
 command(['git','config','user.name','superbasket-bot'],OUT);command(['git','config','user.email','superbasket-bot@users.noreply.github.com'],OUT)
 command(['git','add','--pathspec-from-file=.publish-paths'],OUT)
 changed=subprocess.run(['git','diff','--cached','--quiet'],cwd=OUT).returncode
 if changed:
  command(['git','commit','-m',f"Verified official prices: {m['priced_stores']} branches"],OUT);command(['git','push','origin','HEAD:price-data'],OUT)
 print(f"Published {m['priced_stores']} branches, {m['price_records']} prices",flush=True)
def main():
 process=subprocess.Popen(['python','scripts/fetch_prices.py','--workers','8'],cwd=ROOT);last=time.monotonic()
 while process.poll() is None:
  try:process.wait(timeout=30)
  except subprocess.TimeoutExpired:pass
  if process.poll() is None and time.monotonic()-last>=300:
   try:publish()
   except Exception as exc:print('Progress publish deferred:',exc,flush=True)
   last=time.monotonic()
 publish()
 if process.returncode:raise SystemExit(process.returncode)
if __name__=='__main__':main()
