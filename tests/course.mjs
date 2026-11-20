import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {hole1} from '../course/holes/hole-1.mjs';
import {createCourse} from '../core/course.mjs';
import {createRound,fullBag} from '../core/round.mjs';
import {clubs,windVector} from '../core/physics.mjs';
const html=readFileSync('index.html','utf8');
const original=execFileSync('git',['show','9a40a9f5660965a076fb4cfa695fa7d48ef4eee9:index.html'],{encoding:'utf8'});
function physics(source){
    const context=vm.createContext({});
    vm.runInContext(source.slice(source.indexOf('const scale = '),source.indexOf('// End shared physics.')),context);
    return context;
}
const old=physics(original),current=physics(html);
for(const day of ['2026-11-17','2026-11-18','2026-11-19','2026-11-20'])
for(const club of ['3 Iron','6 Iron','9 Iron','SW','Putter'])
for(const power of [.4,.8,1])
for(const heading of [-.12,0,.12]){
    const expression=`JSON.stringify(replayDailyShot('${day}','${club}',${power},${heading}))`;
    assert.equal(vm.runInContext(expression,current),vm.runInContext(expression,old),expression);
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
assert.ok(round.state.ball.x>250,'Driver should reach a par-four landing area');
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
console.log('540 Hole 6 replay comparisons passed. Four tee distances, driver, 14-club bag, multi-shot round, cup capture and OB penalty passed.');
