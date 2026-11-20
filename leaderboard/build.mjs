import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';

const source=new URL('../index.html',import.meta.url);
const assets=new URL('./generated/public/',import.meta.url);
let html=await readFile(source,'utf8');
const engine=await readFile(new URL('../core/physics.mjs',import.meta.url),'utf8');
const inline=engine.slice(0,engine.lastIndexOf('export {'));
const marker='// Begin shared engine.\n',finish='// End shared engine.';
const engineStart=html.indexOf(marker),engineEnd=html.indexOf(finish);
if(engineStart<0||engineEnd<engineStart)throw Error('Missing shared engine markers');
html=html.slice(0,engineStart+marker.length)+inline+html.slice(engineEnd);
await writeFile(source,html);

const start=html.indexOf('const scale = ');
const end=html.indexOf('// End shared physics.');
if(start<0||end<=start)throw Error('Could not locate the shared physics in index.html.');

await mkdir(assets,{recursive:true});
await Promise.all([
    writeFile(new URL('index.html',assets),html),
    cp(new URL('../course',import.meta.url),new URL('course/',assets),{recursive:true}),
    cp(new URL('../core',import.meta.url),new URL('core/',assets),{recursive:true}),
    writeFile(new URL('./generated/physics.mjs',import.meta.url),
        html.slice(start,end)+'\nexport { dayKey, clubs, replayDailyShot };\n')
]);
