import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {hole6} from '../course/holes/hole-6.mjs';import {createCourse} from '../core/course.mjs';
import {newCompetition,applyCompetitionShot,restoreCompetitionRound} from '../core/competition.mjs';
import {createVisuals} from '../core/visuals.mjs';
const html=readFileSync('index.html','utf8'),context=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('const scale = '),html.indexOf('// End shared physics.')),context);
const c=createCourse(hole6);assert.equal(c.pins.length,9);
for(let x=65;x<1330;x+=13)for(let z=65;z<465;z+=13){const px=x*.153,pz=z*.153;
 assert.equal(c.ground(px,pz),vm.runInContext(`ground(${px},${pz})`,context));assert.equal(c.surface(px,pz),vm.runInContext(`surface(${px},${pz})`,context));}
for(const point of c.wall){assert.ok(Number.isFinite(point.top));}assert.ok(c.wall[30].top>c.wall[0].top+1);
const visuals=createVisuals({gl:{},ground:c.ground,surface:c.surface,greenBounds:c.greenBounds});
const meshes=c.meshes(visuals);for(const mesh of meshes){assert.equal(mesh.vertices.length%6,0);assert.ok(mesh.vertices.every(Number.isFinite));}
assert.deepEqual(meshes.map(mesh=>mesh.kind),[1,4,2,3,0]);
const session=newCompetition('2026-11-22','test','id','ace'),shot={hole:6,club:'5 Iron',power:1,heading:-.03,position:.2,releaseTick:480};
const official=applyCompetitionShot(session,shot),practice=restoreCompetitionRound(session);
for(let i=0;i<shot.releaseTick;i++)practice.step();practice.hit(shot.club,shot.power,shot.heading,shot.position);
while(['air','roll','drop'].includes(practice.state.ball.mode))practice.step();
assert.deepEqual(official.state.history,practice.state.history);assert.equal(official.status,'completed');assert.throws(()=>applyCompetitionShot(official,shot));
const timing=applyCompetitionShot(session,{...shot,position:0});assert.notDeepEqual(timing.state.history[0].to,official.state.history[0].to);
// Search a real tee-shot solution with the shared engine, fixed phase and clean timing.
let best={score:Infinity};
for(const club of ['3 Wood','4 Hybrid','4 Iron','5 Iron','6 Iron','7 Iron'])for(let power=.65;power<=1.001;power+=.025)for(const heading of [-.08,-.04,0,.04]){
 const shot={hole:6,club,power:Math.round(power*2000)/2000,heading,position:0,releaseTick:0};const result=applyCompetitionShot(session,shot);
 const score=result.outcome==='in-play'?result.mm:1e9;if(score<best.score)best={score,shot,result};
}
for(let pass=0;pass<12&&!best.result.ace;pass++){
 const start=best.shot,step=.016/1.5**pass;
 for(const p of [-2,-1,0,1,2])for(const h of [-2,-1,0,1,2]){
  const shot={...start,power:Math.max(.025,Math.min(1,Math.round((start.power+p*step)*2000)/2000)),heading:start.heading+h*step*.4};const result=applyCompetitionShot(session,shot);
  const score=result.outcome==='in-play'?result.mm:1e9;if(score<best.score)best={score,shot,result};
 }
}
console.log('Closest sampled tee shot:',best.score,'mm',best.shot);
assert.equal(best.result.ace,true,'A real shared-engine tee shot must hole out');
console.log('Hole 6 unification passed: exact terrain/surface parity, 9 pins, tapered wall, finite seam/water/bridge meshes, shared practice/official flight, timing and one-shot completion.');
