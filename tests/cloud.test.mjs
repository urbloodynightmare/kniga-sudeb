import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveQueue} from '../app/cloud-source.js';
test('save queue serializes writes and uses the newly returned revision',async()=>{
  const calls=[];let firstResolve;
  const q=new SaveQueue(async(data,rev)=>{calls.push([data,rev]);if(calls.length===1)await new Promise(r=>firstResolve=r);return rev+1;});
  q.enqueue({note:'first'});const running=q.flush();q.enqueue({note:'newest'});firstResolve();await running;
  assert.deepEqual(calls,[[{note:'first'},0],[{note:'newest'},1]]);assert.equal(q.revision,2);assert.equal(q.pending,null);clearTimeout(q.timer);
});
test('conflicts preserve local edits and block automatic overwrite',async()=>{
  let count=0;const statuses=[];const q=new SaveQueue(async()=>{count++;throw Error('REVISION_CONFLICT');},s=>statuses.push(s));
  q.enqueue({note:'Keep me'});await q.flush();assert.equal(q.blocked,true);assert.equal(q.pending.note,'Keep me');assert.equal(statuses.at(-1),'conflict');
  q.enqueue({note:'New edits'});await q.flush();assert.equal(count,1);assert.equal(q.pending.note,'New edits');assert.equal(statuses.at(-1),'conflict');clearTimeout(q.timer);
});
test('network errors can be retried without dropping pending data',async()=>{
  let attempt=0;const q=new SaveQueue(async(_,rev)=>{if(!attempt++)throw Error('offline');return rev+1;});
  const statuses=[];q.onStatus=s=>statuses.push(s);q.enqueue({note:'persist'});await q.flush();assert.equal(q.pending.note,'persist');assert.equal(q.blocked,false);assert.equal(statuses.at(-1),'error');await q.retry();assert.equal(q.pending,null);assert.equal(q.revision,1);clearTimeout(q.timer);
});
test('switching accounts resets pending data and revision',async()=>{
  const q=new SaveQueue(async(_,rev)=>rev+1);q.enqueue({note:'private'});q.reset(9);assert.equal(q.pending,null);assert.equal(q.revision,9);assert.equal(q.blocked,false);
});
test('save queue retains the server error until a successful retry',async()=>{const error=Object.assign(Error('INVALID_BOOK'),{code:'P0001'});let fails=true;const q=new SaveQueue(async()=>{if(fails)throw error;return 1;});q.enqueue({characters:[]});await q.flush();assert.equal(q.error,error);assert.ok(q.pending);fails=false;await q.retry();assert.equal(q.error,null);assert.equal(q.pending,null);q.reset();assert.equal(q.error,null);clearTimeout(q.timer);});
