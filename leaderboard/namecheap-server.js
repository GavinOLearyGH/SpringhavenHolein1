const http=require('node:http');
const {Readable}=require('node:stream');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const mysql=require('mysql2/promise');

const mount='/DailyChallenge';
const publicOrigin=new URL(process.env.PUBLIC_ORIGIN||'https://www.theirishpar.com').origin;
const canonical=publicOrigin+mount+'/';
const db=mysql.createPool({
    host:process.env.DB_HOST||'127.0.0.1',
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database:process.env.DB_NAME,
    connectionLimit:4,
    flags:'-FOUND_ROWS',
    charset:'utf8mb4'
});
const service=import('./leaderboard.mjs');
const page=readFile(path.join(__dirname,'generated/public/index.html'),'utf8').then(html=>
    html.replaceAll('https://gavinolearygh.github.io/TIPOS_V3.0/daily-challenge/',canonical));
const saveScore=`
    INSERT INTO scores (day, player, name, ace, mm, posted, score_rank)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        name = IF(VALUES(score_rank) < score_rank, VALUES(name), name),
        ace = IF(VALUES(score_rank) < score_rank, VALUES(ace), ace),
        mm = IF(VALUES(score_rank) < score_rank, VALUES(mm), mm),
        posted = IF(VALUES(score_rank) < score_rank, VALUES(posted), posted),
        score_rank = LEAST(score_rank, VALUES(score_rank))`;
async function readBoard(day){
    const {boardResponse,topQuery,distributionQuery}=await service;
    const connection=await db.getConnection();
    try{
        await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await connection.beginTransaction();
        const [leaders]=await connection.execute(topQuery,[day]);
        const [summary]=await connection.execute(distributionQuery,[day]);
        await connection.commit();
        return boardResponse(day,leaders,summary[0]);
    }catch(error){
        await connection.rollback();
        throw error;
    }finally{
        connection.release();
    }
}
const store={
    read:readBoard,
    async save({day,player,name,ace,mm,posted}){
        // Update rank last so every assignment compares with the original score.
        const [result]=await db.execute(saveScore,[day,player,name,Number(ace),mm,posted,ace?0:mm+1]);
        return result.affectedRows>0;
    }
};
const server=http.createServer(async(req,res)=>{
    try{
        const url=new URL(req.url,publicOrigin);
        const route=url.pathname===mount?'/':url.pathname.startsWith(mount+'/')?url.pathname.slice(mount.length):url.pathname;
        if((route==='/'||route==='/api/leaderboard')&&
            (url.pathname===mount||req.headers.host?.toLowerCase()==='theirishpar.com')){
            res.writeHead(308,{Location:canonical+route.slice(1)+url.search});
            res.end();
            return;
        }
        if(route==='/api/leaderboard'){
            const {handleLeaderboard}=await service;
            const options={method:req.method,headers:req.headers};
            if(req.method==='POST'){
                options.body=Readable.toWeb(req);
                options.duplex='half';
            }
            const request=new Request(publicOrigin+mount+route,options);
            const result=await handleLeaderboard(request,store);
            res.writeHead(result.status,Object.fromEntries(result.headers));
            res.end(await result.text());
        }else if(route==='/'&&(req.method==='GET'||req.method==='HEAD')){
            const html=await page;
            res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache',
                'X-Content-Type-Options':'nosniff'});
            res.end(req.method==='HEAD'?undefined:html);
        }else{
            res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
            res.end('Not found');
        }
    }catch(error){
        console.error('Daily Challenge request failed',error.code||error.name);
        res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});
        res.end(JSON.stringify({error:'The Daily Challenge is temporarily unavailable.'}));
    }
});
Promise.all([service,page]).then(()=>server.listen(Number(process.env.PORT)||3000)).catch(error=>{
    console.error('Run node leaderboard/build.mjs before starting the app.',error.code||error.name);
    process.exitCode=1;
});
