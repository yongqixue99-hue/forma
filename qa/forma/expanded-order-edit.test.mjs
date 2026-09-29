import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {newWork,cleanWork,stepEligibility,stepMorphDocument} from '../../src/forma/work-model.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {multivariateExtendedOrderFields,multivariateExtendedCompatibility} from '../../src/forma/multivariate-extended-rules.js';
import {workColorMap} from '../../src/forma/work-scene.js';
import {semanticChanges} from '../../src/forma/data-semantics.js';
const templates=['parallel','radar','ternary','pca','pcaloadings','scree','andrews','radviz'];

test('declared multivariate orders survive supported row sorting and work-file recovery',()=>{
 for(const template of templates){
  const work=newWork([{doc:getExample(template)}]),step=work.steps[0],before=stepMorphDocument(step),ids=step.doc.data.map(r=>r._id).sort();
  if(template==='scree'){const bad=structuredClone(work);bad.steps[0].doc.data.reverse();assert.throws(()=>cleanWork(bad));}
  else step.doc.data.reverse();
  const restored=cleanWork(JSON.parse(JSON.stringify(work))),after=stepMorphDocument(restored.steps[0]);
  assert.equal(stepEligibility(restored.steps[0]).valid,true,template);assert.deepEqual(restored.steps[0].doc.data.map(r=>r._id).sort(),ids);
  assert.equal(multivariateExtendedCompatibility(before,after),'',template);
 }
});

test('renaming complete objects and dimensions updates declared order without changing identity or colors',()=>{
 for(const template of templates)for(const [key,field]of Object.entries(multivariateExtendedOrderFields({template}))){
  const work=newWork([{doc:getExample(template)}]),step=work.steps[0],before=[...workColorMap(step,work.steps)],order=step.doc[key],name=order[0],column=findTemplate(template).fields.findIndex(f=>f[0]===field),indices=step.doc.data.flatMap((r,i)=>r[field]===name?[i]:[]);
  const model=createEditorModel(step.doc,undefined,{viewValidation:doc=>stepEligibility({...step,doc})});
  for(const i of indices)model.setCell(i,column,'Renamed value');
  assert.equal(model.report.valid,true,`${template}/${key}: ${JSON.stringify(model.report)}`);
  assert.deepEqual(model.meta[key],['Renamed value',...order.slice(1)]);
  step.doc=model.doc;assert.deepEqual([...workColorMap(step,work.steps)],before,template+'/'+key);
  const saved=cleanWork(JSON.parse(JSON.stringify(work)));assert.deepEqual(saved.steps[0].doc[key],model.meta[key]);
  model.undo();assert.deepEqual(model.meta[key],order);model.redo();assert.equal(model.report.valid,true);
 }
});

test('malformed orders never poison color consumers and mandatory Andrews metadata is not invented',()=>{
 for(const template of templates)for(const key of Object.keys(multivariateExtendedOrderFields({template})))for(const value of [null,'invalid',[],['unknown']]){
  const work=newWork([{doc:getExample(template)}]),step=work.steps[0];step.doc[key]=value;
  assert.equal(stepEligibility(step).valid,false,template+'/'+key);assert.doesNotThrow(()=>workColorMap(step,work.steps));
 }
 const doc=getExample('andrews');delete doc.variables;assert.throws(()=>newWork([{doc}]),/variables/);assert.equal(doc.variables,undefined);
});

test('sync review exposes engineering parameters and category ordering changes',()=>{
 for(const [template,key,value]of [['smith','referenceImpedance',75],['phasor','frequency',60],['windrose','windSectors',8],['pca','pc1Variance',25],['radar','axisOrder',['different']],['venn','sets',['X','Y','Z']],['adjacency','nodes',['different']],['cycleplot','seasonOrder',['different']]]){
  const before=getExample(template),after={...before,[key]:value};assert.ok(semanticChanges(before,after).some(change=>change.key===key),template+'/'+key);
 }
});
