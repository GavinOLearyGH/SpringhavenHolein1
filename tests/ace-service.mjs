import assert from 'node:assert/strict';
import {handleThree} from '../leaderboard/three.mjs';import {buildId} from '../core/build-info.mjs';
const day='2026-11-22',id='e'.repeat(32),player='f'.repeat(32);let saved;
const store={readAttempt:async()=>saved,start:async(_day,_player,value)=>saved??=(value),advance:async(_day,_player,revision,next)=>{if(saved.revision===revision)saved=next;return saved;},publish:async(_day,_player,name)=>saved={...saved,name:saved.name||name},read:async()=>({leaders:[]})};
async function post(value){const response=await handleThree(new Request('https://example.com/DailyChallenge/api/ace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({day,id,player,...value})}),store,{today:day,kind:'ace'});return {status:response.status,data:await response.json()};}
const start=await post({action:'start',build:buildId});assert.equal(start.status,200);assert.equal(saved.kind,'ace');assert.equal(saved.hole,6);
await post({action:'start',build:buildId,id:'a'.repeat(32)});assert.equal(saved.id,id);
const shot={hole:6,club:'3 Wood',power:.8735,heading:-.022933333333333333,position:0,releaseTick:0};
assert.equal((await post({action:'shot',revision:0,shot:{...shot,position:2}})).status,422);
const played=await post({action:'shot',revision:0,shot});assert.equal(played.status,200);assert.equal(saved.ace,true);assert.equal(saved.mm,0);assert.equal(saved.status,'completed');
assert.equal((await post({action:'shot',revision:0,shot})).data.revision,1);
assert.equal((await post({action:'shot',revision:1,shot})).status,422);
assert.equal((await post({action:'publish',name:'An Ace'})).data.name,'An Ace');assert.equal((await post({action:'publish',name:'Changed'})).data.name,'An Ace');
console.log('ACE service passed: pinned shared-engine replay, real ace, position validation, first-shot locking, retry idempotency and name publication.');
