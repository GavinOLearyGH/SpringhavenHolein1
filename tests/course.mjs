import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {hole1} from '../course/holes/hole-1.mjs';
import {createCourse} from '../core/course.mjs';
import {createRound,fullBag} from '../core/round.mjs';
import {clubs,windVector,advance} from '../core/physics.mjs';
const html=readFileSync('index.html','utf8');
const {replayDailyShot}=await import('../leaderboard/generated/physics.mjs');
function physics(source){
    const context=vm.createContext({});
    vm.runInContext(source.slice(source.indexOf('const scale = '),source.indexOf('// End shared physics.')),context);
    return context;
}
const current=physics(html);
const engine=readFileSync('core/physics.mjs','utf8');
assert.ok(html.includes(engine.slice(0,engine.lastIndexOf('export {'))),'Hole 6 embeds the canonical shared engine');
for(const day of ['2026-11-17','2026-11-18','2026-11-19','2026-11-20'])
for(const club of ['3 Iron','6 Iron','9 Iron','SW','Putter'])
for(const power of [.4,.8,1])
for(const heading of [-.12,0,.12]){
    const expression=`JSON.stringify(replayDailyShot('${day}','${club}',${power},${heading}))`;
    assert.equal(vm.runInContext(expression,current),JSON.stringify(replayDailyShot(day,club,power,heading)),expression);
}
const course=createCourse(hole1),pin=course.pins[0];
for(const tee of course.tees){
    assert.ok(Math.abs(Math.hypot(pin.x-tee.x,pin.z-tee.z)/.9144-tee.yards)<1e-8);
    assert.equal(course.surface(tee.x,tee.z),'tee');
}
assert.equal(fullBag.length,14);
assert.equal(course.surface(pin.x,pin.z),'green');
const round=createRound(course);
assert.equal(round.hit('Driver',1,0),true);
assert.equal(round.hit('Driver',1,0),false);
while(['air','roll','drop'].includes(round.state.ball.mode))round.step();
assert.ok(round.state.ball.x>260,'Driver should reach a par-four landing area');
assert.equal(round.state.strokes,1);
assert.equal(round.state.history.length,1);
round.state.ball.x=pin.x-.5;round.state.ball.z=pin.z;
assert.equal(round.hit('Putter',.14,0),true);
while(['air','roll','drop'].includes(round.state.ball.mode))round.step();
assert.equal(round.state.complete,true);
const bad=createRound(course);bad.hit('Driver',1,-1);
while(['air','roll','drop'].includes(bad.state.ball.mode))bad.step();
assert.equal(bad.state.penalties,1);
assert.equal(bad.state.strokes,2);
assert.equal(bad.state.ball.x,course.tees[0].x);
console.log('180 Hole 6 client/server replay comparisons passed. Four tee distances, driver, 14-club bag, multi-shot round, cup capture and OB penalty passed.');

// Closed paths can contain repeated endpoints. Sand must still have finite depths.
const unit=hole1.plan.metresPerUnit;
for(let x=965;x<=1025;x+=3)for(let z=370;z<=433;z+=3)assert.ok(Number.isFinite(course.ground(x*unit,z*unit)));
const flat={ground:()=>0,surface:()=> 'rough',wall:[],bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},
    obstacles:[{kind:'tree',center:{x:1,y:2,z:0},radii:{x:.3,y:1,z:.3},restitution:.2,retention:.5}]};
const hit={x:.5,y:2,z:0,vx:20,vy:0,vz:0,mode:'air',lift:0,time:0,cupCooldown:0};
advance(hit,flat,{pin:{x:10,z:10},wind:{x:0,z:0},greenSpeed:1},.03);
assert.equal(hit.obstacle,'tree');
assert.ok(hit.vx<0);
console.log('Bunker endpoint regression and shared obstacle collision passed.');
