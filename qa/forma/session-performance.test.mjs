import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {openWorkStore,RECORD_CACHE_LIMIT,workSummary} from '../../src/forma/work-store.js';
import {newWork,presetWork} from '../../src/forma/work-model.js';
import {getExample} from '../../src/forma/catalog.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
const config=indexedDB=>({indexedDB,name:crypto.randomUUID(),storage:{getItem:()=>null},broadcast:false});

test('locale session restores invalid scientific input, rectangular edits, undo and redo without changing identity',()=>{
 const model=createEditorModel(getExample('volcano')),initial=model.snapshot,ids=model.recordIds();
 model.setCell(0,2,'3.1e-18');const decimal=model.snapshot;
 model.setCell(1,2,'unfinished');const invalid=model.snapshot;assert.equal(model.report.valid,false);
 const resume=createEditorModel(model.doc,invalid,{session:model.captureSession()});assert.deepEqual(resume.recordIds(),ids);assert.equal(resume.report.valid,false);
 resume.undo();assert.deepEqual(resume.snapshot,decimal);resume.undo();assert.deepEqual(resume.snapshot,initial);resume.redo();assert.deepEqual(resume.snapshot,decimal);resume.redo();assert.deepEqual(resume.snapshot,invalid);
 resume.paste([['Feature A','2','1e-20'],['Feature B','-3','2e-19']],0,0);const patched=resume.snapshot;
 const again=createEditorModel(resume.doc,resume.snapshot,{session:resume.captureSession()});again.undo();assert.deepEqual(again.snapshot,invalid);again.redo();assert.deepEqual(again.snapshot,patched);assert.deepEqual(again.recordIds(),ids);
});
test('stale session history cannot overwrite a newer saved draft or introduce duplicate record IDs',()=>{
 const model=createEditorModel(getExample('column'));model.setCell(0,1,'24');const history=model.captureSession();model.setCell(0,1,'25');assert.throws(()=>createEditorModel(model.doc,model.snapshot,{session:history}),/现场已变化/);
 const bad=model.captureSession();bad.past[0].rowMeta[1]._id=bad.past[0].rowMeta[0]._id;assert.throws(()=>createEditorModel(model.doc,model.snapshot,{session:bad}),/现场已变化/);
});
test('large catalogue reopening reads summaries plus active work only, while cache eviction never removes saved works or versions',async t=>{
 const options=config(new IDBFactory()),store=await openWorkStore(options);t.after(()=>store.close());const ids=[];
 for(let i=0;i<12;i++){const work=newWork([{doc:getExample('column')}],`Work ${i}`);ids.push(work.id);const s=await store.save(work);await store.save({...work,name:`Edited ${i}`},{expectedRevision:s.record.revision,checkpoint:true});}
 assert.ok(store.cacheInfo().records<=RECORD_CACHE_LIMIT);assert.equal(store.summaries().length,12);
 const before=await store.backup(),reads=[],original=IDBObjectStore.prototype.getAll;
 IDBObjectStore.prototype.getAll=function(...args){reads.push(this.name);return original.apply(this,args);};let reopened;
 try{reopened=await openWorkStore(options);await reopened.usage();}finally{IDBObjectStore.prototype.getAll=original;}
 t.after(()=>reopened.close());assert.equal(reads.includes('works'),false);assert.equal(reopened.cacheInfo().records,1);assert.equal(reopened.summaries().length,12);
 for(const id of ids){const record=await reopened.get(id);assert.ok(record);assert.equal(record.recovery.length,1);assert.ok(reopened.cacheInfo().records<=RECORD_CACHE_LIMIT);}
 assert.equal((await reopened.list()).length,12);assert.deepEqual((await reopened.backup()).records,before.records);
 assert.deepEqual(reopened.summaries().map(r=>r.id).sort(),ids.sort());
});
test('version 2 migration indexes original records and history without rewriting work bodies',async t=>{
 const options=config(new IDBFactory()),work=presetWork('classic'),record={id:work.id,work,revision:7,saved:true,sync:[],recovery:[],writer:'old',committedAt:1};
 const db=await new Promise((resolve,reject)=>{const r=options.indexedDB.open(options.name,2);r.onupgradeneeded=()=>{r.result.createObjectStore('works',{keyPath:'id'});r.result.createObjectStore('meta',{keyPath:'key'});r.result.createObjectStore('legacy',{keyPath:'hash'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 await new Promise((resolve,reject)=>{const tx=db.transaction(['works','meta'],'readwrite');tx.objectStore('works').put(record);tx.objectStore('meta').put({key:'active',id:work.id});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();
 const store=await openWorkStore(options);t.after(()=>store.close());assert.deepEqual((await store.backup()).records,[record]);assert.deepEqual(store.summaries(),[workSummary(record)]);assert.deepEqual(store.current().work,work);
});
test('aborted updates and trash operations keep summary index consistent with full records',async t=>{
 const options=config(new IDBFactory()),store=await openWorkStore(options);t.after(()=>store.close());const work=newWork([{doc:getExample('column')}]),saved=await store.save(work),before=store.summaries();
 const controller=new AbortController();controller.abort();await assert.rejects(store.save({...work,name:'must not appear'},{expectedRevision:1,signal:controller.signal}));assert.deepEqual(store.summaries(),before);
 await store.remove(work.id,saved.record.revision);assert.equal(store.summaries().length,0);assert.equal(store.trash().length,1);
 let record=(await store.backup()).records[0];await store.restoreTrash(work.id,record.revision);assert.equal(store.summaries().length,1);
 record=await store.get(work.id);await store.remove(work.id,record.revision);await store.purge(work.id,record.revision+1);await store.refresh();assert.equal(store.has(work.id),false);assert.equal(store.trash().length,0);assert.equal((await store.backup()).records.length,0);
});

test('formula review requirement depends on workbook metadata, not translated prose',async()=>{
 const {requiresFormulaReview}=await import('../../src/forma/workbook-notes.js');
 for(const notes of [[],['1 个公式'],['One cached formula'],['reworded explanation']])assert.equal(requiresFormulaReview({origin:{formulaCount:1,formulaPolicy:'cached-results-only'},notes}),true);
 assert.equal(requiresFormulaReview({origin:{kind:'paste'},notes:['User text mentions formula']}),false);
});

test('locale checkpoint writes workbook bytes, remains recoverable until acknowledged, and belongs to this tab',async()=>{
 const previous={indexedDB:globalThis.indexedDB,sessionStorage:globalThis.sessionStorage},entries=new Map();
 globalThis.indexedDB=new IDBFactory();globalThis.sessionStorage={getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
 try{
  const {saveLocaleSession,takeLocaleSession,clearLocaleSession}=await import('../../src/forma/locale-session.js');
  const file=new File([new Uint8Array([80,75,0,9])],'original.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  await saveLocaleSession({editor:{workspace:{importer:{file,text:'original input'}}}});
  const restored=await takeLocaleSession();assert.equal(restored.editor.workspace.importer.file.name,'original.xlsx');assert.ok(restored.editor.workspace.importer.file.bytes instanceof ArrayBuffer);assert.deepEqual([...new Uint8Array(restored.editor.workspace.importer.file.bytes)],[80,75,0,9]);assert.deepEqual(await takeLocaleSession(),restored);
  await clearLocaleSession();assert.equal(await takeLocaleSession(),null);
 }finally{for(const [k,v]of Object.entries(previous))if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
});
