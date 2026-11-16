import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';

const source=new URL('../index.html',import.meta.url);
const assets=new URL('./generated/public/',import.meta.url);
const html=await readFile(source,'utf8');
const start=html.indexOf('const scale = ');
const end=html.indexOf('// End shared physics.');
if(start<0||end<=start)throw Error('Could not locate the shared physics in index.html.');

await mkdir(assets,{recursive:true});
await Promise.all([
    copyFile(source,new URL('index.html',assets)),
    writeFile(new URL('./generated/physics.mjs',import.meta.url),
        html.slice(start,end)+'\nexport { dayKey, clubs, replayDailyShot };\n')
]);
