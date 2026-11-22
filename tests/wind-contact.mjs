import assert from 'node:assert/strict';
import {relativeWind} from '../core/wind-setup.mjs';
import {executionWindow,resolveExecution} from '../core/execution.mjs';
import {createRound} from '../core/round.mjs';
import {createCourse} from '../core/course.mjs';
import {hole1} from '../course/holes/hole-1.mjs';
import {hole2} from '../course/holes/hole-2.mjs';
import {hole3} from '../course/holes/hole-3.mjs';
const a=relativeWind(0,9,0),b=relativeWind(0,9,180),c=relativeWind(0,9,90);
assert.ok(a.x>0&&b.x<0&&c.z<0);assert.ok(Math.abs(Math.hypot(a.x,a.z)-Math.hypot(c.x,c.z))<1e-9);
assert.ok(Math.abs(executionWindow('Driver',1,'teed')-.16*.65)<1e-9);
assert.ok(executionWindow('Driver',.85)>executionWindow('Driver',1));
const early=resolveExecution('Driver',1,-1),late=resolveExecution('Driver',1,1);
assert.equal(early.curve,-late.curve);assert.ok(late.spin<1&&late.lift<1&&late.power<1);
assert.ok(late.curve>resolveExecution('SW',1,1).curve);
const course=createCourse(hole1),clean=createRound(course),miss=createRound(course);
clean.hit('7 Iron',1,0,0);miss.hit('7 Iron',1,0,1);
assert.ok(miss.state.ball.spin<clean.state.ball.spin);assert.ok(miss.state.ball.curve>0);
console.log('Course bearing transforms, fixed wind magnitude, tighter full power and signed club-dependent curve/spin/lift checks passed.');

// One world wind must survive every hole's local-coordinate rotation unchanged.
for(let direction=0;direction<8;direction++){
 const world=relativeWind(direction,9,0);
 for(const definition of [hole1,hole2,hole3]){
  const round=createRound(createCourse(definition),{windDirection:direction,windMph:9});
  const local=round.settings.wind,angle=definition.bearing*Math.PI/180;
  const x=local.x*Math.cos(angle)-local.z*Math.sin(angle);
  const z=local.x*Math.sin(angle)+local.z*Math.cos(angle);
  assert.ok(Math.abs(x-world.x)<1e-9&&Math.abs(z-world.z)<1e-9);
 }
}
const sameWind=[hole1,hole2,hole3].map(hole=>createRound(createCourse(hole),{windDirection:0,windMph:9}).settings.wind);
assert.ok(sameWind[0].x>0&&sameWind[1].x<0&&sameWind[2].x<0,
 'Hole 1 tailwind must oppose play on both return-facing holes');
assert.ok(sameWind[2].z<0,'Hole 3 should retain the crosswind component from its different bearing');
console.log('Satellite orientation regression passed: Hole 3 reverses the Hole 1 wind; all eight world vectors remain consistent across Holes 1–3.');
