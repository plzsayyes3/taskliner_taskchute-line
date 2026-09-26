const test=require('node:test');
const assert=require('node:assert/strict');
const {buildPreviewDocument}=require('./v2-preview.js');

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
