(()=>{'use strict';
const FRAME_ID='app';
const CONFIG_KEY='taskliner_github_sync_config_v1';
const TOKEN_KEY='taskliner_github_sync_token_v1';
const DEFAULT_REPO='plzsayyes3/mynotebook';
const DEFAULT_BRANCH='main';
const treeCache=new Map();
const noteCache=new Map();
const resolutionCache=new Map();
let activeRequest=0;

const norm=value=>{
  let text=String(value||'').trim();
  try{text=decodeURIComponent(text)}catch{}
  return text.normalize('NFC').replace(/\\/g,'/').replace(/^\/+|\/+$/g,'').replace(/\.md$/i,'').toLocaleLowerCase('ja');
};
const headingNorm=value=>String(value||'').normalize('NFC').trim().toLocaleLowerCase('ja').replace(/[\s　]+/g,' ').replace(/[\[\]#*_`~]/g,'');
function config(){
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')}catch{}
  const repo=String(saved.repo||DEFAULT_REPO).trim()||DEFAULT_REPO;
  const branch=String(saved.branch||DEFAULT_BRANCH).trim()||DEFAULT_BRANCH;
  const token=String(localStorage.getItem(TOKEN_KEY)||'').trim();
  return{repo,branch,token};
}
function splitRepo(repo){
  const parts=String(repo||'').split('/').filter(Boolean);
  if(parts.length!==2)throw new Error('GitHub設定のRepositoryは owner/repo 形式にしてください');
  return parts;
}
function apiHeaders(){
  const {token}=config();
  const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  if(token)headers.Authorization=`Bearer ${token}`;
  return headers;
}
function endpoint(path=''){
  const {repo}=config(),[owner,name]=splitRepo(repo);
  return`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}${path}`;
}
async function fetchJson(url){
  const response=await fetch(url,{headers:apiHeaders()});
  if(!response.ok){
    const data=await response.json().catch(()=>({}));
    const error=new Error(data.message||`GitHub API ${response.status}`);
    error.status=response.status;
    throw error;
  }
  return response.json();
}
function repositoryKey(){const {repo,branch}=config();return`${repo}@${branch}`}
async function noteIndex(){
  const key=repositoryKey();
  if(treeCache.has(key))return treeCache.get(key);
  const {branch}=config();
  const data=await fetchJson(endpoint(`/git/trees/${encodeURIComponent(branch)}?recursive=1`));
  const entries=(Array.isArray(data.tree)?data.tree:[])
    .filter(item=>item.type==='blob'&&/\.md$/i.test(item.path||''))
    .map(item=>{
      const path=String(item.path||'');
      const withoutExt=path.replace(/\.md$/i,'');
      const parts=withoutExt.split('/');
      return{path,sha:item.sha,fullKey:norm(withoutExt),baseKey:norm(parts[parts.length-1]),base:parts[parts.length-1]};
    });
  const index={entries,truncated:!!data.truncated};
  treeCache.set(key,index);
  return index;
}
function parseWiki(raw){
  const source=String(raw||'').trim().replace(/^\[\[|\]\]$/g,'');
  const pipe=source.indexOf('|');
  const targetWithHeading=(pipe>=0?source.slice(0,pipe):source).trim();
  const alias=(pipe>=0?source.slice(pipe+1):'').trim();
  const hash=targetWithHeading.indexOf('#');
  const target=(hash>=0?targetWithHeading.slice(0,hash):targetWithHeading).trim();
  const heading=(hash>=0?targetWithHeading.slice(hash+1):'').trim();
  const display=alias||target.split('/').pop()||targetWithHeading||source;
  return{raw:source,target,heading,alias,display};
}
async function resolveWiki(parsed){
  if(!parsed.target)throw new Error('このWikiLinkは対象ノート名を持っていません');
  const key=`${repositoryKey()}|${norm(parsed.target)}`;
  const cachedPath=resolutionCache.get(key);
  const index=await noteIndex();
  if(cachedPath){const cached=index.entries.find(entry=>entry.path===cachedPath);if(cached)return{entry:cached,index}}
  const targetKey=norm(parsed.target);
  let candidates=[];
  if(/[\\/]/.test(parsed.target))candidates=index.entries.filter(entry=>entry.fullKey===targetKey);
  if(!candidates.length)candidates=index.entries.filter(entry=>entry.baseKey===targetKey);
  if(candidates.length===1){resolutionCache.set(key,candidates[0].path);return{entry:candidates[0],index}}
  return{candidates,index,cacheKey:key};
}
function decodeBlob(content){
  const binary=atob(String(content||'').replace(/\s/g,''));
  const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
async function fetchNote(entry){
  const key=`${repositoryKey()}|${entry.sha}`;
  if(noteCache.has(key))return noteCache.get(key);
  const data=await fetchJson(endpoint(`/git/blobs/${encodeURIComponent(entry.sha)}`));
  if(data.encoding!=='base64'||!data.content)throw new Error('Markdown本文を取得できませんでした');
  const text=decodeBlob(data.content);
  noteCache.set(key,text);
  return text;
}

function ensureUi(){
  if(document.getElementById('wikiPreview'))return;
  const style=document.createElement('style');
  style.id='taskliner-wiki-preview-style';
  style.textContent=`
    .wiki-preview-backdrop{position:fixed;inset:0;z-index:80;background:rgba(17,24,27,.22);backdrop-filter:blur(1.5px);opacity:0;pointer-events:none;transition:opacity .18s ease}
    .wiki-preview-backdrop.open{opacity:1;pointer-events:auto}
    .wiki-preview{position:fixed;z-index:81;top:0;right:0;width:min(560px,44vw);height:100dvh;box-sizing:border-box;background:#fff;color:#20272b;border-left:1px solid #d8e0e3;box-shadow:-18px 0 50px rgba(24,40,46,.16);transform:translateX(102%);transition:transform .2s ease;display:flex;flex-direction:column}
    .wiki-preview.open{transform:translateX(0)}
    .wiki-preview-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start;padding:15px 16px 12px;border-bottom:1px solid #e1e6e8;background:#fff}
    .wiki-preview-title{font-size:16px;font-weight:800;line-height:1.35;overflow-wrap:anywhere}.wiki-preview-path{margin-top:4px;color:#768188;font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
    .wiki-preview-close{border:1px solid #d8e0e3;background:#fff;color:#394247;border-radius:9px;width:34px;height:34px;font-size:20px;line-height:1;cursor:pointer}
    .wiki-preview-body{flex:1;overflow:auto;padding:18px 20px 42px;overscroll-behavior:contain;font-size:14px;line-height:1.72}
    .wiki-preview-body h1,.wiki-preview-body h2,.wiki-preview-body h3,.wiki-preview-body h4,.wiki-preview-body h5,.wiki-preview-body h6{line-height:1.35;margin:1.3em 0 .55em}.wiki-preview-body h1{font-size:1.55em}.wiki-preview-body h2{font-size:1.32em;border-bottom:1px solid #e7ebed;padding-bottom:.28em}.wiki-preview-body h3{font-size:1.15em}
    .wiki-preview-body p{margin:.7em 0}.wiki-preview-body ul,.wiki-preview-body ol{padding-left:1.45em;margin:.7em 0}.wiki-preview-body li{margin:.2em 0}.wiki-preview-body blockquote{margin:.8em 0;padding:.15em .9em;border-left:3px solid #b7cbd1;color:#5d686e;background:#f6f9fa}.wiki-preview-body pre{overflow:auto;padding:11px 12px;background:#f4f7f8;border:1px solid #e0e6e8;border-radius:9px;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}.wiki-preview-body code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f1f4f5;padding:.08em .3em;border-radius:4px}.wiki-preview-body pre code{background:transparent;padding:0}.wiki-preview-body hr{border:0;border-top:1px solid #e0e5e7;margin:1.2em 0}.wiki-preview-body a{color:#416873;text-decoration:underline;text-underline-offset:2px}.wiki-preview-body .wiki-note-link{font-weight:700}.wiki-preview-body input[type=checkbox]{margin-right:.45em;accent-color:#416873}.wiki-preview-state{padding:18px 4px;color:#68747a}.wiki-preview-error{color:#8d4b52}.wiki-preview-candidates{display:flex;flex-direction:column;gap:7px;margin-top:12px}.wiki-preview-candidate{display:block;width:100%;text-align:left;border:1px solid #d8e0e3;background:#f8fafb;color:#263136;border-radius:9px;padding:10px 11px;cursor:pointer;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
    html.taskliner-terminal .wiki-preview{border-color:#111;box-shadow:none;color:#111}.taskliner-terminal .wiki-preview-head,.taskliner-terminal .wiki-preview-close{border-color:#111;background:#fff;color:#111}.taskliner-terminal .wiki-preview-body h2{border-color:#111}.taskliner-terminal .wiki-preview-body a{color:#111}.taskliner-terminal .wiki-preview-candidate{border-radius:0;border-color:#111;background:#fff;color:#111}
    @media(max-width:720px){.wiki-preview-backdrop{background:rgba(17,24,27,.3)}.wiki-preview{top:auto;right:0;bottom:0;width:100%;height:min(80dvh,720px);border-left:0;border-top:1px solid #d8e0e3;border-radius:16px 16px 0 0;box-shadow:0 -18px 50px rgba(24,40,46,.18);transform:translateY(102%)}.wiki-preview.open{transform:translateY(0)}.wiki-preview-head{padding:13px 14px 10px;border-radius:16px 16px 0 0}.wiki-preview-body{padding:15px 16px 34px;font-size:15px}}
  `;
  document.head.append(style);
  const backdrop=document.createElement('div');backdrop.id='wikiPreviewBackdrop';backdrop.className='wiki-preview-backdrop';
  const panel=document.createElement('aside');panel.id='wikiPreview';panel.className='wiki-preview';panel.setAttribute('aria-label','ノートプレビュー');panel.innerHTML='<header class="wiki-preview-head"><div><div id="wikiPreviewTitle" class="wiki-preview-title">ノート</div><div id="wikiPreviewPath" class="wiki-preview-path"></div></div><button id="wikiPreviewClose" class="wiki-preview-close" type="button" aria-label="閉じる">×</button></header><div id="wikiPreviewBody" class="wiki-preview-body"></div>';
  document.body.append(backdrop,panel);
  backdrop.addEventListener('click',closePreview);
  panel.querySelector('#wikiPreviewClose').addEventListener('click',closePreview);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel.classList.contains('open'))closePreview()});
}
function openPanel(){ensureUi();document.getElementById('wikiPreviewBackdrop').classList.add('open');document.getElementById('wikiPreview').classList.add('open')}
function closePreview(){document.getElementById('wikiPreviewBackdrop')?.classList.remove('open');document.getElementById('wikiPreview')?.classList.remove('open')}
function setPreview(title,path,node){
  ensureUi();
  document.getElementById('wikiPreviewTitle').textContent=title||'ノート';
  document.getElementById('wikiPreviewPath').textContent=path||'';
  const body=document.getElementById('wikiPreviewBody');body.replaceChildren(node);
}
function stateNode(message,isError=false){const node=document.createElement('div');node.className=`wiki-preview-state${isError?' wiki-preview-error':''}`;node.textContent=message;return node}

function safeUrl(raw){
  const value=String(raw||'').trim();
  if(!value||/^(?:javascript|data|vbscript):/i.test(value))return'';
  return /^(?:https?:\/\/|[a-z][a-z0-9+.-]*:)/i.test(value)?value:'';
}
function appendInline(root,text){
  const source=String(text||'');
  const pattern=/\[\[([^\]]+)\]\]|\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|(https?:\/\/[^\s<]+)/gi;
  let last=0,match;
  while((match=pattern.exec(source))){
    if(match.index>last)root.append(document.createTextNode(source.slice(last,match.index)));
    if(match[1]!==undefined){
      const parsed=parseWiki(match[1]),link=document.createElement('a');link.href='#';link.className='wiki-note-link';link.textContent=parsed.display;link.title=`[[${parsed.raw}]]`;link.addEventListener('click',event=>{event.preventDefault();openWiki(parsed.raw)});root.append(link);
    }else if(match[2]!==undefined){
      const target=safeUrl(match[3]);
      if(target){const link=document.createElement('a');link.href=target;link.textContent=match[2];if(/^https?:\/\//i.test(target)){link.target='_blank';link.rel='noopener noreferrer'}root.append(link)}else root.append(document.createTextNode(match[0]));
    }else if(match[4]!==undefined){const code=document.createElement('code');code.textContent=match[4];root.append(code)}
    else{const link=document.createElement('a');link.href=match[5];link.textContent=match[5];link.target='_blank';link.rel='noopener noreferrer';root.append(link)}
    last=pattern.lastIndex;
  }
  if(last<source.length)root.append(document.createTextNode(source.slice(last)));
}
function renderMarkdown(markdown){
  let source=String(markdown||'').replace(/\r\n?/g,'\n');
  if(source.startsWith('---\n')){const end=source.indexOf('\n---\n',4);if(end>=0)source=source.slice(end+5)}
  const root=document.createElement('div'),lines=source.split('\n');
  let paragraph=[],list=null,listType='',codeLines=null,codeLang='';
  const flushParagraph=()=>{if(!paragraph.length)return;const p=document.createElement('p');appendInline(p,paragraph.join(' ').trim());root.append(p);paragraph=[]};
  const flushList=()=>{if(list){root.append(list);list=null;listType=''}};
  const flushCode=()=>{if(codeLines===null)return;const pre=document.createElement('pre'),code=document.createElement('code');if(codeLang)code.dataset.language=codeLang;code.textContent=codeLines.join('\n');pre.append(code);root.append(pre);codeLines=null;codeLang=''};
  for(const line of lines){
    const fence=line.match(/^\s*```\s*([^\s]*)\s*$/);
    if(codeLines!==null){if(fence){flushCode()}else codeLines.push(line);continue}
    if(fence){flushParagraph();flushList();codeLines=[];codeLang=fence[1]||'';continue}
    if(!line.trim()){flushParagraph();flushList();continue}
    let match;
    if((match=line.match(/^(#{1,6})\s+(.+)$/))){flushParagraph();flushList();const level=match[1].length,h=document.createElement(`h${level}`);appendInline(h,match[2].trim());h.dataset.wikiHeading=headingNorm(match[2]);root.append(h);continue}
    if(/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)){flushParagraph();flushList();root.append(document.createElement('hr'));continue}
    if((match=line.match(/^\s*>\s?(.*)$/))){flushParagraph();flushList();const quote=document.createElement('blockquote');appendInline(quote,match[1]);root.append(quote);continue}
    if((match=line.match(/^\s*[-*+]\s+(?:\[([ xX])\]\s+)?(.*)$/))){flushParagraph();if(listType!=='ul'){flushList();list=document.createElement('ul');listType='ul'}const li=document.createElement('li');if(match[1]!==undefined){const cb=document.createElement('input');cb.type='checkbox';cb.disabled=true;cb.checked=/x/i.test(match[1]);li.append(cb)}appendInline(li,match[2]);list.append(li);continue}
    if((match=line.match(/^\s*\d+[.)]\s+(.*)$/))){flushParagraph();if(listType!=='ol'){flushList();list=document.createElement('ol');listType='ol'}const li=document.createElement('li');appendInline(li,match[1]);list.append(li);continue}
    paragraph.push(line.trim());
  }
  flushParagraph();flushList();if(codeLines!==null)flushCode();
  return root;
}
function scrollToHeading(body,heading){
  if(!heading)return;
  const wanted=headingNorm(heading);
  requestAnimationFrame(()=>{const target=[...body.querySelectorAll('[data-wiki-heading]')].find(el=>el.dataset.wikiHeading===wanted);if(target)target.scrollIntoView({block:'start'})});
}
function candidateNode(parsed,result,requestId){
  const wrap=document.createElement('div');
  const text=document.createElement('div');text.className='wiki-preview-state';text.textContent=result.candidates.length?'同名ノートが複数あります。表示するノートを選んでください。':result.index.truncated?'ノートを見つけられませんでした。GitHubのRepository treeが途中で省略されているため、索引が不完全な可能性があります。':'ノートを見つけられませんでした。';wrap.append(text);
  if(result.candidates.length){const list=document.createElement('div');list.className='wiki-preview-candidates';for(const entry of result.candidates){const button=document.createElement('button');button.type='button';button.className='wiki-preview-candidate';button.textContent=entry.path;button.addEventListener('click',async()=>{resolutionCache.set(result.cacheKey,entry.path);await showResolvedNote(parsed,entry,requestId)});list.append(button)}wrap.append(list)}
  return wrap;
}
async function showResolvedNote(parsed,entry,requestId){
  setPreview(parsed.display,entry.path,stateNode('読み込み中…'));
  try{
    const text=await fetchNote(entry);if(requestId!==activeRequest)return;
    const rendered=renderMarkdown(text);setPreview(parsed.display,entry.path,rendered);scrollToHeading(document.getElementById('wikiPreviewBody'),parsed.heading);
  }catch(error){if(requestId!==activeRequest)return;setPreview(parsed.display,entry.path,stateNode(`読み込みに失敗しました: ${error.message}`,true))}
}
async function openWiki(raw){
  const parsed=parseWiki(raw),requestId=++activeRequest;openPanel();setPreview(parsed.display,'',stateNode('ノートを探しています…'));
  try{
    const result=await resolveWiki(parsed);if(requestId!==activeRequest)return;
    if(result.entry){await showResolvedNote(parsed,result.entry,requestId);return}
    setPreview(parsed.display,'',candidateNode(parsed,result,requestId));
  }catch(error){if(requestId!==activeRequest)return;const hint=(error.status===401||error.status===403||error.status===404)?' GitHub設定のRepository / Branch / Tokenも確認してください。':'';setPreview(parsed.display,'',stateNode(`ノートを開けませんでした: ${error.message}${hint}`,true))}
}

function installFrameStyle(doc){
  if(doc.getElementById('taskliner-wikilink-style'))return;
  const style=doc.createElement('style');style.id='taskliner-wikilink-style';style.textContent='.task-wikilink{color:var(--accent)!important;text-decoration:underline;text-decoration-style:dotted;text-decoration-thickness:1px;text-underline-offset:3px;cursor:pointer;font-weight:inherit}.task.running.time-progress-dark .task-wikilink{color:#fff!important}';doc.head.append(style);
}
function decorateTextNode(node,doc){
  const text=node.nodeValue||'';if(!text.includes('[['))return;
  const pattern=/\[\[([^\]]+)\]\]/g,fragment=doc.createDocumentFragment();let last=0,match,changed=false;
  while((match=pattern.exec(text))){changed=true;if(match.index>last)fragment.append(doc.createTextNode(text.slice(last,match.index)));const parsed=parseWiki(match[1]),link=doc.createElement('a');link.href='#';link.className='task-wikilink';link.textContent=parsed.display;link.title=`[[${parsed.raw}]]`;link.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openWiki(parsed.raw)});fragment.append(link);last=pattern.lastIndex}
  if(!changed)return;if(last<text.length)fragment.append(doc.createTextNode(text.slice(last)));node.replaceWith(fragment);
}
function decorateContainer(container,doc){
  const walker=doc.createTreeWalker(container,NodeFilter.SHOW_TEXT,{acceptNode(node){const parent=node.parentElement;if(!parent||!node.nodeValue?.includes('[['))return NodeFilter.FILTER_REJECT;if(parent.closest('a,button,input,textarea,script,style,code,.task-wikilink'))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT}}),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(node=>decorateTextNode(node,doc));
}
function decorateFrame(doc){doc.querySelectorAll('.task-title-rich,#currentTitle').forEach(el=>decorateContainer(el,doc))}
function installIntoFrame(retry=0){
  const frame=document.getElementById(FRAME_ID);if(!frame)return;
  let doc;try{doc=frame.contentDocument}catch{return}
  if(!doc||!doc.body||!doc.querySelector('.task-title-rich')){if(retry<30)setTimeout(()=>installIntoFrame(retry+1),100);return}
  installFrameStyle(doc);decorateFrame(doc);
  if(doc.__tasklinerWikiPreviewObserver)return;doc.__tasklinerWikiPreviewObserver=true;
  const observer=new MutationObserver(mutations=>{for(const mutation of mutations){for(const node of mutation.addedNodes){if(node.nodeType===Node.TEXT_NODE){const parent=node.parentElement;if(parent&&(parent.matches('.task-title-rich,#currentTitle')||parent.closest('.task-title-rich,#currentTitle')))decorateTextNode(node,doc)}else if(node.nodeType===Node.ELEMENT_NODE){if(node.matches?.('.task-title-rich,#currentTitle'))decorateContainer(node,doc);node.querySelectorAll?.('.task-title-rich,#currentTitle').forEach(el=>decorateContainer(el,doc))}}}});
  observer.observe(doc.body,{childList:true,subtree:true});
}
function boot(){ensureUi();const frame=document.getElementById(FRAME_ID);if(!frame)return;frame.addEventListener('load',()=>setTimeout(()=>installIntoFrame(0),0));installIntoFrame(0)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.TaskLinerWikiPreview={open:openWiki,close:closePreview,clearCache(){treeCache.clear();noteCache.clear();resolutionCache.clear()}};
})();
