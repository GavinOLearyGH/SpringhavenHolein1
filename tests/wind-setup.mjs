import assert from 'node:assert/strict';
import {randomWind} from '../core/wind-setup.mjs';
import {strike,advance,stepTime,windVector} from '../core/physics.mjs';
import '../core/round.mjs';
assert.deepEqual(randomWind(()=>0),{wind:'0',mph:'4'});
assert.deepEqual(randomWind(()=>.9999),{wind:'7',mph:'12'});
const directions=new Set();for(let i=0;i<8;i++)directions.add(randomWind(()=>i/8).wind);assert.equal(directions.size,8);
const course={ground:()=>0,surface:()=> 'fairway',wall:[],bounds:{minX:-1000,maxX:1000,minZ:-1000,maxZ:1000}};
function shot(direction,mph,club='7 Iron'){
 const ball=strike({x:0,z:0},course.ground,club,.8,0,'fairway');const wind=windVector(direction,mph),settings={pin:null,wind,greenSpeed:1};
 while(['air','roll','drop'].includes(ball.mode))advance(ball,course,settings,stepTime);
 assert.deepEqual(settings.wind,windVector(direction,mph));return ball;
}
assert.ok(shot(2,8).z>0);assert.ok(shot(6,8).z<0);assert.ok(shot(0,8).x>shot(4,8).x);
assert.equal(shot(2,8,'Putter').x,shot(0,0,'Putter').x);assert.equal(shot(2,8,'Putter').z,0);
console.log('Wind setup passed: eight directions, 4–12 mph, fixed setup vector, crosswind/headwind/tailwind flight effects and unchanged putts.');
