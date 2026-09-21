const test=require('node:test');
const assert=require('node:assert/strict');
const UI=require('./task-ui-actions.js');

function storage(initial={}){
  const data=new Map(Object.entries(initial));
  return{getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),data};
}

test('defines the one-character labels for every existing task action',()=>{
  assert.deepEqual(UI.keys.map(x=>[x.key,x.label,x.title]),[
    ['complete','済','完了'],['start','始','開始'],['end','終','終了'],['time','時','時刻指定'],
    ['defer','保','保留'],['tomorrow','翌','翌日'],['up','上','上へ'],['down','下','下へ'],
    ['delete','削','削除'],['more','…','その他']
  ]);
});

test('loads defaults when storage is absent or invalid',()=>{
  const empty=storage();
  assert.deepEqual(UI.load(empty),UI.defaults());
  empty.setItem(UI.STORAGE_KEY,'not-json');
  assert.deepEqual(UI.load(empty),UI.defaults());
  empty.setItem(UI.STORAGE_KEY,JSON.stringify({visible:['start']}));
  assert.deepEqual(UI.load(empty),UI.defaults());
});

test('filters unknown action keys and preserves configured order',()=>{
  const saved=storage({[UI.STORAGE_KEY]:JSON.stringify(['delete','unknown','start','start','more'])});
  assert.deepEqual(UI.load(saved),['delete','start','more']);
});

test('saves only supported unique keys',()=>{
  const target=storage();
  assert.deepEqual(UI.save(target,['defer','unknown','defer','end']),['defer','end']);
  assert.deepEqual(JSON.parse(target.data.get(UI.STORAGE_KEY)),['defer','end']);
});
