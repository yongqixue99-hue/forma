import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {openWorkStore,unavailableWorkStore} from '../../src/forma/work-store.js';
import {getExample} from '../../src/forma/catalog.js';
import {presetWork} from '../../src/forma/work-model.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {newSequence} from '../../src/forma/morph-sequence.js';
import {makeBackupSet,readBackupSet,backupBlob,readBackupFiles} from '../../src/forma/work-backup.js';
import {applyDelta} from '../../src/forma/storage-delta.js';

const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
async function fixture(t,storage=memory()){const indexedDB=new IDBFactory(),name=crypto.randomUUID(),open=()=>openWorkStore({indexedDB,name,storage,broadcast:false});const repo=await open();t.after(()=>repo.close());return {repo,open,storage,indexedDB,name};}
const file=(name,data)=>new File([data],name);

test('migrate all saved charts, more than twelve editor drafts and individual valid sequences without dropping neighbors',async t=>{
 const storage=memory(),doc=getExample('column');doc.data[0].value=2.1e-15;doc.data[0]._extra={编号:'00001',备注:'研究\n记录'};const model=createEditorModel(doc);model.setCell(0,1,'未填写');
 const saved=JSON.stringify([{id:'chart-a',doc,options:{palette:'ultramarine'}},{broken:true}]);storage.setItem('forma.documents.v1',saved);
 storage.setItem('forma.editor.v1',JSON.stringify(Array.from({length:15},(_,i)=>({key:`draft:${i}`,doc,draft:i===0?model.snapshot:undefined}))));
 storage.setItem('forma.morph-sequences.v1',JSON.stringify({projects:[newSequence('classic'),{bad:true}]}));
 storage.setItem('forma.editor.active',JSON.stringify('draft:14'));const f=await fixture(t,storage);assert.equal(f.repo.current().id,'record:draft:14');assert.equal((await f.repo.list()).length,17);assert.equal((await f.repo.get('record:draft:0')).work.steps[0].draft.cells[0][1],'未填写');assert.equal((await f.repo.get('chart:chart-a')).work.steps[0].doc.data[0].value,2.1e-15);assert.equal(storage.getItem('forma.documents.v1'),saved);
 const archives=await f.repo.archives();assert.equal(archives.length,3);assert.equal(archives.reduce((n,a)=>n+a.warnings.length,0),2);
 const again=await f.open();t.after(()=>again.close());assert.equal((await again.list()).length,17);assert.deepEqual((await again.get('chart:chart-a')).work,(await f.repo.get('chart:chart-a')).work);
});
test('unchanged old entries stay deduplicated after new edits and deletion; late old edits become copies',async t=>{
 const storage=memory(),doc=getExample('column'),old=[{id:'a',doc},{id:'b',doc}];storage.setItem('forma.documents.v1',JSON.stringify(old));const f=await fixture(t,storage),a=(await f.repo.get('chart:a'));await f.repo.save({...a.work,name:'新页面修改'},{expectedRevision:1});await f.repo.remove('chart:b',1);
 old[0].updated=new Date().toISOString();old.push({id:'c',doc});storage.setItem('forma.documents.v1',JSON.stringify(old));const second=await f.open();t.after(()=>second.close());assert.equal((await second.list()).length,2);assert.equal(second.trash().length,1);assert.equal((await second.get('chart:a')).work.name,'新页面修改');
 old[0]={...old[0],doc:{...doc,title:'旧页面新标题'}};storage.setItem('forma.documents.v1',JSON.stringify(old));const third=await f.open();t.after(()=>third.close());assert.equal((await third.list()).length,3);assert.equal((await third.get('chart:a')).work.name,'新页面修改');assert.ok((await third.list()).some(w=>w.steps[0].doc.title==='旧页面新标题'));
});
test('a migration interrupted after work put rolls back both work and entry marker so retry recovers everything',async t=>{
 const f=await fixture(t),raw=JSON.stringify([{id:'retry',doc:getExample('column')}]);f.storage.setItem('forma.documents.v1',raw);const put=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(v,...args){if(this.name==='meta'&&v.key.startsWith('source:'))throw new DOMException('test interruption','AbortError');return put.call(this,v,...args);};
 try{await assert.rejects(f.open(),{name:'AbortError'});}finally{IDBObjectStore.prototype.put=put;}
 await f.repo.refresh();assert.equal((await f.repo.list()).length,0);const after=await f.open();t.after(()=>after.close());assert.equal((await after.list()).length,1);assert.equal(f.storage.getItem('forma.documents.v1'),raw);
});
test('recycle and restore preserve steps, history and IDs; stale writers and purge cannot resurrect deleted identity',async t=>{
 const f=await fixture(t),w=presetWork('classic');await f.repo.save(w);await f.repo.save({...w,name:'修改后'},{expectedRevision:1,checkpoint:true});const before=(await f.repo.get(w.id));await f.repo.remove(w.id,2);assert.equal((await f.repo.list()).length,0);assert.equal(f.repo.trash().length,1);assert.equal((await f.repo.backup()).records[0].recovery.length,1);
 const stale=await f.repo.save({...w,name:'旧标签写入'},{expectedRevision:2});assert.equal(stale.conflict,true);assert.notEqual(stale.record.id,w.id);const restored=await f.repo.restoreTrash(w.id,3);assert.deepEqual(restored.work,before.work);assert.deepEqual(restored.recovery,before.recovery);
 await assert.rejects(f.repo.purge(w.id,3));await f.repo.remove(w.id,4);await f.repo.purge(w.id,5);assert.equal(f.repo.trash().length,0);const staleAgain=await f.repo.save(w,{expectedRevision:0});assert.equal(staleAgain.conflict,true);assert.notEqual(staleAgain.record.id,w.id);
});
test('v2 backup preview is read-only and restoration retains recycle-bin status and active item',async t=>{
 const f=await fixture(t),a=presetWork('classic'),b=presetWork('method-agreement');await f.repo.save(a);await f.repo.save(b);await f.repo.remove(a.id,1);const backup=await f.repo.backup();assert.equal(backup.version,2);
 const preview=await f.repo.importBackup(backup,{preview:true});assert.equal(preview.works,1);assert.equal(preview.trash,1);assert.equal((await f.repo.list()).length,1);assert.equal(f.repo.trash().length,1);
 await f.repo.importBackup(backup);assert.equal((await f.repo.list()).length,2);assert.equal(f.repo.trash().length,2);assert.equal(f.repo.current().origin.id,b.id);
});
test('partitioned backup preserves Unicode byte boundaries, scientific values, drafts and unknown columns',async t=>{
 const f=await fixture(t),work=presetWork('classic');work.steps[0].doc.data[0].value=2.1e-15;work.steps[0].doc.data[0]._extra={编号:'00007',备注:'中文🌗\n'.repeat(110)};await f.repo.save(work);const backup=await f.repo.backup();const set=await makeBackupSet(backup,{partBytes:1024});assert.ok(set.manifest.parts.length>3);assert.deepEqual(await readBackupSet(new Map([...set.files].reverse())),backup);
 const packed=await backupBlob(backup,{partBytes:1024});assert.deepEqual(await readBackupFiles([file(packed.filename,packed.blob)]),backup);assert.deepEqual(await readBackupFiles([...set.files].map(([name,data])=>file(name,data))),backup);
});
test('missing, foreign, reordered manifests and corrupted parts are rejected before a repository mutation',async t=>{
 const f=await fixture(t),work=presetWork('classic');await f.repo.save(work);const backup=await f.repo.backup(),set=await makeBackupSet(backup,{partBytes:1024});
 const missing=new Map(set.files);missing.delete(set.manifest.parts[1].name);await assert.rejects(readBackupSet(missing),/缺少第 2 卷/);
 const corrupt=new Map(set.files),name=set.manifest.parts[0].name,bytes=set.files.get(name).slice();bytes[0]^=1;corrupt.set(name,bytes);await assert.rejects(readBackupSet(corrupt),/第 1 卷校验失败/);
 const foreign=await makeBackupSet({...backup,createdAt:2},{partBytes:1024}),mixed=new Map(set.files);mixed.set(name,foreign.files.get(name));await assert.rejects(readBackupSet(mixed),/校验失败/);
 const reordered=new Map(set.files);reordered.set('manifest.json',new TextEncoder().encode(JSON.stringify({...set.manifest,parts:[...set.manifest.parts].reverse()})));await assert.rejects(readBackupSet(reordered),/编号/);
 assert.equal((await f.repo.list()).length,1);
});
test('oversize ZIP entries, repeated filenames and unknown archives are rejected before allocation',async()=>{
 const {zipSync}=await import('fflate');const archive=zipSync({'manifest.json':new Uint8Array(1024*1024+1)},{level:9});await assert.rejects(readBackupFiles([file('bad.zip',archive)]),/容量/);
 const duplicate=zipSync({'manifest.json':new Uint8Array(2),'part-0001.forma-part':new Uint8Array(2),'part-0002.forma-part':new Uint8Array(2)});const needle=new TextEncoder().encode('part-0002.forma-part'),replacement=new TextEncoder().encode('part-0001.forma-part');for(let i=0;i<=duplicate.length-needle.length;i++)if(needle.every((v,j)=>duplicate[i+j]===v))duplicate.set(replacement,i);await assert.rejects(readBackupFiles([file('duplicate.zip',duplicate)]),/重复/);
 const unknown=zipSync({'unexpected.txt':new Uint8Array(2)});await assert.rejects(readBackupFiles([file('bad.zip',unknown)]),/不支持/);
});
test('backup cancellation never returns a partial ready archive',async t=>{
 const f=await fixture(t);await f.repo.save(presetWork('classic'));const abort=new AbortController();await assert.rejects(makeBackupSet(await f.repo.backup(),{partBytes:1024,signal:abort.signal,onProgress(){abort.abort();}}),{name:'AbortError'});
});
test('malformed historical deltas cannot request unbounded allocation',()=>{
 assert.throws(()=>applyDelta([],{t:'array',length:1e9,changes:[]}),/历史/);
});

test('when database opening fails, saved charts and unfinished legacy drafts still have a complete downloadable backup',async()=>{
 const storage=memory(),doc=getExample('column'),model=createEditorModel(doc);model.setCell(0,1,'待填写');
 const raw=JSON.stringify([{id:'old',doc}]);storage.setItem('forma.documents.v1',raw);storage.setItem('forma.editor.v1',JSON.stringify([{key:'unfinished',doc,draft:model.snapshot}]));
 const fallback=await unavailableWorkStore(new DOMException('blocked','SecurityError'),storage);assert.equal(fallback.available,false);assert.equal((await fallback.list()).length,2);assert.equal((await fallback.get('record:unfinished')).work.steps[0].draft.cells[0][1],'待填写');await assert.rejects(fallback.save(doc));const backup=await fallback.backup();assert.ok(backup.legacy.some(a=>a.raw===raw));const target=await openWorkStore({indexedDB:new IDBFactory(),storage:{getItem:()=>null},broadcast:false,name:crypto.randomUUID()});await target.importBackup(backup);assert.equal((await target.list()).length,2);target.close();
});

test('older work-set writes keep unchanged neighbors deduplicated, including permanent deletion and timestamp-only changes',async t=>{
 const storage=memory(),a=presetWork('classic'),b=presetWork('method-agreement'),c=presetWork('classic');storage.setItem('forma.works.v1',JSON.stringify({projects:[a,b]}));const f=await fixture(t,storage);await f.repo.save({...a,name:'新界面标题'},{expectedRevision:1});await f.repo.remove(b.id,1);await f.repo.purge(b.id,2);
 storage.setItem('forma.works.v1',JSON.stringify({projects:[{...a,updated:Date.now()+1},b,c]}));const second=await f.open();t.after(()=>second.close());assert.equal((await second.list()).length,2);assert.equal((await second.get(a.id)).work.name,'新界面标题');assert.equal(second.has(b.id),false);
 storage.setItem('forma.works.v1',JSON.stringify({projects:[{...a,name:'旧界面新编辑'},b,c]}));const third=await f.open();t.after(()=>third.close());assert.equal((await third.list()).length,3);assert.equal(third.has(b.id),false);assert.ok((await third.list()).some(w=>w.name.includes('旧界面新编辑')));
});
