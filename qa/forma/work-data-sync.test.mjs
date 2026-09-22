import {payload} from './payload.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presetWork,makeStep,newWork,stepView} from '../../src/forma/work-model.js';
import {getExample} from '../../src/forma/catalog.js';
import {previewDataSync,applyDataSync,undoDataSync} from '../../src/forma/work-data-sync.js';
import {createEditorModel} from '../../src/forma/editor-model.js';

function edited(){const w=presetWork('method-agreement');w.steps[0].doc.data[0].b+=4;return w;}
test('sync changes selected linked documents atomically while preserving independent editing, style, title and rhythm',()=>{
  const w=edited(),original=structuredClone(w),source=w.steps[0],target=w.steps[2];target.doc.title='保留的标题';target.doc.subtitle='保留的说明';target.options.palette='cobalt';target.hold=4000;target.duration=2400;
  const before=structuredClone(w),preview=previewDataSync(w),result=applyDataSync(w,preview,[target.id]);
  assert.deepEqual(w,before);assert.deepEqual(result.work.steps[0],source);assert.deepEqual(result.work.steps[1],w.steps[1]);assert.deepEqual(result.work.steps[3],w.steps[3]);
  const changed=result.work.steps[2];assert.deepEqual(changed.doc.data,source.doc.data);assert.equal(changed.doc.title,'保留的标题');assert.equal(changed.doc.subtitle,'保留的说明');assert.deepEqual(changed.options,target.options);assert.equal(changed.duration,2400);assert.equal(changed.hold,4000);assert.equal(stepView(changed),stepView(target));assert.equal(changed.dataGroup,target.dataGroup);
  assert.notDeepEqual(changed.doc.data,original.steps[2].doc.data);assert.deepEqual(undoDataSync(result.work,result.transaction),before);
});
test('already equal and independent steps are not selectable, even with identical labels',()=>{
  const w=presetWork('method-agreement');assert.ok(previewDataSync(w).targets.every(t=>!t.eligible));
  w.steps[0].doc.data[0].b++;w.steps[1].dataGroup='independent';w.steps[2].relation='separate';
  const p=previewDataSync(w);assert.match(p.targets[0].reason,/独立/);assert.match(p.targets[1].reason,/独立/);assert.equal(p.targets[2].eligible,true);
  assert.throws(()=>applyDataSync(w,p,[w.steps[3].id,w.steps[1].id]),/无法同步/);assert.notDeepEqual(w.steps[3].doc.data,w.steps[0].doc.data);
});
test('explicit related boundaries can join source groups; edited units and method definitions are copied together',()=>{
  const w=edited();w.steps[1].dataGroup='separate-origin';w.steps[1].relation='related';w.steps[0].doc.unit='mm';w.steps[0].doc.source={name:'输入测量',type:'user'};w.steps[0].doc.methodLabels=['设备甲','设备乙'];
  const p=previewDataSync(w),t=p.targets[0];assert.equal(t.eligible,true);assert.equal(t.metadataChanged,true);
  const next=applyDataSync(w,p,[t.id]).work.steps[1];assert.equal(next.doc.unit,'mm');assert.deepEqual(next.doc.methodLabels,['设备甲','设备乙']);assert.equal(next.doc.source.name,'输入测量');assert.equal(next.dataGroup,'separate-origin');
});
test('invalid drafts, incompatible target views and too many rows are blocked without truncation',()=>{
  const w=edited(),model=createEditorModel(w.steps[1].doc);model.setCell(0,1,'未填');w.steps[1].draft=model.snapshot;
  assert.equal(previewDataSync(w).targets[0].eligible,false);
  const m=createEditorModel(w.steps[0].doc);m.setCell(0,1,'未填');w.steps[0].draft=m.snapshot;assert.throws(()=>previewDataSync(w),/修正/);delete w.steps[0].draft;
  w.steps[0].doc.data=getExample('blandaltman').data;const p=previewDataSync(w);assert.equal(p.targets[2].eligible,false);assert.match(p.targets[2].reason,/20/);assert.equal(w.steps[0].doc.data.length,36);
  w.steps[2].doc=getExample('residual');w.steps[2].view='prediction-scatter';assert.equal(previewDataSync(w).targets[1].eligible,false);
});
test('stale previews and unknown or repeated targets never apply a partial update',()=>{
  const w=edited(),p=previewDataSync(w),ids=[w.steps[1].id,w.steps[2].id];
  for(const bad of [[],[ids[0],ids[0]],[ids[0],'unknown'],[w.steps[0].id]])assert.throws(()=>applyDataSync(w,p,bad));
  w.steps[0].doc.data[1].b++;const before=structuredClone(w);assert.throws(()=>applyDataSync(w,p,ids),/预览后/);assert.deepEqual(w,before);
});
test('undo preserves subsequent style and source changes but never overwrites later target data',()=>{
  const w=edited(),p=previewDataSync(w),{work:next,transaction}=applyDataSync(w,p,[w.steps[1].id,w.steps[2].id]);
  next.steps[1].options.palette='cobalt';next.steps[1].hold=5000;next.steps[0].doc.data[0].b+=7;
  const back=undoDataSync(next,transaction);assert.deepEqual(back.steps[1].doc,w.steps[1].doc);assert.equal(back.steps[1].hold,5000);assert.equal(back.steps[1].options.palette,'cobalt');assert.deepEqual(back.steps[0],next.steps[0]);
  next.steps[2].doc.data[0].a++;const before=structuredClone(next);assert.throws(()=>undoDataSync(next,transaction),/已被修改/);assert.deepEqual(next,before);
  const missing=structuredClone(next);missing.steps.splice(1,1);assert.throws(()=>undoDataSync(missing,transaction));
});
test('native category aliases are adapted explicitly without replacing the target chart',()=>{
  const a={...getExample('bar'),data:[{label:'一月',value:14},{label:'二月',value:21},{label:'三月',value:30}]},b=getExample('singleline');
  const w=newWork([{doc:a,dataGroup:'same'},{doc:b,dataGroup:'same'}]),p=previewDataSync(w);assert.equal(p.targets[0].eligible,true);
  const result=applyDataSync(w,p,[w.steps[1].id]).work;assert.equal(result.steps[1].doc.template,'singleline');assert.deepEqual(payload(result.steps[1].doc.data),payload(a.data.map(r=>({period:r.label,value:r.value}))));assert.equal(stepView(result.steps[1]),'line');
});
