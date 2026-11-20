import assert from 'node:assert/strict';
import {hole1} from '../course/holes/hole-1.mjs';
import {createCourse} from '../core/course.mjs';
import {createRound} from '../core/round.mjs';
const course=createCourse(hole1),pin=course.pins[0],k=hole1.plan.metresPerUnit;
const roughAt=(yards,z)=>({x:pin.x-Math.sqrt((yards*.9144)**2-(pin.z-z)**2),z});
function play(club,start,heading){
    const round=createRound(course);
    if(start){Object.assign(round.state.ball,start);round.state.ball.y=course.ground(start.x,start.z)+.02135;}
    const ball=round.state.ball;
    assert.ok(round.hit(club,1,heading??Math.atan2(pin.z-ball.z,pin.x-ball.x)));
    for(let i=0;i<14000&&['air','roll','drop'].includes(round.state.ball.mode);i++)round.step();
    const record=round.state.history[0];assert.ok(record);
    const {metrics}=record;
    for(const key of ['carry','bounceRoll','total','netDistance'])assert.ok(Number.isFinite(metrics[key])&&metrics[key]>=0,key);
    assert.equal(metrics.total,metrics.carry+metrics.bounceRoll);
    assert.ok(metrics.total>=metrics.netDistance-1e-7);
    return {round,record,carry:metrics.carry/.9144,roll:metrics.bounceRoll/.9144};
}
const driver=play('Driver');
assert.ok(driver.carry>229&&driver.carry<232);
assert.ok(driver.roll>5&&driver.roll<15);
const iron=play('4 Iron',roughAt(223,558*k));
assert.ok(iron.carry>135&&iron.carry<140);
assert.ok(iron.roll>10&&iron.roll<22,'4-iron should release modestly after landing on fairway');
const seven=play('7 Iron',roughAt(178,558*k));
assert.ok(seven.roll>5&&seven.roll<18);
let count=0;
for(const [yards,club] of [[223,'4 Iron'],[178,'7 Iron']])for(let z=535;z<=590;z++){
    const start=roughAt(yards,z*k);if(course.surface(start.x,start.z)!=='rough')continue;
    const shot=play(club,start);assert.equal(shot.record.outcome,'rest');assert.ok(shot.roll<24);count++;
}
const penalty=play('Driver',{x:course.bounds.maxX-2,z:pin.z},0);
assert.equal(penalty.record.outcome,'out');assert.equal(penalty.round.state.penalties,1);
assert.ok(penalty.record.metrics.total>0,'Keep measured flight before penalty relief');
assert.equal(penalty.round.state.ball.x,course.bounds.maxX-2);
const putt=play('Putter',{x:pin.x-1,z:pin.z+2});
assert.equal(putt.carry,0);assert.ok(putt.roll>0);
console.log(`Hole 1 cases passed: Driver ${driver.carry.toFixed(1)} + ${driver.roll.toFixed(1)} yd; rough 4-iron ${iron.carry.toFixed(1)} + ${iron.roll.toFixed(1)} yd; rough 7-iron ${seven.carry.toFixed(1)} + ${seven.roll.toFixed(1)} yd. ${count} rough-position regressions, penalty metrics and putt metrics passed.`);
