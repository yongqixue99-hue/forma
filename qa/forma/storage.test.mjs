import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {openWorkStore,inspectLegacy} from '../../src/forma/work-store.js';
import {makeDelta,applyDelta,packSyncHistory,unpackSyncHistory} from '../../src/forma/storage-delta.js';
import {presetWork,WORK_KEY,cleanWork,newWork,workReport} from '../../src/forma/work-model.js';
import {getExample} from '../../src/forma/catalog.js';
import {previewDataSync,applyDataSync,undoDataSync} from '../../src/forma/work-data-sync.js';
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
async function fixture(t,storage=memory()){const indexedDB=new IDBFactory(),name='test';const open=()=>openWorkStore({indexedDB,storage,name,broadcast:false});const store=await open();t.after(()=>store.close());return {store,storage,indexedDB,open};}
const synced=()=>{const work=presetWork('method-agreement');work.steps[0].doc.data[0].b+=.25;const p=previewDataSync(work,work.steps[0].id);return applyDataSync(work,p,p.targets.filter(t=>t.eligible).map(t=>t.id));};

test('ID-based delta survives rename, reorder, delete, missing values, leading zeros and unknown columns',()=>{
 const a={steps:[{id:'s1',data:[{_id:'a',label:'同名',value:1e-14,_extra:{编号:'001',备注:'a\nb'}},{_id:'b',label:'同名',value:null}]}]};
 const b=structuredClone(a);b.steps[0].data.reverse();b.steps[0].data[1].label='改名';b.steps[0].data[1].value=0;b.steps.push({id:'s2',data:[]});
 assert.deepEqual(applyDelta(a,makeDelta(a,b)),b);assert.deepEqual(applyDelta(b,makeDelta(b,a)),a);assert.match(JSON.stringify(makeDelta(a,b)),/"key":"_id"/);
 const unusual=JSON.parse('{"__proto__":{"polluted":true},"constructor":"kept"}');assert.deepEqual(applyDelta({},makeDelta({},unusual)),unusual);assert.equal({}.polluted,undefined);
});
test('same ID is stored once, cursor is a reference and unfinished cells survive reopening',async t=>{
 const f=await fixture(t),w=presetWork('classic');const saved=await f.store.save(w,{saved:true});const backup=await f.store.backup();assert.equal(backup.records.length,1);assert.equal(backup.activeId,w.id);assert.equal(backup.records[0].work.id,w.id);assert.equal(f.storage.getItem(WORK_KEY),null);
 const second=await f.open();t.after(()=>second.close());assert.deepEqual(second.current().work,cleanWork(w));assert.equal(saved.record.revision,1);
});
test('stale writers preserve original and conflict copy, including their own synchronization history',async t=>{
 const f=await fixture(t),base=synced();const first=await f.store.save(base.work,{syncHistory:[base.transaction]});const b=await f.open();t.after(()=>b.close());
 const aWork=structuredClone(first.record.work),bWork=structuredClone(first.record.work);aWork.name='A：新标题';bWork.steps[0].doc.unit='B：新单位';
 await f.store.save(aWork,{expectedRevision:1,syncHistory:[base.transaction]});const result=await b.save(bWork,{expectedRevision:1,syncHistory:[base.transaction]});
 assert.equal(result.conflict,true);assert.equal(result.current.work.name,aWork.name);assert.notEqual(result.record.id,aWork.id);assert.equal(result.record.work.steps[0].doc.unit,bWork.steps[0].doc.unit);assert.equal(result.record.syncHistory[0].workId,result.record.id);assert.equal((await f.store.get(aWork.id)).work.steps[0].doc.unit,aWork.steps[0].doc.unit);assert.equal((await b.refresh()).length,2);
});
test('simultaneous transactions cannot both overwrite the same expected revision',async t=>{
 const f=await fixture(t),work=presetWork('classic');await f.store.save(work);const b=await f.open();t.after(()=>b.close());
 const results=await Promise.all([f.store.save({...work,name:'A'},{expectedRevision:1}),b.save({...work,name:'B'},{expectedRevision:1})]);assert.equal(results.filter(r=>r.conflict).length,1);const backup=await f.store.backup();assert.equal(backup.records.length,2);assert.deepEqual(new Set(backup.records.map(r=>r.work.name.replace(' · 冲突副本',''))),new Set(['A','B']));
});
test('deletion has a version guard and stale saves never resurrect the deleted identity',async t=>{
 const f=await fixture(t),work=presetWork('classic');await f.store.save(work);await f.store.save({...work,name:'updated'},{expectedRevision:1});await assert.rejects(f.store.remove(work.id,1),/未执行删除/);await f.store.remove(work.id,2);const result=await f.store.save({...work,name:'old tab'},{expectedRevision:1});assert.equal(result.conflict,true);assert.equal(result.current,null);assert.equal((await f.store.get(work.id)),null);
});
test('failed commit rolls back work, history, revision and active pointer together',async t=>{
 const f=await fixture(t),work=presetWork('classic');await f.store.save(work);const before=await f.store.backup(),put=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(value,...args){if(this.name==='meta')throw new DOMException('injected disk quota','QuotaExceededError');return put.call(this,value,...args);};
 try{await assert.rejects(f.store.save({...work,name:'must not commit'},{expectedRevision:1}),{name:'QuotaExceededError'});}finally{IDBObjectStore.prototype.put=put;}
 const after=await f.store.backup();assert.deepEqual(after.records,before.records);assert.equal(after.activeId,before.activeId);assert.equal((await f.store.get(work.id)).revision,1);
 const controller=new AbortController();controller.abort();await assert.rejects(f.store.save({...work,name:'cancelled'},{expectedRevision:1,signal:controller.signal}),{name:'AbortError'});assert.deepEqual((await f.store.get(work.id)).work,cleanWork(work));
});
test('legacy migration preserves raw bytes, current drafts, incomplete peer recovery and sync undo',async t=>{
 const storage=memory(),base=synced(),older={...base.work,name:'old saved name',updated:base.work.updated-100},raw=JSON.stringify({version:1,projects:[older,{id:'bad'}],drafts:[base.work],draft:base.work,syncHistories:{[base.work.id]:[base.transaction]}});storage.setItem(WORK_KEY,raw);
 const f=await fixture(t,storage);assert.equal((await f.store.list()).length,1);assert.equal(f.store.current().work.name,base.work.name);const archives=await f.store.archives();assert.equal(archives[0].raw,raw);assert.equal(archives[0].warnings.length,1);assert.equal(storage.getItem(WORK_KEY),raw);
 const restored=f.store.current();assert.deepEqual(undoDataSync(restored.work,restored.syncHistory[0]),undoDataSync(base.work,base.transaction));
 const reopen=await f.open();t.after(()=>reopen.close());assert.equal((await reopen.list()).length,1);assert.equal((await reopen.archives()).length,1);
});
test('late old-version writes become recoverable copies instead of overwriting migrated works',async t=>{
 const storage=memory(),work=presetWork('classic');storage.setItem(WORK_KEY,JSON.stringify({projects:[work],draft:work}));const f=await fixture(t,storage);await f.store.save({...work,name:'new database version'},{expectedRevision:1});storage.setItem(WORK_KEY,JSON.stringify({projects:[work],draft:{...work,name:'late old tab'}}));const other=await f.open();t.after(()=>other.close());assert.equal((await other.list()).length,2);assert.equal((await other.get(work.id)).work.name,'new database version');assert.ok((await other.list()).some(w=>w.name==='late old tab · 旧版副本'));assert.equal((await other.archives()).length,2);
});
test('migration abort leaves original untouched and can be retried',async t=>{
 const indexedDB=new IDBFactory(),storage=memory(),work=presetWork('classic'),raw=JSON.stringify({projects:[work],draft:work});storage.setItem(WORK_KEY,raw);const controller=new AbortController();controller.abort();await assert.rejects(openWorkStore({indexedDB,storage,name:'abort',broadcast:false,signal:controller.signal}),{name:'AbortError'});assert.equal(storage.getItem(WORK_KEY),raw);const store=await openWorkStore({indexedDB,storage,name:'abort',broadcast:false});t.after(()=>store.close());assert.equal((await store.list()).length,1);assert.equal((await store.archives()).length,1);
});
test('malformed legacy root is preserved and no longer empties valid unrelated works',()=>{
 for(const raw of ['null','not json','{}'])assert.doesNotThrow(()=>inspectLegacy(raw));assert.equal(inspectLegacy('bad').warnings.length,1);
});
test('delta synchronization history is lossless after unrelated edits and removed targets',()=>{
 const result=synced(),work=structuredClone(result.work);work.steps[1].doc.unit='edited later';work.steps.pop();const packed=packSyncHistory(work,[result.transaction]);assert.deepEqual(unpackSyncHistory(work,packed),[result.transaction]);
});
test('restoring a persisted revision restores data and sync history, and can itself be undone',async t=>{
 const f=await fixture(t),base=synced();await f.store.save(base.work,{syncHistory:[base.transaction]});const changed=structuredClone(base.work);changed.steps[0].doc.data[0].b=2.76e-12;changed.steps.reverse();changed.name='after';const next=await f.store.save(changed,{expectedRevision:1,syncHistory:[base.transaction],checkpoint:true});
 const reopened=await f.open();t.after(()=>reopened.close());const revisions=reopened.revisions(base.work.id);assert.equal(revisions.length,1);const result=await reopened.restore(base.work.id,revisions[0].id,next.record.revision);assert.deepEqual(result.record.work.steps,cleanWork(base.work).steps);assert.deepEqual(result.record.syncHistory,[base.transaction]);
 const redo=await reopened.restore(base.work.id,reopened.revisions(base.work.id)[0].id,result.record.revision);assert.deepEqual(redo.record.work.steps,cleanWork(changed).steps);
});
test('backup roundtrip keeps raw columns, precision, steps and undo; restores as copies',async t=>{
 const f=await fixture(t),base=synced();await f.store.save(base.work,{syncHistory:[base.transaction]});await f.store.save({...base.work,name:'new'},{expectedRevision:1,syncHistory:[base.transaction],checkpoint:true});const backup=await f.store.backup();const restored=await f.store.importBackup(JSON.parse(JSON.stringify(backup)));assert.equal(restored.length,1);assert.notEqual(restored[0].id,base.work.id);assert.deepEqual(restored[0].work.steps,cleanWork(base.work).steps);assert.equal(restored[0].syncHistory[0].workId,restored[0].id);assert.equal(f.store.revisions(restored[0].id).length,1);
 const before=await f.store.backup();await assert.rejects(f.store.importBackup({...backup,records:[...backup.records,{work:{id:'invalid'}}]}));assert.deepEqual((await f.store.backup()).records,before.records);
});
test('20 steps x 600 valid scientific records fit one payload, a single-cell edit stores a small delta',async t=>{
 const f=await fixture(t),doc=getExample('histogram');doc.data=Array.from({length:600},(_,i)=>({label:`样本 ${i}`,value:i*1e-9,_extra:{备注:'测'.repeat(100)}}));const work=newWork(Array.from({length:20},()=>({doc})));assert.equal(workReport(work).valid,true);await f.store.save(work);const changed=structuredClone(work);changed.steps[0].doc.data[300].value=2.1e-15;const next=await f.store.save(changed,{expectedRevision:1,checkpoint:true});const backup=await f.store.backup();assert.equal(backup.records.length,1);assert.equal(backup.records[0].work.steps.reduce((n,s)=>n+s.doc.data.length,0),12000);assert.ok(JSON.stringify(next.record.recovery).length<JSON.stringify(work).length*.1);const reopened=await f.open();t.after(()=>reopened.close());assert.equal(reopened.current().work.steps[0].doc.data[300].value,2.1e-15);
});
test('opening another tab and saving unchanged content does not create a false conflict',async t=>{const f=await fixture(t),work=presetWork('classic');await f.store.save(work);const b=await f.open();t.after(()=>b.close());const unchanged=await b.save({...work,updated:Date.now()},{expectedRevision:1});assert.equal(unchanged.record.revision,1);const changed=await f.store.save({...work,name:'first actual edit'},{expectedRevision:1});assert.equal(changed.conflict,false);assert.equal(changed.record.revision,2);});
test('downloaded legacy raw files restore as copies with readable warnings and an exact archive',async t=>{const f=await fixture(t),work=presetWork('classic'),raw=JSON.stringify({projects:[work,{invalid:true}],draft:work});const imported=await f.store.importLegacy(raw);assert.equal(imported.restored.length,1);assert.equal(imported.warnings.length,1);assert.notEqual(imported.restored[0].id,work.id);assert.equal((await f.store.archives())[0].raw,raw);});
test('archive corruption rejects the entire backup before any records are added',async t=>{const f=await fixture(t),work=presetWork('classic');await f.store.save(work);const backup=await f.store.backup();backup.legacy=[{raw:'not original',hash:'wrong'}];await assert.rejects(f.store.importBackup(backup),/校验失败/);assert.equal((await f.store.list()).length,1);});
test('restoring multiple works retains the active work and step independently of file order',async t=>{
 const f=await fixture(t),first=presetWork('classic'),second=presetWork('method-agreement');second.activeStep=second.steps.at(-1).id;
 await f.store.save(first);await f.store.save(second);const backup=await f.store.backup();backup.records.sort((a,b)=>a.id===first.id?-1:b.id===first.id?1:0);
 const copies=await f.store.importBackup(backup),active=f.store.current();assert.equal(active.origin.id,second.id);assert.equal(active.work.activeStep,second.activeStep);assert.equal(active.id,copies.find(c=>c.origin.id===second.id).id);
 const reopened=await f.open();t.after(()=>reopened.close());assert.equal(reopened.current().id,active.id);
 const legacy=await f.store.importLegacy(JSON.stringify({projects:[first,second],draft:second}));assert.equal(f.store.current().origin.id,second.id);assert.equal(legacy.restored.length,2);
});
