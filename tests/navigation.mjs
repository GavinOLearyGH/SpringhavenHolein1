import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gameLinks} from '../core/navigation.mjs';
for(const [page,root] of [
 ['https://gavinolearygh.github.io/TIPOS_V3.0/course/','https://gavinolearygh.github.io/TIPOS_V3.0/daily-challenge/'],
 ['https://gavinolearygh.github.io/TIPOS_V3.0/course/play.html?hole=6','https://gavinolearygh.github.io/TIPOS_V3.0/daily-challenge/'],
 ['https://gavinolearygh.github.io/TIPOS_V3.0/daily-challenge/course/','https://gavinolearygh.github.io/TIPOS_V3.0/daily-challenge/'],
 ['https://gavinolearygh.github.io/TIPOS_V3.0/daily-challenge/course/releases/0.3.0-old/course/play.html?ace=2026-11-22','https://gavinolearygh.github.io/TIPOS_V3.0/daily-challenge/'],
 ['https://www.theirishpar.com/DailyChallenge/course/releases/old/course/play.html','https://www.theirishpar.com/DailyChallenge/'],
 ['https://www.theirishpar.com/DailyChallenge/','https://www.theirishpar.com/DailyChallenge/']]){
 const links=gameLinks(page);assert.equal(links.home,root);assert.equal(links.practice,root+'course/');assert.equal(links.player,root+'course/play.html');
 for(const mode of ['ace','three']){const link=new URL(links.leaderboard(mode));assert.equal(link.origin,new URL(page).origin);assert.equal(link.searchParams.get('board'),mode);assert.equal(link.hash,'#leaderboards');}
}
for(const path of ['course/index.html','course/home.mjs','course/play.html','course/play.mjs','daily/index.html','daily/home.mjs']){
 const source=readFileSync(path,'utf8');assert.ok(!source.includes('https://www.theirishpar.com'),path+' must not hardcode a live destination');
}
const html=readFileSync('course/play.html','utf8');assert.equal([...html.matchAll(/id="close-result"/g)].length,1);assert.ok(html.includes('class="result-heading"'));
console.log('Navigation passed: standalone/integrated/pinned GitHub and Namecheap routes stay on their own deployment; both leaderboard destinations and single modal close verified.');
