import assert from 'node:assert/strict';
import {createWind,windSetup,randomWindSetup,windReading,windModel} from '../core/wind.mjs';
import {createRound} from '../core/round.mjs';
import {createCourse} from '../core/course.mjs';
import {hole1} from '../course/holes/hole-1.mjs';
import {hole2} from '../course/holes/hole-2.mjs';
import {hole3} from '../course/holes/hole-3.mjs';
import {strike,advance,stepTime} from '../core/physics.mjs';
import {setupKey} from '../core/series.mjs';
const setup={windModel,windAngle:'120',mph:'10',windSeed:'four-clock'};
assert.equal(new Set(Array.from({length:12},(_,i)=>randomWindSetup(()=>i/12).windAngle)).size,12);
assert.equal(randomWindSetup(()=>.999999).windAngle,'330');
for(let i=0;i<8;i++)assert.equal(windSetup({wind:i}).windAngle,String(i*45));
assert.equal(windSetup({wind:4}).windAngle,'180');assert.equal(windSetup({windAngle:120,wind:4}).windAngle,'120');
assert.equal(windSetup({windAngle:-30}).windAngle,'330');assert.equal(windSetup({mph:NaN}).mph,'0');
assert.throws(()=>createWind({windModel:'future'}));
const pattern=createWind(setup),copy=createWind(JSON.parse(JSON.stringify(setup)));
const samples=[],speeds=[],angles=[];
for(let i=0;i<=240*120;i++){
 const t=i*stepTime,w=pattern.sample(t);
 assert.deepEqual(w,copy.sample(t));
 assert.ok(w.mph>=8-1e-9&&w.mph<=12+1e-9);assert.ok(w.angle>=105&&w.angle<=135);
 if(i){const previous=samples.at(-1);assert.ok(Math.abs(w.angle-previous.angle)<.02);assert.ok(Math.abs(w.mph-previous.mph)<.01);}
 samples.push(w);speeds.push(w.mph);angles.push(w.angle);
}
assert.ok(Math.max(...speeds)-Math.min(...speeds)>2);assert.ok(Math.max(...angles)-Math.min(...angles)>15);
assert.notDeepEqual(pattern.sample(10),createWind({...setup,windSeed:'other'}).sample(10));
assert.deepEqual(createWind({mph:0}).sample(50),{x:0,z:0,mph:0,angle:createWind({mph:0}).sample(50).angle,trend:'steady'});
for(let t=0;t<120;t++)assert.ok(createWind({...setup,mph:25}).sample(t).mph<=25);
for(const angle of [0,30,60,90,120,150,180,210,240,270,300,330]){
 const vector={x:Math.cos(angle*Math.PI/180)*4,z:Math.sin(angle*Math.PI/180)*4};
 assert.ok(windReading(vector).text.includes((angle/30||12)+' o’clock'));
}
assert.ok(windReading({x:4,z:0},Math.PI).text.includes('6 o’clock'));
assert.equal(windReading({x:0,z:0}).text,'Calm');
for(const definition of [hole1,hole2,hole3]){
 const round=createRound(createCourse(definition),{windProfile:setup,windTick:4321});
 const current=round.settings.wind,angle=definition.bearing*Math.PI/180,world=pattern.sample(4321*stepTime);
 assert.ok(Math.abs(current.x*Math.cos(angle)-current.z*Math.sin(angle)-world.x)<1e-9);
 assert.ok(Math.abs(current.x*Math.sin(angle)+current.z*Math.cos(angle)-world.z)<1e-9);
 const tick=round.state.windTick;round.step();assert.equal(round.state.windTick,tick+1);
 assert.deepEqual(round.settings.wind,pattern.sample((tick+1)*stepTime,definition.bearing));
 assert.equal(round.state.strokes,0);assert.equal(round.state.ball.mode,'rest');
}
const flat={tees:[{id:'test',x:0,z:0}],pins:[{id:'test',x:1000,z:0}],bearing:0,
 ground:()=>0,surface:()=> 'fairway',bounds:{minX:-2000,maxX:2000,minZ:-2000,maxZ:2000}};
function finish(round){let count=0;while(['air','roll','drop'].includes(round.state.ball.mode)&&count++<12000)round.step();assert.ok(count<12000);return round.state.history[0];}
const round=createRound(flat,{windProfile:setup});
for(let i=0;i<2400;i++)round.step(); // Wind advances while lining up the shot.
assert.equal(round.state.windTick,2400);
assert.ok(round.hit('4 Iron',1,0,0));
const history=finish(round),record=history.metrics.wind;
assert.equal(record.releaseTick,2400);assert.equal(record.windSeed,setup.windSeed);assert.equal(record.windModel,windModel);
// Server-style replay can start directly at the recorded release tick.
const replay=createRound(flat,{windProfile:record,windTick:record.releaseTick});replay.hit('4 Iron',1,0,0);
assert.deepEqual(finish(replay),history);
const later=createRound(flat,{windProfile:setup,windTick:4800});later.hit('4 Iron',1,0,0);
assert.notDeepEqual(finish(later).to,history.to,'Choosing a different release phase must affect the shot');
// Independent per-step flight consumes precisely the HUD/current-vector samples.
const ball=strike({x:0,z:0},flat.ground,'4 Iron',1,0,'fairway');let tick=2400;
while(['air','roll','drop'].includes(ball.mode))advance(ball,flat,{pin:flat.pins[0],wind:pattern.sample(++tick*stepTime),greenSpeed:1},stepTime);
assert.equal(ball.x,history.to.x);assert.equal(ball.z,history.to.z);
for(const bearing of [0,177,157]){
 const calm=createRound({...flat,bearing}),windy=createRound({...flat,bearing},{windProfile:setup});
 calm.hit('Putter',.5,0);windy.hit('Putter',.5,0);
 assert.deepEqual(finish(calm).to,finish(windy).to);
}
assert.notEqual(setupKey({...setup,tee:'test',speed:1}),setupKey({...setup,windSeed:'other',tee:'test',speed:1}));
assert.equal(createRound(flat,{windProfile:setup,windTick:Infinity}).state.windTick,0);
const staticRound=createRound(flat,{windDirection:4,windMph:10});const staticWind={...staticRound.settings.wind};
for(let i=0;i<240;i++)staticRound.step();assert.deepEqual(staticRound.settings.wind,staticWind);
console.log('Dynamic wind passed: 12 directions, old 8-way migration, smooth bounds, seeded replay, 3-hole orientation, idle/flight clock, HUD-vector identity, release-phase effects, putts and static compatibility.');
