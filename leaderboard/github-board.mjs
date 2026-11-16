import {writeFile} from 'node:fs/promises';
import {clubs,dayKey,replayDailyShot} from './generated/physics.mjs';

const {GITHUB_REPOSITORY,GH_TOKEN}=process.env;
const title='Today’s Ace score';
const today=dayKey();
const since=new Date(Date.now()-48*60*60*1000).toISOString();
const replayed=new Map();
const best=new Map();
for(let page=1;;page++){
    const url=new URL('https://api.github.com/repos/'+GITHUB_REPOSITORY+'/issues');
    url.search=new URLSearchParams({state:'all',since,per_page:'100',page:String(page)});
    const response=await fetch(url,{headers:{Authorization:'Bearer '+GH_TOKEN,Accept:'application/vnd.github+json'}});
    if(!response.ok)throw Error('GitHub Issues returned '+response.status);
    const issues=await response.json();
    for(const issue of issues){
        if(issue.title!==title||issue.pull_request||!issue.user||issue.user.type!=='User'||
            dayKey(new Date(issue.created_at))!==today||typeof issue.body!=='string'||issue.body.length>1024)continue;
        let shot;
        try{shot=JSON.parse(issue.body);}catch{continue;}
        const name=typeof shot?.name==='string'?shot.name.trim().replace(/\s+/g,' '):'';
        if(!name||name.length>28||/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(name)||
            shot.day!==today||!Object.hasOwn(clubs,shot.club)||!Number.isFinite(shot.power)||
            shot.power<.025||shot.power>1||Math.abs(shot.power*2000-Math.round(shot.power*2000))>.000001||
            !Number.isFinite(shot.heading)||Math.abs(shot.heading)>Math.PI)continue;
        const key=JSON.stringify([shot.club,shot.power,shot.heading]);
        if(!replayed.has(key))replayed.set(key,replayDailyShot(today,shot.club,shot.power,shot.heading));
        const result=replayed.get(key);
        if(!result)continue;
        const score={name,ace:result.ace,mm:Math.round(result.distance*1000),issue:issue.number};
        const previous=best.get(issue.user.id);
        if(!previous||rank(score,previous)<0)best.set(issue.user.id,score);
    }
    if(issues.length<100)break;
}
function rank(a,b){return Number(b.ace)-Number(a.ace)||a.mm-b.mm||a.issue-b.issue;}
const scores=[...best.values()].sort(rank);
const counts=[0,0,0,0,0];
for(const score of scores)counts[score.ace?0:score.mm<914.4?1:score.mm<3048?2:score.mm<7620?3:4]++;
const board={day:today,total:scores.length,counts,leaders:scores.slice(0,25).map(({name,ace,mm})=>({name,ace,mm}))};
await writeFile(new URL('./results.json',import.meta.url),JSON.stringify(board,null,2)+'\n');
