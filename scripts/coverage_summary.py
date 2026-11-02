import json,os
from pathlib import Path
p=Path(os.getenv('DATA_DIR','.snapshots'))/'manifest.json'
if not p.exists():print('No successful manifest available');raise SystemExit(0)
m=json.loads(p.read_bytes());print('# Measured official-data coverage\n');print(f"Generation: {m['generated_at']}\n\n{m['priced_stores']} priced branches / {len(m['stores'])} discovered; {m['products']} product identifiers; {m['price_records']} prices.\n")
print('| Chain | Priced | Discovered | Status |\n|---|---:|---:|---|')
for c in m['chains']:print(f"| {c['name']} | {c['priced']} | {c['discovered']} | {c['status']} |")
