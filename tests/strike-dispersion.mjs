import assert from 'node:assert/strict';
import {executionWindow,resolveExecution} from '../core/execution.mjs';
import {fullBag} from '../core/round.mjs';
import {strike,advance,stepTime} from '../core/physics.mjs';
const flat={ground:()=>0,surface:()=> 'fairway',wall:[],bounds:{minX:-2000,maxX:2000,minZ:-2000,maxZ:2000}};
function flight(club,contact){
 const ball=strike({x:0,z:0},flat.ground,club,contact.power,contact.heading,'fairway');
 ball.spin*=contact.spin??1;ball.lift*=contact.lift??1;ball.curve=contact.curve??0;
 let steps=0;
 while(['air','roll','drop'].includes(ball.mode)&&steps++<12000)advance(ball,flat,{pin:null,wind:{x:0,z:0},greenSpeed:1},stepTime);
 assert.ok(steps<12000,'Shot must settle');
 assert.ok(['x','y','z'].every(key=>Number.isFinite(ball[key])));
 return {side:ball.firstContact?.z/.9144,carry:Math.hypot(ball.firstContact?.x??0,ball.firstContact?.z??0)/.9144,ball};
}
for(const club of fullBag.filter(name=>name!=='Putter'))for(const power of [.35,.7,.85,1]){
 const zone=executionWindow(club,power),clean=resolveExecution(club,power,0);
 // Whole green zone stays identical, including its boundaries.
 for(const position of [-zone,0,zone])assert.equal(JSON.stringify(resolveExecution(club,power,position)),JSON.stringify(clean));
 const edge=resolveExecution(club,power,zone+1e-8);
 assert.ok(Math.abs(edge.heading)<1e-8&&Math.abs(edge.curve)<1e-8,'No jump leaving clean zone');
 let previous=0;
 for(const fraction of [.1,.25,.5,.75,1]){
  const position=zone+(1-zone)*fraction,late=resolveExecution(club,power,position),early=resolveExecution(club,power,-position);
  assert.equal(early.heading,-late.heading);assert.equal(early.curve,-late.curve);
  assert.equal(early.power,late.power);assert.equal(early.spin,late.spin);
  const right=flight(club,late),left=flight(club,early);
  assert.ok(right.side>previous,'Landing dispersion increases through entire miss range');previous=right.side;
  assert.ok(Math.abs(right.side+left.side)<1e-8,'Early/late flights mirror in calm conditions');
  assert.deepEqual(flight(club,late),right,'No random dispersion');
 }
 // At equal normalized timing error, controlled swings reduce directional error.
 if(power<1){const p=zone+(1-zone)*.5,fullZone=executionWindow(club,1);
  assert.ok(resolveExecution(club,power,p).heading<resolveExecution(club,1,fullZone+(1-fullZone)*.5).heading);
 }
}
const comparison=[];
for(const position of [.25,.5,.75,1]){
 const contact=resolveExecution('4 Hybrid',1,position),signed=contact.error;
 const old={...contact,heading:signed*.045,curve:signed*.0013};
 const before=flight('4 Hybrid',old),after=flight('4 Hybrid',contact);
 assert.ok(after.side>before.side);
 assert.ok(Math.abs(after.carry-before.carry)<1.5,'Extra penalty is lateral; existing contact distance loss stays bounded');
 comparison.push({position,oldSide:+before.side.toFixed(1),newSide:+after.side.toFixed(1)});
}
assert.ok(comparison[0].newSide<7&&comparison[1].newSide>18&&comparison[3].newSide>45&&comparison[3].newSide<60);
for(const power of [.1,.5,1])for(const position of [-1,0,1])assert.deepEqual(resolveExecution('Putter',power,position),{heading:0,power,label:'Putt',error:0});
console.log('Progressive strike dispersion passed: 13 clubs, four powers, clean boundaries, smooth ramp, mirrored deterministic flights, controlled-swing benefit and unchanged putt execution.');
console.table(comparison);
