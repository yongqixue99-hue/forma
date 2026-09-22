import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presetWork,cleanWork,transitionPlan,stepReport,stepDomain} from '../../src/forma/work-model.js';
import {previewDataSync,applyDataSync,undoDataSync} from '../../src/forma/work-data-sync.js';
import {englishDemo} from '../../src/forma/locale-catalog.js';
import {withRecordIds} from '../../src/forma/data-identity.js';
import {getExample} from '../../src/forma/catalog.js';
import {setLocale} from '../../src/forma/locale.js';

test('SPLOM explicit sync keeps each step focus while copying measurements, identities and variable units; whole undo and save are exact',()=>{
 const w=presetWork('matrix-to-focus'),[source,target]=w.steps,ids=source.doc.entities.items.map(v=>v.id);
 target.doc.selectedPair=[ids[1],ids[2]];target.options.palette='cobalt';target.duration=2100;target.hold=3300;
 source.doc.data[0].value+=.125;source.doc.variableUnits={[ids[0]]:'mm',[ids[1]]:'g',[ids[2]]:'mm'};source.doc.source={type:'user',name:'Confirmed original measurements'};
 const before=structuredClone(w),p=previewDataSync(w,source.id),t=p.targets[0];assert.equal(t.eligible,true,t.reason);assert.ok(t.semanticChanges.some(c=>c.key==='variableUnits'));assert.ok(!JSON.stringify(t.semanticChanges.find(c=>c.key==='variableUnits').after).includes('legacy:entity'));
 const result=applyDataSync(w,p,[target.id]),updated=result.work.steps[1];assert.deepEqual(updated.doc.data,source.doc.data);assert.deepEqual(updated.doc.selectedPair,target.doc.selectedPair);assert.deepEqual(updated.doc.sampleEntities,source.doc.sampleEntities);assert.deepEqual(updated.doc.variableUnits,source.doc.variableUnits);assert.equal(updated.options.palette,'cobalt');assert.equal(updated.duration,2100);assert.equal(updated.hold,3300);
 assert.deepEqual(cleanWork(result.work),result.work);assert.deepEqual(undoDataSync(result.work,result.transaction),before);assert.notEqual(transitionPlan(source,updated,{steps:result.work.steps}).mode,'morph');
});

test('removing a selected variable blocks a sync target without silently choosing another pair or modifying any step',()=>{
 const w=presetWork('matrix-to-focus'),[source,target]=w.steps,ids=source.doc.entities.items.map(v=>v.id);target.doc.selectedPair=[ids[0],ids[2]];
 source.doc.data=source.doc.data.filter(r=>r._variableId!==ids[2]);source.doc.entities.items=source.doc.entities.items.filter(v=>v.id!==ids[2]);source.doc.selectedPair=[ids[0],ids[1]];
 assert.ok(stepReport(source).valid);const before=structuredClone(w),p=previewDataSync(w,source.id);assert.equal(p.targets[0].eligible,false);assert.match(p.targets[0].reason,/变量/);assert.throws(()=>applyDataSync(w,p,[target.id]));assert.deepEqual(w,before);
});

test('English demo translation leaves Chinese legacy identity references untouched',()=>{
 const raw=getExample('splom');raw.data.forEach(r=>{r.variable=r.variable.replace('Length','长度').replace('Mass','质量').replace('Width','宽度');});const doc=withRecordIds(raw,{legacyNamespace:'中文测试'});
 setLocale('en');try{const en=englishDemo(doc);assert.deepEqual(en.selectedPair,doc.selectedPair);assert.deepEqual(en.data.map(r=>r._sampleId),doc.data.map(r=>r._sampleId));assert.deepEqual(en.entities.items.map(r=>r.id),doc.entities.items.map(r=>r.id));}finally{setLocale('zh-CN');}
});

test('two new research families remain eligible with independent domains and closed saved documents',()=>{
 for(const id of ['process-variation','matrix-to-focus']){const w=presetWork(id);assert.equal(transitionPlan(...w.steps,{steps:w.steps}).mode,'morph');assert.deepEqual(cleanWork(w),w);for(const s of w.steps){assert.ok(stepReport(s).valid);assert.ok(Object.keys(stepDomain(s,w.steps)).length>=2);}}
});
