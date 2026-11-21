import assert from 'node:assert/strict';
import {hole3} from '../course/holes/hole-3.mjs';
import {createCourse} from '../core/course.mjs';
import {createRound} from '../core/round.mjs';
import {geometryPath} from '../core/geometry.mjs';
import {courseCatalog} from '../course/catalog.mjs';
const course=createCourse(hole3),pin=course.pins[0],k=hole3.plan.metresPerUnit;
assert.deepEqual(courseCatalog.map(hole=>hole.number),[1,2,3]);
assert.equal(geometryPath(hole3.shapes.tee).length,2);
assert.equal(geometryPath(hole3.shapes.sand).length,3);
function settle(round){for(let i=0;i<14000&&['air','roll','drop'].includes(round.state.ball.mode);i++)round.step();assert.ok(round.state.history.length);}
for(const tee of course.tees){
    assert.equal(course.surface(tee.x,tee.z),'tee');
    assert.ok(Math.abs(Math.hypot(pin.x-tee.x,pin.z-tee.z)/.9144-tee.yards)<1e-8);
    const round=createRound(course,{tee:tee.id});
    const club={'1896':'4 Hybrid',rawlins:'7 Iron',butler:'8 Iron',dixon:'9 Iron'}[tee.id];
    round.hit(club,1,Math.atan2(pin.z-tee.z,pin.x-tee.x));settle(round);
    assert.equal(round.state.strokes,1);assert.equal(round.state.penalties,0);
    assert.equal(course.surface(round.state.ball.x,round.state.ball.z),'green',tee.id+' stock shot should reach the green');
}
assert.equal(course.surface(1550*k,575*k),'fairway');
assert.equal(course.surface(1650*k,570*k),'surround');
assert.equal(course.surface(pin.x,pin.z),'green');
assert.equal(course.surface(1150*k,590*k),'rough','Tee-to-green annotation must not become a fairway strip');
for(const [x,z] of [[1715,445],[1890,440],[1750,695]]){
    assert.equal(course.surface(x*k,z*k),'sand');
    const round=createRound(course),point={x:x*k,z:z*k};
    Object.assign(round.state.ball,{...point,y:course.ground(point.x,point.z)+.02135});
    round.hit('SW',.5,Math.atan2(pin.z-point.z,pin.x-point.x));settle(round);
    assert.equal(round.state.penalties,0);
    assert.notEqual(course.surface(round.state.ball.x,round.state.ball.z),'sand','Sand wedge should clear the bunker lip');
}
const putt=createRound(course);Object.assign(putt.state.ball,{x:pin.x-.5,z:pin.z,y:course.ground(pin.x-.5,pin.z)+.02135});
putt.hit('Putter',.14,0);settle(putt);assert.equal(putt.state.complete,true);
for(let x=1600;x<=1960;x+=7)for(let z=390;z<=930;z+=7)assert.ok(Number.isFinite(course.ground(x*k,z*k)));
console.log('Hole 3 passed: 193/151/137/117-yard tees, two pads, three bunkers and recoveries, distinct approach/collar/rough, shared tee-shot and cup mechanics, finite terrain.');
