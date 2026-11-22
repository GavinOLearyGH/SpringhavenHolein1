import assert from 'node:assert/strict';
import Module from 'node:module';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {buildId} from '../core/build-info.mjs';
const original=Module._load,require=createRequire(import.meta.url);
Module._load=function(name,...args){if(name==='mysql2/promise')return {createPool:()=>({})};return original.call(this,name,...args);};
process.env.PORT=String(32000+Math.floor(Math.random()*1000));
const server=require('../leaderboard/namecheap-server.js');Module._load=original;
await once(server,'listening');
try{
 const root='http://127.0.0.1:'+server.address().port+'/DailyChallenge/';
 for(const [asset,type,contains] of [['','text/html','Three-Hole Challenge'],['ace.html','text/html','The Springhaven Club - Hole 6'],['course/play.html','text/html','wind-arrow'],['course/releases/'+buildId+'/core/competition.mjs','text/javascript','applyCompetitionShot'],['course/releases/'+buildId+'/daily/style.css','text/css','challenge-grid']]){
  const response=await fetch(root+asset);assert.equal(response.status,200,asset);assert.ok(response.headers.get('content-type').startsWith(type));assert.ok((await response.text()).includes(contains));
 }
 assert.equal((await fetch(root+'namecheap-server.js')).status,404);
 assert.equal((await fetch(root+'course/releases/'+buildId+'/course/play.html')).status,200,'Pinned game HTML must be served for resumes');
 assert.equal((await fetch(root+'course/releases/'+buildId+'/core/competition.mjs')).headers.get('cache-control'),'public,max-age=31536000,immutable');
 console.log('Namecheap HTTP assets passed: unified home, preserved Hole 6, pinned course HTML/modules/CSS, immutable cache and private-file boundary. MySQL operations use separate service tests.');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
