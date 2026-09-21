(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TaskLinerMarkdown=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function stripTaskMetadata(value){
    return String(value||'').replace(/\s*<!--\s*tl:[^>]*-->\s*$/i,'').trimEnd();
  }
  function displayTitle(value){
    let text=stripTaskMetadata(value);
    text=text.replace(/\[\[([^\]]+)\]\]/g,(_,raw)=>{const source=String(raw||'').trim(),pipe=source.indexOf('|'),targetWithHeading=(pipe>=0?source.slice(0,pipe):source).trim(),alias=(pipe>=0?source.slice(pipe+1):'').trim(),hash=targetWithHeading.indexOf('#'),target=(hash>=0?targetWithHeading.slice(0,hash):targetWithHeading).trim();return alias||target.split('/').pop()||targetWithHeading||source});
    return text.replace(/\[([^\]]+)\]\((?:\\.|[^()\\]|\([^()]*\))*\)/g,'$1');
  }
  function parseTaskLine(raw,currentSection=''){
    const m=String(raw||'').match(/^([-*+])\s+(?:\[([^\]])\]\s+)?(.*)$/);if(!m)return null;
    let body=stripTaskMetadata(m[3].trim()),mark=m[2]===undefined?' ':m[2],skipDate='';
    const sm=body.match(/\s*\[SKIP(?:\s+(\d{4}-\d{2}-\d{2}|\d{4}))?\]\s*$/i);if(sm){skipDate=sm[1]||'';body=body.slice(0,sm.index).trimEnd()}
    let start='',end='',actualMin=0;
    const tm=body.match(/\s*【\s*(\d{1,2}:\d{2})?\s*[-－ー~〜～]\s*(\d{1,2}:\d{2})?\s*(?:\/\s*(\d+)m)?\s*】\s*$/);
    const pm=tm?null:body.match(/\s+(\d{1,2}:\d{2})\s*[-－ー~〜～]\s*(\d{1,2}:\d{2})\s*$/);
    const range=tm||pm;
    if(range){start=range[1]||'';end=range[2]||'';actualMin=Number(range[3])||0;body=body.slice(0,range.index).trimEnd()}
    const legacyEta=body.match(/\s*\[ETA\s+\d{1,2}:\d{2}\]\s*$/i);if(legacyEta)body=body.slice(0,legacyEta.index).trimEnd();
    let estimate=0,estimateStyle='paren',estimateGap=' ';
    const hm=body.match(/(\s*)⏳\s*(\d+)m\s*$/);if(hm){estimate=Number(hm[2])||0;estimateStyle='hourglass';estimateGap=hm[1]||' ';body=body.slice(0,hm.index).trimEnd()}
    else{const em=body.match(/(\s*)\((\d+)m\)\s*$/);if(em){estimate=Number(em[2])||0;estimateStyle='paren';estimateGap=em[1]||'';body=body.slice(0,em.index).trimEnd()}}
    return{title:body,estimate,start,end,actualMin,completed:/^x$/i.test(mark),deferred:mark==='>'||mark==='<',skipDate,section:currentSection,bullet:m[1],hadCheckbox:m[2]!==undefined,estimateStyle,estimateGap,childLines:[]};
  }
  function parseMarkdown(text){const result=[],nodes=[];let currentSection='',lastTask=null;for(const raw of String(text||'').split(/\r?\n/)){const heading=raw.match(/^\s*##\s+(.+?)\s*$/);if(heading){currentSection=heading[1].trim();nodes.push({type:'raw',text:raw});lastTask=null;continue}if(/^\s+\S/.test(raw)&&lastTask){lastTask.childLines.push(raw);continue}const task=parseTaskLine(raw,currentSection);if(task){result.push(task);nodes.push({type:'task',id:task.id||''});lastTask=task;continue}nodes.push({type:'raw',text:raw});if(raw.trim()!=='')lastTask=null}return{tasks:result,nodes}}
  return{displayTitle,parseTaskLine,parseMarkdown,stripTaskMetadata};
});
