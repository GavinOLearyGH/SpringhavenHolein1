import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const assets=fileURLToPath(new URL('../leaderboard/generated/public/',import.meta.url));
const {buildId}=JSON.parse(await readFile(path.join(assets,'course/release.json'),'utf8'));
const release=path.join(assets,'course/releases',buildId);
const physicsImports=new Set();let count=0;
async function walk(folder){
    for(const entry of await readdir(folder,{withFileTypes:true})){
        const name=path.join(folder,entry.name);
        if(entry.isDirectory()){await walk(name);continue;}
        if(!name.endsWith('.mjs'))continue;
        const source=await readFile(name,'utf8');
        for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.{1,2}\/[^'"]+\.mjs)['"]/g)){
            const target=path.resolve(path.dirname(name),match[1]);
            assert.ok(target.startsWith(release+path.sep),'Every module must stay inside one release');
            await readFile(target);if(target.endsWith('/physics.mjs'))physicsImports.add(target);
        }
        count++;
    }
}
await walk(release);assert.equal(physicsImports.size,1,'Single physics instance per release');
for(const file of ['course/index.html','course/play.html','course/hole-1/index.html']){
    const html=await readFile(path.join(assets,file),'utf8');assert.ok(html.includes(buildId));
    for(const match of html.matchAll(/(?:src|href)=["'](\.{1,2}\/[^"']+\.(?:mjs|css))["']/g)){
        const target=path.resolve(assets,path.dirname(file),match[1]);
        assert.ok(target.startsWith(release+path.sep));await readFile(target);
    }
    for(const match of html.matchAll(/(?:from\s*|import\s*)['"](\.{1,2}\/[^'"]+\.mjs)['"]/g)){
        const target=path.resolve(assets,path.dirname(file),match[1]);
        assert.ok(target.startsWith(release+path.sep));await readFile(target);
    }
}
const {createRound}=await import('file://'+path.join(release,'core/round.mjs'));
const {createCourse}=await import('file://'+path.join(release,'core/course.mjs'));
const {hole1}=await import('file://'+path.join(release,'course/holes/hole-1.mjs'));
const round=createRound(createCourse(hole1));assert.equal(round.hit('Driver',1,0),true);
console.log(`Release ${buildId}: ${count} immutable modules, complete import graph and all three entry pages verified.`);
