import {dayKey} from './generated/physics.mjs';
import {buildId} from './generated/public/core/build-info.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const engines=new Map();
function engineFor(build){
 if(!/^0\.3\.0-[a-f0-9]{10}$/.test(build))throw Error('Invalid engine version');
 if(!engines.has(build))engines.set(build,import('./generated/public/course/releases/'+build+'/core/competition.mjs'));
 return engines.get(build);
}
export async function handleThree(request,store,{today=dayKey(),currentBuild=buildId,loadEngine=engineFor}={}){
 try{
  if(request.method==='GET')return json(await store.read(today));
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Post from the game'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected JSON'},415);
  const decoder=new TextDecoder();let body='',bytes=0;for await(const chunk of request.body??[]){bytes+=chunk.byteLength;if(bytes>8192)return json({error:'Request too large'},413);body+=decoder.decode(chunk,{stream:true});}
  body+=decoder.decode();
  let input;try{input=JSON.parse(body);}catch{return json({error:'Invalid request'},400);}
  const validId=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);
  if(!validId(input.player)||!validId(input.id))return json({error:'Invalid player or attempt'},400);
  if(input.day!==today)return json({error:'This daily challenge has closed. Return to play today’s challenge.'},409);
  let session=await store.readAttempt(today,input.player);
  if(input.action==='start'){
   if(session)return json(session);
   if(input.build!==currentBuild)return json({error:'A new game version is available. Reload the Daily Challenge page.'},409);
   const engine=await loadEngine(currentBuild);
   session=await store.start(today,input.player,engine.newCompetition(today,currentBuild,input.id));return json(session);
  }
  if(!session||session.id!==input.id)return json({error:'Start or resume your official round first'},409);
  if(input.action==='shot'){
   if(!Number.isInteger(input.revision)||input.revision<0)return json({error:'Invalid round revision'},400);
   if(input.revision<session.revision)return json(session); // Lost response: return the saved result without playing twice.
   if(input.revision!==session.revision)return json({error:'Resume the latest saved round'},409);
   const engine=await loadEngine(session.build);let next;
   try{next=engine.applyCompetitionShot(session,input.shot??{});}catch(error){return json({error:error.message},422);}
   return json(await store.advance(today,input.player,session.revision,next,engine.totalScore(next)));
  }
  if(input.action==='publish'){
   const name=typeof input.name==='string'?input.name.trim().replace(/\s+/g,' '):'';
   if(!name||name.length>28||/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(name))return json({error:'Enter a display name of up to 28 characters'},400);
   if(session.status!=='completed')return json({error:'Complete all three holes before posting'},409);
   return json(await store.publish(today,input.player,name));
  }
  return json({error:'Unknown action'},400);
 }catch(error){console.error('three-hole scoring',error.code||error.name);return json({error:'Shared scoring is unavailable. Your last saved shot is retained; please retry.'},503);}
}
