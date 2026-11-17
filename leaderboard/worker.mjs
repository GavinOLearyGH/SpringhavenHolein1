import {attemptQuery,publishedQuery,boardResponse,distributionQuery,handleLeaderboard,topQuery} from './leaderboard.mjs';

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
            async readAttempt(day,player){
                return env.DB.prepare(attemptQuery).bind(day,player).first();
            },
            async recordAttempt({day,player,id,outcome,ace,mm}){
                await env.DB.prepare(`
                    INSERT INTO daily_attempts (day, player, id, outcome, ace, mm) VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(day, player) DO NOTHING`).bind(day,player,id,outcome,Number(ace),mm).run();
                return this.readAttempt(day,player);
            },
            async publish({day,player,name,ace,mm,posted}){
                await env.DB.prepare(`
                    INSERT INTO scores (day, player, name, ace, mm, posted) VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(day, player) DO NOTHING`).bind(day,player,name,Number(ace),mm,posted).run();
                const result=await env.DB.prepare(publishedQuery).bind(day,player).first();
                return {name:result.name};
            }
        };
        return handleLeaderboard(request,store);
    }
};
