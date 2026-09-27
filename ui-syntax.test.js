const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const files=['master.html','repeat.html','today.html','index-v2.html','taskliner-v2.html','taskliner_taskchute-line.html','legacy-shell.html'];
for(const file of files){
  test(`${file} inline scripts parse`,()=>{
    const html=fs.readFileSync(file,'utf8');
    const scripts=[...html.matchAll(/<script(?![^>]*\btype=["']text\/plain["'])[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
    assert.ok(scripts.length>0,`${file} should contain inline script`);
    for(const source of scripts)assert.doesNotThrow(()=>new Function(source),`${file} contains invalid JavaScript`);
  });
}

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
  assert.match(html,/その他の操作は「…」から選べます/);
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

test('sync shell waits for the nested app date before startup pull',()=>{
  const html=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(html,/if\(!date\)\{if\(attempt<60\)setTimeout\(\(\)=>startupPull\(/);
  assert.match(html,/function appWindow\(\)/);
  assert.match(html,/win=appWindow\(\)/);
});

test('sync shell handles task links through delegated events without observing the nested document',()=>{
  const html=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(html,/doc\.addEventListener\('click',activate,true\)/);
  assert.doesNotMatch(html,/new MutationObserver\([^\n]+\)\.observe\(doc\.body/);
});

test('successful note pulls open a read-only right-side drawer with safely rendered Markdown',()=>{
  const html=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(html,/<aside class="note-drawer" role="dialog" aria-modal="true"/);
  assert.match(html,/function openNoteDrawer\(path,content,returnFocus=null\)[^\n]+TaskLinerNotePull\.renderMarkdown\(content\)/);
  assert.match(html,/TaskLinerNotePull\.cache\(localStorage,[^\n]+openNoteDrawer\(path,content,returnFocus\)/);
  assert.match(html,/pullTaskNote\(raw,link\)/);
});

test('sync shell pulls the newly selected date after navigation',()=>{
  const html=fs.readFileSync('legacy-shell.html','utf8');
  assert.match(html,/if\(msg\.type==='date-changed'\)\{refreshSaveState\(\);if\(!dirtyDates\.has\(activeDate\(\)\)\)loadRemote\(\)\}/);
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

test('app gives completion actions state-specific meaning',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/availableDefinitions\(visibleActionKeys,s\)/);
  assert.doesNotMatch(html,/const statusAction=/);
});

test('app exposes completion-only in the overflow menu for pending tasks',()=>{
  const html=fs.readFileSync('app.html','utf8');
  assert.match(html,/function markDone\(id\)/);
  assert.match(html,/if\(s==='todo'\|\|s==='deferred'\)\{const completion=btn\('完了のみ',\(\)=>markDone\(t\.id\)\)/);
});

test('metadata is serialized by one layer only',()=>{
  const html=fs.readFileSync('taskliner-v2.html','utf8');
  assert.doesNotMatch(html,/if\(t\.masterId\)hidden\.push\(/);
  const app=fs.readFileSync('app.html','utf8');
  assert.match(app,/taskToMarkdownBase\(t\)\.replace\(/);
});
