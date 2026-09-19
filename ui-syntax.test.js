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
