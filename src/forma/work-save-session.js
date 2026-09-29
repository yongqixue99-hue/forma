import {uiText,uiMarkup,uiMessage} from './locale.js';
// Serialize edits within one tab. Revision checks remain inside the database
// transaction so two independent tabs cannot both win the same revision.
export function createWorkSaveSession(repository,record,{onState=()=>{},onConflict=()=>{},onCommit=()=>{}}={}){
  let revision=record?.revision||0,id=record?.id,pending=null,running=null,error=null;
  const merge=(previous,next)=>({...next,saved:!!previous?.saved||!!next.saved,checkpoint:!!previous?.checkpoint||!!next.checkpoint,label:next.label||previous?.label});
  function stage(work,syncHistory=[],options={}){
    const next={work:structuredClone(work),syncHistory:structuredClone(syncHistory),...options};
    if(id&&next.work.id!==id)throw new Error(uiText('保存对象已切换，请重新打开作品。'));
    pending=merge(pending,next);
    id=work.id;onState('pending');
  }
  function flush(){
    if(running)return running;
    if(!pending)return Promise.resolve(!error);
    running=(async()=>{
      while(pending){
        const input=pending;pending=null;onState('saving');
        try{
          const result=await repository.save(input.work,{...input,expectedRevision:revision});
          revision=result.record.revision;id=result.record.id;error=null;
          if(result.conflict){
            if(pending){pending.work.id=id;if(pending.work.name===input.work.name)pending.work.name=result.record.work.name;pending.syncHistory=pending.syncHistory.map(t=>({...t,workId:id}));}
            onConflict(result,pending?.work||result.record.work);
          }
          onCommit(result.record);
        }catch(e){
          // Keep the latest typed data, but retry the failed manual save's
          // checkpoint too. A later autosave must not erase that intent.
          error=e;pending=merge(input,pending||input);onState('error',e);return false;
        }
      }
      onState('saved');return true;
    })().finally(()=>running=null);
    return running;
  }
  return {stage,flush,get revision(){return revision;},get id(){return id;},get dirty(){return !!pending||!!running;},get error(){return error;}};
}
