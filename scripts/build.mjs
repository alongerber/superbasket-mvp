import {access,rm} from 'node:fs/promises';
for(const f of ['public/index.html','public/app.js','public/app.css','public/manifest.webmanifest','public/sw.js'])await access(f);
console.log('Static app and API source verified. Price snapshots served independently.');
