import {boardResponse,distributionQuery,handleLeaderboard,topQuery} from './leaderboard.mjs';

export default {
    async fetch(request,env){
        if(new URL(request.url).pathname!=='/api/leaderboard')return env.ASSETS.fetch(request);
        const store={
            async read(day){
                const [top,distribution]=await env.DB.batch([
                    env.DB.prepare(topQuery).bind(day),
                    env.DB.prepare(distributionQuery).bind(day)
                ]);
                return boardResponse(day,top.results,distribution.results[0]);
            },
            async save({day,player,name,ace,mm,posted}){
                const change=await env.DB.prepare(`
                    INSERT INTO scores (day, player, name, ace, mm, posted) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(day, player) DO UPDATE SET
                    name = excluded.name, ace = excluded.ace, mm = excluded.mm, posted = excluded.posted
                WHERE excluded.ace > scores.ace OR (excluded.ace = scores.ace AND excluded.mm < scores.mm)`
                ).bind(day,player,name,Number(ace),mm,posted).run();
                return change.meta.changes>0;
            }
        };
        return handleLeaderboard(request,store);
    }
};
