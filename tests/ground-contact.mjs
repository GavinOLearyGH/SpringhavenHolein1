import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strike,advance,stepTime,ballRadius} from '../core/physics.mjs';
import {fullBag} from '../core/round.mjs';
import {createCourse} from '../core/course.mjs';
import {hole1} from '../course/holes/hole-1.mjs';
import {dragPower,dragHeading,pullGuideGeometry} from '../core/controls.mjs';

function shot(club,from='tee',landing='fairway',gx=0,gz=0){
    const ground=(x,z)=>gx*x+gz*z;
    const course={ground,surface:()=>landing,wall:[],airClearance:1000,
        bounds:{minX:-10000,maxX:10000,minZ:-10000,maxZ:10000}};
    const ball=strike({x:0,z:0},ground,club,1,0,from);
    let peak=0,impactEnergy;
    for(let i=0;i<14000&&['air','roll','drop'].includes(ball.mode);i++){
        const previous={...ball};
        advance(ball,course,{pin:null,wind:{x:0,z:0},greenSpeed:1},stepTime);
        if(ball.firstContact){
            peak=Math.max(peak,ball.y-ground(ball.x,ball.z)-ballRadius);
            if(!previous.firstContact)impactEnergy=(ball.vx**2+ball.vy**2+ball.vz**2)/(previous.vx**2+previous.vy**2+previous.vz**2);
        }
    }
    assert.equal(ball.mode,'rest',`${club} ${from} -> ${landing} must settle`);
    assert.ok(impactEnergy<1,'A grass impact must dissipate energy');
    return {ball,carry:ball.firstContact.x/.9144,roll:(ball.x-ball.firstContact.x)/.9144,peak};
}
for(const club of fullBag.filter(name=>name!=='Putter')){
    const fairway=shot(club),rough=shot(club,'tee','rough');
    const roughToFairway=shot(club,'rough','fairway');
    assert.ok(fairway.roll>=0&&fairway.roll<35,club+' fairway rollout');
    assert.ok(rough.roll>=0&&rough.roll<7,club+' rough landing should check');
    assert.ok(roughToFairway.roll<35,club+' rough-origin shot must not acquire excessive run');
    assert.ok(roughToFairway.carry<fairway.carry,club+' rough-origin carry penalty');
    assert.ok(fairway.peak<.5,club+' fairway rebound should stay low');
    assert.ok(rough.peak<fairway.peak,club+' rough absorbs bounce');
}
for(const lie of ['fairway','rough','surround']){
    const flat=shot('7 Iron','tee',lie);
    const uphill=shot('7 Iron','tee',lie,.05,0);
    const downhill=shot('7 Iron','tee',lie,-.05,0);
    const sidehill=shot('7 Iron','tee',lie,0,.05);
    assert.ok(uphill.roll<flat.roll,lie+' uphill should check sooner');
    assert.ok(downhill.roll>flat.roll,lie+' downhill should run farther');
    assert.ok(sidehill.ball.z<-.1,lie+' sidehill bounce and roll should move downhill');
}
const course=createCourse(hole1),{pews,plan}=hole1,k=plan.metresPerUnit;
for(let i=0;i<pews.count-1;i++){
    const crest=course.ground((pews.x+i*pews.spacing)*k,pews.z*k);
    const trough=course.ground((pews.x+(i+.5)*pews.spacing)*k,pews.z*k);
    assert.ok(crest-trough>.85,'Each church pew must have distinct relief');
}
assert.ok(dragHeading(0,0,80)<0&&dragHeading(0,0,-80)>0);
assert.equal(dragPower(.42,false),.8);
const guide=pullGuideGeometry({x:195,y:420},{x:200,y:200},1,390,560,20);
assert.ok(guide.back>0&&guide.forward>0);
// Both players consume exactly the same visuals and controls through the build.
const html=readFileSync('index.html','utf8');
for(const name of ['visuals','controls']){
    const module=readFileSync('core/'+name+'.mjs','utf8').replace(/^import .*?;\n/gm,'').replace(/export /g,'');
    assert.ok(html.includes(module),`Standalone Hole 6 must embed shared ${name}`);
}
console.log('39 full-bag surface checks, 12 slope checks, church-pew relief, slingshot alignment and Hole 6 shared-source conformance passed.');
