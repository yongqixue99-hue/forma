import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {newWork,stepEligibility,stepDomain} from '../../src/forma/work-model.js';
import {workColorMap} from '../../src/forma/work-scene.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
const setup=template=>{
 const work=newWork([{doc:getExample(template)}]),step=work.steps[0],viewValidation=doc=>stepEligibility({...step,doc}),model=createEditorModel(step.doc,undefined,{viewValidation});
 return {work,step,model,viewValidation,column:findTemplate(template).fields.findIndex(f=>f[0]==='group')};
};

test('comparison editors migrate complete group renames by original record membership and preserve direction',()=>{
 for(const template of ['deltaplot','ecdfdiff','qqcompare','worm','spreadlevel']){
  const {work,step,model,column}=setup(template),original=structuredClone(step.doc),order=original.groupOrder,old=order[0],ids=model.recordIds(),beforeColors=[...workColorMap(step,work.steps)],indices=original.data.flatMap((r,i)=>r.group===old?[i]:[]);
  for(const [j,i]of indices.entries()){
   model.setCell(i,column,'Renamed & group');
   assert.deepEqual(model.meta.groupOrder,j===indices.length-1?['Renamed & group',...order.slice(1)]:order,'only a complete original population can be renamed');
  }
  assert.equal(model.report.valid,true,template);assert.deepEqual(model.recordIds(),ids);step.doc=model.doc;
  assert.deepEqual([...workColorMap(step,work.steps)],beforeColors);assert.doesNotThrow(()=>stepDomain(step,work.steps));assert.equal(stepEligibility(step).valid,true);
  assert.deepEqual(step.doc.data.map(({group,...r})=>r),original.data.map(({group,...r})=>r));
  model.undo();assert.deepEqual(model.meta.groupOrder,order);assert.equal(model.report.valid,false);model.redo();assert.deepEqual(model.meta.groupOrder,['Renamed & group',...order.slice(1)]);assert.equal(model.report.valid,true);
 }
});

test('partial rename survives draft/session recovery and paste completes it without swapping the populations',()=>{
 const {step,model,column,viewValidation}=setup('deltaplot'),old=step.doc.groupOrder[0],indices=step.doc.data.flatMap((r,i)=>r.group===old?[i]:[]);
 for(const i of indices.slice(0,3))model.setCell(i,column,'Renamed');
 const draft=model.snapshot,session=model.captureSession(),restored=createEditorModel(model.doc,draft,{viewValidation,session});
 const matrix=restored.cells.map(row=>[row[column]===old?'Renamed':row[column]]);restored.paste(matrix,0,column);
 assert.equal(restored.report.valid,true);assert.deepEqual(restored.meta.groupOrder,['Renamed',step.doc.groupOrder[1]]);assert.deepEqual(restored.recordIds(),model.recordIds());
});

test('merges, split memberships, added/deleted populations and explicit order edits are not guessed as a rename',()=>{
 for(const operation of ['merge','split','delete','add','explicit']){
  const {model,step,column}=setup('deltaplot'),order=step.doc.groupOrder,indices=step.doc.data.flatMap((r,i)=>r.group===order[0]?[i]:[]);
  if(operation==='merge')for(const i of indices)model.setCell(i,column,order[1]);
  if(operation==='split')model.setCell(indices[0],column,'New population');
  if(operation==='delete')for(const i of indices.toReversed())model.deleteRow(i);
  if(operation==='add'){model.addRow();const cells=model.cells;cells.at(-1)[column]='New population';model.setRow(cells.length-1,cells.at(-1));}
  if(operation==='explicit')model.setMeta('groupOrder',['Unknown',order[1]]);
  assert.deepEqual(model.meta.groupOrder,operation==='explicit'?['Unknown',order[1]]:order,operation);
 }
});

test('replacing/reordering the same identified records can rename groups while explicit comparison direction stays authoritative',()=>{
 const {model,step}=setup('deltaplot'),doc=model.doc,order=doc.groupOrder;
 doc.data.reverse();for(const row of doc.data)if(row.group===order[0])row.group='First population renamed';model.replace(doc);
 assert.equal(model.report.valid,true);assert.deepEqual(model.meta.groupOrder,['First population renamed',order[1]]);
 const reversed=[...model.meta.groupOrder].reverse();model.setMeta('groupOrder',reversed);assert.deepEqual(model.meta.groupOrder,reversed);
 const next=model.doc;for(const row of next.data)if(row.group===order[1])row.group='Second renamed';model.replace(next);assert.deepEqual(model.meta.groupOrder,['Second renamed','First population renamed']);assert.equal(model.report.valid,true);
});
