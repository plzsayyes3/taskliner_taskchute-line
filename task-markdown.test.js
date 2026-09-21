const test=require('node:test');
const assert=require('node:assert/strict');
const MD=require('./task-markdown.js');

function parse(line){return MD.parseTaskLine(line,'9-19')}

test('parses checkbox, estimate, and all supported time range separators',()=>{
  assert.deepEqual(parse('- [/] 作業 (25m) 【09:00-】'),{title:'作業',estimate:25,start:'09:00',end:'',actualMin:0,completed:false,deferred:false,skipDate:'',section:'9-19',bullet:'-',hadCheckbox:true,estimateStyle:'paren',estimateGap:' ',childLines:[]});
  assert.equal(parse('- [x] 作業 ⏳30m 【09:00〜10:00 / 60m】').end,'10:00');
  assert.equal(parse('- [ ] 作業 (5m) 【-10:00】').start,'');
  assert.equal(parse('- [ ] 作業 (5m) 【-10:00】').end,'10:00');
});

test('parses legacy ETA, SKIP, and plain trailing time ranges',()=>{
  const eta=parse('- [ ] 作業 [ETA 10:30] [SKIP 2026-09-22]');
  assert.equal(eta.title,'作業');assert.equal(eta.skipDate,'2026-09-22');
  const plain=parse('- [x] 作業 (5m) 09:00-09:05');
  assert.deepEqual([plain.start,plain.end,plain.actualMin,plain.title],['09:00','09:05',0,'作業']);
});

test('displayTitle removes Markdown and WikiLink destinations without changing raw storage',()=>{
  const raw='🐤[英語](shortcuts://run-shortcut?name=English) [[folder/note#見出し|ノート]]';
  assert.equal(MD.displayTitle(raw),'🐤英語 ノート');
  assert.equal(raw,'🐤[英語](shortcuts://run-shortcut?name=English) [[folder/note#見出し|ノート]]');
});

test('parseMarkdown preserves sections, task nodes, and child memo lines',()=>{
  const result=MD.parseMarkdown('## 7-9\n- [ ] 朝 (5m)\n  - メモ\n## 9-19\n- [x] 夜 (10m)');
  assert.deepEqual(result.tasks.map(x=>[x.title,x.section,x.completed]),[['朝','7-9',false],['夜','9-19',true]]);
  assert.deepEqual(result.tasks[0].childLines,['  - メモ']);
  assert.deepEqual(result.nodes.map(x=>x.type),['raw','task','raw','task']);
});
