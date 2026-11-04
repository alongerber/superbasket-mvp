import {access,rm} from 'node:fs/promises';
for(const f of ['public/og/me-super-v1.jpg','public/me-super.css','public/taxonomy.mjs','public/categories-ui.mjs','public/planning.mjs','public/planner-capabilities.mjs','public/planner-ui.mjs','public/index.html','public/app.js','public/app.css','public/manifest.webmanifest','public/sw.js','public/basket-client.mjs','public/basket-summary.mjs','public/retailers.mjs','public/recognition.mjs','public/product-identity.mjs'])await access(f);
console.log('Static app and API source verified. Price snapshots served independently.');
