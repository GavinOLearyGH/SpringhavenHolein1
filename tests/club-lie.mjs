import assert from 'node:assert/strict';
import {createRound,fullBag} from '../core/round.mjs';
import {recommendClub,clubLie,contactProfile} from '../core/club-lie.mjs';
import {executionWindow} from '../core/execution.mjs';
import {createCourse} from '../core/course.mjs';
import {hole2} from '../course/holes/hole-2.mjs';
const flat=(surface='fairway',extra={})=>({ground:()=>0,surface:()=>surface,wall:[],tees:[{id:'test',x:0,z:0}],pins:[{id:'test',x:600,z:0}],bounds:{minX:-2000,maxX:2000,minZ:-2000,maxZ:2000},...extra});
function settle(round){let i=0,peak=0;while(['air','roll','drop'].includes(round.state.ball.mode)&&i++<22000){round.step();peak=Math.max(peak,round.state.ball.y);}assert.ok(i<22000);return peak;}
function shot(club,{surface='fairway',teed=false,position=0,extra={}}={}){
 const r=createRound(flat(surface,extra));r.state.teed=teed;assert.ok(r.hit(club,1,0,position));const launch=Math.atan2(r.state.ball.vy,Math.hypot(r.state.ball.vx,r.state.ball.vz));const peak=settle(r);return {r,launch,peak,carry:r.state.history[0].metrics.carry/.9144};
}
const tee=shot('Driver',{teed:true}),deck=shot('Driver'),wood=shot('3 Wood');
assert.ok(tee.carry>229&&tee.carry<232,'Teed driver calibration unchanged');
assert.ok(deck.carry<tee.carry-15&&deck.carry>175,'Clean deck driver has viable but reduced carry');
assert.ok(deck.launch<tee.launch&&deck.peak<tee.peak);
assert.ok(wood.carry>deck.carry,'3 Wood is the sensible clean fairway option');
assert.equal(executionWindow('Driver',1,'fairway'),executionWindow('Driver',1,'teed')*.5);
assert.ok(executionWindow('Driver',1,'rough')<executionWindow('Driver',1,'fairway'));
assert.ok(executionWindow('3 Wood',1,'rough')<executionWindow('4 Hybrid',1,'rough'));
const early=shot('Driver',{position:-.5}),late=shot('Driver',{position:.5});
assert.ok(Math.abs(early.r.state.history[0].to.z+late.r.state.history[0].to.z)<1e-8);
assert.ok(late.r.state.history[0].metrics.contact.includes('Driver off the deck'));
for(const [id,surface,expected] of [['fairway','fairway','3 Wood'],['rough','rough','4 Hybrid'],['heavy','rough','4 Hybrid'],['tight','fairway','4 Hybrid'],['sand','sand','SW'],['green','green','Putter'],['tee','tee','3 Wood']]){
 const lie={id,surface,teed:false};assert.equal(recommendClub(320,lie,fullBag),expected);
}
assert.equal(recommendClub(419,{id:'teed',surface:'tee',teed:true},fullBag),'Driver');
assert.equal(recommendClub(145,{id:'fairway',surface:'fairway',teed:false},fullBag),'7 Iron');
// A ball landing on tee grass does not gain a tee, including after serialization.
const teeGrass=shot('3 Wood',{surface:'tee',teed:true}).r;
assert.equal(teeGrass.getLie().teed,false);assert.equal(teeGrass.getLie().id,'tee');
const restored=createRound(flat('tee'));Object.assign(restored.state,JSON.parse(JSON.stringify(teeGrass.state)));assert.equal(restored.getLie().teed,false);
// Replay from a teed stroke-and-distance penalty allows re-teeing; a ground shot does not.
for(const teed of [true,false]){
 const r=shot('Driver',{surface:'tee',teed,extra:{isOutOfBounds:()=>true}}).r;
 assert.equal(r.state.penalties,1);assert.equal(r.getLie().teed,teed);
}
const relief=shot('Driver',{teed:true,extra:{surface:()=> 'water',waterHeight:1,waterRelief:()=>({x:5,z:0})}}).r;
assert.equal(relief.getLie().teed,false);
// Barranca profile remains composed, and fixed spatial lies do not reroll.
const profile={id:'heavy',material:'rough',speed:.74,spin:.55,launch:1.5,label:'Heavy lie',featureName:'Barranca'};
const composed=contactProfile('Driver',{id:'heavy',surface:'rough',profile});
assert.equal(composed.speed,.74*.88);assert.equal(composed.spin,.55);assert.equal(composed.launch,-2.5);
const rough=shot('Driver',{surface:'rough'}),heavy=shot('Driver',{surface:'rough',extra:{lieAt:()=>profile}});
assert.ok(heavy.carry<rough.carry);assert.equal(heavy.r.state.history[0].metrics.startingLieLabel,'Barranca · Heavy lie');
const course2=createCourse(hole2),actual=createRound(course2,{tee:'rawlins'}),target=course2.aimTarget(actual.state.ball);actual.hit('Driver',1,Math.atan2(target.z-actual.state.ball.z,target.x-actual.state.ball.x));settle(actual);
assert.equal(actual.getLie().surface,'fairway');assert.equal(recommendClub(Math.hypot(actual.state.ball.x-actual.settings.pin.x,actual.state.ball.z-actual.settings.pin.z)/.9144,actual.getLie(),fullBag),'3 Wood');
console.log(`Club/lie passed: Hole 2 drive recommends 3 Wood; driver carries ${tee.carry.toFixed(1)} yd teed / ${deck.carry.toFixed(1)} yd off deck vs ${wood.carry.toFixed(1)} yd 3 Wood. Recovery suggestions, timing, mirrored misses, persistent tee state, penalty re-tee and barranca composition verified.`);
