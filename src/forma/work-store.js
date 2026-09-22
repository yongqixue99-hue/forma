import {uiText,uiMarkup,uiMessage} from './locale.js';
import {cleanWork,WORK_KEY} from './work-model.js';
import {cleanSyncHistories,cleanSyncHistory,hasInvalidSyncHistory} from './sync-history.js';
import {makeDelta,applyDelta,packSyncHistory,unpackSyncHistory} from './storage-delta.js';
import {LEGACY_COLLECTION_KEYS,inspectLegacyCollection,sha256} from './legacy-collections.js';
import {cleanBrandProfile} from './brand-style.js';

export const WORK_DATABASE='forma.works.v2';
export const RECOVERY_LIMIT=20;
export const BACKUP_LIMIT=64*1024*1024;
export const BACKUP_SET_LIMIT=256*1024*1024;
export const RECORD_CACHE_LIMIT=4;
export const RECORD_CACHE_BYTES=16*1024*1024;
const clone=v=>structuredClone(v);
const json=v=>JSON.stringify(v);
const bytes=v=>new TextEncoder().encode(json(v)).length;
// The catalogue is deliberately data-free. Full documents and history remain in
// `works`; summary updates share the same transaction, including migrations.
export function workSummary(r){return {id:r.id,name:r.work.name,revision:r.revision,committedAt:r.committedAt,deletedAt:r.deletedAt,stepCount:r.work.steps.length,rows:r.work.steps.reduce((n,s)=>n+s.doc.data.length,0),draft:r.work.steps.some(s=>s.draft),first:{view:r.work.steps[0]?.view,doc:{template:r.work.steps[0]?.doc.template}},steps:r.work.steps.map(s=>({id:s.id,view:s.view,template:s.doc.template,title:s.doc.title,rows:s.doc.data.length})),updated:r.work.updated,contentBytes:bytes(r.work),historyBytes:bytes({sync:r.sync,recovery:r.recovery})};}
function indexedTransaction(tx){
  return {objectStore(name){const store=tx.objectStore(name);if(name!=='works')return store;
    return new Proxy(store,{get(target,key){
      if(key==='put'||key==='add')return value=>{tx.objectStore('summaries').put(workSummary(value));return target[key](value);};
      if(key==='delete')return id=>{tx.objectStore('summaries').delete(id);return target.delete(id);};
      const value=target[key];return typeof value==='function'?value.bind(target):value;
    }});
  }};
}
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const uuid=()=>globalThis.crypto.randomUUID();
const stateOf=record=>({work:record.work,sync:record.sync});
const comparable=state=>json({...state,work:{...state.work,updated:0}});
const historyFor=(work,history)=>{
  const clean=cleanSyncHistory(history,work.id);
  if(history!==undefined&&(!Array.isArray(history)||clean.length!==Math.min(history.length,5)))throw new Error(uiText('同步记录不完整，请下载备份后重试；本次保存未覆盖原作品。'));
  return clean;
};
const expose=record=>record?{...clone(record),syncHistory:unpackSyncHistory(record.work,record.sync)}:null;
const rehome=(history,id)=>history.map(t=>({...t,workId:id}));
export function storageMessage(error){
  if(error?.name==='QuotaExceededError')return uiText('浏览器空间不足，修改尚未保存。请下载备份，再清理不需要的作品。');
  if(error?.name==='AbortError')return uiText('保存已中断，原作品保持不变。请重试或下载当前备份。');
  if(['SecurityError','InvalidStateError'].includes(error?.name))return uiText('浏览器暂不允许保存作品。请先下载当前备份，再刷新页面或检查此站点的存储设置。');
  return error?.message||uiText('暂时无法保存，请下载当前作品备份。');
}

// Inspect entries independently. One malformed work must not hide valid peers.
// The exact original JSON is archived by migration before anything is imported.
export function inspectLegacy(raw){
  const warnings=[],candidates=[],saved=new Set();let input;
  if(!raw)return {works:[],histories:{},activeId:null,warnings};
  try{input=JSON.parse(raw);if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('invalid root');}catch{return {works:[],histories:{},activeId:null,warnings:[uiText('旧版作品文件无法解析，原始内容已保留，仍可下载。')]};}
  for(const [slot,items] of [['projects',input?.projects],['drafts',input?.drafts],['draft',input?.draft?[input.draft]:[]]]){
    if(items===undefined)continue;
    if(!Array.isArray(items)){warnings.push(uiMessage`${slot} 格式异常，原始内容已保留。`);continue;}
    items.forEach((value,i)=>{try{const work=cleanWork(value);candidates.push({work,slot});if(slot==='projects')saved.add(work.id);}catch(e){warnings.push(uiMessage`${slot} 第 ${i+1} 项：${e.message}`);}});
  }
  const chosen=new Map();
  for(const entry of candidates){const old=chosen.get(entry.work.id);if(!old||entry.work.updated>=old.work.updated)chosen.set(entry.work.id,entry);}
  const works=[...chosen.values()].map(({work})=>({work,saved:saved.has(work.id)})),ids=new Set(works.map(r=>r.work.id));
  if(hasInvalidSyncHistory(input.syncHistories,ids))warnings.push(uiText('部分旧同步记录无法使用，原始记录保留在迁移备份中。'));
  const histories=cleanSyncHistories(input.syncHistories,ids,works.map(r=>r.work));
  return {works,histories,activeId:ids.has(input.draft?.id)?input.draft.id:works.at(-1)?.work.id||null,warnings};
}
async function digest(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function transaction(db,stores,mode,fn,signal){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new DOMException(uiText('保存已取消'),'AbortError'));return;}
    let tx;try{tx=db.transaction(stores,mode,mode==='readwrite'?{durability:'strict'}:undefined);}catch(error){reject(error);return;}
    let result,failure;const abort=()=>{try{tx.abort();}catch{}};
    signal?.addEventListener('abort',abort,{once:true});
    const done=()=>signal?.removeEventListener('abort',abort);
    tx.oncomplete=()=>{done();resolve(result);};
    tx.onabort=()=>{done();reject(failure||tx.error||new DOMException(uiText('保存已中断'),'AbortError'));};
    Promise.resolve().then(()=>fn(tx)).then(value=>result=value).catch(error=>{failure=error;abort();});
  });
}
function newRecord(work,{saved=false,history=[],origin=null,writer='',at=Date.now()}={}){
  return {id:work.id,revision:1,work,saved,sync:packSyncHistory(work,history),recovery:[],origin,writer,committedAt:at};
}
function updateRecord(current,work,history,{saved,writer,checkpoint,label,at}){
  const state={work,sync:packSyncHistory(work,history)},old=stateOf(current),recovery=clone(current.recovery||[]);
  if(comparable(state)!==comparable(old)){
    const coalesce=!checkpoint&&recovery[0]?.writer===writer&&!recovery[0]?.checkpoint&&at-recovery[0].at<30000;
    const before=coalesce?applyDelta(old,recovery.shift().delta):old;
    recovery.unshift({id:uuid(),at,writer,checkpoint:!!checkpoint,label:label||uiText('自动保存前'),delta:makeDelta(state,before)});
  }else if(recovery.length){
    // Even cursor-only writes change the history base. Rebase its first delta.
    recovery[0].delta=makeDelta(state,applyDelta(old,recovery[0].delta));
  }
  return {...current,...state,revision:current.revision+1,saved:current.saved||!!saved,writer,committedAt:at,recovery:recovery.slice(0,RECOVERY_LIMIT)};
}

export async function openWorkStore({indexedDB=globalThis.indexedDB,storage=globalThis.localStorage,name=WORK_DATABASE,broadcast=true,onBlocked=()=>{},signal}={}){
  if(!indexedDB)throw new Error(uiText('此浏览器暂不支持作品存储，可先下载作品文件备份。'));
  const db=await new Promise((resolve,reject)=>{
    const req=indexedDB.open(name,3);let failed=false;
    req.onupgradeneeded=()=>{
      const d=req.result;for(const [store,keyPath] of [['works','id'],['meta','key'],['legacy','hash'],['summaries','id']])if(!d.objectStoreNames.contains(store))d.createObjectStore(store,{keyPath});
      const tx=req.transaction,cursor=tx.objectStore('works').openCursor();
      cursor.onsuccess=()=>{const entry=cursor.result;if(!entry)return;tx.objectStore('summaries').put(workSummary(entry.value));entry.continue();};
    };
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>{failed=true;onBlocked();reject(new Error(uiText('其他标签页仍在使用旧版存储，请关闭旧标签页后重试。')));};
    req.onsuccess=()=>{if(failed){req.result.close();return;}resolve(req.result);};
  });
  const writer=uuid(),listeners=new Set();let cache=new Map(),summaries=new Map(),activeId=null;
  const channel=broadcast&&globalThis.BroadcastChannel?new BroadcastChannel(`${name}.changes`):null;
  const notify=(event,local=true)=>{for(const listener of listeners)listener({...event,local});if(local)channel?.postMessage(event);};
  const run=(stores,mode,fn,options={})=>{
    const indexed=mode==='readwrite'&&stores.includes('works');
    return transaction(db,indexed?[...new Set([...stores,'summaries'])]:stores,mode,tx=>fn(indexed?indexedTransaction(tx):tx),options.signal);
  };
  function remember(record){
    summaries.set(record.id,workSummary(record));cache.delete(record.id);cache.set(record.id,record);
    // Retain the active work even when a single large work exceeds the budget.
    // Everything evicted here is already durably stored in IndexedDB.
    let size=()=>[...cache.keys()].reduce((n,id)=>{const r=summaries.get(id);return n+(r?.contentBytes||0)+(r?.historyBytes||0);},0);
    while(cache.size>1&&(cache.size>RECORD_CACHE_LIMIT||size()>RECORD_CACHE_BYTES)){
      const id=[...cache.keys()].find(id=>id!==activeId);if(id===undefined)break;cache.delete(id);
    }
  }
  db.onversionchange=()=>{db.close();notify({type:'unavailable',message:uiText('作品存储已更新，请备份当前修改并刷新页面。')},false);};
  async function refresh(){
    const result=await run(['summaries','meta'],'readonly',async tx=>{const all=request(tx.objectStore('summaries').getAll()),meta=request(tx.objectStore('meta').get('active'));return {all:await all,meta:await meta};});
    summaries=new Map(result.all.map(r=>[r.id,r]));activeId=result.meta?.id||null;
    for(const [id,record] of cache)if(summaries.get(id)?.revision!==record.revision)cache.delete(id);
    return api.summaries();
  }
  async function refreshOne(id){const record=await run(['works'],'readonly',tx=>request(tx.objectStore('works').get(id)));if(record)remember(record);else{cache.delete(id);summaries.delete(id);}return record?.deletedAt?null:expose(record);}
  if(channel)channel.onmessage=async e=>{try{
    if(e.data?.id){const id=e.data.id,summary=await run(['summaries'],'readonly',tx=>request(tx.objectStore('summaries').get(id)));if(summary)summaries.set(id,summary);else summaries.delete(id);if(cache.has(id))await refreshOne(id);}
    notify(e.data,false);
  }catch(error){notify({type:'unavailable',message:storageMessage(error)},false);}};
  async function migrate(){
    let raw;try{raw=storage?.getItem(WORK_KEY);}catch{notify({type:'migration',warnings:[uiText('无法读取旧存储，请保留原浏览器中的作品。')]});return;}
    if(!raw)return;
    const hash=await digest(raw),inspection=inspectLegacy(raw),at=Date.now();
    const earlier=await run(['meta','legacy'],'readonly',async tx=>{const previous=await request(tx.objectStore('meta').get('migration'));return previous?request(tx.objectStore('legacy').get(previous.hash)):null;});
    const fingerprint=(work,history)=>digest(json({work:{...work,updated:0},history}));
    const old=inspectLegacy(earlier?.raw),oldHashes=new Map(await Promise.all(old.works.map(async({work})=>[work.id,await fingerprint(work,old.histories[work.id]||[])])));
    const hashes=await Promise.all(inspection.works.map(({work})=>fingerprint(work,inspection.histories[work.id]||[])));
    await run(['works','meta','legacy'],'readwrite',async tx=>{
      const archives=tx.objectStore('legacy');if(await request(archives.get(hash)))return;
      const works=tx.objectStore('works'),meta=tx.objectStore('meta'),previous=await request(meta.get('migration'));
      const imported=[],forks=[],resolved=new Map();
      for(const [i,{work,saved}] of inspection.works.entries()){
        const markerKey=`legacy-work:${work.id}`,marker=await request(meta.get(markerKey)),previousHash=marker?.fingerprint||oldHashes.get(work.id),current=await request(works.get(work.id)),history=inspection.histories[work.id]||[];
        if(previousHash===hashes[i]){if(current&&!current.deletedAt)resolved.set(work.id,current.id);continue;}
        const purged=await request(meta.get(`purged:${work.id}`));let candidate=work;
        if(current||marker||previousHash||purged){candidate={...work,id:`legacy:${uuid()}`,name:uiMessage`${work.name.slice(0,65)} · 旧版副本`};forks.push(candidate.id);}else imported.push(work.id);
        await request(works.add(newRecord(candidate,{saved,history:rehome(history,candidate.id),origin:candidate===work?null:{type:'legacy',id:work.id},writer,at})));
        await request(meta.put({key:markerKey,fingerprint:hashes[i],id:candidate.id}));resolved.set(work.id,candidate.id);
      }
      await request(archives.add({hash,raw,at,imported,forks,warnings:inspection.warnings}));
      await request(meta.put({key:'migration',hash,at}));
      const id=resolved.get(inspection.activeId);if(!previous&&id&&!await request(meta.get('active')))await request(meta.put({key:'active',id}));
    },{signal});
  }
  async function migrateCollections(){
    for(const key of LEGACY_COLLECTION_KEYS){
      let raw;try{raw=storage?.getItem(key);}catch{continue;}if(!raw)continue;
      const hash=await digest(raw),inspection=await inspectLegacyCollection(key,raw),at=Date.now();
      const markers=await Promise.all(inspection.entries.map(e=>sha256(key+'\0'+e.itemKey)));
      await run(['works','meta','legacy'],'readwrite',async tx=>{
        const works=tx.objectStore('works'),meta=tx.objectStore('meta'),archives=tx.objectStore('legacy');
        if((await request(meta.get(`source:${key}`)))?.hash===hash)return;
        const imported=[],forks=[],resolved=new Map();
        for(const [i,entry] of inspection.entries.entries()){
          const markerKey=`legacy-item:${markers[i]}`,previous=await request(meta.get(markerKey));
          if(previous?.fingerprint===entry.fingerprint){resolved.set(entry.itemKey,previous.id);continue;}
          const current=await request(works.get(entry.work.id)),purged=await request(meta.get(`purged:${entry.work.id}`));
          let work=entry.work;
          if(previous||current||purged){work={...work,id:`legacy:${uuid()}`,name:uiMessage`${work.name.slice(0,65)} · 旧版副本`};forks.push(work.id);}else imported.push(work.id);
          await request(works.add(newRecord(work,{saved:entry.saved,origin:{type:'legacy-collection',key,itemKey:entry.itemKey},writer,at})));
          await request(meta.put({key:markerKey,fingerprint:entry.fingerprint,id:work.id}));resolved.set(entry.itemKey,work.id);
        }
        const archive=await request(archives.get(hash));
        await request(archives.put(archive?{...archive,sourceKeys:[...new Set([...(archive.sourceKeys||[]),key])]}:{hash,raw,at,sourceKeys:[key],warnings:inspection.warnings,imported,forks}));
        await request(meta.put({key:`source:${key}`,hash,at}));
        if(!await request(meta.get('active'))){const preferred=inspection.entries.find(e=>key==='forma.editor.v1'&&e.itemKey===(()=>{try{return JSON.parse(storage.getItem('forma.editor.active'));}catch{return null;}})());const id=resolved.get(preferred?.itemKey)||imported[0]||forks[0];if(id&&!((await request(works.get(id)))?.deletedAt))await request(meta.put({key:'active',id}));}
      },{signal});
    }
  }
  const api={
    name,writer,available:true,
    async brands(){return run(['meta'],'readonly',async tx=>(await request(tx.objectStore('meta').getAll())).filter(r=>r.key.startsWith('brand-kit:')).map(({key,...r})=>clone(r)));},
    async saveBrand(value,{expectedRevision=0}={}){
      const profile=cleanBrandProfile(value),key=`brand-kit:${profile.id}`;
      const saved=await run(['meta'],'readwrite',async tx=>{const store=tx.objectStore('meta'),current=await request(store.get(key));if((current?.revision||0)!==expectedRevision)throw new Error(uiText('品牌方案已在其他页面修改，请重新读取，或另存一份。'));const record={key,profile,revision:expectedRevision+1,updated:Date.now()};await request(store.put(record));return record;});notify({type:'brands'});const {key:ignored,...record}=saved;return record;
    },
    async removeBrand(id,expectedRevision){await run(['meta'],'readwrite',async tx=>{const store=tx.objectStore('meta'),key=`brand-kit:${id}`,current=await request(store.get(key));if(!current||current.revision!==expectedRevision)throw new Error(uiText('品牌方案已有变化，请重新打开后再移除。'));await request(store.delete(key));});notify({type:'brands'});},
    summaries:()=>[...summaries.values()].filter(r=>!r.deletedAt).sort((a,b)=>b.committedAt-a.committedAt).map(clone),
    // Explicit bulk reads return every work, never just the bounded cache.
    async list(){const records=await run(['works'],'readonly',tx=>request(tx.objectStore('works').getAll()));return records.filter(r=>!r.deletedAt).sort((a,b)=>b.committedAt-a.committedAt).map(r=>clone(r.work));},
    trash:()=>[...summaries.values()].filter(r=>r.deletedAt).sort((a,b)=>b.deletedAt-a.deletedAt).map(r=>({id:r.id,name:r.name,steps:r.stepCount,rows:r.rows,deletedAt:r.deletedAt,revision:r.revision})),
    has:id=>summaries.has(id)&&!summaries.get(id).deletedAt,
    cacheInfo:()=>({records:cache.size,ids:[...cache.keys()],bytes:[...cache.keys()].reduce((n,id)=>n+(summaries.get(id)?.contentBytes||0)+(summaries.get(id)?.historyBytes||0),0)}),
    peek:id=>cache.get(id)?.deletedAt?null:expose(cache.get(id)),
    current:()=>cache.get(activeId)?.deletedAt?null:expose(cache.get(activeId)),
    subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
    refresh,get:refreshOne,
    async save(input,{expectedRevision=0,syncHistory=[],saved=false,checkpoint=false,label,signal}={}){
      const work=cleanWork(input),history=historyFor(work,syncHistory),at=Date.now();
      const result=await run(['works','meta'],'readwrite',async tx=>{
        const works=tx.objectStore('works'),meta=tx.objectStore('meta'),current=await request(works.get(work.id)),purged=await request(meta.get(`purged:${work.id}`));
        let record,conflict=false;
        if(current&&!current.deletedAt&&comparable(stateOf(current))===comparable({work,sync:packSyncHistory(work,history)})){
          // Opening a second tab or clicking Save without editing is not a new
          // content revision. Rebase timestamp-only recovery data losslessly.
          record=updateRecord(current,work,history,{saved,writer:current.writer,checkpoint:false,at:current.committedAt});record.revision=current.revision;if(checkpoint&&record.recovery[0])record.recovery[0].checkpoint=true;
          await request(works.put(record));await request(meta.put({key:'active',id:record.id}));return {record,current:null,conflict:false};
        }
        if(current?.deletedAt||purged||(current?.revision||0)!==expectedRevision){
          conflict=true;
          const copy={...work,id:`conflict:${uuid()}`,name:uiMessage`${work.name.slice(0,65)} · 冲突副本`};
          record=newRecord(copy,{saved:true,history:rehome(history,copy.id),origin:{type:'conflict',id:work.id,revision:expectedRevision,remoteRevision:current?.revision||null},writer,at});
        }else record=current?updateRecord(current,work,history,{saved,writer,checkpoint,label,at}):newRecord(work,{saved,history,writer,at});
        await request(works.put(record));await request(meta.put({key:'active',id:record.id}));
        return {record,current:conflict&&!current?.deletedAt?current||null:null,conflict};
      },{signal});
      activeId=result.record.id;remember(result.record);if(result.current)remember(result.current);
      notify({type:'saved',id:result.record.id,revision:result.record.revision});
      return {...result,record:expose(result.record),current:expose(result.current)};
    },
    async remove(id,expectedRevision){
      const record=await run(['works','meta'],'readwrite',async tx=>{const store=tx.objectStore('works'),current=await request(store.get(id));if(!current||current.deletedAt)return current;if(current.revision!==expectedRevision)throw new Error(uiText('这个作品刚在其他标签页更新，未执行删除。请重新打开核对。'));const next={...current,deletedAt:Date.now(),revision:current.revision+1,writer};await request(store.put(next));const meta=tx.objectStore('meta'),active=await request(meta.get('active'));if(active?.id===id)await request(meta.delete('active'));return next;});
      if(record)remember(record);if(activeId===id)activeId=null;notify({type:'removed',id,revision:record?.revision});
    },
    async restoreTrash(id,expectedRevision){
      const record=await run(['works'],'readwrite',async tx=>{const store=tx.objectStore('works'),current=await request(store.get(id));if(!current?.deletedAt||current.revision!==expectedRevision)throw new Error(uiText('回收站内容已变化，请刷新后再恢复。'));const {deletedAt,...rest}=current,next={...rest,revision:rest.revision+1,writer,committedAt:Date.now()};await request(store.put(next));return next;});
      remember(record);notify({type:'saved',id,revision:record.revision});return expose(record);
    },
    async purge(id,expectedRevision){
      await run(['works','meta'],'readwrite',async tx=>{const store=tx.objectStore('works'),current=await request(store.get(id));if(!current?.deletedAt||current.revision!==expectedRevision)throw new Error(uiText('回收站内容已变化，未执行永久删除。'));await request(store.delete(id));await request(tx.objectStore('meta').put({key:`purged:${id}`,revision:current.revision+1}));});
      cache.delete(id);summaries.delete(id);notify({type:'removed',id});
    },
    revisions(id){const record=cache.get(id);if(!record)return [];let state=stateOf(record);return record.recovery.map(item=>{state=applyDelta(state,item.delta);return {id:item.id,at:item.at,label:item.label,name:state.work.name,steps:state.work.steps.length,rows:state.work.steps.reduce((n,s)=>n+s.doc.data.length,0)};});},
    async restore(id,revisionId,expectedRevision){
      const record=await refreshOne(id);if(!record||record.revision!==expectedRevision)throw new Error(uiText('作品已有新的修改，请重新打开版本记录后再恢复。'));
      let state=stateOf(record),found=false;for(const item of record.recovery){state=applyDelta(state,item.delta);if(item.id===revisionId){found=true;break;}}
      if(!found)throw new Error(uiText('该版本已不在最近记录中。'));
      return api.save({...state.work,updated:Date.now()},{expectedRevision,syncHistory:unpackSyncHistory(state.work,state.sync),saved:record.saved,checkpoint:true,label:uiText('恢复版本前')});
    },
    async archives(){return run(['legacy'],'readonly',tx=>request(tx.objectStore('legacy').getAll()));},
    async backup(){const result=await run(['works','legacy','meta'],'readonly',async tx=>{const records=request(tx.objectStore('works').getAll()),legacy=request(tx.objectStore('legacy').getAll()),meta=request(tx.objectStore('meta').getAll());const values=await meta,brands=values.filter(r=>r.key.startsWith('brand-kit:')).map(({key,...r})=>r);return {records:await records,legacy:await legacy,activeId:values.find(r=>r.key==='active')?.id||null,...(brands.length?{brands}:{})};});return {kind:'forma-local-backup',version:result.brands?3:2,createdAt:Date.now(),...result};},
    async importBackup(value,{preview=false,signal,onProgress=()=>{}}={}){
      const check=()=>{if(signal?.aborted)throw new DOMException(uiText('备份操作已取消'),'AbortError');};
      const yieldControl=async()=>{check();await new Promise(resolve=>setTimeout(resolve,0));check();};
      check();
      // Freeze the import before yielding; callers may reuse or edit their input.
      value=clone(value);
      if(value?.kind!=='forma-local-backup'||![1,2,3].includes(value.version)||!Array.isArray(value.records))throw new Error(uiText('这不是可用的 FORMA 本地备份，或原始内容超过 256 MiB。'));
      if(value.brands!==undefined&&!Array.isArray(value.brands))throw new Error(uiText('品牌方案列表无效，未恢复任何内容。'));
      const brandIds=new Set(),brands=(value.brands||[]).map(r=>{const p=cleanBrandProfile(r.profile);if(brandIds.has(p.id))throw new Error(uiText('品牌方案编号重复，未恢复任何内容。'));brandIds.add(p.id);return p;});
      let totalBytes=bytes({...value,records:[]});
      if(totalBytes>BACKUP_SET_LIMIT)throw new Error(uiText('这不是可用的 FORMA 本地备份，或原始内容超过 256 MiB。'));
      const ids=new Set(),records=[];
      for(const input of value.records){await yieldControl();totalBytes+=bytes(input)+(records.length?1:0);if(totalBytes>BACKUP_SET_LIMIT)throw new Error(uiText('这不是可用的 FORMA 本地备份，或原始内容超过 256 MiB。'));if(!input||!Array.isArray(input.recovery||[])||(input.recovery||[]).length>RECOVERY_LIMIT||!Array.isArray(input.sync||[])||(input.sync||[]).length>5)throw new Error(uiText('备份版本记录格式无效或超出可恢复范围，未裁剪历史。'));if(ids.has(input.work?.id))throw new Error(uiText('备份含重复作品编号，未恢复任何作品。'));ids.add(input.work?.id);if(input.deletedAt!==undefined&&(!Number.isFinite(input.deletedAt)||input.deletedAt<=0))throw new Error(uiText('回收站记录格式无效。'));const work=cleanWork(input.work),history=historyFor(work,unpackSyncHistory(work,input.sync));let state=stateOf(input);for(const item of input.recovery||[]){state=applyDelta(state,item.delta);cleanWork(state.work);historyFor(state.work,unpackSyncHistory(state.work,state.sync));}records.push({input,work,history});onProgress({phase:'validate',completed:records.length,total:value.records.length});}
      const archives=[];for(const archive of value.legacy||[]){if(typeof archive.raw!=='string'||typeof archive.hash!=='string'||await digest(archive.raw)!==archive.hash)throw new Error(uiText('迁移备份校验失败，未恢复任何作品。'));archives.push(archive);}
      check();
      if(preview)return {works:records.filter(r=>!r.input.deletedAt).length,trash:records.filter(r=>r.input.deletedAt).length,versions:records.reduce((n,r)=>n+(r.input.recovery?.length||0),0),archives:archives.length,...(brands.length?{brands:brands.length}:{}),warnings:archives.flatMap(a=>a.warnings||[]),names:records.map(r=>r.work.name)};
      const imported=[];let restoredActiveId=null;
        for(const {input,work,history} of records){
          await yieldControl();
          const copy={...work,id:`restore:${uuid()}`,name:uiMessage`${work.name.slice(0,65)} · 恢复副本`};
          // Rehome each historical state, then rebuild its deltas with the new ID.
          let original=stateOf(input),previous={work:copy,sync:packSyncHistory(copy,rehome(history,copy.id))};const recovery=[];
          for(const item of input.recovery||[]){original=applyDelta(original,item.delta);const oldWork={...original.work,id:copy.id},next={work:oldWork,sync:packSyncHistory(oldWork,rehome(unpackSyncHistory(original.work,original.sync),copy.id))};recovery.push({...item,delta:makeDelta(previous,next)});previous=next;}
          const record={...newRecord(copy,{saved:true,history:rehome(history,copy.id),origin:{type:'backup',id:work.id},writer}),recovery:recovery.slice(0,RECOVERY_LIMIT),...(input.deletedAt?{deletedAt:input.deletedAt}:{})};
          imported.push(record);if(work.id===value.activeId&&!record.deletedAt)restoredActiveId=record.id;
        }
      check();await run(['works','meta','legacy'],'readwrite',async tx=>{
        for(const record of imported)await request(tx.objectStore('works').add(record));
        for(const archive of archives)await request(tx.objectStore('legacy').put(archive));
        for(const profile of brands){const copy={...profile,id:`brand:${uuid()}`};await request(tx.objectStore('meta').add({key:`brand-kit:${copy.id}`,profile:copy,revision:1,updated:Date.now()}));}
        restoredActiveId ||= imported.find(r=>!r.deletedAt)?.id||null;
        if(restoredActiveId)await request(tx.objectStore('meta').put({key:'active',id:restoredActiveId}));
      },{signal});
      if(restoredActiveId)activeId=restoredActiveId;for(const record of imported){remember(record);notify({type:'saved',id:record.id,revision:record.revision});}if(brands.length)notify({type:'brands'});if(restoredActiveId)activeId=restoredActiveId;return imported.map(expose);
    },
    async importLegacy(raw){
      const inspected=inspectLegacy(raw);if(!inspected.works.length)throw new Error(uiText('这个旧版备份中没有可恢复的作品，原文件未修改。'));
      const records=inspected.works.map(({work,saved})=>newRecord(work,{saved,history:inspected.histories[work.id]||[]}));
      const restored=await api.importBackup({kind:'forma-local-backup',version:1,records,activeId:inspected.activeId,legacy:[{hash:await digest(raw),raw,at:Date.now(),warnings:inspected.warnings}]});
      return {restored,warnings:inspected.warnings};
    },
    async usage(){
      const rows=[...summaries.values()];let backupBytes=0,estimate=null,persistent=null;
      await run(['legacy'],'readonly',tx=>new Promise((resolve,reject)=>{const req=tx.objectStore('legacy').openCursor();req.onerror=()=>reject(req.error);req.onsuccess=()=>{const c=req.result;if(!c){resolve();return;}backupBytes+=bytes(c.value);c.continue();};}));
      try{estimate=await navigator.storage?.estimate();persistent=await navigator.storage?.persisted();}catch{}
      return {works:rows.filter(r=>!r.deletedAt).length,trashed:rows.filter(r=>r.deletedAt).length,contentBytes:rows.reduce((n,r)=>n+r.contentBytes,0),historyBytes:rows.reduce((n,r)=>n+r.historyBytes,0),backupBytes,estimate,persistent};
    },
    async requestPersistence(){try{return await navigator.storage?.persist()||false;}catch{return false;}},
    close(){channel?.close();db.close();listeners.clear();},
  };
  try{await migrate();await migrateCollections();await refresh();if(activeId)await refreshOne(activeId);return api;}catch(error){api.close();throw error;}
}

// No silent localStorage fallback: keep editing possible, but visibly unsaved.
export async function unavailableWorkStore(error,storage){
  let raw;try{raw=storage?.getItem(WORK_KEY);}catch{}
  const state=inspectLegacy(raw),records=new Map(state.works.map(r=>[r.work.id,expose(newRecord(r.work,{saved:r.saved,history:state.histories[r.work.id]}))])),archives=[];
  if(raw)archives.push({raw,hash:await digest(raw),warnings:state.warnings});
  for(const key of LEGACY_COLLECTION_KEYS){let text;try{text=storage?.getItem(key);}catch{}if(!text)continue;const inspected=await inspectLegacyCollection(key,text);archives.push({raw:text,hash:await digest(text),sourceKeys:[key],warnings:inspected.warnings});for(const entry of inspected.entries){let work=entry.work;if(records.has(work.id))work={...work,id:`legacy:${uuid()}`};records.set(work.id,expose(newRecord(work,{saved:entry.saved})));}}
  const fail=async()=>{throw error;};
  return {available:false,error,brands:async()=>[],saveBrand:fail,removeBrand:fail,trash:()=>[],restoreTrash:fail,purge:fail,list:()=>[...records.values()].map(r=>clone(r.work)),has:id=>records.has(id),peek:id=>records.get(id),current:()=>records.get(state.activeId)||records.values().next().value,get:async id=>records.get(id),refresh:async()=>{},subscribe:()=>()=>{},save:fail,remove:fail,restore:fail,importBackup:fail,importLegacy:fail,revisions:()=>[],archives:async()=>clone(archives),backup:async()=>({kind:'forma-local-backup',version:2,records:[...records.values()],legacy:clone(archives)}),usage:fail,requestPersistence:async()=>false,close(){}};
}
