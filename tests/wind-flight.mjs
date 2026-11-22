import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strike,advance,stepTime,windVector,clubs} from '../core/physics.mjs';
import {fullBag} from '../core/round.mjs';
import {resolveExecution} from '../core/execution.mjs';
const flat=surface=>({ground:()=>0,surface:()=>surface,wall:[],bounds:{minX:-2000,maxX:2000,minZ:-2000,maxZ:2000}});
function shot(club,direction=0,mph=0,{position=0,power=1,heading=0,surface='fairway',engine={strike,advance}}={}){
 const contact=resolveExecution(club,power,position),ball=engine.strike({x:0,z:0},()=>0,club,contact.power,heading+contact.heading,'fairway');
 ball.spin*=contact.spin??1;ball.lift*=contact.lift??1;ball.curve=contact.curve??0;
 const course=flat(surface),settings={pin:null,wind:windVector(direction,mph),greenSpeed:1};
 let peak=ball.y,steps=0;
 while(['air','roll','drop'].includes(ball.mode)&&steps++<12000){engine.advance(ball,course,settings,stepTime);peak=Math.max(peak,ball.y);}
 assert.ok(steps<12000,`${club} ${direction}/${mph}: must settle`);
 for(const key of ['x','y','z','vx','vy','vz'])assert.ok(Number.isFinite(ball[key]));
 if(club==='Putter')return {ball};
 const hit=ball.firstContact;assert.ok(hit);
 return {ball,carry:Math.hypot(hit.x,hit.z)/.9144,side:hit.z/.9144,peak:peak/.3048,
  descent:Math.atan2(-hit.vy,Math.hypot(hit.vx,hit.vz))*180/Math.PI,
  release:(ball.x-hit.x)/.9144};
}
// The baseline is the previous integrator, not a second copy of the new formula.
const source=readFileSync('core/physics.mjs','utf8');
const start=source.indexOf('    const vx=ball.vx,vy=ball.vy,vz=ball.vz;');
const end=source.indexOf('    // Rotate horizontal',start);
const legacy=source.slice(0,start)+`    const dx=ball.vx-wind.x,dz=ball.vz-wind.z;
    const drag=.0032*Math.hypot(dx,ball.vy,dz);
    ball.vx-=dx*drag*dt;ball.vz-=dz*drag*dt;
    ball.vy-=(9.81+ball.vy*drag-ball.lift*Math.hypot(ball.vx,ball.vz)**2)*dt;
`+source.slice(end);
const old=await import('data:text/javascript;base64,'+Buffer.from(legacy).toString('base64'));
for(const club of fullBag){if(!old.clubs[club])old.clubs[club]={...clubs[club]};}
for(const club of fullBag)for(const power of [.35,.75,1])for(const heading of [0,.4,-1.7]){
 const current=shot(club,0,0,{power,heading}),previous=shot(club,0,0,{power,heading,engine:old});
 for(const key of ['x','y','z'])assert.equal(current.ball[key],previous.ball[key],`Calm ${club} ${power} ${heading} ${key}`);
}
const summary=[];
for(const club of fullBag.filter(club=>club!=='Putter')){
 const calm=shot(club),head=shot(club,4,10),tail=shot(club,0,10);
 assert.ok(head.carry<calm.carry&&tail.carry>calm.carry,club+' carry');
 assert.ok(head.peak>calm.peak&&tail.peak<calm.peak,club+' height');
 assert.ok(head.descent>calm.descent&&tail.descent<calm.descent,club+' landing angle');
 assert.ok(calm.carry-head.carry>tail.carry-calm.carry,club+' headwind loss exceeds tailwind gain');
 const left=shot(club,6,10),right=shot(club,2,10);
 assert.ok(left.side<0&&right.side>0);assert.ok(Math.abs(left.side+right.side)<1e-8);
 const headGreen=shot(club,4,10,{surface:'green'}),tailGreen=shot(club,0,10,{surface:'green'});
 assert.ok(headGreen.release<tailGreen.release,club+' headwind checks sooner on same flat green');
 for(const direction of [0,1,2,3,4,5,6,7])shot(club,direction,25);
 if(['Driver','4 Iron','7 Iron','PW'].includes(club))summary.push({club,calm:calm.carry.toFixed(1),head:head.carry.toFixed(1),tail:tail.carry.toFixed(1),headGreenRoll:headGreen.release.toFixed(1),tailGreenRoll:tailGreen.release.toFixed(1)});
}
const diagonal=shot('4 Iron',3,10);assert.ok(diagonal.carry>162&&diagonal.carry<168);
const aligned=shot('4 Iron',2,10,{heading:.7}),rotation=shot('4 Iron',3,10,{heading:.7+Math.PI/4});
assert.ok(Math.abs(aligned.carry-rotation.carry)<1e-8,'Rotation must preserve the flight');
const calmPutt=shot('Putter');for(let d=0;d<8;d++)assert.deepEqual(shot('Putter',d,25).ball,calmPutt.ball);
assert.ok(shot('4 Iron',2,10,{position:1}).side>shot('4 Iron',2,10).side,'Late fade adds to a matching crosswind');
assert.ok(Math.abs(shot('4 Iron',2,10,{position:-1}).side)<Math.abs(shot('4 Iron',6,10,{position:-1}).side),'Opposing crosswind reduces early draw drift');
console.table(summary);
console.log('Wind flight passed: exact calm baseline, full-bag height/descent/asymmetry, green release, mirrored crosswind, rotation, timing interaction, 25-mph stability and wind-free putting.');
