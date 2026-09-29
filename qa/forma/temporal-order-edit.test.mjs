import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {newWork,cleanWork,stepEligibility,stepMorphDocument} from '../../src/forma/work-model.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {temporalOrderFields,temporalCompatibility} from '../../src/forma/temporal-series-rules.js';
import {workColorMap} from '../../src/forma/work-scene.js';
const templates=['streamgraph','horizon','cycleplot','rankclock','cohort','cohortcurve'];

test('temporal works retain declared order through supported row sorting and save/reopen',()=>{
 for(const template of templates){
  const work=newWork([{doc:getExample(template)}]),step=work.steps[0],before=stepMorphDocument(step),ids=step.doc.data.map(r=>r._id).sort();
  for(const [key,field]of Object.entries(temporalOrderFields(step.doc))){
   if(key==='periodOrder'&&['streamgraph','horizon'].includes(template))assert.equal(step.doc[key],undefined);
   else assert.deepEqual(step.doc[key],[...new Set(step.doc.data.map(r=>r[field]))]);
  }
  if(template==='cohort'){
   const invalid=structuredClone(work);invalid.steps[0].doc.data.reverse();
   assert.throws(()=>cleanWork(invalid),/同期群|cohort/i,'native triangular cohorts require chronological rows');
  }else step.doc.data.reverse();
  const restored=cleanWork(JSON.parse(JSON.stringify(work))),after=stepMorphDocument(restored.steps[0]);
  assert.equal(stepEligibility(restored.steps[0]).valid,true,template);assert.deepEqual(restored.steps[0].doc.data.map(r=>r._id).sort(),ids);
  assert.equal(temporalCompatibility(before,after),'',template);
 }
});

test('complete temporal label renames preserve order and population colors through edits and undo',()=>{
 for(const [template,key,field]of [['streamgraph','seriesOrder','series'],['horizon','seriesOrder','series'],['cycleplot','seasonOrder','season'],['cycleplot','cycleOrder','cycle'],['rankclock','objectOrder','label'],['rankclock','periodOrder','period'],['cohortcurve','cohortOrder','cohort']]){
  const work=newWork([{doc:getExample(template)}]),step=work.steps[0],beforeColors=[...workColorMap(step,work.steps)],order=step.doc[key],old=order[0],column=findTemplate(template).fields.findIndex(f=>f[0]===field),indices=step.doc.data.flatMap((r,i)=>r[field]===old?[i]:[]);
  const model=createEditorModel(step.doc,undefined,{viewValidation:doc=>stepEligibility({...step,doc})});
  for(const [i,row]of indices.entries()){
   model.setCell(row,column,'Renamed population');
   assert.deepEqual(model.meta[key],i===indices.length-1?['Renamed population',...order.slice(1)]:order,template+':'+field);
  }
  assert.equal(model.report.valid,true,template+':'+field);step.doc=model.doc;
  assert.deepEqual([...workColorMap(step,work.steps)],beforeColors,template+':'+field);
  model.undo();assert.deepEqual(model.meta[key],order);model.redo();assert.equal(model.report.valid,true);
  assert.equal(Object.hasOwn(model.doc,'temporalOrderMembers'),false);
 }
});

test('partial temporal rename survives draft and history recovery; explicit invalid orders stay rejected safely',()=>{
 const work=newWork([{doc:getExample('cycleplot')}]),step=work.steps[0],field='season',key='seasonOrder',column=findTemplate('cycleplot').fields.findIndex(f=>f[0]===field),old=step.doc[key][0],indices=step.doc.data.flatMap((r,i)=>r[field]===old?[i]:[]),validate=doc=>stepEligibility({...step,doc});
 const model=createEditorModel(step.doc,undefined,{viewValidation:validate});model.setCell(indices[0],column,'Edited season');
 const next=createEditorModel(model.doc,model.snapshot,{viewValidation:validate,session:model.captureSession()});
 for(const row of indices.slice(1))next.setCell(row,column,'Edited season');
 assert.equal(next.report.valid,true);assert.equal(next.meta[key][0],'Edited season');
 for(const invalid of [null,'bad',[],['Unknown']]){
  const doc=structuredClone(step.doc);doc[key]=invalid;const restored=newWork([{doc}]).steps[0];
  assert.deepEqual(restored.doc[key],invalid);assert.equal(stepEligibility(restored).valid,false);assert.doesNotThrow(()=>workColorMap(restored,[restored]));
 }
});

test('dated series derive chronological order after date edits without stale categorical metadata',()=>{
 const work=newWork([{doc:getExample('streamgraph')}]),step=work.steps[0],doc=structuredClone(step.doc),old=doc.data[0].period;
 for(const row of doc.data)if(row.period===old)row.period='2030-01-01';
 const model=createEditorModel(step.doc,undefined,{viewValidation:doc=>stepEligibility({...step,doc})});model.replace(doc);
 assert.equal(model.report.valid,true);assert.equal(model.doc.periodOrder,undefined);const adapted=stepMorphDocument({...step,doc:model.doc});assert.equal(adapted.periodOrder.at(-1),'2030-01-01');
});
