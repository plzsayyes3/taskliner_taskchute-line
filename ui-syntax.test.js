const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const files=['master.html','repeat.html','today.html','index-v2.html','taskliner-v2.html','taskliner_taskchute-line.html'];
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
