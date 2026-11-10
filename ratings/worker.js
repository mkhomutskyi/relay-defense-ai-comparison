const allowedGames=new Set(['qwen27','qwen-native','qwen-strata','glm-strata','deepseek-pi','deepseek-graphify']);
const categories=['overall','visuals','fun','sound'];
function response(body,status=200,origin=''){const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};if(origin){headers['Access-Control-Allow-Origin']=origin;headers.Vary='Origin'}return new Response(JSON.stringify(body),{status,headers})}
function allowedOrigin(request,env){const origin=request.headers.get('Origin');if(!origin)return '';const origins=(env.ALLOWED_ORIGINS||'').split(',').map(v=>v.trim());return origins.includes(origin)?origin:null}
function validGame(game,version){return allowedGames.has(game)&&version==='20261109-frozen-v1'}
export default{
 async fetch(request,env){
  const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  const origin=allowedOrigin(request,env);if(origin===null)return response({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin||'null','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600',Vary:'Origin'}});
  try{
   if(request.method==='GET'&&url.pathname==='/api/ratings'){
    const game=url.searchParams.get('game'),version=url.searchParams.get('version');if(!validGame(game,version))return response({error:'Unknown game version'},400,origin);
    const results={};for(const category of categories){const row=await env.DB.prepare(`SELECT count(${category}) AS count, avg(${category}) AS average FROM votes WHERE game=? AND version=?`).bind(game,version).first();results[category]={count:row.count,average:row.average}}
    return response({game,version,ratings:results},200,origin);
   }
   if(request.method==='POST'&&url.pathname==='/api/vote'){
    if(!origin)return response({error:'A supported browser origin is required'},403);
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return response({error:'JSON required'},415,origin);
    const reader=request.body?.getReader();if(!reader)return response({error:'Body required'},400,origin);let chunks=[],length=0;
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2048){await reader.cancel();return response({error:'Body too large'},413,origin)}chunks.push(value)}
    const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length}
    let body;try{body=JSON.parse(new TextDecoder().decode(bytes))}catch{return response({error:'Invalid JSON'},400,origin)}
    const {game,version,token,ratings}=body||{};
    if(!validGame(game,version)||typeof token!=='string'||!/^[-a-zA-Z0-9]{20,80}$/.test(token)||!ratings||typeof ratings!=='object'||Array.isArray(ratings)||!Number.isInteger(ratings.overall)||ratings.overall<1||ratings.overall>5)return response({error:'Invalid vote'},400,origin);
    if(Object.keys(ratings).some(k=>!categories.includes(k))||categories.some(k=>ratings[k]!==undefined&&(!Number.isInteger(ratings[k])||ratings[k]<1||ratings[k]>5)))return response({error:'Stars must be integers from 1 to 5'},400,origin);
    const tokenHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
    const prior=await env.DB.prepare('SELECT updated_at FROM votes WHERE game=? AND version=? AND voter=?').bind(game,version,tokenHash).first();
    const now=Math.floor(Date.now()/1000);if(prior&&now-prior.updated_at<2)return response({error:'Please wait before updating'},429,origin);
    await env.DB.prepare('INSERT INTO votes(game,version,voter,overall,visuals,fun,sound,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(game,version,voter) DO UPDATE SET overall=excluded.overall,visuals=excluded.visuals,fun=excluded.fun,sound=excluded.sound,updated_at=excluded.updated_at').bind(game,version,tokenHash,ratings.overall,ratings.visuals??null,ratings.fun??null,ratings.sound??null,now).run();
    return response({saved:true},200,origin);
   }
   return response({error:'Not found'},404,origin);
  }catch{return response({error:'Rating service unavailable'},503,origin)}
 }
};
