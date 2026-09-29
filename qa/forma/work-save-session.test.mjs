import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createWorkSaveSession} from '../../src/forma/work-save-session.js';
import {openWorkStore} from '../../src/forma/work-store.js';
import {presetWork} from '../../src/forma/work-model.js';

test('retry preserves latest edits and a failed manual-save checkpoint through later autosaves',async t=>{
  const repository=await openWorkStore({indexedDB:new IDBFactory(),storage:null,name:crypto.randomUUID(),broadcast:false});
  t.after(()=>repository.close());
  const initial=(await repository.save(presetWork('classic'))).record,save=repository.save.bind(repository);
  let rejectFirst,calls=0;
  repository.save=async(...args)=>{if(calls++===0)await new Promise((resolve,reject)=>rejectFirst=reject);return save(...args);};
  const session=createWorkSaveSession(repository,initial),manual={...initial.work,name:'Manual save'},latest={...initial.work,name:'Typed during save'};
  session.stage(manual,[],{saved:true,checkpoint:true,label:'手动保存前'});
  const pending=session.flush();session.stage(latest);rejectFirst(new DOMException('full','QuotaExceededError'));
  assert.equal(await pending,false);assert.equal(session.dirty,true);assert.equal(repository.current().work.name,initial.work.name);
  assert.equal(await session.flush(),true);
  const recovered=await repository.get(initial.id);
  assert.equal(recovered.work.name,latest.name);assert.equal(recovered.saved,true);
  assert.equal(recovered.recovery[0].checkpoint,true);assert.equal(recovered.recovery[0].label,'手动保存前');
  session.stage({...latest,name:'A subsequent autosave'});await session.flush();
  const versions=repository.revisions(initial.id);
  assert.deepEqual(versions.map(r=>r.name),[latest.name,initial.work.name],'the manual checkpoint must prevent later autosave coalescing from dropping a restore point');
  assert.equal(session.dirty,false);assert.equal(session.error,null);
});

test('rejecting another work identity leaves previously staged edits intact',async()=>{
  const saves=[],session=createWorkSaveSession({async save(work){saves.push(work);return {record:{id:work.id,revision:2,work}};}},{id:'original',revision:1});
  session.stage({id:'original',name:'Keep my pending edit'});
  assert.throws(()=>session.stage({id:'another',name:'Wrong work'}),/保存对象已切换/);
  assert.equal(await session.flush(),true);
  assert.deepEqual(saves,[{id:'original',name:'Keep my pending edit'}]);assert.equal(session.id,'original');
});

test('a newer explicit checkpoint label wins when several failed saves are combined',async()=>{
  let rejectFirst;const saves=[];
  const session=createWorkSaveSession({async save(work,options){saves.push({work,options});if(saves.length===1)await new Promise((resolve,reject)=>rejectFirst=reject);return {record:{id:work.id,revision:2,work}};}},{id:'work',revision:1});
  session.stage({id:'work',name:'Earlier'},[],{checkpoint:true,saved:true,label:'Earlier manual save'});
  const pending=session.flush();
  session.stage({id:'work',name:'Newest'},[],{checkpoint:true,label:'Latest manual save'});
  rejectFirst(new Error('temporary write failure'));await pending;await session.flush();
  assert.equal(saves[1].work.name,'Newest');assert.equal(saves[1].options.label,'Latest manual save');
  assert.equal(saves[1].options.checkpoint,true);assert.equal(saves[1].options.saved,true);
});
