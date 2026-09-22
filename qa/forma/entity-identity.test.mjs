import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presetWork,makeStep,transitionPlan,stepView,cleanWork,readWorks,writeWorks,WORK_KEY} from '../../src/forma/work-model.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';
import {layoutEvaluation,layoutCorrelation} from '../../src/forma/analytical-morph.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {entityProblems} from '../../src/forma/entity-identity.js';
import {workColorMap} from '../../src/forma/work-scene.js';
import {previewDataSync,applyDataSync,undoDataSync} from '../../src/forma/work-data-sync.js';
import {importedTableDocument} from '../../src/forma/table-data.js';

const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};};
const stripEntities=doc=>{delete doc.entities;doc.data.forEach(row=>{delete row._modelId;delete row._variableId;});};

const keys=(step,layout)=>layout(scientificDocument(step),stepView(step)).marks.map(m=>m.key).sort();
test('model names can change without replacing threshold geometry or correspondence',()=>{
  const work=presetWork('classifier-comparison'),a=work.steps[0],b=structuredClone(a);b.id='renamed';
  const editor=createEditorModel(b.doc);for(const e of editor.meta.entities.items)editor.editEntity('rename',{id:e.id,name:'新名称 '+e.name});b.doc=editor.doc;
  assert.deepEqual(keys(b,layoutEvaluation),keys(a,layoutEvaluation));
  assert.equal(transitionPlan(a,b,{steps:[a,b]}).mode,'morph');
});
test('independent same-name models do not reuse model geometry identity',()=>{
  const a=presetWork('classifier-comparison').steps[0],doc=structuredClone(a.doc);
  delete doc.entities;doc.data.forEach(r=>{delete r._id;delete r._modelId;});
  const b=makeStep({doc,view:a.view,dataGroup:'independent-evaluation'}),before=new Set(keys(a,layoutEvaluation));
  assert.ok(keys(b,layoutEvaluation).every(k=>!before.has(k)));
});
test('variable rename and record reorder preserve pair identity and compatible transitions',()=>{
  const work=presetWork('correlation-exploration'),a=work.steps[0],b=structuredClone(a);b.id='renamed';
  const editor=createEditorModel(b.doc);for(const e of editor.meta.entities.items)editor.editEntity('rename',{id:e.id,name:'改名 '+e.name});b.doc=editor.doc;b.doc.data.reverse();
  assert.deepEqual(keys(b,layoutCorrelation),keys(a,layoutCorrelation));
  assert.equal(transitionPlan(a,b,{steps:[a,b]}).mode,'morph');
});
test('independent same-name variables do not reuse variable-pair geometry identity',()=>{
  const a=presetWork('correlation-exploration').steps[0],doc=structuredClone(a.doc);
  delete doc.entities;doc.data.forEach(r=>{delete r._id;delete r._variableId;});
  const b=makeStep({doc,view:a.view,dataGroup:'independent-correlation'}),before=new Set(keys(a,layoutCorrelation));
  assert.ok(keys(b,layoutCorrelation).every(k=>!before.has(k)));
});

test('model rename, matrix reorder and undo persist exact IDs, values and model colors',()=>{
  for(const preset of ['classifier-comparison','correlation-exploration']){
    const work=presetWork(preset),step=work.steps[0],before=structuredClone(step.doc),editor=createEditorModel(step.doc),id=editor.meta.entities.items[0].id;
    editor.editEntity('rename',{id,name:'新名称'});editor.editEntity('move',{id,index:editor.meta.entities.items.length-1});
    const changed=editor.doc;assert.deepEqual(changed.data.map(r=>r._id),before.data.map(r=>r._id));assert.deepEqual(changed.data.map(r=>r.score??r.value),before.data.map(r=>r.score??r.value));
    step.doc=changed;step.draft=editor.snapshot;const reopened=cleanWork(JSON.parse(JSON.stringify(work)));assert.deepEqual(reopened.steps[0].doc,changed);
    if(preset==='classifier-comparison')assert.equal(workColorMap(step,work.steps).get(id),0);
    editor.undo();editor.undo();assert.deepEqual(editor.doc,before);editor.redo();assert.equal(editor.meta.entities.items[0].name,'新名称');
  }
});
test('explicit same-name replacement changes identity without fabricating or dropping observations',()=>{
  for(const preset of ['classifier-comparison','correlation-exploration']){
    const a=presetWork(preset).steps[0],b=structuredClone(a),editor=createEditorModel(b.doc),before=editor.doc;
    for(const entity of editor.meta.entities.items)editor.editEntity('replace',{id:entity.id});b.id='replacement';b.doc=editor.doc;
    assert.deepEqual(b.doc.data.map(r=>[r.model??r.variable,r.score??r.value,r._id]),before.data.map(r=>[r.model??r.variable,r.score??r.value,r._id]));
    assert.equal(transitionPlan(a,b,{steps:[a,b]}).mode,'gather');
    const layout=preset==='classifier-comparison'?layoutEvaluation:layoutCorrelation,old=new Set(keys(a,layout));assert.ok(keys(b,layout).every(k=>!old.has(k)));
  }
});
test('new entities start with blank measures; delete and undo keep complete rows and identities',()=>{
  for(const preset of ['classifier-comparison','correlation-exploration']){
    const doc=presetWork(preset).steps[0].doc,editor=createEditorModel(doc),before=editor.snapshot,model=doc.entities.kind==='model';
    editor.editEntity('create',{name:'待填写'});const draft=editor.snapshot,newRows=draft.cells.slice(before.cells.length);
    assert.equal(newRows.length,new Set(before.cells.map(r=>r[0])).size);assert.ok(newRows.every(row=>row.at(-1)===''));assert.equal(editor.report.valid,false);assert.equal(editor.report.cellErrors.length,newRows.length);
    assert.equal(new Set(draft.rowMeta.map(r=>r._id)).size,draft.rowMeta.length);editor.undo();assert.deepEqual(editor.snapshot,before);
    const id=doc.entities.items[0].id,ref=model?'_modelId':'_variableId';editor.editEntity('delete',{id});assert.equal(editor.cells.length,before.cells.length-before.rowMeta.filter(r=>r[ref]===id).length);editor.undo();assert.deepEqual(editor.snapshot,before);
  }
});
test('merging overlapping samples and renaming to an existing name fail atomically',()=>{
  for(const preset of ['classifier-comparison','correlation-exploration']){
    const editor=createEditorModel(presetWork(preset).steps[0].doc),before=editor.snapshot,[a,b]=editor.meta.entities.items;
    assert.throws(()=>editor.editEntity('merge',{id:a.id,targetId:b.id}),/同一样本/);assert.deepEqual(editor.snapshot,before);
    assert.throws(()=>editor.editEntity('rename',{id:a.id,name:b.name}),/同名/);assert.deepEqual(editor.snapshot,before);
  }
});
test('sheet assignment and rectangular edits cannot silently rename an entity',()=>{
  const editor=createEditorModel(presetWork('classifier-comparison').steps[0].doc),before=editor.snapshot;
  editor.paste([['未登记模型'],['未登记模型']],0,1);assert.equal(editor.report.valid,false);assert.deepEqual(editor.report.cellErrors.map(e=>[e.row,e.col]),[[0,1],[1,1]]);assert.deepEqual(editor.meta.entities,before.meta.entities);
  editor.undo();assert.deepEqual(editor.snapshot,before);
});
test('independent table import keeps original headers and generates new entity IDs',()=>{
  const original=presetWork('classifier-comparison').steps[0].doc,table={headers:['对象','算法','答案','概率'],rows:original.data.map(r=>[r.label,r.model,String(r.actual),String(r.score)])};
  const imported=importedTableDocument(original,table,[0,1,2,3]).doc;
  assert.deepEqual(imported.tableInput.headers,table.headers);assert.equal(imported.data.length,original.data.length);assert.ok(imported.entities.items.every(e=>!original.entities.items.some(old=>old.id===e.id)));
});
test('legacy works and persisted sync history migrate together and remain undoable',()=>{
  const storage=memory(),input=presetWork('classifier-comparison');input.steps[0].doc.data[0].score=.12345;
  const {work,transaction}=applyDataSync(input,previewDataSync(input),input.steps.slice(1).map(s=>s.id));
  work.steps.forEach(s=>stripEntities(s.doc));
  transaction.entries.forEach(e=>{stripEntities(e.before.doc);const after=JSON.parse(e.after);stripEntities(after[0]);e.after=JSON.stringify(after);});
  storage.setItem(WORK_KEY,JSON.stringify({version:1,projects:[work],drafts:[work],draft:work,syncHistories:{[work.id]:[transaction]}}));
  const state=readWorks(storage);assert.ok(state.draft);assert.deepEqual(state.draft.steps[0].doc.entities,state.draft.steps[1].doc.entities);
  const undone=undoDataSync(state.draft,state.syncHistories[work.id][0]);assert.notEqual(undone.steps[1].doc.data[0].score,.12345);assert.equal(undone.steps[0].doc.data[0].score,.12345);
  writeWorks(storage,state.projects,undone,{syncHistory:[]});assert.deepEqual(readWorks(storage).draft,undone);
});
test('registry corruption is rejected rather than reassigned by names',()=>{
  const work=presetWork('correlation-exploration'),row=work.steps[0].doc.data[0];row._variableId='missing';
  assert.match(entityProblems(work.steps[0].doc)[0].message,/身份不一致/);assert.throws(()=>cleanWork(work),/身份不一致/);
});

test('series and parent registries preserve identity through rename, reorder, import, save and synchronization',async()=>{
 const {seriesDocument}=await import('../../src/forma/series-rules.js'),{layoutSeries}=await import('../../src/forma/series-morph.js'),{relationalDocument}=await import('../../src/forma/relational-rules.js'),{layoutHierarchy}=await import('../../src/forma/hierarchy-morph.js');
 for(const preset of ['series-revenue','research-budget']){
  const work=presetWork(preset),a=work.steps[0],before=structuredClone(a.doc),editor=createEditorModel(a.doc),entity=editor.meta.entities.items[0],series=preset==='series-revenue',map=series?seriesDocument:relationalDocument,layout=series?layoutSeries:layoutHierarchy;
  const colors=workColorMap(a,work.steps),keys=layout(map(a),stepView(a)).marks.map(m=>m.key).sort();
  editor.editEntity('rename',{id:entity.id,name:'重命名'});editor.editEntity('move',{id:entity.id,index:editor.meta.entities.items.length-1});a.doc=editor.doc;
  assert.equal(editor.report.dataValid,true);assert.deepEqual(layout(map(a),stepView(a)).marks.map(m=>m.key).sort(),keys);assert.equal(workColorMap(a,work.steps).get(entity.id),colors.get(entity.id));
  const sync=applyDataSync(work,previewDataSync(work),work.steps.slice(1).map(s=>s.id));
  assert.ok(sync.work.steps.every(s=>JSON.stringify(s.doc.entities)===JSON.stringify(a.doc.entities)));assert.deepEqual(cleanWork(JSON.parse(JSON.stringify(sync.work))).steps[0].doc,a.doc);
  editor.undo();editor.undo();assert.deepEqual(editor.doc,before);
  const f=(await import('../../src/forma/catalog.js')).findTemplate(a.doc.template).fields,table={headers:f.map(v=>'原表-'+v[0]),rows:a.doc.data.map(r=>f.map(v=>String(r[v[0]])))};
  const imported=importedTableDocument(a.doc,table,f.map((_,i)=>i)).doc;assert.deepEqual(imported.tableInput.headers,table.headers);assert.ok(imported.entities.items.every(e=>!a.doc.entities.items.some(old=>old.id===e.id)));
  editor.editEntity('create',{name:'待填系列'});if(!series)assert.equal(editor.report.valid,false);assert.ok(editor.cells.slice(before.data.length).every(r=>r.at(-1)===''));
 }
});
