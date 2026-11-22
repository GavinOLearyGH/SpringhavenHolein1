// Run the actual course controller against a small DOM/renderer adapter.
// This checks clock/input lifecycle, not native rendering or screen geometry.
import assert from 'node:assert/strict';
import {newCompetition,dayKey} from '../core/competition.mjs';
import {buildId} from '../core/build-info.mjs';
import {readFileSync} from 'node:fs';
const sourceURL=new URL('../course/play.mjs',import.meta.url),html=readFileSync(new URL('../course/play.html',import.meta.url),'utf8');
const rendererURL='data:text/javascript,'+encodeURIComponent('export const makeAtlas=()=>({width:100,height:100});export const createRenderer=()=>({frame(view){globalThis.__viewFrames.push(view);},project(){return {x:100,y:100}}});');
const controller=readFileSync(sourceURL,'utf8').replace(/from ['"]([^'"]+)['"]/g,(_,url)=>'from '+JSON.stringify(url.endsWith('/renderer.mjs')?rendererURL:new URL(url,sourceURL).href));
function surface(){const events={};return {events,addEventListener(name,fn){(events[name]??=[]).push(fn);},emit(name,event={}){for(const fn of events[name]??[])fn(event);}};}
async function load(query,saved,official,pending){
 globalThis.__viewFrames=[];
 const nodes=new Map();
 const ctx=new Proxy({},{get:(_,key)=>()=>{}});
 for(const [,id] of html.matchAll(/id="([^"]+)"/g))nodes.set(id,{...surface(),id,options:[],value:'',style:{},hidden:false,open:false,clientWidth:390,clientHeight:600,width:180,height:510,
  classList:{add(){},remove(){}},setAttribute(){},add(option){this.options.push(option);if(this.options.length===1)this.value=String(option.value);},
  replaceChildren(){this.options=[];},append(){},focus(){},setPointerCapture(){},getContext:()=>ctx,
  getBoundingClientRect:()=>({left:0,top:0}),showModal(){this.open=true;},close(){this.open=false;}});
 nodes.get('green-speed').value='1';nodes.get('wind-speed').value='0';
 const doc={...surface(),hidden:false,baseURI:'https://test.invalid/course/play.html',getElementById:id=>nodes.get(id),createElement:()=>({append(){}})};
 const win={...surface()};const storage=new Map(saved?[[`irish-par-series-${saved.id}`,JSON.stringify(saved)]]:[]);
 globalThis.document=doc;globalThis.window=win;globalThis.location={search:query,href:doc.baseURI+query,hostname:'test.github.io',protocol:'https:',replace(url){this.replaced=url;},assign(){}};
 globalThis.Option=class{constructor(label,value){this.textContent=label;this.value=String(value);}};
 globalThis.sessionStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
 const local=new Map();if(official)local.set((official.kind==='ace'?'irish-par-ace:':'irish-par-three:')+official.day,JSON.stringify(official));if(pending)local.set('irish-par-three-pending:'+official.day,JSON.stringify(pending));
 globalThis.localStorage={getItem:key=>local.get(key)??null,setItem:(key,value)=>local.set(key,value),removeItem:key=>local.delete(key)};
 globalThis.innerHeight=800;globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 globalThis.fetch=async()=>({ok:false});
 const app=await import('data:text/javascript;base64,'+Buffer.from(controller+'\nexport {round,frame,startRound,weatherSetup,holeWindTick,tidyPracticeResult,showOfficialDialog,suggestClub,updateHUD};\n//'+query).toString('base64'));
 assert.notEqual(nodes.get('status').textContent,'Course graphics could not start.');
 return {app,nodes,win,doc,storage,local};
}
const {app,nodes,win}=await load('?hole=1&windAngle=120&mph=10&windSeed=ui');
assert.equal(nodes.get('wind').options.length,12);assert.equal(nodes.get('wind').value,'120');
app.frame(1000);app.frame(1050);assert.ok(app.round.state.windTick>0);
const before=app.round.state.windTick;win.emit('blur');app.frame(100000);app.frame(100050);assert.equal(app.round.state.windTick,before);
win.emit('focus');app.frame(200000);assert.equal(app.round.state.windTick,before,'Resume must not catch up wall time');
app.frame(200050);assert.ok(app.round.state.windTick>before);
assert.ok(nodes.get('wind-arrow').style.transform.includes('rotate('));
assert.ok(nodes.get('wind-text').textContent.includes('mph'));
const event={code:'Space',preventDefault(){},target:{matches:()=>false}};
win.emit('keydown',event);app.frame(performance.now()+700);
const chargedTick=app.round.state.windTick;assert.ok(Number(nodes.get('power-label').textContent.replace('%',''))>0);
win.emit('keyup',event);assert.equal(app.round.state.strokes,1);
for(let i=0;i<15;i++)app.frame(performance.now()+750+i*30);
assert.ok(app.round.state.windTick>chargedTick);
// An old URL means the old 45-degree index, never a new 30-degree index.
const legacy=await load('?hole=2&wind=4&mph=9');assert.equal(legacy.nodes.get('wind').value,'180');
const saved={id:'legacy',setup:{tee:'rawlins',wind:'1',mph:'9',speed:'1'},results:[{hole:1,strokes:4,penalties:0}],windTick:4321,windStarts:{1:0,3:99999}};
const series=await load('?hole=2&series=legacy',saved);
assert.equal(series.nodes.get('wind').value,'45');assert.equal(series.app.round.state.windTick,4321);
const persisted=JSON.parse(series.storage.get('irish-par-series-legacy'));
assert.equal(persisted.setup.windAngle,'45');assert.equal(persisted.windStarts[2],4321);
assert.equal(persisted.windStarts[3],undefined,'Resetting an earlier hole invalidates future entry clocks');
series.app.frame(1000);series.app.frame(1050);assert.ok(series.app.round.state.windTick>4321);
series.app.startRound();assert.equal(series.app.round.state.windTick,4321,'Reset restores entry phase');
console.log('Course controller smoke passed: 12 choices, live wind arrow, idle/charging/flight, blur/resume without catch-up, legacy URL and saved-series clock migration. Native visuals still require device testing.');

const today=dayKey(),official=newCompetition(today,buildId,'a'.repeat(32));
const active=await load('?official='+today+'&hole=1',null,official);
assert.equal(active.nodes.get('round-settings').hidden,true);assert.equal(active.nodes.get('tee').disabled,true);
assert.equal(active.nodes.get('reset').textContent,'Home');
assert.ok(active.nodes.get('series-status').textContent.includes('Official'));
active.app.frame(1000);active.app.frame(1050);
active.win.emit('keydown',event);active.app.frame(performance.now()+700);active.win.emit('keyup',event);
assert.equal(active.app.round.state.strokes,1);assert.ok(active.local.get('irish-par-three-pending:'+today));
for(let i=0;i<900;i++){active.app.frame(performance.now()+1000+i*30);await Promise.resolve();}
const savedOfficial=JSON.parse(active.local.get('irish-par-three:'+today));
assert.equal(savedOfficial.revision,1);assert.equal(active.local.has('irish-par-three-pending:'+today),false);
const resumed=await load('?official='+today+'&resume=1',null,savedOfficial);
assert.equal(resumed.app.round.state.ball.x,savedOfficial.state.ball.x);assert.equal(resumed.app.round.state.strokes,savedOfficial.state.strokes);
const pending={id:official.id,revision:0,shot:{hole:1,club:'Driver',power:1,heading:0,position:0,releaseTick:240}};
const recovered=await load('?official='+today+'&pending=1',null,official,pending);await Promise.resolve();await Promise.resolve();
assert.equal(JSON.parse(recovered.local.get('irish-par-three:'+today)).revision,1);
const completed={...savedOfficial,hole:3,status:'completed',results:[{hole:1,strokes:4,penalties:0},{hole:2,strokes:5,penalties:0},{hole:3,strokes:3,penalties:0}],tieValid:true,tieMM:1000,state:{...savedOfficial.state,complete:true}};
const final=await load('?official='+today+'&finished=1',null,completed);
assert.equal(final.nodes.get('complete').open,true);assert.equal(final.nodes.get('complete-title').textContent,'Official result');
assert.equal(final.nodes.get('official-result').hidden,false);assert.ok(final.nodes.get('complete-detail').textContent.includes('12 strokes'));
final.nodes.get('official-name').value='Test Golfer';await final.nodes.get('publish-official').onclick();
assert.equal(JSON.parse(final.local.get('irish-par-three:'+today)).name,'Test Golfer');
console.log('Official controller passed: daily locking, pending-shot save, settled-shot resume, interrupted-save recovery, completed result and local publication.');

const aceSession=newCompetition(today,buildId,'d'.repeat(32),'ace');
const aceUI=await load('?ace='+today,null,aceSession);
assert.equal(aceUI.nodes.get('hole-title').textContent,'Hole 6 · Par 3');assert.equal(aceUI.nodes.get('pin').disabled,true);
aceUI.win.emit('keydown',event);aceUI.app.frame(performance.now()+700);aceUI.win.emit('keyup',event);
for(let i=0;i<1200;i++){aceUI.app.frame(performance.now()+1000+i*30);await Promise.resolve();}
const aceSaved=JSON.parse(aceUI.local.get('irish-par-ace:'+today));
assert.equal(aceSaved.status,'completed');assert.equal(aceUI.nodes.get('complete').open,true);assert.equal(aceUI.nodes.get('complete-title').textContent,'Official result');
assert.equal(aceUI.nodes.get('official-detail').hidden,true);assert.ok(aceUI.nodes.get('official-board').href.includes('board=ace'));
assert.equal(aceUI.nodes.get('power-fill').style.height,'0%');assert.ok(aceUI.nodes.get('series-status').textContent.includes('Hole-in-One'));
console.log('Unified Hole 6 controller passed: same power/strike/wind overlay, one-shot completion and ACE result/leaderboard routing.');

const practiceSix=await load('?hole=6&practiceAce=2026-11-22&regression=flyover-putt');
assert.equal(practiceSix.nodes.get('green-speed').value,'.8');assert.equal(practiceSix.app.round.settings.greenSpeed,.8);
practiceSix.nodes.get('flyover').onclick();assert.equal(practiceSix.nodes.get('flyover').textContent,'Skip flyover');
for(const t of [1000,2000,5000,7500,9000,11000])practiceSix.app.frame(t);
assert.equal(practiceSix.nodes.get('flyover').textContent,'Flyover','Flyover must finish and return to play');
assert.notDeepEqual(globalThis.__viewFrames[0].eye,globalThis.__viewFrames[2].eye,'Camera must move during flyover');
assert.ok(globalThis.__viewFrames.every(view=>view.eye.every(Number.isFinite)&&view.target.every(Number.isFinite)));

const puttingBall=practiceSix.app.round.state.ball,pin=practiceSix.app.round.settings.pin;
Object.assign(puttingBall,{x:pin.x-4.5,z:pin.z,y:0,mode:'rest'});
practiceSix.nodes.get('club').value='Putter';practiceSix.nodes.get('club').onchange();
practiceSix.win.emit('keydown',event);practiceSix.app.frame(performance.now()+700);
assert.ok(parseFloat(practiceSix.nodes.get('putt-roll').textContent.replace('Est. ',''))>0,'Half-power putt must estimate nonzero travel');
const startX=puttingBall.x,startZ=puttingBall.z;
practiceSix.win.emit('keyup',event);
for(let i=0;i<400;i++)practiceSix.app.frame(performance.now()+1000+i*30);
assert.ok(Math.hypot(practiceSix.app.round.state.ball.x-startX,practiceSix.app.round.state.ball.z-startZ)>.1,'Putt must move after release');
console.log('Hole 6 regressions passed: slow-speed normalization, complete animated flyover, nonzero putting estimate and released putt movement.');

assert.equal(final.nodes.get('official-name-label').hidden,true,'Published result hides redundant name entry');
assert.equal(final.nodes.get('publish-official').hidden,true);assert.equal(final.nodes.get('official-board').className,'button primary');
assert.ok(final.nodes.get('complete-home').href.includes('/daily-challenge/'));assert.equal(final.nodes.get('practice-home').hidden,true);
practiceSix.app.tidyPracticeResult(true,false);assert.equal(practiceSix.nodes.get('next-hole').className,'button primary');
practiceSix.app.tidyPracticeResult(false,true);assert.equal(practiceSix.nodes.get('replay').hidden,true);assert.equal(practiceSix.nodes.get('series-replay').className,'primary');
const mid={...official,hole:2,results:[{hole:1,strokes:4,penalties:0}]};
const between=await load('?official='+today+'&modal=between',null,mid);between.app.showOfficialDialog();
assert.equal(between.nodes.get('replay').hidden,true);assert.equal(between.nodes.get('next-hole').className,'button primary');assert.equal(between.nodes.get('complete-home').textContent,'Save and exit');
console.log('Result actions passed: posted official leaderboard priority, between-hole continue/save-and-exit and practice round replay hierarchy.');

const fairwayUI=await load('?hole=2&tee=rawlins&mph=0&clubLie=1');
const lieCourse=(await import('../core/course.mjs')).createCourse((await import('../course/holes/hole-2.mjs')).hole2);
const driveTarget=lieCourse.aimTarget(fairwayUI.app.round.state.ball),driveBall=fairwayUI.app.round.state.ball;
fairwayUI.app.round.hit('Driver',1,Math.atan2(driveTarget.z-driveBall.z,driveTarget.x-driveBall.x));
for(let i=0;i<22000&&['air','roll','drop'].includes(fairwayUI.app.round.state.ball.mode);i++)fairwayUI.app.round.step();
fairwayUI.app.suggestClub();fairwayUI.app.updateHUD();
assert.equal(fairwayUI.nodes.get('club').value,'3 Wood');assert.equal(fairwayUI.nodes.get('club-risk').hidden,true);
fairwayUI.nodes.get('club').value='Driver';fairwayUI.nodes.get('club').onchange();
assert.equal(fairwayUI.nodes.get('club-risk').hidden,false);assert.ok(fairwayUI.nodes.get('club-risk').textContent.includes('off the deck'));
console.log('Club/lie UI passed: Hole 2 fairway defaults to 3 Wood; manually choosing Driver reveals contact risk.');
