import assert from 'node:assert/strict';
import {newCompetition,applyCompetitionShot,restoreCompetitionRound,dailySetup,totalScore,rankedThree,dayKey} from '../core/competition.mjs';
import {buildId} from '../core/build-info.mjs';
import {clubs} from '../core/physics.mjs';
import {fullBag} from '../core/round.mjs';
import {handleThree} from '../leaderboard/three.mjs';
import * as engine from '../core/competition.mjs';
const build='0.3.0-0123456789',day='2026-11-21',id='a'.repeat(32),player='b'.repeat(32);
assert.equal(dayKey(new Date('2026-11-22T04:59:00Z')),day);assert.equal(dayKey(new Date('2026-11-22T05:00:00Z')),'2026-11-22');
assert.deepEqual(dailySetup(day),dailySetup(day));assert.notDeepEqual(dailySetup(day),dailySetup('2026-11-22'));
let session=newCompetition(day,build,id);assert.equal(totalScore(session),0);
assert.throws(()=>applyCompetitionShot(session,{hole:2}));
// Exercise a complete, legal three-hole round by choosing candidate shots through the public replay API.
for(let count=0;count<45&&session.status!=='completed';count++){
 const round=restoreCompetitionRound(session),ball=round.state.ball,pin=round.settings.pin;
 const distance=Math.hypot(pin.x-ball.x,pin.z-ball.z),heading=Math.atan2(pin.z-ball.z,pin.x-ball.x),putting=distance<20;
 const choices=putting?['Putter','SW']:fullBag.filter(name=>name!=='Putter'&&clubs[name].carry*.9144>distance*.45&&clubs[name].carry*.9144<distance*2).concat(['SW']);
 let best=null;
 for(const club of new Set(choices))for(const power of (club==='Putter'?[.08,.12,.18,.25,.35,.5,.7,1]:[.35,.55,.75,.9,1]))for(const offset of (putting?[-.15,0,.15]:[-.06,0,.06])){
  const shot={hole:session.hole,club,power,heading:Math.atan2(Math.sin(heading+offset),Math.cos(heading+offset)),position:0,releaseTick:session.state.windTick+240};
  const next=applyCompetitionShot(session,shot),last=next.hole!==session.hole?next.results.at(-1):next.state.history.at(-1);
  const advanced=next.hole!==session.hole||next.status==='completed';
  const penalty=next.state.penalties>session.state.penalties&&!advanced;
  const leave=advanced?-1000:Math.hypot(next.state.ball.x-pin.x,next.state.ball.z-pin.z)+(penalty?1000:0);
  if(!best||leave<best.leave)best={next,leave,shot};
 }
 assert.ok(best);session=best.next;
 // A reload round-trips the canonical resting snapshot without changing it.
 session=JSON.parse(JSON.stringify(session));
 assert.deepEqual(restoreCompetitionRound(session).state,session.state);
}
assert.equal(session.status,'completed','Legal three-hole round must finish');
assert.equal(session.results.length,3);assert.equal(totalScore(session),session.results.reduce((sum,row)=>sum+row.strokes,0));
const hole3Tee=session.shots.find(shot=>shot.hole===3);assert.ok(hole3Tee);assert.equal(session.tieValid,true);assert.ok(Number.isInteger(session.tieMM));
const savedTie=session.tieMM;assert.equal(JSON.parse(JSON.stringify(session)).tieMM,savedTie);
assert.throws(()=>applyCompetitionShot(session,hole3Tee));
const ranking=rankedThree([{name:'A',total:12,tieValid:true,tieMM:1000},{name:'B',total:11,tieValid:false,tieMM:null},{name:'C',total:12,tieValid:true,tieMM:1000},{name:'D',total:12,tieValid:false,tieMM:null}]);
assert.deepEqual(ranking.map(row=>[row.name,row.rank]),[['B',1],['A',2],['C',2],['D',4]]);
// Penalty tee shots remain valid rounds, but have no in-play tiebreak distance.
const penalty=structuredClone(newCompetition(day,build,id));penalty.hole=3;penalty.state=structuredClone(restoreCompetitionRound({...penalty,state:newCompetition(day,build,id).state}).state);
const fresh3=restoreCompetitionRound({...penalty,state:{...penalty.state,ball:{...penalty.state.ball,x:-100,z:-100},strokes:0,history:[]}});
penalty.state=fresh3.state;
const failed=applyCompetitionShot(penalty,{hole:3,club:'SW',power:.1,heading:0,position:0,releaseTick:0});
assert.equal(failed.tieValid,false);assert.equal(failed.tieMM,null);
let stored=null;const store={read:async()=>({day,leaders:[],total:0,distribution:[]}),readAttempt:async()=>stored,
 start:async(_d,_p,value)=>stored??=(value),advance:async(_d,_p,revision,value)=>{if(stored.revision===revision)stored=value;return stored;},
 publish:async(_d,_p,name)=>stored={...stored,name:stored.name||name}};
const options={today:day,currentBuild:build,loadEngine:async()=>engine};
const post=async value=>{const response=await handleThree(new Request('https://example.com/DailyChallenge/api/three',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.com'},body:JSON.stringify({day,id,player,...value})}),store,options);return {status:response.status,body:await response.json()};};
assert.equal((await post({action:'start',build:'old'})).status,409);
assert.equal((await post({action:'start',build})).status,200);
const original=stored;assert.equal((await post({action:'start',build,id:'c'.repeat(32)})).body.id,id);
assert.equal((await post({action:'publish',name:'Player'})).status,409);
const shot={hole:1,club:'Driver',power:1,heading:0,position:0,releaseTick:240};
assert.equal((await post({action:'shot',revision:0,shot:{...shot,power:2}})).status,422);
assert.equal((await post({action:'shot',revision:0,shot,total:1,tieMM:0})).status,200);assert.equal(stored.revision,1);
const once=structuredClone(stored);await post({action:'shot',revision:0,shot});assert.deepEqual(stored,once,'Retry must not play a second shot');
assert.equal((await post({action:'shot',revision:5,shot})).status,409);
assert.equal((await post({action:'shot',day:'2026-11-20',revision:1,shot})).status,409);
stored=session;assert.equal((await post({action:'publish',name:'Test Player'})).status,200);
assert.equal((await post({action:'publish',name:'Changed'})).body.name,'Test Player');
stored=null;
const pinned=await handleThree(new Request('https://example.com/DailyChallenge/api/three',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',day,id,player,build:buildId})}),store,{today:day});
assert.equal(pinned.status,200,'Production loader must import the pinned release engine');assert.equal((await pinned.json()).build,buildId);
console.log('Daily three passed: complete legal round, resting recovery, deterministic setup, first-round locking, server shot validation/idempotency, midnight, tiebreak/penalty/shared ranks and publication. Strokes:',totalScore(session));
