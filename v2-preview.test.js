const test=require('node:test');
const assert=require('node:assert/strict');
const {buildPreviewDocument,previewAssetUrl}=require('./v2-preview.js');
const fs=require('node:fs');

test('preview page refreshes its helper script when the preview loader changes',()=>{
  const html=fs.readFileSync('v2.html','utf8');
  assert.match(html,/v2-preview\.js\?v=\d+/);
});

test('preview asset URLs bypass stale browser caches on each reload',()=>{
  assert.equal(previewAssetUrl('https://raw.example/branch/','app.html',123),'https://raw.example/branch/app.html?preview=123');
  assert.equal(previewAssetUrl('https://raw.example/branch/','ui.js?v=1',123),'https://raw.example/branch/ui.js?v=1&preview=123');
});

test('preview document loads the mobile app without sharing its saved task data',()=>{
  const html='<head></head><script src="./task-markdown.js?v=1"></script><script src="./task-ui-actions.js?v=1"></script><script>const STORAGE_PREFIX=\'taskliner_taskchute_line_v1:\';function pauseRunningTask(id){if(typeof interruptTask===\'function\'){interruptTask(id);return}deferTask(id)}</script>';
  const result=buildPreviewDocument(html,'window.markdownLoaded=true;','window.actionsLoaded=true;const key=\'taskliner_task_ui_actions_v1\';');
  assert.match(result,/window\.markdownLoaded=true/);
  assert.match(result,/window\.actionsLoaded=true/);
  assert.match(result,/taskliner_v2_preview_taskchute_line_v1:/);
  assert.match(result,/taskliner_v2_preview_task_ui_actions_v1/);
  assert.match(result,/function interruptTask\(id,explicitAt=/);
  assert.doesNotMatch(result,/src="\.\/task-(?:markdown|ui-actions)\.js/);
  for(const script of [...result.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]).filter(Boolean)){
    assert.doesNotThrow(()=>new Function(script));
  }
});
