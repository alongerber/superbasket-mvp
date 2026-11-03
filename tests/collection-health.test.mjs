import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionHealth} from '../lib/collection-health.mjs';
const now=Date.parse('2026-11-03T10:00:00Z');
test('a dead running process stops appearing as live collection',()=>{
 const health=collectionHealth({generated_at:'2026-11-03T05:00:00Z',schedule_hours:2,collector:{status:'running',started_at:'2026-11-03T04:00:00Z',max_seconds:2400}},now);
 assert.equal(health.status,'interrupted');assert.equal(health.refresh_overdue,true);
});
test('a new active run and a published time-budget result remain distinct',()=>{
 const m={generated_at:'2026-11-03T09:58:00Z',schedule_hours:2,collector:{status:'running',started_at:'2026-11-03T09:55:00Z',max_seconds:2400}};
 assert.equal(collectionHealth(m,now).status,'running');m.collector.status='time_budget';assert.equal(collectionHealth(m,now).status,'time_budget');assert.equal(collectionHealth(m,now).refresh_overdue,false);
});
test('legacy and invalid reports do not claim an active or fresh refresh',()=>{
 assert.equal(collectionHealth({generated_at:'invalid'},now).refresh_overdue,true);
 assert.equal(collectionHealth({generated_at:'2026-11-03T05:00:00Z'},now).status,'unknown');
});
