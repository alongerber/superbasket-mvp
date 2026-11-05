import {verifiedStoreMetadata} from './store-metadata.mjs';
import {identity} from '../public/product-identity.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const ROOT='https://raw.githubusercontent.com/alongerber/superbasket-mvp/price-data';
let manifestCache,manifestAt=0,manifestPromise,catalogPromise,catalogKey,catalogDb;
const objects=new Map();
async function bytes(path){
  if(process.env.DATA_DIR)return readFile(join(process.env.DATA_DIR,path));
  const response=await fetch(`${ROOT}/${path}${path==='manifest.json'?'?v='+Math.floor(Date.now()/60000):''}`,{signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error(`Price data unavailable (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}
export async function manifest(){
 if(manifestCache&&Date.now()-manifestAt<60000)return manifestCache;
 if(manifestPromise)return manifestPromise;
 manifestPromise=(async()=>{try{const m=JSON.parse(await bytes('manifest.json'));if(m.schema!==2||!Array.isArray(m.stores)||!m.catalog)throw Error('Invalid data manifest');m.stores=m.stores.map(verifiedStoreMetadata);manifestCache=m;manifestAt=Date.now();return m;}catch(e){if(manifestCache)return {...manifestCache,refresh_error:'Data refresh failed; serving last verified snapshot'};throw e;}})().finally(()=>{manifestPromise=null});return manifestPromise;
}
async function objectBytes(key){
 if(!/^[a-f0-9]{64}\.(json|sqlite)\.gz$/.test(key))throw Error('Invalid object');
 const data=await bytes(`objects/${key}`);
 if(createHash('sha256').update(data).digest('hex')!==key.split('.')[0])throw Error('Data checksum mismatch');
 return gunzipSync(data,{maxOutputLength:250*1024*1024});
}
export async function catalog(m){
 if(catalogDb&&catalogKey===m.catalog)return catalogDb;
 if(catalogPromise)return catalogPromise;
 catalogPromise=(async()=>{const data=await objectBytes(m.catalog);const path=join('/tmp',`salik-${m.catalog}.db`);await writeFile(path,data);const db=new DatabaseSync(path,{readOnly:true});db.exec('PRAGMA query_only=ON;');catalogDb?.close();catalogDb=db;catalogKey=m.catalog;return db;})().finally(()=>{catalogPromise=null});return catalogPromise;
}
export async function branch(store){
 if(!store.object)throw Error('No verified branch prices');
 if(objects.has(store.object)){const v=objects.get(store.object);objects.delete(store.object);objects.set(store.object,v);return v;}
 const result=JSON.parse(await objectBytes(store.object));
 if(result.id!==store.id)throw Error('Branch identity mismatch');
 objects.set(store.object,result);while(objects.size>12)objects.delete(objects.keys().next().value);return result;
}
export async function mapLimit(items,limit,fn){let next=0;const out=new Array(items.length);await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{for(;;){const i=next++;if(i>=items.length)return;out[i]=await fn(items[i],i);}}));return out;}
export const normalize=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s%]/gu,' ').replace(/\s+/g,' ').trim();
export function search(db,q='',limit=30,offset=0){
 const clean=normalize(q);let rows;
 const exact=db.prepare('SELECT * FROM products WHERE id=? OR barcode=? LIMIT 1').get(q,q.padStart(14,'0'));
 if(exact)return [exact];
 if(!clean)rows=db.prepare('SELECT * FROM products WHERE barcode IS NOT NULL ORDER BY stores DESC LIMIT ? OFFSET ?').all(limit,offset);
 else{
  const tokens=clean.split(' ').filter(Boolean).slice(0,12);const match=tokens.map(t=>'"'+t.replaceAll('"','')+'"*').join(' AND ');
  rows=db.prepare('SELECT p.* FROM product_search f JOIN products p ON p.id=f.id WHERE product_search MATCH ? ORDER BY (p.search LIKE ?) DESC,p.stores DESC LIMIT ? OFFSET ?').all(match,clean+'%',limit,offset);
  if(!rows.length)rows=db.prepare('SELECT * FROM products WHERE search LIKE ? ORDER BY stores DESC LIMIT ? OFFSET ?').all('%'+clean.replaceAll('%','\\%')+'%',limit,offset);
 }
 return rows;
}
export function publicProduct(p){return {id:p.id,barcode:p.barcode,name:p.name,minPrice:p.min_price/100,maxPrice:p.max_price/100,stores:p.stores,weighted:!!p.weighted,unit:p.unit,manufacturer:p.manufacturer,identity:identity(p)};}
export function fresh(time,maxHours=36){return !!time&&Date.now()-Date.parse(time)<=maxHours*3600000&&Date.parse(time)<=Date.now()+300000;}
export function apiError(res,error){console.error(error.message);return res.status(503).json({error:'נתוני המחירים אינם זמינים כרגע. הסל נשמר במכשיר; אפשר לנסות שוב.',code:'DATA_UNAVAILABLE'});}
