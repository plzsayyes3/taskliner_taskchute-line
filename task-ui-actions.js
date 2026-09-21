(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TaskLinerTaskUIActions=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STORAGE_KEY='taskliner_task_ui_actions_v1';
  const keys=Object.freeze([
    {key:'complete',label:'済',title:'完了',defaultVisible:false},
    {key:'start',label:'始',title:'開始',defaultVisible:true},
    {key:'end',label:'終',title:'終了',defaultVisible:false},
    {key:'time',label:'時',title:'時刻指定',defaultVisible:true},
    {key:'defer',label:'保',title:'保留',defaultVisible:true},
    {key:'tomorrow',label:'翌',title:'翌日',defaultVisible:false},
    {key:'up',label:'上',title:'上へ',defaultVisible:false},
    {key:'down',label:'下',title:'下へ',defaultVisible:false},
    {key:'delete',label:'削',title:'削除',defaultVisible:false},
    {key:'more',label:'…',title:'その他',defaultVisible:true}
  ]);
  const supported=new Set(keys.map(x=>x.key));
  function uniqueSupported(value){
    const seen=new Set();return(Array.isArray(value)?value:[]).filter(key=>supported.has(key)&&!seen.has(key)&&(seen.add(key),true));
  }
  function defaults(){return keys.filter(x=>x.defaultVisible).map(x=>x.key)}
  function load(storage){
    try{
      const parsed=JSON.parse(storage?.getItem?.(STORAGE_KEY)||'null');
      return Array.isArray(parsed)?uniqueSupported(parsed):defaults();
    }catch{return defaults()}
  }
  function save(storage,value){const clean=uniqueSupported(value);storage?.setItem?.(STORAGE_KEY,JSON.stringify(clean));return clean}
  return{STORAGE_KEY,keys,defaults,load,save};
});
