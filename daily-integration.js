(function(root,factory){
  const api=factory(root&&root.TaskLinerTemplates);
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./template-core.js'));
  if(root)root.TaskLinerDailyIntegration=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(TL){
  'use strict';
  if(!TL)throw new Error('TaskLinerTemplates is required');

  function sectionName(line){
    const m=String(line||'').match(/^\s*##\s+(.+?)\s*$/);
    return m?m[1].trim():'';
  }
  function taskLine(line){return /^\s*-\s*\[[ xX]\]\s+/.test(String(line||''))}
  function existingInstances(markdown){
    const out=[];
    for(const line of String(markdown||'').replace(/\r\n?/g,'\n').split('\n')){
      if(!taskLine(line))continue;
      const meta=TL.parseHiddenMetadata(line);
      if(meta.master_id||meta.repeat_id||meta.planned_at)out.push(meta);
    }
    return out;
  }
  function insertOne(lines,instance){
    const target=String(instance.section||'').trim();
    if(!target){lines.push(TL.renderInstanceMarkdown(instance));return lines}
    let head=lines.findIndex(line=>sectionName(line)===target);
    if(head<0){
      if(lines.length&&lines[lines.length-1]!=='')lines.push('');
      lines.push(`## ${target}`);
      head=lines.length-1;
    }
    let end=lines.length;
    for(let i=head+1;i<lines.length;i++){if(sectionName(lines[i])){end=i;break}}
    const planned=String(instance.planned_at||'');
    let insertAt=end;
    if(planned){
      for(let i=head+1;i<end;i++){
        if(!taskLine(lines[i]))continue;
        const meta=TL.parseHiddenMetadata(lines[i]);
        const other=String(meta.planned_at||'');
        if(!other||other>planned){insertAt=i;break}
      }
    }
    lines.splice(insertAt,0,TL.renderInstanceMarkdown(instance));
    return lines;
  }
  function mergeGeneratedIntoMarkdown(markdown,instances=[]){
    const lines=String(markdown||'').replace(/\r\n?/g,'\n').split('\n');
    const sorted=[...instances].sort((a,b)=>String(a.section||'').localeCompare(String(b.section||''),'ja')||String(a.planned_at||'99:99').localeCompare(String(b.planned_at||'99:99'))||String(a.title||'').localeCompare(String(b.title||''),'ja'));
    for(const instance of sorted)insertOne(lines,instance);
    return lines.join('\n');
  }
  return{sectionName,existingInstances,mergeGeneratedIntoMarkdown};
});
