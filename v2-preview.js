(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TaskLinerV2Preview=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function previewAssetUrl(base,path,version){const separator=String(path).includes('?')?'&':'?';return`${base}${path}${separator}preview=${encodeURIComponent(version)}`}
  const interruptTaskSource="function interruptTask(id,explicitAt=''){const i=tasks.findIndex(x=>x.id===id);if(i<0)return;const t=tasks[i];if(stateOf(t)!=='running')return;const at=explicitAt||nowTime();t.end=at;t.actualMin=elapsed(t.start,t.end);t.completed=true;const remaining=t.estimate>0?Math.max(t.estimate-t.actualMin,0):0;const continuation=normalizeTask({...t,id:uid(),estimate:remaining,start:'',end:'',actualMin:0,completed:false,deferred:false,skipDate:'',childLines:[...(t.childLines||[])]});tasks.splice(i+1,0,continuation);const nodeIndex=documentNodes.findIndex(n=>n.type==='task'&&n.id===id);if(nodeIndex>=0)documentNodes.splice(nodeIndex+1,0,{type:'task',id:continuation.id});else insertTaskNode(continuation);save();toast(t.estimate>0?`中断しました。残り見積 ${remaining}m`:'中断しました。見積もりなしで継続タスクを作成しました')}";
  function buildPreviewDocument(appHtml,markdownSource,actionsSource){
    const scripts=/<script src="\.\/task-markdown\.js[^\"]*"><\/script><script src="\.\/task-ui-actions\.js[^\"]*"><\/script>/;
    const inlineScripts=`<script>${markdownSource}</script><script>${actionsSource.replaceAll('taskliner_task_ui_actions_v1','taskliner_v2_preview_task_ui_actions_v1')}</script>`;
    let result=String(appHtml).replace(scripts,inlineScripts);
    if(result===appHtml)throw new Error('TaskLiner app dependency scripts were not found');
    result=result.replace('function pauseRunningTask(id){',`${interruptTaskSource}\nfunction pauseRunningTask(id){`);
    if(!result.includes(interruptTaskSource))throw new Error('TaskLiner pause handler was not found');
    return result.replaceAll('taskliner_taskchute_line_','taskliner_v2_preview_taskchute_line_');
  }
  return{buildPreviewDocument,previewAssetUrl};
});
