// Run the actual course controller against a small DOM/renderer adapter.
// This checks clock/input lifecycle, not native rendering or screen geometry.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sourceURL=new URL('../course/play.mjs',import.meta.url),html=readFileSync(new URL('../course/play.html',import.meta.url),'utf8');
const rendererURL='data:text/javascript,'+encodeURIComponent('export const makeAtlas=()=>({width:100,height:100});export const createRenderer=()=>({frame(){},project(){return {x:100,y:100}}});');
const controller=readFileSync(sourceURL,'utf8').replace(/from ['"]([^'"]+)['"]/g,(_,url)=>'from '+JSON.stringify(url.endsWith('/renderer.mjs')?rendererURL:new URL(url,sourceURL).href));
function surface(){const events={};return {events,addEventListener(name,fn){(events[name]??=[]).push(fn);},emit(name,event={}){for(const fn of events[name]??[])fn(event);}};}
async function load(query,saved){
 const nodes=new Map();
 const ctx=new Proxy({},{get:(_,key)=>()=>{}});
 for(const [,id] of html.matchAll(/id="([^"]+)"/g))nodes.set(id,{...surface(),id,options:[],value:'',style:{},hidden:false,open:false,clientWidth:390,clientHeight:600,width:180,height:510,
  classList:{add(){},remove(){}},setAttribute(){},add(option){this.options.push(option);if(this.options.length===1)this.value=String(option.value);},
  replaceChildren(){this.options=[];},append(){},focus(){},setPointerCapture(){},getContext:()=>ctx,
  getBoundingClientRect:()=>({left:0,top:0}),showModal(){this.open=true;},close(){this.open=false;}});
 nodes.get('green-speed').value='1';nodes.get('wind-speed').value='0';
 const doc={...surface(),hidden:false,baseURI:'https://test.invalid/course/play.html',getElementById:id=>nodes.get(id),createElement:()=>({append(){}})};
 const win={...surface()};const storage=new Map(saved?[[`irish-par-series-${saved.id}`,JSON.stringify(saved)]]:[]);
 globalThis.document=doc;globalThis.window=win;globalThis.location={search:query,href:doc.baseURI+query,replace(url){this.replaced=url;},assign(){}};
 globalThis.Option=class{constructor(label,value){this.textContent=label;this.value=String(value);}};
 globalThis.sessionStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
 globalThis.localStorage={getItem:()=>null,setItem(){}};
 globalThis.innerHeight=800;globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 globalThis.fetch=async()=>({ok:false});
 const app=await import('data:text/javascript;base64,'+Buffer.from(controller+'\nexport {round,frame,startRound,weatherSetup,holeWindTick};\n//'+query).toString('base64'));
 assert.notEqual(nodes.get('status').textContent,'Course graphics could not start.');
 return {app,nodes,win,doc,storage};
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
