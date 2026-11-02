import subprocess,pathlib,json,base64
names=subprocess.check_output(['git','diff','--name-only'],text=True).splitlines()+subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines()
entries=[];binary=[]
for name in sorted(set(names)):
 p=pathlib.Path(name)
 if not p.exists():entries.append({'path':name,'mode':'100644','type':'blob','sha':None});continue
 if p.suffix=='.png':binary.append({'path':name,'content':base64.b64encode(p.read_bytes()).decode()})
 else:entries.append({'path':name,'mode':'100644','type':'blob','content':p.read_text()})
print(json.dumps({'entries':entries,'binary':binary},ensure_ascii=False))
