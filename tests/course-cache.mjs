import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {protectCourseRoutes} from '../scripts/patch-preview-worker.mjs';
const fixture=process.argv[2]?readFileSync(process.argv[2],'utf8'):
    "self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request));});";
function worker(source){
    const listeners={},old='cached old renderer';let cachedReads=0;
    vm.runInNewContext(source,{URL,self:{registration:{scope:'https://example.com/TIPOS_V3.0/'},addEventListener:(event,fn)=>listeners[event]=fn},
        caches:{match:async()=>{cachedReads++;return old;}}});
    return async pathname=>{
        let response;listeners.fetch({request:{url:'https://example.com'+pathname,method:'GET'},respondWith:p=>response=p});
        return {intercepted:response!==undefined,value:await response,cachedReads};
    };
}
const old=worker(fixture),patched=worker(protectCourseRoutes(fixture));
for(const route of ['/course/','/course/play.html?hole=1','/core/renderer.mjs','/course/release.json','/course/releases/example/core/physics.mjs']){
    const pathname='/TIPOS_V3.0'+route;
    assert.equal((await old(pathname)).intercepted,true,'Reproduce the stale game interception');
    const result=await patched(pathname);assert.equal(result.intercepted,false);assert.equal(result.cachedReads,0);
}
assert.equal((await patched('/TIPOS_V3.0/js/app.js')).intercepted,true,'Keep coaching app offline cache');
assert.equal((await patched('/TIPOS_V3.0/daily-challenge/index.html')).intercepted,true,'Preserve the separate Daily Challenge route');
assert.equal(protectCourseRoutes(protectCourseRoutes(fixture)),protectCourseRoutes(fixture),'Patch must be idempotent');
console.log('Parent-worker regression passed: stale course/core interception reproduced and bypassed; coaching and Daily Challenge cache behavior preserved.');
