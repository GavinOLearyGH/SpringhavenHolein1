import {buildCourseAssets} from '../course/build.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

const source=new URL('../index.html',import.meta.url);
const assets=new URL('./generated/public/',import.meta.url);
let html=await readFile(source,'utf8');
const engine=await readFile(new URL('../core/physics.mjs',import.meta.url),'utf8');
const inline=engine.slice(0,engine.lastIndexOf('export {'));
const marker='// Begin shared engine.\n',finish='// End shared engine.';
const engineStart=html.indexOf(marker),engineEnd=html.indexOf(finish);
if(engineStart<0||engineEnd<engineStart)throw Error('Missing shared engine markers');
html=html.slice(0,engineStart+marker.length)+inline+html.slice(engineEnd);
for(const name of ['controls','visuals']){
    const module=await readFile(new URL('../core/'+name+'.mjs',import.meta.url),'utf8');
    const inline=module.replace(/^import .*?;\n/gm,'').replace(/export /g,'');
    const marker='// Begin shared '+name+'.\n',finish='// End shared '+name+'.';
    const start=html.indexOf(marker),end=html.indexOf(finish);
    if(start<0||end<start)throw Error('Missing '+name+' markers');
    html=html.slice(0,start+marker.length)+inline+html.slice(end);
}
await writeFile(source,html);

const start=html.indexOf('const scale = ');
const end=html.indexOf('// End shared physics.');
if(start<0||end<=start)throw Error('Could not locate the shared physics in index.html.');

await mkdir(assets,{recursive:true});
await Promise.all([
    writeFile(new URL('index.html',assets),html),
    writeFile(new URL('./generated/physics.mjs',import.meta.url),
        html.slice(start,end)+'\nexport { dayKey, clubs, replayDailyShot };\n')
]);

const buildId=await buildCourseAssets(assets);
const hub=await readFile(new URL('../daily/index.html',import.meta.url),'utf8');
const release='course/releases/'+buildId+'/';
await writeFile(new URL('index.html',assets),hub.replace('./daily/style.css','./'+release+'daily/style.css').replace('./daily/home.mjs','./'+release+'daily/home.mjs'));
// Compatibility URL: all current gameplay goes through the one shared player.
await writeFile(new URL('ace.html',assets),`<!doctype html><html><head><meta charset="utf-8"><title>The Irish Par · Hole 6</title></head><body><p>Opening Hole 6…</p><script>
const params=new URLSearchParams(location.search),target=new URL('course/play.html',location.href);
target.searchParams.set('hole','6');target.searchParams.set(params.has('practice')?'practiceAce':'ace',new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
location.replace(target.href);</script></body></html>`);
console.log('Daily Challenge build: '+buildId);
