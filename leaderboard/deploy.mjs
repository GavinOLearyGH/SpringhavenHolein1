import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const directory=fileURLToPath(new URL('.',import.meta.url));
const configPath=new URL('./wrangler.json',import.meta.url);
const examplePath=new URL('./wrangler.example.json',import.meta.url);
const npm=process.env.npm_execpath;
if(!npm)throw new Error('Run npm --prefix leaderboard run deploy from the repository root.');

function wrangler(args,capture=false){
    const result=spawnSync(process.execPath,
        [npm,'exec','--yes','--package=wrangler@4','--','wrangler',...args],{
            cwd:directory,encoding:'utf8',stdio:capture?['inherit','pipe','inherit']:'inherit'
        });
    if(result.error)throw result.error;
    if(result.status!==0)throw new Error('Wrangler '+args.slice(0,2).join(' ')+' failed.');
    return result.stdout;
}

if(process.argv.includes('--login'))wrangler(['login']);

if(!existsSync(configPath)){
    const config=JSON.parse(await readFile(examplePath,'utf8'));
    const binding=config.d1_databases.find(database=>database.binding==='DB');
    const name=binding.database_name;
    const lookup=()=>JSON.parse(wrangler(['d1','list','--json'],true)).find(database=>database.name===name);
    let database=lookup();
    if(!database){
        wrangler(['d1','create',name]);
        database=lookup();
    }
    if(!database?.uuid)throw new Error('Could not find the UUID for '+name+'.');
    binding.database_id=database.uuid;
    await writeFile(configPath,JSON.stringify(config,null,2)+'\n',{flag:'wx'});
}

await import('./build.mjs');
wrangler(['d1','migrations','apply','DB','--remote','--config','wrangler.json']);
wrangler(['deploy','--config','wrangler.json']);
console.log('Open the Worker URL printed above on both devices to test shared scoring.');
