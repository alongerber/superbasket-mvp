import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRequest,templatePlan,recipePlan,normalizePlan,packageQuantity} from '../public/planning.mjs';
import {departments,categoryMap,leafIds,classifyProduct,descendants,publicCategories} from '../public/taxonomy.mjs';
import {CLAUDE_MODEL,MAX_OUTPUT_TOKENS,generateShoppingPlan,generationAccess,verifyClaudeConnection,createConnectionVerifier,plannerCapabilities} from '../lib/shopping-ai.mjs';
import {availabilityFromServer} from '../public/planner-capabilities.mjs';
const plan={title:'ארוחת פסטה',summary:'לארבעה סועדים',servings:4,ingredients:[{name:'פסטה',query:'פסטה',amount:400,unit:'g',group:'main',note:''}],notes:['בדקו גודל אריזה']};
test('taxonomy has unique IDs, depth and complete disjoint descendants',()=>{const all=[];const visit=ns=>ns.forEach(n=>{all.push(n.id);if(n.children)visit(n.children)});visit(departments);assert.equal(new Set(all).size,all.length);assert.equal(all.length,categoryMap.size);assert.ok(categoryMap.get('entrecote').ancestors.length===2);assert.equal(new Set(departments.flatMap(n=>descendants(n.id))).size,leafIds.length);assert.equal(publicCategories({'cottage':3,'white-cheese':2})[0].count,5)});
test('retail categories distinguish cheese, meat, plant milk and misleading food names',()=>{const cases=[['קוטג תנובה 5%','cottage'],['גבינה צהובה עמק 200 גרם','yellow-cheese'],['גבינה בולגרית 5%','salty-cheese'],['גבינה שמנת נפוליאון','cream-cheese'],['טונה לבנה בשמן','canned'],['אנטריקוט עגל קפוא חלק','entrecote'],['המבורגר אנטריקוט 500 גרם','burgers'],['קבב אנטריקוט קצבים','burgers'],['מאגדת טעמקור','ice-cream'],['פרגיות טריות','chicken-thigh'],['בשר טחון טרי','beef-mince'],['קפה טחון 250 גרם','coffee'],['פלפל שחור טחון','spices'],['סלמון טרי','salmon'],['סלמון מעושן','smoked-fish'],['משקה סויה אלפרו','plant-milk'],['אלטרנטיב שיבול.שועל','plant-milk'],['תפוציפס שמנת בצל','salty-snacks'],['קליק קורנפלקס','chocolate'],['פיניש נוזל הברקה','dishes'],['מוצר שלא ניתן לזהות','unclassified']];for(const [name,id]of cases)assert.equal(classifyProduct({name}),id,name)});
test('guest counts are totals and invalid requests are rejected',()=>{assert.equal(validateRequest({people:8,children:2,vegetarians:3}).people,8);for(const body of [{people:0},{people:4,children:5},{people:2,vegetarians:3},{people:3.5},{budget:-1},{prompt:'x'.repeat(1201)}])assert.throws(()=>validateRequest(body))});
test('structured plans label themselves and scale quantities without adding guests',()=>{const a=templatePlan({people:4,preset:'bbq'}),b=templatePlan({people:8,preset:'bbq'});assert.equal(a.source,'template');assert.equal(b.ingredients.find(x=>x.name==='פרגיות').amount,2*a.ingredients.find(x=>x.name==='פרגיות').amount);const veg=templatePlan({people:4,vegetarians:4,preset:'bbq'});assert.ok(!veg.ingredients.some(x=>/פרגיות|קבב/.test(x.name)));assert.ok(veg.ingredients.find(x=>x.name==='טופו'))});
test('recipe parser reports unparsed lines and does not silently rescale or truncate',()=>{const p=recipePlan('500 גרם פסטה\n2 כפות שמן\nמערבבים היטב',8);assert.equal(p.ingredients[0].amount,500);assert.equal(p.ingredients[1].unit,'tbsp');assert.ok(p.notes.some(n=>n.includes('מערבבים היטב')));assert.throws(()=>recipePlan(Array(41).fill('1 ביצה').join('\n')));assert.throws(()=>recipePlan('?! --'))});
test('package conversion distinguishes weight, volume, packs and uncertain sizes',()=>{assert.equal(packageQuantity({amount:750,unit:'g'},{weighted:true}).quantity,.75);assert.equal(packageQuantity({amount:900,unit:'g'},{name:'פסטה 500 גרם'}).quantity,2);assert.equal(packageQuantity({amount:1800,unit:'ml'},{name:'חלב 1 ליטר'}).quantity,2);assert.equal(packageQuantity({amount:6,unit:'unit'},{name:'ביצים 12 יח'}).quantity,1);assert.equal(packageQuantity({amount:1000,unit:'g'},{name:'גבינה 4*250 גרם'}).verified,false);assert.equal(packageQuantity({amount:200,unit:'g'},{name:'גבינה מיוחדת'}).verified,false);assert.equal(packageQuantity({amount:2,unit:'cup'},{name:'קמח 1 קג'}).verified,false);assert.equal(packageQuantity({amount:2,unit:'unit'},{weighted:true}).verified,false)});
test('normalization never accepts empty, zero, tiny or unsupported quantities',()=>{for(const bad of [0,-1,.00001,NaN])assert.throws(()=>normalizePlan({...plan,ingredients:[{...plan.ingredients[0],amount:bad}]}));assert.throws(()=>normalizePlan({...plan,ingredients:[{...plan.ingredients[0],unit:'bucket'}]}));assert.throws(()=>normalizePlan({ingredients:[]}));assert.equal(normalizePlan({...plan,prices:123}).prices,undefined)});

const env={ANTHROPIC_API_KEY:'private-test-key'};
const modelInfo={id:CLAUDE_MODEL,capabilities:{structured_outputs:{supported:true}}};
const success=(body=plan,extra={})=>({ok:true,status:200,json:async()=>({stop_reason:'end_turn',content:[{type:'thinking',thinking:'not for public display'},{type:'text',text:JSON.stringify(body)}],usage:{input_tokens:1200,output_tokens:900},...extra})});
test('a saved key never enables paid inference by itself or through request fields',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;return success()};
 await assert.rejects(generateShoppingPlan({people:4,authorized:true,AI_USAGE_MODE:'public'},{env,fetchImpl}),{code:'AI_USAGE_DISABLED'});
 await assert.rejects(generateShoppingPlan({people:4},{env:{},authorized:true,fetchImpl}),{code:'AI_SETUP_REQUIRED'});
 assert.equal(calls,0);
});
test('spending access is server-controlled and test credentials expire',()=>{
 const token='test-only-'.repeat(5),now=Date.parse('2026-11-04T10:00:00Z'),testing={AI_USAGE_MODE:'testing',AI_TEST_TOKEN:token,AI_TEST_EXPIRES_AT:'2026-11-04T10:10:00Z'};
 assert.equal(generationAccess({body:{AI_USAGE_MODE:'public'}},{}),false);
 assert.equal(generationAccess({}, {AI_USAGE_MODE:'public'}),true);
 assert.equal(generationAccess({},testing,now),false);
 assert.equal(generationAccess({headers:{'x-ai-test-token':token}},testing,now),true);
 assert.equal(generationAccess({headers:{'x-ai-test-token':token}},testing,now+600000),false);
 for(const given of ['wrong',null,[token],'x'.repeat(300)])assert.equal(generationAccess({headers:{'x-ai-test-token':given}},testing,now),false);
 assert.equal(generationAccess({headers:{'x-ai-test-token':token}},{...testing,AI_USAGE_MODE:'off'},now),false);
});
test('connection probe checks model metadata only and returns no credentials',async()=>{
 const calls=[];const result=await verifyClaudeConnection({env,fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>modelInfo};}});
 assert.equal(result.connection_verified,true);assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://api.anthropic.com/v1/models/'+CLAUDE_MODEL);
 assert.equal(calls[0].options.body,undefined);assert.equal(calls[0].options.redirect,'error');
 assert.ok(!JSON.stringify(result).includes(env.ANTHROPIC_API_KEY));
 let callsWithoutKey=0;assert.equal((await verifyClaudeConnection({env:{},fetchImpl:()=>callsWithoutKey++})).connection_reason,'missing_key');assert.equal(callsWithoutKey,0);
});
test('optional workspace selection stays server-side and model capabilities must be verified',async()=>{
 const result=await verifyClaudeConnection({env:{...env,ANTHROPIC_WORKSPACE_ID:'wrkspc_test'},fetchImpl:async(url,options)=>{assert.equal(options.headers['anthropic-workspace-id'],'wrkspc_test');return {ok:true,json:async()=>({id:CLAUDE_MODEL})};}});
 assert.equal(result.connection_verified,false);assert.equal(result.connection_reason,'model_capabilities_unverified');
});
test('connection errors are actionable without echoing upstream content',async()=>{
 for(const [status,message,reason]of [[401,'private-test-key','authentication'],[400,'workspace must be selected private-test-key','workspace_required'],[404,'private-test-key','model_unavailable']]){
 const result=await verifyClaudeConnection({env,fetchImpl:async()=>({ok:false,status,json:async()=>({error:{message}})})});
 assert.equal(result.connection_reason,reason);assert.ok(!JSON.stringify(result).includes('private-test-key'));
 }
});
test('connection checks share in-flight work, cache metadata and refresh on key rotation',async()=>{
 const verify=createConnectionVerifier();let calls=0;
 const fetchImpl=async()=>{calls++;await new Promise(r=>setTimeout(r,5));return {ok:true,json:async()=>modelInfo}};
 const results=await Promise.all([verify({env,fetchImpl}),verify({env,fetchImpl})]);assert.equal(calls,1);assert.ok(results.every(r=>r.connection_verified));
 await verify({env,fetchImpl});assert.equal(calls,1);
 await verify({env:{ANTHROPIC_API_KEY:'rotated-test'},fetchImpl});assert.equal(calls,2);
});
test('public capability requires both verified model access and spending authorization',()=>{
 const connection={ai_configured:true,connection_verified:true,connection_reason:'verified'};
 const off=plannerCapabilities(connection,{});assert.equal(off.ai_ready,false);assert.equal(off.availability_reason,'usage_approval_required');
 assert.equal(plannerCapabilities(connection,{AI_USAGE_MODE:'testing'}).ai_ready,false);
 const on=plannerCapabilities(connection,{AI_USAGE_MODE:'public'});assert.equal(on.ai_ready,true);assert.equal(availabilityFromServer(on).ready,true);
 assert.equal(availabilityFromServer({...on,connection_verified:false}).ready,false);assert.equal(availabilityFromServer({ai_ready:true}).ready,false);
 assert.ok(!JSON.stringify(on).includes('private-test-key'));
});
test('Claude request is bounded and fixed, uses supported schema and returns only normalized shopping data',async()=>{
 const calls=[];const result=await generateShoppingPlan({people:4,model:'expensive',tools:['web_search']},{env,authorized:true,fetchImpl:async(url,options)=>{calls.push({url,options});return success({...plan,prices:[10],barcodes:['fake']});}});
 assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.anthropic.com/v1/messages');
 const sent=JSON.parse(calls[0].options.body);
 assert.equal(sent.model,CLAUDE_MODEL);assert.equal(sent.max_tokens,MAX_OUTPUT_TOKENS);
 assert.equal(sent.tools,undefined);assert.equal(sent.temperature,undefined);assert.equal(sent.output_config.format.type,'json_schema');
 assert.equal(sent.output_config.format.schema.properties.ingredients.maxItems,undefined);
 assert.equal(JSON.parse(sent.messages[0].content).model,undefined);
 assert.equal(result.source,'ai');assert.equal(result.prices,undefined);assert.equal(result.barcodes,undefined);
 assert.deepEqual(result.usage,{input_tokens:1200,output_tokens:900});assert.ok(!JSON.stringify(result).includes('not for public display'));
});
test('invalid input never reaches Claude',async()=>{
 let calls=0;await assert.rejects(generateShoppingPlan({people:0},{env,authorized:true,fetchImpl:()=>calls++}));assert.equal(calls,0);
 await assert.rejects(generateShoppingPlan({recipe:'x'.repeat(6001)},{env,authorized:true,fetchImpl:()=>calls++}));assert.equal(calls,0);
});
test('truncated or refused model responses never become partial plans and are not retried',async()=>{
 for(const reason of ['max_tokens','refusal','pause_turn']){
 let calls=0;await assert.rejects(generateShoppingPlan({people:4},{env,authorized:true,fetchImpl:async()=>{calls++;return success(plan,{stop_reason:reason})}}),{code:'AI_INCOMPLETE'});assert.equal(calls,1);
 }
});
test('invalid model JSON, invalid quantities and oversized lists are rejected',async()=>{
 const invalid=[{stop_reason:'end_turn',content:[{type:'text',text:'not JSON'}]},{stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({...plan,ingredients:[{...plan.ingredients[0],amount:0}]})}]},{stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({...plan,ingredients:Array(41).fill(plan.ingredients[0])})}]}];
 for(const data of invalid)await assert.rejects(generateShoppingPlan({people:4},{env,authorized:true,fetchImpl:async()=>({ok:true,json:async()=>data})}),{code:'AI_INVALID_RESPONSE'});
});
test('network and provider failures never leak secrets or silently retry with another model',async()=>{
 for(const [status,code]of [[401,'AI_SETUP_REQUIRED'],[402,'AI_SETUP_REQUIRED'],[403,'AI_SETUP_REQUIRED'],[429,'AI_BUSY'],[500,'AI_UNAVAILABLE']]){
 let calls=0;await assert.rejects(generateShoppingPlan({people:4},{env,authorized:true,fetchImpl:async()=>{calls++;return {ok:false,status,json:async()=>({error:{message:'private-test-key'}})}}}),e=>e.code===code&&!JSON.stringify(e).includes('private-test-key')&&!e.message.includes('private-test-key'));assert.equal(calls,1);
 }
 await assert.rejects(generateShoppingPlan({people:4},{env,authorized:true,fetchImpl:async()=>{throw Error('private-test-key')}}),e=>e.code==='AI_UNAVAILABLE'&&!e.message.includes('private-test-key'));
});
