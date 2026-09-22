import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presetWork} from '../../src/forma/work-model.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';
import {layoutSamples,layoutObservations} from '../../src/forma/scientific-morph.js';
const sample=()=>scientificDocument(presetWork('sample-distributions').steps[0]);
const summaries=doc=>layoutSamples(doc,'sample-box').marks.filter(m=>m.role==='box').map(m=>({key:m.key,ids:[...m.recordIds].sort()}));
test('summary identity follows contributing records through group rename and row reorder',()=>{
  const doc=sample(),before=summaries(doc),renamed=structuredClone(doc);
  renamed.data=renamed.data.toReversed().map(r=>({...r,group:`新名称 ${r.group}`}));
  assert.deepEqual(summaries(renamed).sort((a,b)=>a.key.localeCompare(b.key)),before.sort((a,b)=>a.key.localeCompare(b.key)));
});
test('same display name cannot join different sample populations',()=>{
  const doc=sample(),different=structuredClone(doc);different.data.forEach(r=>r._id=`other:${r._id}`);
  assert.ok(summaries(different).every(m=>!summaries(doc).some(a=>a.key===m.key)));
});
test('summary identity changes for merged populations and stays stable for numeric edits',()=>{
  const doc=sample(),before=summaries(doc),edited=structuredClone(doc);edited.data[0].value+=1;
  assert.deepEqual(summaries(edited),before);
  const names=[...new Set(doc.data.map(r=>r.group))],merged=structuredClone(doc);merged.data.forEach(r=>{if(r.group===names[1])r.group=names[0];});
  const mergedMark=summaries(merged).find(m=>m.ids.length>before[0].ids.length);
  assert.ok(mergedMark);assert.ok(!before.some(m=>m.key===mergedMark.key));
});

test('OLS model identity belongs to its observed population, including after serialization',async()=>{
  const {getExample}=await import('../../src/forma/catalog.js'),{makeStep,cleanWork,newWork}=await import('../../src/forma/work-model.js');
  const work=newWork([{doc:getExample('regression')}]),doc=scientificDocument(work.steps[0]),before=layoutObservations(doc,'obs-confidence').marks.find(m=>m.role==='fit').key;
  const restored=cleanWork(JSON.parse(JSON.stringify(work))),same=scientificDocument(restored.steps[0]);same.data.reverse();same.data.forEach(r=>r.group='改名');
  assert.equal(layoutObservations(same,'obs-confidence').marks.find(m=>m.role==='fit').key,before);
  same.data.forEach(r=>r._id=`different:${r._id}`);assert.notEqual(layoutObservations(same,'obs-confidence').marks.find(m=>m.role==='fit').key,before);
});

test('sample group colors share the same population mapping after rename, reverse order and reopen',async()=>{
  const {workColorMap}=await import('../../src/forma/work-scene.js'),{populationId}=await import('../../src/forma/data-identity.js');
  const work=presetWork('sample-distributions'),step=structuredClone(work.steps[0]);step.id='renamed';step.doc.data.reverse();step.doc.data.forEach(r=>r.group='新'+r.group);work.steps.push(step);
  const colors=workColorMap(step,work.steps),groups=Object.values(Object.groupBy(work.steps[0].doc.data,r=>r.group));
  assert.equal(colors.size,groups.length);
  groups.forEach((rows,index)=>assert.equal(colors.get(populationId('sample-group',rows)),index));
  const restored=JSON.parse(JSON.stringify(work));assert.deepEqual(workColorMap(restored.steps.at(-1),restored.steps),colors);
});
