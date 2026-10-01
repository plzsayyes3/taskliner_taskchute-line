const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const files=['master.html','repeat.html','today.html','index-v2.html','taskliner-v2.html','taskliner_taskchute-line.html','legacy-shell.html'];
function appFunction(name,dependencies={}){
  const line=fs.readFileSync('app.html','utf8').split('\n').find(value=>value.startsWith(`function ${name}(`));
  assert.ok(line,`app.html must define ${name}`);
  return new Function(...Object.keys(dependencies),`return (${line.trim()})`)(...Object.values(dependencies));
}
for(const file of files){
  test(`${file} inline scripts parse`,()=>{
    const html=fs.readFileSync(file,'utf8');
    const scripts=[...html.matchAll(/<script(?![^>]*\btype=["']text\/plain["'])[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
    assert.ok(scripts.length>0,`${file} should contain inline script`);
    for(const source of scripts)assert.doesNotThrow(()=>new Function(source),`${file} contains invalid JavaScript`);
  });
}

test('GitHub contents fallback helper parses as JavaScript',()=>{
  const source=fs.readFileSync('taskliner-github-content.js','utf8');
  assert.doesNotThrow(()=>new Function(source));
});

test('sync shell loads autosave scheduler and retries when visibility returns',()=>{
  const html=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(html,/<script src="\.\/taskliner-autosave\.js\?v=20260928-autosave-visible"><\/script>/);
  assert.match(html,/document\.addEventListener\('visibilitychange',\(\)=>autoSaveScheduler\.visibilityChanged\(\)\)/);
});

test('taskliner loader resolves app.html when running from srcdoc',()=>{
  const html=fs.readFileSync('taskliner_taskchute-line.html','utf8');
  assert.match(html,/window\.location\.href\.startsWith\(['"]about:/);
  assert.match(html,/window\.parent\.location\.href/);
});

test('TaskLiner guards MutationObserver targets before observing',()=>{
  const html=fs.readFileSync('taskliner_taskchute-line.html','utf8');
  assert.match(html,/const root=document\.getElementById\('tasks'\);if\(root&&root\.nodeType===1\)new MutationObserver/);
  assert.match(html,/if\(tasksRoot&&tasksRoot\.nodeType===1\)new MutationObserver/);
  assert.doesNotMatch(html,/const root=document\.getElementById\('tasks'\);if\(root\)new MutationObserver/);
});

test('Repeat loading never turns collection failures into an empty successful list',()=>{
  const store=fs.readFileSync('template-store.js','utf8');
  const repeat=fs.readFileSync('repeat.html','utf8');
  assert.match(store,/async function loadCollection\(sub,parser,options=\{\}\)/);
  const loadCollectionLine=store.split('\n').find(line=>line.startsWith('async function loadCollection('));
  assert.ok(loadCollectionLine);
  assert.doesNotMatch(loadCollectionLine,/catch\{return\[\]\}/);
  assert.match(store,/if\(!Array\.isArray\(list\)\)throw new Error\(`/);
  assert.match(store,/if\(!file\)throw new Error\('ファイルが見つかりません'\)/);
  assert.match(store,/if\(!obj\.id\)throw new Error\('idがありません'\)/);
  assert.match(store,/if\(strict&&failures\.length\)/);
  assert.match(store,/loadCollection\('repeats',TL\.parseRepeatMarkdown,\{strict:true,label:'Repeat'\}\)/);
  assert.match(repeat,/catch\(e\)\{status\(`読込失敗: \$\{e\.message\}`\);return false\}/);
});

test('Repeat generation refreshes Master and Repeat definitions at click time',()=>{
  const repeat=fs.readFileSync('repeat.html','utf8');
  const today=fs.readFileSync('today.html','utf8');
  assert.match(repeat,/const \[freshMasters,freshRepeats\]=await Promise\.all\(\[S\.pullMasters\(\),S\.loadRepeats\(\)\]\),date=today\(\)/);
  assert.match(repeat,/DI\.existingInstances\(markdown,freshMasters\)/);
  assert.match(repeat,/TL\.generateDailyInstances\(date,freshMasters,freshRepeats,existing\)/);
  assert.match(today,/const \[freshMasters,freshRepeats\]=await Promise\.all\(\[S\.pullMasters\(\),S\.loadRepeats\(\)\]\),existing=DI\.existingInstances\(box\.value,freshMasters\)/);
  assert.match(today,/TL\.generateDailyInstances\(date,freshMasters,freshRepeats,existing\)/);
});

test('Repeat explicit reload pulls fresh Master data from GitHub',()=>{
  const repeat=fs.readFileSync('repeat.html','utf8');
  assert.match(repeat,/async function reload\(forceMasters=false\)/);
  assert.match(repeat,/const masterPromise=forceMasters\?S\.pullMasters\(\):S\.loadMasters\(\)/);
  assert.match(repeat,/\[masters,repeats\]=await Promise\.all\(\[masterPromise,S\.loadRepeats\(\)\]\)/);
  assert.match(repeat,/\$\('reload'\)\.onclick=\(\)=>reload\(true\)/);
  assert.match(repeat,/reload\(\)\}\)\(\);<\/script>/);
});

test('Repeat save blocks double submit and exact active schedule duplicates',()=>{
  const repeat=fs.readFileSync('repeat.html','utf8');
  assert.match(repeat,/id="saveBtn" class="btn primary" type="submit">保存<\/button>/);
  assert.match(repeat,/let masters=\[\],repeats=\[\],selected='',saving=false/);
  assert.match(repeat,/if\(saving\)return/);
  assert.match(repeat,/saving=true;\$\('saveBtn'\)\.disabled=true;\$\('saveBtn'\)\.textContent='保存中…'/);
  assert.match(repeat,/const latest=await S\.loadRepeats\(\),key=TL\.repeatScheduleKey\(r\),duplicate=latest\.find\(x=>x\.id!==r\.id&&\(x\.status\|\|'active'\)==='active'&&TL\.repeatScheduleKey\(x\)===key\)/);
  assert.match(repeat,/同じ条件のactive Repeatが既にあります/);
  assert.match(repeat,/finally\{saving=false;\$\('saveBtn'\)\.disabled=false;\$\('saveBtn'\)\.textContent='保存'\}/);
});

test('Master deletion is blocked by inactive Repeat references too',()=>{
  const master=fs.readFileSync('master.html','utf8');
  assert.match(master,/function repeatCount\(id\)\{return repeats\.filter\(r=>r\.master_id===id&&r\.status!=='inactive'\)\.length\}function linkedRepeatCount\(id\)\{return repeats\.filter\(r=>r\.master_id===id\)\.length\}/);
  assert.match(master,/const linked=linkedRepeatCount\(id\);if\(linked>0\)\{status\(`削除できません: active \/ inactiveを含むRepeat参照が\$\{linked\}件あります。先にRepeatの参照を解除してください。`\);return\}/);
  assert.match(master,/Repeat \$\{repeatCount\(m\.id\)\}/);
});

test('biweekly Repeat derives weekday from its anchor date and rejects a missing anchor',()=>{
  const repeat=fs.readFileSync('repeat.html','utf8');
  assert.match(repeat,/function weekdayOfDate\(value\)/);
  assert.match(repeat,/function syncBiweeklyWeekday\(\)\{if\(\$\('rule'\)\.value!=='biweekly'\)return;const w=weekdayOfDate\(\$\('anchor'\)\.value\);if\(w!==null\)\$\('weekday'\)\.value=String\(w\)\}/);
  assert.match(repeat,/\$\('anchor'\)\.onchange=syncBiweeklyWeekday/);
  assert.match(repeat,/\$\('weekday'\)\.readOnly=r==='biweekly'/);
  assert.match(repeat,/if\(r\.rule==='biweekly'\)\{const anchorWeekday=weekdayOfDate\(r\.anchor_date\);if\(anchorWeekday===null\)\{status\('隔週の基準日を指定してください'\);return\}r\.weekday=anchorWeekday;\$\('weekday'\)\.value=String\(anchorWeekday\)\}/);
});

test('Repeat Master selection is invalidated when the visible Master text changes',()=>{
  const repeat=fs.readFileSync('repeat.html','utf8');
  assert.match(repeat,/function masterInputChanged\(\)\{\$\('masterId'\)\.value='';\$\('masterLink'\)\.href='\.\/master\.html';suggestions\(\)\}/);
  assert.match(repeat,/\$\('masterQuery'\)\.oninput=masterInputChanged/);
  assert.match(repeat,/const masterId=\$\('masterId'\)\.value,master=masters\.find\(x=>x\.id===masterId\),shown=\$\('masterQuery'\)\.value\.trim\(\)/);
  assert.match(repeat,/if\(!masterId\|\|!master\|\|shown!==TL\.displayTitle\(master\.title\)\.trim\(\)\)\{status\('Masterを候補から選択してください'\);return\}/);
});

test('editing an existing Repeat requires the SHA loaded with that Repeat',()=>{
  const store=fs.readFileSync('template-store.js','utf8');
  const repeat=fs.readFileSync('repeat.html','utf8');
  assert.match(store,/async function saveRepeat\(repeat,options=\{\}\)/);
  assert.match(store,/TL\.serializeRepeat\(repeat\),`TaskLiner repeat: \$\{repeat\.id\}`,options/);
  assert.match(repeat,/const current=repeats\.find\(x=>x\.id===\$\('rid'\)\.value\)\|\|null,r=\{\.\.\.\(current\|\|\{id:TL\.id\('repeat'\),master_id:masterId\}\)\}/);
  assert.match(repeat,/S\.saveRepeat\(r,current\?\{expectedSha:current\._sha\|\|''\}:\{\}\)/);
  assert.match(repeat,/_sha:result\?\.content\?\.sha\|\|r\._sha\|\|''/);
});

test('Repeat daily generation uses the SHA that was originally read',()=>{
  const store=fs.readFileSync('template-store.js','utf8');
  const repeat=fs.readFileSync('repeat.html','utf8');
  assert.match(store,/async function putFile\(path,content,message,options=\{\}\)/);
  assert.match(store,/hasExpected=Object\.prototype\.hasOwnProperty\.call\(options,'expectedSha'\)/);
  assert.match(store,/currentSha=current\?\.sha\|\|'',expectedSha=String\(options\.expectedSha\|\|''\)/);
  assert.match(store,/if\(hasExpected&&currentSha!==expectedSha\)throw new Error\('GitHub側のファイルが更新されています。再読込してからもう一度実行してください。'\)/);
  assert.match(store,/return d\?\.sha\?\{text:decode\(d\.content\|\|''\),sha:d\.sha\}:null/);
  assert.match(repeat,/S\.putFile\(path,merged,`TaskLiner repeat generate: \$\{date\}`,\{expectedSha:file\?\.sha\|\|''\}\)/);
});

test('template store bypasses browser cache for GitHub GET reads',()=>{
  const source=fs.readFileSync('template-store.js','utf8');
  assert.match(source,/if\(method==='GET'\)request\.cache='no-store'/);
});

test('Repeat save appears immediately and verifies the refreshed GitHub list',()=>{
  const html=fs.readFileSync('repeat.html','utf8');
  assert.match(html,/const localIndex=repeats\.findIndex\(x=>x\.id===r\.id\)/);
  assert.match(html,/if\(localIndex>=0\)repeats\[localIndex\]=saved;else repeats\.push\(saved\)/);
  assert.match(html,/GitHub保存完了:/);
  assert.match(html,/const reloaded=await reload\(\),found=repeats\.some\(x=>x\.id===r\.id\)/);
  assert.match(html,/一覧の再読込だけ失敗しました/);
  assert.match(html,/保存しました:/);
});

test('Today keeps template controls in a compact hamburger menu',()=>{
  const html=fs.readFileSync('today.html','utf8');
  assert.match(html,/id="menuToggle"[^>]*aria-controls="menuPanel"/);
  assert.match(html,/id="menuPanel" class="menu-panel" hidden/);
  assert.match(html,/href="\.\/master\.html">Master<\/a>/);
  assert.match(html,/href="\.\/repeat\.html">Repeat<\/a>/);
  assert.match(html,/id="generate"[^>]*>Repeatから今日分を生成<\/button>/);
  assert.match(html,/function closeMenu\(\)/);
  assert.doesNotMatch(html,/<nav class="nav"><a class="active"/);
});

test('Today hamburger owns settings and hides the embedded floating gear',()=>{
  const html=fs.readFileSync('today.html','utf8');
  assert.match(html,/id="settings"[^>]*>⚙ 設定<\/button>/);
  assert.match(html,/function syncShell\(\)/);
  assert.match(html,/function hideEmbeddedSettingsButton\(\)/);
  assert.match(html,/gear\.hidden=true;gear\.style\.display='none'/);
  assert.match(html,/function openSettings\(\)\{closeMenu\(\);[\s\S]*getElementById\('syncOpen'\)\.click\(\)/);
  assert.match(html,/\$\('settings'\)\.onclick=openSettings/);
});

test('Today runtime resolves the nested app document',()=>{
  const html=fs.readFileSync('today.html','utf8');
  assert.match(html,/v2\?\.querySelector\(['"]iframe['"]\)/);
  assert.match(html,/nested\?\.contentDocument/);
});

test('app runtime exposes one-line task UI hooks',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/task-ui-actions\.js/);
  assert.match(html,/selectedTaskId/);
  assert.match(html,/task-action-settings/);
  assert.match(html,/task-selected/);
  assert.match(html,/task-markdown\.js/);
  assert.match(html,/createTaskTitle/);
});

test('pending task titles are slightly muted while running titles keep the base color',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/\.task\.todo \.task-title-rich,\.task\.todo \.task-title-editor\{color:color-mix\(in srgb,var\(--text\) 72%,var\(--muted\)\)\}/);
  assert.doesNotMatch(html,/\.task\.running \.task-title-rich[^}]*color:/);
});

test('app uses a muted accessible repeat marker',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/repeat-marker/);
  assert.match(html,/繰り返し/);
  assert.doesNotMatch(html,/↻\s*Repeat/);
});

test('app strips hidden TaskLiner metadata from loaded titles',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/stripTaskMetadata/);
  assert.match(html,/trimEnd\(\)/);
});

test('app explains where task actions are shown',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/タスクを選ぶと操作が表示されます/);
  assert.match(html,/その他の操作は「他」から選べます/);
  assert.match(html,/操作を選ぶ/);
});

test('app installs metadata-aware parsing before the initial load',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.ok(html.indexOf('const parseMarkdownBase=parseMarkdown')<html.lastIndexOf('load();'));
  assert.ok(html.indexOf('const normalizeTaskBase=normalizeTask')<html.lastIndexOf('load();'));
});

test('app notifies the sync shell after local task changes',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/notifyHost\('tasks-updated'/);
  assert.match(html,/function notifyHost\(type,extra=\{\}\)\{if\(window\.top===window\.self\)return;window\.TaskLinerHostBridge\.postToSyncShell\(window,/);
  assert.match(html,/<script src="\.\/taskliner-host-bridge\.js\?v=20260927-date-nav"><\/script>/);
});

test('app sends task and date messages to the marked sync shell across nested frames',()=>{
  const html=fs.readFileSync('app.html','utf8');
  const shell=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(html,/TaskLinerHostBridge\.postToSyncShell\(window,\{source:'taskliner',type:'navigation-request'/);
  assert.match(html,/TaskLinerHostBridge\.postToSyncShell\(window,\{source:'taskliner',type,...extra\}\)/);
  assert.match(shell,/window\.__tasklinerSyncShell=true/);
  assert.doesNotMatch(html,/window\.top\.postMessage\(\{source:'taskliner',type:'navigation-request'/);
});

test('app validates real calendar dates and queues navigation from the pending date',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/<script src="\.\/taskliner-date\.js\?v=20260928-date-safety"><\/script>/);
  assert.match(html,/TaskLinerDate\.isValidDate\(targetDate\)/);
  assert.match(html,/dateNavigation\.targetDate\(\),-1/);
  assert.match(html,/dateNavigation\.targetDate\(\),1/);
});

test('task wiki-link spans expose the class and keyboard contract used by the shell delegate',()=>{
  const app=fs.readFileSync('app.html','utf8');
  const shell=fs.readFileSync('legacy-shell.html','utf8');
  const runtime=fs.readFileSync('taskliner_taskchute-line.html','utf8');
  assert.match(app,/node\.className='task-wikilink';node\.setAttribute\('role','link'\);node\.setAttribute\('tabindex','0'\)/);
  assert.match(runtime,/wiki\.className='task-wikilink';wiki\.setAttribute\('role','link'\);wiki\.setAttribute\('tabindex','0'\)/);
  assert.match(shell,/event\.target\.closest\?\.\('\.task-wikilink'\)/);
  assert.match(shell,/if\(raw\)pullTaskNote\(raw,link\)/);
});

test('manual save conflicts offer pull or force overwrite while autosave never forces',()=>{
  const html=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(html,/id="saveConflictPull"[^>]*>Pullして読み直す<\/button>/);
  assert.match(html,/id="saveConflictForce"[^>]*>強制上書き<\/button>/);
  assert.match(html,/function saveConflictError\(/);
  assert.match(html,/error\.code='TASKLINER_SAVE_CONFLICT'/);
  assert.match(html,/async function performSave\(\{interactive=true,force=false\}=\{\}\)/);
  assert.match(html,/function assertSafeSave\(\{current,known,localText,force=false\}\)/);
  assert.match(html,/if\(!known\)throw saveConflictError\('GitHubに既存データがあります。保存前にPullしてください。'\)/);
  assert.match(html,/if\(current\.sha!==known\)throw saveConflictError\('GitHub側の内容が更新されています。先にPullしてください。'\)/);
  assert.match(html,/Number\(current\.size\|\|0\)>0&&!String\(localText\|\|''\)\.trim\(\)/);
  assert.match(html,/assertSafeSave\(\{current,known,localText:box\.value,force\}\)/);
  assert.match(html,/if\(r\.status===409\)throw saveConflictError/);
  assert.match(html,/if\(opts\.interactive&&!opts\.force\)openSaveConflict\(\)/);
  assert.match(html,/saveRemote\(\{interactive:true,force:true\}\)/);
  assert.match(html,/loadRemote\(\{confirmDirty:false\}\)/);
  assert.match(html,/save:\(\)=>saveRemote\(\{interactive:false,reason:'idle'\}\)/);
});

test('sync shell never pulls task data automatically on startup',()=>{
  const html=fs.readFileSync('legacy-shell.html','utf8');
  assert.doesNotMatch(html,/function startupPull\(/);
  assert.doesNotMatch(html,/startupPull\(\)/);
  assert.match(html,/\$\('quickPull'\)\.onclick=\(\)=>loadRemote\(\)/);
  assert.match(html,/\$\('ghLoad'\)\.onclick=\(\)=>loadRemote\(\)/);
});

test('sync shell handles task links through delegated events without observing the nested document',()=>{
  const html=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(html,/doc\.addEventListener\('click',activate,true\)/);
  assert.doesNotMatch(html,/new MutationObserver\([^\n]+\)\.observe\(doc\.body/);
});

test('sync shell loads the tested Git blob-content fallback',()=>{
  const html=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(html,/<script src="\.\/taskliner-github-content\.js\?v=20260930-empty-safe"><\/script>/);
  assert.match(html,/TaskLinerGithubContent\.base64Content\(data,sha=>fetchJson\(`\/git\/blobs\/\$\{encodeURIComponent\(sha\)\}`\)\)/);
  assert.match(html,/encoded=data\?await base64Content\(data\):null/);
});

test('empty remote day files are reported without clearing the current screen',()=>{
  const html=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(html,/if\(!text\.trim\(\)\)\{forgetSha\(key\);missing=true;/);
  assert.match(html,/画面の内容は変更していません。復元後にもう一度Pullしてください。/);
  assert.match(html,/saveState\('GitHub側が空','error'\)/);
  assert.ok(html.indexOf("if(!text.trim())")<html.indexOf('box.value=text'));
});

test('successful note pulls open a read-only right-side drawer with safely rendered Markdown',()=>{
  const html=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(html,/<aside class="note-drawer" role="dialog" aria-modal="true"/);
  assert.match(html,/function openNoteDrawer\(path,content,returnFocus=null\)[^\n]+TaskLinerNotePull\.renderMarkdown\(content\)/);
  assert.match(html,/TaskLinerNotePull\.cache\(localStorage,[^\n]+openNoteDrawer\(path,content,returnFocus\)/);
  assert.match(html,/pullTaskNote\(raw,link\)/);
});

test('sync shell keeps date navigation local until the user manually pulls',()=>{
  const html=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(html,/if\(msg\.type==='date-changed'\)\{refreshSaveState\(\);status\('日付を切り替えました。GitHubから読み込む場合は pull を押してください'\)\}/);
  assert.doesNotMatch(html,/date-changed'[\s\S]{0,160}loadRemote\(\)/);
});

test('failed date saves cancel the pending in-app navigation request',()=>{
  const app=fs.readFileSync('app.html','utf8');
  const shell=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(shell,/reply\(ok\?'navigation-continue':'navigation-cancel'\)/);
  assert.match(app,/msg\.type==='navigation-cancel'/);
});

test('app keeps the previous-start action and edge movement guards',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/startTask\(t\.id,true\)/);
  assert.match(html,/globalIndex===0/);
  assert.match(html,/globalIndex===tasks\.length-1/);
});

test('task URL schemes are promoted to the top window from a real click',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/function openTaskUrl\(raw,event\)/);
  assert.match(html,/window\.top\.location\.href=value/);
  assert.match(html,/link\.onclick=e=>openTaskUrl\(target,e\)/);
  assert.doesNotMatch(html,/link\.onclick=e=>e\.stopPropagation\(\)/);
});

test('mobile running dock renders Markdown links as labels instead of raw syntax',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/const mobileTitle=\$\('mobileRunningTitle'\);mobileTitle\.replaceChildren\(\);appendTaskLinkedText\(mobileTitle,running\.title\)/);
  assert.doesNotMatch(html,/\$\('mobileRunningTitle'\)\.textContent=running\.title/);
  assert.match(html,/\.task-title-rich a,\.mobile-running-title a\{color:inherit/);
});

test('mobile layout reserves the measured running dock height and keeps the last task reachable',()=>{
  const html=fs.readFileSync('app.html','utf8');
  const runtime=fs.readFileSync('taskliner_taskchute-line.html','utf8');
  assert.match(html,/function syncMobileRunningSpace\(dock\)/);
  assert.match(html,/--mobile-running-space/);
  assert.match(html,/getBoundingClientRect\(\)\.height\+18/);
  assert.match(runtime,/padding:5px 10px calc\(var\(--mobile-running-space,72px\) \+ env\(safe-area-inset-bottom\)\)!important/);
});

test('mobile v2 compacts quick add and visually emphasizes the running task without recoloring its title',()=>{
  const runtime=fs.readFileSync('taskliner_taskchute-line.html','utf8');
  assert.match(runtime,/\.add-label\{display:none!important\}/);
  assert.match(runtime,/\.add-form\{grid-template-columns:minmax\(0,1fr\) 58px 70px!important/);
  assert.match(runtime,/\.toolbar-help\{display:none!important\}/);
  assert.match(runtime,/\.task\.running\{border-color:color-mix/);
  assert.match(runtime,/\.task\.running \.task-title-rich\{font-weight:800!important\}/);
  assert.doesNotMatch(runtime,/\.task\.running \.task-title-rich\{[^}]*color:/);
});

test('mobile running dock keeps only finish and next as primary actions',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/<section id="mobileRunningDock" class="mobile-running-dock"[^>]*hidden/);
  assert.match(html,/<button id="mobileFinishBtn"[^>]*>終了<\/button>/);
  assert.doesNotMatch(html,/id="mobilePauseBtn"/);
  assert.doesNotMatch(html,/id="mobileResetBtn"/);
  assert.match(html,/mobileFinishBtn'\)\.onclick=\(\)=>endTaskAt\(running\.id\)/);
  assert.match(html,/@media\(max-width:720px\)[\s\S]*?\.mobile-running-dock/);
  const shell=fs.readFileSync('taskliner_taskchute-line.html','utf8');
  assert.match(shell,/function splitRunningTask\(id,explicitAt='',deferredContinuation=false\)/);
  assert.match(shell,/function holdRunningTask\(id,explicitAt=''\)/);
});

test('mobile running overflow contains reset, hold, and estimate only',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/id="mobileRunningProgress"[^>]*role="progressbar"/);
  assert.match(html,/id="mobileRunningMore"[^>]*class="task-more(?:\s|\")/);
  assert.match(html,/function renderMobileRunningMenu\(running\)/);
  assert.match(html,/btn\('実行前に戻す'/);
  assert.match(html,/btn\('保留'/);
  assert.match(html,/btn\('見積もり設定'/);
  assert.match(html,/holdMobileRunningTask\(running\.id\)/);
  assert.doesNotMatch(html,/UI\.availableDefinitions\(visibleActionKeys,'running'\)/);
  const mobileMenuLine=html.split('\n').find(line=>line.startsWith('function renderMobileRunningMenu('));
  assert.ok(mobileMenuLine);
  assert.doesNotMatch(mobileMenuLine,/menuAction\('end'/);
  assert.doesNotMatch(mobileMenuLine,/menuAction\('tomorrow'/);
  assert.match(html,/fill\.style\.width=`\$\{Math\.min\(100,Math\.max\(0,progress\.percent\)\)\}%`/);
});

test('running task row offers finish-and-next when another pending task exists',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/const next=findFirstTodoInDocument\(documentNodes,tasks,stateOf,t\.id\);if\(next\)\{const nextAction=btn\('次',\(\)=>advanceRunningTask\(t\.id\)\)/);
  assert.match(html,/nextAction\.title='終了して次へ';nextAction\.setAttribute\('aria-label','終了して次へ'\);actions\.append\(nextAction\)/);
});

test('mobile running dock offers an atomic finish-and-start-next action',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/<button id="mobileNextTaskBtn"[^>]*>終了して次へ<\/button>/);
  assert.match(html,/function findFirstTodoInDocument\(nodes,items,stateOf,excludeId=''\)/);
  assert.match(html,/function finishAndStartNext\(items,nodes,currentId,at,stateOf,elapsed\)/);
  assert.match(html,/next=findFirstTodoInDocument\(documentNodes,tasks,stateOf,running\.id\)/);
  assert.match(html,/nextButton\.onclick=next\?\(\)=>advanceRunningTask\(running\.id\):null/);
});

test('running task end sheet supports manual time, interruption, and estimate-time completion',()=>{
  const shell=fs.readFileSync('taskliner_taskchute-line.html','utf8');
  assert.match(shell,/id="tasklinerEndTime" type="time"/);
  assert.match(shell,/id="tasklinerEndInterrupt" type="checkbox"/);
  assert.match(shell,/id="tasklinerEndConfirm"[^>]*>確定<\/button>/);
  assert.match(shell,/id="tasklinerEndEstimate"[^>]*>見積もり時刻で終了<\/button>/);
  assert.match(shell,/estimateBtn\.disabled=!expected/);
  assert.match(shell,/estimateBtn\.textContent=expected\?\`見積もり時刻で終了（\$\{expected\}）\`:'見積もり時刻で終了（未設定）'/);
  assert.match(shell,/endTask\(id,expected\)/);
  assert.match(shell,/if\(interrupted\)interruptTask\(id,at\);else endTask\(id,at\)/);
  assert.match(shell,/@media\(max-width:720px\)\{\.taskliner-time-dialog\{position:fixed;inset:auto 0 0 0/);
});

test('running task row uses the same hold semantics as the mobile running dock',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/addAction\('defer',\(\)=>s==='running'\?holdMobileRunningTask\(t\.id\):deferTask\(t\.id\)\)/);
  assert.match(html,/function holdMobileRunningTask\(id\)\{if\(typeof holdRunningTask==='function'\)\{holdRunningTask\(id\);return\}deferTask\(id\)\}/);
});

test('holding a running task records elapsed work and creates a deferred continuation',()=>{
  const shell=fs.readFileSync('taskliner_taskchute-line.html','utf8');
  assert.match(shell,/function holdRunningTask\(id,explicitAt=''\)\{const result=splitRunningTask\(id,explicitAt,true\)/);
  assert.match(shell,/deferred:!!deferredContinuation/);
  assert.match(shell,/t\.end=at;t\.actualMin=elapsed\(t\.start,t\.end\);t\.completed=true/);
});

test('mobile running menu replaces estimates with quick choices or half-width integer minutes',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/function parseEstimateMinutes\(raw\)/);
  assert.match(html,/estimateOptions\.id='mobileEstimateOptions'/);
  assert.match(html,/for\(const minutes of \[1,5,10,15,30,60\]\)/);
  assert.match(html,/choice\.dataset\.estimate=String\(minutes\)/);
  assert.match(html,/input\.inputMode='numeric'/);
  assert.match(html,/btn\('見積もり設定'/);
  assert.match(html,/function setRunningEstimate\(id,raw\)/);
});

test('next-task action chooses the first pending task in Markdown order',()=>{
  const findFirstTodoInDocument=appFunction('findFirstTodoInDocument');
  const items=[
    {id:'before',status:'todo'},
    {id:'running',status:'running'},
    {id:'done',status:'done'},
    {id:'deferred',status:'deferred'},
    {id:'later',status:'todo'}
  ];
  const nodes=[
    {type:'raw',text:'## 朝'},
    {type:'task',id:'done'},
    {type:'task',id:'before'},
    {type:'task',id:'running'},
    {type:'task',id:'deferred'},
    {type:'task',id:'later'}
  ];
  assert.equal(findFirstTodoInDocument(nodes,items,task=>task.status,'running'),items[0]);
  items[0].status='done';
  assert.equal(findFirstTodoInDocument(nodes,items,task=>task.status,'running'),items[4]);
});

test('finish-and-start-next records both tasks at one timestamp and preserves elapsed minutes',()=>{
  const findFirstTodoInDocument=appFunction('findFirstTodoInDocument');
  const finishAndStartNext=appFunction('finishAndStartNext',{findFirstTodoInDocument});
  const current={id:'current',status:'running',start:'09:12',end:'',actualMin:0,completed:false};
  const next={id:'next',status:'todo',start:'',end:'',actualMin:0,completed:false,deferred:false,skipDate:'2026-09-26'};
  const items=[current,next],nodes=[{type:'task',id:'next'},{type:'task',id:'current'}];
  const started=finishAndStartNext(items,nodes,'current','09:37',task=>task.status,(from,to)=>25);
  assert.equal(started,next);
  assert.deepEqual([current.end,current.actualMin,current.completed],['09:37',25,true]);
  assert.deepEqual([next.start,next.end,next.actualMin,next.completed,next.deferred,next.skipDate],['09:37','',0,false,false,'']);
});

test('finish-and-start-next persists the transition only once',()=>{
  const findFirstTodoInDocument=appFunction('findFirstTodoInDocument');
  const finishAndStartNext=appFunction('finishAndStartNext',{findFirstTodoInDocument});
  const current={id:'current',status:'running',start:'09:12',end:'',completed:false};
  const next={id:'next',status:'todo',start:'',completed:false};
  const documentNodes=[{type:'task',id:'next'},{type:'task',id:'current'}];
  let saves=0;
  const advance=appFunction('advanceRunningTask',{tasks:[current,next],documentNodes,finishAndStartNext,nowTime:()=>'09:37',stateOf:task=>task.status,elapsed:()=>25,save:()=>saves++,toast:()=>{}});
  advance('current');
  assert.equal(saves,1);
  assert.equal(current.end,'09:37');
  assert.equal(next.start,'09:37');
});

test('running-task estimate can be replaced and invalid input does not save',()=>{
  const task={id:'active',status:'running',estimate:10};
  let saves=0;
  const setRunningEstimate=appFunction('setRunningEstimate',{
    tasks:[task],stateOf:item=>item.status,parseEstimateMinutes:appFunction('parseEstimateMinutes'),save:()=>saves++,toast:()=>{}
  });
  assert.equal(setRunningEstimate('active','30'),true);
  assert.equal(task.estimate,30);
  assert.equal(saves,1);
  assert.equal(setRunningEstimate('active','３'),false);
  assert.equal(task.estimate,30);
  assert.equal(saves,1);
});

test('estimate input accepts positive half-width whole minutes only',()=>{
  const parseEstimateMinutes=appFunction('parseEstimateMinutes');
  assert.equal(parseEstimateMinutes('15'),15);
  for(const invalid of ['','0','-5','1.5','５'])assert.equal(parseEstimateMinutes(invalid),null,`reject ${invalid}`);
});

test('app gives completion actions state-specific meaning',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/availableDefinitions\(visibleActionKeys,s\)/);
  assert.doesNotMatch(html,/const statusAction=/);
});

test('desktop task overflow uses single-kanji labels without losing accessible names',()=>{
  const html=fs.readFileSync('app.html','utf8');
  const actions=fs.readFileSync('task-ui-actions.js','utf8');
  assert.match(actions,/\{key:'complete',label:'完',title:'完了'/);
  assert.match(actions,/\{key:'more',label:'他',title:'その他'/);
  assert.match(html,/const menuLabels=\{start:'前',end:'時',defer:'留',tomorrow:'翌'\}/);
  assert.match(html,/const b=btn\(menuLabels\[key\]\|\|def\.label,handler\);b\.title=def\.title;b\.setAttribute\('aria-label',def\.title\)/);
  assert.match(html,/if\(s==='todo'\|\|s==='deferred'\)\{const completion=btn\('完',\(\)=>markDone\(t\.id\)\)/);
  assert.match(html,/\.task-more summary\{display:grid;place-items:center;width:30px;min-height:28px;/);
  assert.match(html,/completion\.title='時刻を記録せず完了';completion\.setAttribute\('aria-label',completion\.title\)/);
});

test('metadata is serialized by one layer only',()=>{
  const html=fs.readFileSync('taskliner-v2.html','utf8');
  assert.doesNotMatch(html,/if\(t\.masterId\)hidden\.push\(/);
  const app=fs.readFileSync('app.html','utf8');
  assert.match(app,/taskToMarkdownBase\(t\)\.replace\(/);
});
