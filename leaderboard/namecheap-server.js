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
const threeService=import('./three.mjs');
const page=readFile(path.join(__dirname,'generated/public/index.html'),'utf8').then(html=>
    html.replaceAll('https://gavinolearygh.github.io/TIPOS_V3.0/daily-challenge/',canonical));
async function readAttempt(day,player){
    const {attemptQuery}=await service;
    const [rows]=await db.execute(attemptQuery,[day,player]);
    return rows[0];
}
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
    readAttempt,
    async recordAttempt({day,player,id,outcome,ace,mm}){
        await db.execute(`
            INSERT INTO daily_attempts (day, player, id, outcome, ace, mm) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE id = daily_attempts.id`,[day,player,id,outcome,Number(ace),mm]);
        return readAttempt(day,player);
    },
    async publish({day,player,name,ace,mm,posted}){
        await db.execute(`
            INSERT INTO scores (day, player, name, ace, mm, posted, score_rank) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE player = scores.player`,[day,player,name,Number(ace),mm,posted,ace?0:mm+1]);
        const {publishedQuery}=await service;
        const [rows]=await db.execute(publishedQuery,[day,player]);
        return {name:rows[0].name};
    }
};
async function readThree(day,player){
    const [rows]=await db.execute('SELECT document, name FROM three_attempts WHERE day = ? AND player = ?',[day,player]);
    return rows[0]?{...JSON.parse(rows[0].document),...(rows[0].name?{name:rows[0].name}:{})}:null;
}
const threeStore={
    readAttempt:readThree,
    async start(day,player,session){
        await db.execute(`INSERT INTO three_attempts (day,player,id,revision,status,document) VALUES (?,?,?,0,'in-progress',?)
            ON DUPLICATE KEY UPDATE id=three_attempts.id`,[day,player,session.id,JSON.stringify(session)]);
        return readThree(day,player);
    },
    async advance(day,player,revision,session,total){
        await db.execute(`UPDATE three_attempts SET revision=?,status=?,document=?,total=?,tie_valid=?,tie_mm=?
            WHERE day=? AND player=? AND revision=?`,[session.revision,session.status,JSON.stringify(session),total,Number(session.tieValid),session.tieMM,day,player,revision]);
        return readThree(day,player);
    },
    async publish(day,player,name){
        await db.execute(`UPDATE three_attempts SET name=COALESCE(name,?),posted=COALESCE(posted,?)
            WHERE day=? AND player=? AND status='completed'`,[name,Date.now(),day,player]);
        return readThree(day,player);
    },
    async read(day){
        const [rows]=await db.execute(`SELECT name,total,tie_valid,tie_mm FROM three_attempts
            WHERE day=? AND status='completed' AND name IS NOT NULL
            ORDER BY total,tie_valid DESC,tie_mm,posted,player LIMIT 50`,[day]);
        const [distribution]=await db.execute(`SELECT total,COUNT(*) AS count FROM three_attempts
            WHERE day=? AND status='completed' AND name IS NOT NULL GROUP BY total`,[day]);
        return {day,leaders:rows.map(row=>({name:row.name,total:Number(row.total),tieValid:Boolean(row.tie_valid),tieMM:row.tie_mm===null?null:Number(row.tie_mm)})),
            distribution:distribution.map(row=>({total:Number(row.total),count:Number(row.count)})),total:distribution.reduce((sum,row)=>sum+Number(row.count),0)};
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
        if(route==='/api/leaderboard'||route==='/api/three'){
            const {handleLeaderboard}=await service;
            const options={method:req.method,headers:req.headers};
            if(req.method==='POST'){
                options.body=Readable.toWeb(req);
                options.duplex='half';
            }
            const request=new Request(publicOrigin+mount+route,options);
            const result=route==='/api/three'?await (await threeService).handleThree(request,threeStore):await handleLeaderboard(request,store);
            res.writeHead(result.status,Object.fromEntries(result.headers));
            res.end(await result.text());
        }else if((req.method==='GET'||req.method==='HEAD')&&!route.startsWith('/api/')){
            const root=path.join(__dirname,'generated/public');
            const relative=decodeURIComponent(route==='/'?'/index.html':route.endsWith('/')?route+'index.html':route);
            const file=path.resolve(root,'.'+relative);
            if(!file.startsWith(root+path.sep))throw Object.assign(Error('Invalid asset path'),{code:'ENOENT'});
            try{
                const data=await readFile(file),ext=path.extname(file);
                const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
                if(!types[ext]){res.writeHead(404);res.end();return;}
                res.writeHead(200,{'Content-Type':types[ext],'Cache-Control':route.includes('/releases/')?'public,max-age=31536000,immutable':'no-cache','X-Content-Type-Options':'nosniff'});
                res.end(req.method==='HEAD'?undefined:data);
            }catch(error){if(error.code!=='ENOENT')throw error;res.writeHead(404);res.end('Not found');}
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
Promise.all([service,page,threeService]).then(()=>server.listen(Number(process.env.PORT)||3000)).catch(error=>{
    console.error('Run node leaderboard/build.mjs before starting the app.',error.code||error.name);
    process.exitCode=1;
});

module.exports=server;
