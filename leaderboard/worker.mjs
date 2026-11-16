import {dayKey,clubs,replayDailyShot} from './generated/physics.mjs';

const endpoint='/api/leaderboard';
const json=(data,status=200)=>Response.json(data,{status,
    headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

async function readShot(request){
    if(!request.body)return null;
    const reader=request.body.getReader(),decoder=new TextDecoder();
    let source='',length=0;
    while(true){
        const {done,value}=await reader.read();
        if(done)break;
        length+=value.byteLength;
        if(length>2048){await reader.cancel();return null;}
        source+=decoder.decode(value,{stream:true});
    }
    try{return JSON.parse(source+decoder.decode());}catch{return null;}
}
async function board(db,day){
    const [top,distribution]=await db.batch([
        db.prepare(`
            SELECT name, ace, mm
            FROM scores WHERE day = ?
            ORDER BY ace DESC, mm, posted, player
            LIMIT 25`).bind(day),
        db.prepare(`
            SELECT
                COUNT(*) AS total,
                COUNT(CASE WHEN ace = 1 THEN 1 END) AS aces,
                COUNT(CASE WHEN ace = 0 AND mm < 914.4 THEN 1 END) AS inside_three,
                COUNT(CASE WHEN ace = 0 AND mm >= 914.4 AND mm < 3048 THEN 1 END) AS inside_ten,
                COUNT(CASE WHEN ace = 0 AND mm >= 3048 AND mm < 7620 THEN 1 END) AS inside_twenty_five,
                COUNT(CASE WHEN ace = 0 AND mm >= 7620 THEN 1 END) AS farther
            FROM scores WHERE day = ?`).bind(day)
    ]);
    const d=distribution.results[0];
    return {day,leaders:top.results.map(row=>({...row,ace:Boolean(row.ace)})),
        total:d.total,counts:[d.aces,d.inside_three,d.inside_ten,d.inside_twenty_five,d.farther]};
}
export default {
    async fetch(request,env){
        const url=new URL(request.url);
        if(url.pathname!==endpoint)return env.ASSETS.fetch(request);
        try{
            const day=dayKey();
            if(request.method==='GET')return json(await board(env.DB,day));
            if(request.method!=='POST')return json({error:'Method not allowed.'},405);
            const origin=request.headers.get('Origin');
            if(origin&&origin!==url.origin)return json({error:'Post from the game.'},403);
            if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected JSON.'},415);
            const shot=await readShot(request);
            const name=typeof shot?.name==='string'?shot.name.trim().replace(/\s+/g,' '):'';
            if(!name||name.length>28||/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(name)||
                typeof shot.player!=='string'||!(/^[a-f0-9]{32}$/).test(shot.player)||
                !Object.hasOwn(clubs,shot.club)||!Number.isFinite(shot.power)||shot.power<.025||shot.power>1||
                Math.abs(shot.power*2000-Math.round(shot.power*2000))>.000001||
                !Number.isFinite(shot.heading)||Math.abs(shot.heading)>Math.PI){
                return json({error:'Invalid shot or display name.'},400);
            }
            if(shot.day!==day)return json({error:'This daily challenge has closed. Play today’s challenge.'},409);
            const result=replayDailyShot(day,shot.club,shot.power,shot.heading);
            if(!result)return json({error:'Only shots that finish in play can be posted.'},422);
            const mm=Math.round(result.distance*1000);
            const change=await env.DB.prepare(`
                INSERT INTO scores (day, player, name, ace, mm, posted) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(day, player) DO UPDATE SET
                    name = excluded.name, ace = excluded.ace, mm = excluded.mm, posted = excluded.posted
                WHERE excluded.ace > scores.ace OR (excluded.ace = scores.ace AND excluded.mm < scores.mm)
            `).bind(day,shot.player,name,Number(result.ace),mm,Date.now()).run();
            return json({ace:result.ace,mm,improved:change.meta.changes>0});
        }catch(error){
            console.error('leaderboard',error);
            return json({error:'Shared scoring is temporarily unavailable.'},503);
        }
    }
};
