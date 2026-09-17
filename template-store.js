(()=>{'use strict';
const TL=window.TaskLinerTemplates;
const CONFIG_KEY='taskliner_github_sync_config_v1',TOKEN_KEY='taskliner_github_sync_token_v1';
const RECENT_KEY='taskliner_master_recent_v1';
function cfg(){let saved={};try{saved=JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')}catch{};return{repo:String(saved.repo||'plzsayyes3/mynotebook'),branch:String(saved.branch||'main'),folder:String(saved.folder||'09_taskchute').replace(/^\/+|\/+$/g,''),token:String(localStorage.getItem(TOKEN_KEY)||'')}}
function splitRepo(repo){const p=repo.split('/').filter(Boolean);if(p.length!==2)throw new Error('Repository設定は owner/repo 形式が必要です');return p}
function headers(){const c=cfg(),h={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};if(c.token)h.Authorization=`Bearer ${c.token}`;return h}
function endpoint(path){const c=cfg(),[o,r]=splitRepo(c.repo);return`https://api.github.com/repos/${encodeURIComponent(o)}/${encodeURIComponent(r)}${path}`}
function decode(text){const bin=atob(String(text||'').replace(/\s/g,'')),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
function encode(text){const bytes=new TextEncoder().encode(text);let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin)}
async function gh(path,options={}){const r=await fetch(endpoint(path),{...options,headers:{...headers(),...(options.headers||{})}});if(r.status===404)return null;if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.message||`GitHub API ${r.status}`)}return r.json()}
function base(){return`${cfg().folder}/templates`}
function apiPath(path){return`/contents/${path.split('/').map(encodeURIComponent).join('/')}`}
async function listDir(path){const c=cfg();return await gh(`${apiPath(path)}?ref=${encodeURIComponent(c.branch)}`)||[]}
async function readFile(path){const c=cfg(),d=await gh(`${apiPath(path)}?ref=${encodeURIComponent(c.branch)}`);return d?.content?{text:decode(d.content),sha:d.sha}:null}
async function putFile(path,content,message){const c=cfg();if(!c.token)throw new Error('TaskLiner設定のGitHub Tokenが必要です');const current=await readFile(path);const body={message,content:encode(content),branch:c.branch};if(current?.sha)body.sha=current.sha;return gh(apiPath(path),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
async function loadCollection(sub,parser){let list=[];try{list=await listDir(`${base()}/${sub}`)}catch{return[]};if(!Array.isArray(list))return[];const out=[];for(const item of list.filter(x=>x.type==='file'&&/\.md$/i.test(x.name||''))){try{const file=await readFile(item.path),obj=parser(file?.text||'');if(obj.id)out.push({...obj,_path:item.path,_sha:item.sha})}catch(e){console.warn(item.path,e)}}return out}
async function loadMasters(){return loadCollection('masters',TL.parseMasterMarkdown)}
async function loadRepeats(){return loadCollection('repeats',TL.parseRepeatMarkdown)}
async function saveMaster(master){return putFile(`${base()}/masters/${master.id}.md`,TL.serializeMaster(master),`TaskLiner master: ${master.title}`)}
async function saveRepeat(repeat){return putFile(`${base()}/repeats/${repeat.id}.md`,TL.serializeRepeat(repeat),`TaskLiner repeat: ${repeat.id}`)}
function reviewMarkdown(review){return`---\ntype: task-master-review\nid: ${JSON.stringify(review.id)}\nsource_master_id: ${JSON.stringify(review.source_master_id)}\nstatus: ${JSON.stringify(review.status||'pending')}\ncandidate_master_ids:\n${(review.candidate_master_ids||[]).map(x=>`  - ${JSON.stringify(x)}`).join('\n')}\n---\n`}
function parseReview(text,path=''){const id=(text.match(/^id:\s*"?([^"\n]+)"?/m)||[])[1]||path.split('/').pop()?.replace(/\.md$/,'')||'';const source=(text.match(/^source_master_id:\s*"?([^"\n]+)"?/m)||[])[1]||'';const status=(text.match(/^status:\s*"?([^"\n]+)"?/m)||[])[1]||'pending';const block=(text.match(/^candidate_master_ids:\s*\n((?:\s+-.*\n?)*)/m)||[])[1]||'';const ids=[...block.matchAll(/^\s*-\s*"?([^"\n]+)"?/gm)].map(m=>m[1].trim());return{id:id.trim(),source_master_id:source.trim(),status:status.trim(),candidate_master_ids:ids,_path:path}}
async function loadReviews(){let list=[];try{list=await listDir(`${base()}/review`)}catch{return[]};if(!Array.isArray(list))return[];const out=[];for(const item of list.filter(x=>x.type==='file'&&/\.md$/i.test(x.name||''))){const f=await readFile(item.path);if(f?.text)out.push(parseReview(f.text,item.path))}return out}
async function saveReview(review){return putFile(`${base()}/review/${review.id}.md`,reviewMarkdown(review),`TaskLiner review: ${review.id}`)}
function recentIds(){try{return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]')}catch{return[]}}
function markRecent(masterId){if(!masterId)return;const ids=[masterId,...recentIds().filter(x=>x!==masterId)].slice(0,500);localStorage.setItem(RECENT_KEY,JSON.stringify(ids))}
function sortMastersRecent(masters){const pos=new Map(recentIds().map((id,i)=>[id,i]));return[...masters].sort((a,b)=>(pos.get(a.id)??999999)-(pos.get(b.id)??999999)||String(a.title).localeCompare(String(b.title),'ja'))}
async function createReviewFor(master,masters){const candidates=TL.findSimilarMasters(master.title,masters.filter(x=>x.id!==master.id)).slice(0,5);if(!candidates.length)return null;const review={id:TL.id('review'),source_master_id:master.id,status:'pending',candidate_master_ids:candidates.map(x=>x.master.id)};await saveReview(review);return review}
window.TaskLinerTemplateStore={cfg,base,listDir,readFile,putFile,loadMasters,loadRepeats,saveMaster,saveRepeat,loadReviews,saveReview,markRecent,sortMastersRecent,createReviewFor};
})();
