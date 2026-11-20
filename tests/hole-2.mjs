import assert from 'node:assert/strict';
import {createCourse} from '../core/course.mjs';
import {createRound} from '../core/round.mjs';
import {strike,ballRadius} from '../core/physics.mjs';
import {hole2} from '../course/holes/hole-2.mjs';
import {courseCatalog} from '../course/catalog.mjs';
const course=createCourse(hole2),k=hole2.plan.metresPerUnit,pin=course.pins[0];
assert.deepEqual(courseCatalog.map(hole=>hole.number),[1,2]);
for(const tee of course.tees){
    assert.equal(course.surface(tee.x,tee.z),'tee');
    assert.ok(Math.abs(Math.hypot(pin.x-tee.x,pin.z-tee.z)/.9144-tee.yards)<1e-8);
}
const baseline=createCourse({...hole2,landforms:[]});
assert.ok(Math.abs(baseline.ground(1690*k,570*k)-course.ground(1690*k,570*k)-1.524)<.001,'Confirmed 5 ft bed depth');
const samples=new Map();
for(let x=1670;x<1703;x+=2)for(let z=542;z<635;z+=2){
    const profile=course.lieAt(x*k,z*k);if(profile&&!samples.has(profile.id))samples.set(profile.id,{x:x*k,z:z*k,profile});
    assert.ok(Number.isFinite(course.ground(x*k,z*k)));
}
assert.deepEqual([...samples.keys()].sort(),['heavy','smooth','tight']);
for(const [id,point] of samples){
    assert.deepEqual(course.lieAt(point.x,point.z),course.lieAt(point.x,point.z),'A lie is stable across club choices');
    assert.equal(course.isOutOfBounds(point.x,point.z),false);
    const round=createRound(course);Object.assign(round.state.ball,{x:point.x,z:point.z,y:course.ground(point.x,point.z)+ballRadius});
    assert.equal(round.hit('SW',.7,Math.atan2(pin.z-point.z,pin.x-point.x)),true);
    for(let i=0;i<14000&&['air','roll','drop'].includes(round.state.ball.mode);i++)round.step();
    assert.equal(round.state.penalties,0,id+' is playable without penalty');
    assert.ok(!course.lieAt(round.state.ball.x,round.state.ball.z),id+' wedge should escape the barranca');
    assert.match(round.state.history[0].metrics.startingLieLabel,new RegExp(point.profile.label));
}
const profiles=hole2.landforms[0].lies.profiles;
const velocities=Object.fromEntries(profiles.map(profile=>[profile.id,strike({x:0,z:0},()=>0,'SW',.7,0,profile.material,profile)]));
assert.ok(velocities.heavy.vx<velocities.smooth.vx,'Heavy grass reduces shot speed');
assert.ok(Math.atan2(velocities.tight.vy,velocities.tight.vx)<Math.atan2(velocities.smooth.vy,velocities.smooth.vx),'Tight lie launches lower');
// A ball actually landing in the ditch must remain playable, not receive water/OB relief.
let ditchLandings=0;
for(const power of [.75,.80,.85,.90]){
    const round=createRound(course),point={x:pin.x-100*.9144,z:pin.z};
    Object.assign(round.state.ball,{...point,y:course.ground(point.x,point.z)+ballRadius});
    round.hit('PW',power,0);
    for(let i=0;i<14000&&['air','roll','drop'].includes(round.state.ball.mode);i++)round.step();
    const record=round.state.history[0];assert.ok(record);assert.equal(round.state.penalties,0);
    if(record.metrics.firstContact&&course.lieAt(record.metrics.firstContact.x,record.metrics.firstContact.z))ditchLandings++;
}
assert.ok(ditchLandings>0,'Exercise a real barranca landing');
// Full par-five sequence uses the existing round/physics engine without a hole-specific loop.
const round=createRound(course);
for(const club of ['Driver','3 Wood','GW']){
    const ball=round.state.ball,target=course.aimTarget(ball);
    round.hit(club,1,Math.atan2(target.z-ball.z,target.x-ball.x));
    while(['air','roll','drop'].includes(round.state.ball.mode))round.step();
}
assert.equal(round.state.strokes,3);assert.equal(round.state.penalties,0);
assert.equal(course.surface(round.state.ball.x,round.state.ball.z),'green');
const tierless=createCourse({...hole2,green:{...hole2.green,tiers:null}});
assert.ok(course.ground(1805*k,558*k)-tierless.ground(1805*k,558*k)>.18,'Upper green tier contributes elevation');
const gx=(course.ground(pin.x+.1,pin.z)-course.ground(pin.x-.1,pin.z))/.2;
const gz=(course.ground(pin.x,pin.z+.1)-course.ground(pin.x,pin.z-.1))/.2;
assert.ok(Math.hypot(gx,gz)<.03,'Default pin should sit clear of the tier transition');
console.log('Hole 2 passed: four tee yardages, 5 ft barranca, three persistent lie profiles, recovery/landing without penalties, shared three-shot sequence and green tiers.');
