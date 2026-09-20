(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TaskLinerTechoImport=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function dateParts(value){
    const m=String(value||'').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    return m?{year:Number(m[1]),month:Number(m[2]),day:Number(m[3])}:null;
  }
  function sectionFor(hour){
    if(hour<9)return'7-9';
    if(hour<19)return'9-19';
    return'19-24';
  }
  function duration(start,end){
    const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);
    if(!Number.isFinite(sh)||!Number.isFinite(sm)||!Number.isFinite(eh)||!Number.isFinite(em))return 0;
    let value=(eh*60+em)-(sh*60+sm);if(value<0)value+=24*60;return value;
  }
  function dedupeTasks(items){
    const seen=new Set();return(Array.isArray(items)?items:[]).filter(item=>{
      const key=[item.title,item.section,item.planned_at].map(x=>String(x||'').trim().toLocaleLowerCase('ja-JP')).join('|');
      if(seen.has(key))return false;seen.add(key);return true;
    });
  }
  function extractDateTasks(markdown,date){
    const parts=dateParts(date);if(!parts)return[];
    const wanted=new RegExp(`^##\\s+${parts.month}月${parts.day}日(?:[（(]|\\s|$)`);
    let active=false;const out=[];
    for(const raw of String(markdown||'').replace(/\r\n?/g,'\n').split('\n')){
      if(/^##\s+/.test(raw)){
        active=wanted.test(raw.trim());
        continue;
      }
      if(!active||!/^\s*[-*+]\s+/.test(raw))continue;
      const m=raw.match(/^\s*[-*+]\s+(.*)$/);if(!m)continue;
      let body=m[1].trim(),completed=false;
      const mark=body.match(/^\[([ xX])\]\s*/);if(mark){completed=mark[1].toLowerCase()==='x';body=body.slice(mark[0].length).trim()}
      if(!body)continue;
      let planned_at='',estimate=0;
      const tm=body.match(/^(\d{1,2}:\d{2})\s*[-－ー〜~]\s*(\d{1,2}:\d{2})\s+(.*)$/);
      if(tm){planned_at=tm[1].padStart(5,'0');estimate=duration(planned_at,tm[2].padStart(5,'0'));body=tm[3].trim()}
      const hour=planned_at?Number(planned_at.slice(0,2)):12;
      out.push({title:body,estimate,completed,section:sectionFor(hour),planned_at});
    }
    return dedupeTasks(out);
  }
  return{extractDateTasks,sectionFor,duration,dedupeTasks};
});

(function installTodayImport(root){
  if(!root||!root.document)return;
  const doc=root.document;
  const status=text=>{const el=doc.getElementById('status');if(el)el.textContent=text};
  function findApp(){
    try{
      const shell=doc.getElementById('todayFrame')?.contentDocument;
      const frame=shell?.getElementById('app');
      const v2=frame?.contentDocument,nested=v2?.querySelector('iframe');
      const appDoc=nested?.contentDocument||v2,appWin=nested?.contentWindow||frame?.contentWindow;
      return appDoc?.getElementById('markdownBox')?{doc:appDoc,win:appWin}:null;
    }catch{return null}
  }
  function key(title,section,planned){return[String(title||'').trim(),String(section||'').trim(),String(planned||'').trim()].join('|')}
  function existingKeys(markdown){
    let section='';const keys=new Set();
    for(const line of String(markdown||'').split(/\r?\n/)){
      const heading=line.match(/^\s*##\s+(.+?)\s*$/);if(heading){section=heading[1].trim();continue}
      const task=line.match(/^\s*[-*+]\s+(?:\[[^\]]\]\s+)?(.*)$/);if(!task)continue;
      let title=task[1].replace(/\s*<!--\s*tl:[^>]*-->\s*$/i,'').trim();title=title.replace(/\s*\(\d+m\)\s*$/,'').trim();
      const planned=(root.TaskLinerTemplates?.parseHiddenMetadata?.(line)||{}).planned_at||'';
      keys.add(key(title,section,planned));
    }
    return keys;
  }
  async function importToday(){
    const app=findApp();if(!app){status('Today画面へ接続中です');return}
    const date=(app.doc.getElementById('dateBtn')?.textContent||'').trim().slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){status('Todayの日付を取得できません');return}
    const S=root.TaskLinerTemplateStore,DI=root.TaskLinerDailyIntegration;
    try{
      const file=await S.readFile(`02_techo/${date.slice(0,7)}.md`);
      if(!file?.text){status(`手帳ファイルがありません: 02_techo/${date.slice(0,7)}.md`);return}
      const items=root.TaskLinerTechoImport.extractDateTasks(file.text,date),box=app.doc.getElementById('markdownBox'),importBtn=app.doc.getElementById('importMdBtn');
      if(!items.length){status(`${date}の手帳タスクはありません`);return}
      const existing=existingKeys(box.value),fresh=items.filter(item=>!existing.has(key(item.title,item.section,item.planned_at)));
      if(!fresh.length){status('手帳から追加できる新しいタスクはありません');return}
      box.value=DI.mergeGeneratedIntoMarkdown(box.value,fresh);
      const original=app.win.confirm;app.win.confirm=()=>true;try{importBtn.click()}finally{app.win.confirm=original}
      status(`手帳から${fresh.length}件を追加しました`);
    }catch(error){status(`手帳の読込失敗: ${error.message}`)}
  }
  function boot(){
    const actions=doc.querySelector('.actions'),frame=doc.getElementById('todayFrame');
    if(!actions||!frame||doc.getElementById('importTecho'))return;
    const button=doc.createElement('button');button.id='importTecho';button.type='button';button.textContent='手帳からインポート';button.onclick=importToday;actions.append(button);
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof window!=='undefined'?window:null);
