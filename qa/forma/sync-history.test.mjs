import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presetWork,readWorks,writeWorks,removeWork,cleanWork,WORK_KEY} from '../../src/forma/work-model.js';
import {previewDataSync,applyDataSync,undoDataSync} from '../../src/forma/work-data-sync.js';
import {cleanSyncHistory,SYNC_HISTORY_LIMIT} from '../../src/forma/sync-history.js';
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
function sync(w){const source=w.steps[0];source.doc.data[0].b+=4;return applyDataSync(w,previewDataSync(w,source.id),w.steps.slice(1).map(s=>s.id));}

test('saved sync history restores documents, units, sources and definitions after reopen, keeping current styling',()=>{
  const s=memory(),original=presetWork('method-agreement'),w=structuredClone(original);
  w.steps[0].doc.unit='mm';w.steps[0].doc.source={type:'user',name:'本次采集'};w.steps[0].doc.methodLabels=['设备甲','设备乙'];
  const {work,transaction}=sync(w);work.steps[1].options.palette='cobalt';work.steps[1].duration=2400;work.steps[1].hold=5000;
  writeWorks(s,[work],work,{syncHistory:[transaction]});
  const read=readWorks(s),back=undoDataSync(read.draft,read.syncHistories[work.id][0]);
  assert.deepEqual(back.steps[1].doc,original.steps[1].doc);assert.equal(back.steps[1].options.palette,'cobalt');assert.equal(back.steps[1].duration,2400);assert.equal(back.steps[1].hold,5000);assert.deepEqual(back.steps[0].doc,work.steps[0].doc);
  assert.deepEqual(undoDataSync(read.projects[0],read.syncHistories[work.id][0]).steps[2].doc,original.steps[2].doc);
});
test('newest-first transactions remain reversible across repeated save/reopen, capped at the disclosed five',()=>{
  const s=memory(),initial=presetWork('method-agreement');let work=structuredClone(initial),history=[],before=[];
  for(let i=0;i<7;i++){before.unshift(structuredClone(work.steps[1].doc));const result=sync(work);work=result.work;history=[result.transaction,...history];writeWorks(s,[],work,{syncHistory:history});const restored=readWorks(s);work=restored.draft;history=restored.syncHistories[work.id];}
  assert.equal(history.length,SYNC_HISTORY_LIMIT);
  for(let i=0;i<5;i++){work=undoDataSync(work,history[0]);history.shift();assert.deepEqual(work.steps[1].doc,before[i]);writeWorks(s,[],work,{syncHistory:history});const restored=readWorks(s);work=restored.draft;history=restored.syncHistories[work.id]||[];}
  assert.equal(history.length,0);assert.notDeepEqual(work.steps[1].doc,initial.steps[1].doc);
});
test('history stays with its work across switching and deletion, and does not enter exported work documents',()=>{
  const s=memory(),a=sync(presetWork('method-agreement')),b=sync(presetWork('method-agreement'));
  writeWorks(s,[],a.work,{syncHistory:[a.transaction]});writeWorks(s,[],b.work,{syncHistory:[b.transaction]});
  assert.deepEqual(Object.keys(readWorks(s).syncHistories).sort(),[a.work.id,b.work.id].sort());
  const exported=cleanWork({...a.work,syncHistory:[a.transaction],syncHistories:{[a.work.id]:[a.transaction]}});assert.equal('syncHistory' in exported,false);assert.equal('syncHistories' in exported,false);
  writeWorks(s,[],a.work);assert.equal(readWorks(s).syncHistories[a.work.id].length,1);
  removeWork(s,a.work.id);assert.deepEqual(Object.keys(readWorks(s).syncHistories),[b.work.id]);
});
test('a target edit or missing target prevents all undo after reopen, without a partial mutation',()=>{
  const s=memory(),{work,transaction}=sync(presetWork('method-agreement'));work.steps[2].doc.data[0].b++;
  writeWorks(s,[],work,{syncHistory:[transaction]});const state=readWorks(s),before=structuredClone(state.draft);
  assert.throws(()=>undoDataSync(state.draft,state.syncHistories[work.id][0]),/已被修改/);assert.deepEqual(state.draft,before);
  const removed=structuredClone(work);removed.steps.splice(1,1);assert.throws(()=>undoDataSync(removed,transaction));
});
test('serialization property order alone does not make an undo conflict',()=>{
  const {work,transaction}=sync(presetWork('method-agreement'));
  for(const step of work.steps.slice(1))step.doc=Object.fromEntries(Object.entries(step.doc).reverse());
  assert.doesNotThrow(()=>undoDataSync(work,transaction));
});
test('malformed history is isolated with a recoverable backup instead of dropping the valid work',()=>{
  const s=memory(),{work,transaction}=sync(presetWork('method-agreement'));writeWorks(s,[],work,{syncHistory:[transaction]});
  const corrupted=JSON.parse(s.getItem(WORK_KEY));corrupted.syncHistories[work.id][0].entries[0].before.doc.data[0].b='not numeric';const raw=JSON.stringify(corrupted);s.setItem(WORK_KEY,raw);
  assert.equal(readWorks(s).draft.id,work.id);assert.equal(readWorks(s).historyRecoveryRaw,raw);assert.deepEqual(readWorks(s).syncHistories,{});
  writeWorks(s,[],work);assert.equal([...s.data].find(([key])=>key.includes('.recovery.'))[1],raw);assert.equal(readWorks(s).draft.id,work.id);
  assert.deepEqual(cleanSyncHistory([{...transaction,createdAt:1e20}],work.id),[]);
});
test('a quota failure leaves the previously persisted work and undo history together intact',()=>{
  const s=memory(),first=sync(presetWork('method-agreement'));writeWorks(s,[],first.work,{syncHistory:[first.transaction]});const raw=s.getItem(WORK_KEY),second=sync(first.work);
  const full={...s,setItem:()=>{throw new Error('QuotaExceededError');}};
  assert.throws(()=>writeWorks(full,[],second.work,{syncHistory:[second.transaction,first.transaction]}),/Quota/);assert.equal(s.getItem(WORK_KEY),raw);
});

test('blank drafts and a user edit to numeric text remain protected after harmless draft normalization',async()=>{
  const {createEditorModel}=await import('../../src/forma/editor-model.js');
  for(const value of ['', '45.0000']){
    const input=presetWork('method-agreement');input.steps[0].doc.data[0].b=41;
    const {work,transaction}=sync(input),target=work.steps[1],model=createEditorModel(target.doc);model.setCell(0,2,value);target.doc=model.doc;target.draft=model.snapshot;
    assert.throws(()=>undoDataSync(work,transaction),/已被修改/);
  }
});
