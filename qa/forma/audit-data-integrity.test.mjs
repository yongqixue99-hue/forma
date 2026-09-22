import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {fmt,validateDocument} from '../../src/forma/data.js';
import {formatDecimal} from '../../src/forma/number-format.js';
import {number7} from '../../src/forma/volume7-utils.js';
import {dataContract} from '../../src/forma/data-contract.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {parseTable,splitTable,importedTableDocument,cellsToDocument} from '../../src/forma/table-data.js';
import {newWork,cleanWork,makeStep,stepDomain,transitionPlan,stepEligibility,workReport,presetWork} from '../../src/forma/work-model.js';
import {previewDataSync,applyDataSync,undoDataSync} from '../../src/forma/work-data-sync.js';
import {withRecordIds,recordId} from '../../src/forma/data-identity.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';
import {layoutScientific} from '../../src/forma/scientific-morph.js';
import {layoutMorph} from '../../src/forma/morph.js';
import {workAgentBrief,stepSVG} from '../../src/forma/work-export.js';
import {createWorkExportRenderer} from '../../src/forma/work-video.js';
import {workTimeline} from '../../src/forma/work-timeline.js';
import {violinDensity} from '../../src/forma/volume4-data.js';

// Numeric checks cover displayed text, not only the underlying geometry.
test('scientific decimals never become a displayed zero; invalid and absent values are distinct',()=>{
  for(const value of [0.004,1e-7,-1e-8,2.5e-12,Number.MIN_VALUE])for(const format of [fmt,number7,v=>formatDecimal(v,2)]){
    const text=format(value);assert.notEqual(Number(text.replaceAll(',','')),0,`${value}: ${text}`);
  }
  assert.equal(fmt(null),'—');assert.equal(fmt(NaN),'—');assert.equal(fmt(0),'0');assert.equal(fmt(.004),'0.004');
  const doc=getExample('xy');doc.data.forEach((r,i)=>{r.y=(i+1)*1e-7;});const step=makeStep({doc});
  const layout=layoutScientific(scientificDocument(step),'obs-scatter',800,400);
  assert.ok(layout.marks.some(m=>m.tooltip?.includes('1e-7')));assert.ok(layout.labels.some(l=>String(l.text).includes('e-')));
});

test('one contract supplies every template field, sample, type and original column header',()=>{
  for(const t of catalog){const c=dataContract(getExample(t.id));assert.deepEqual(c.fields.map(f=>[f.key,f.type,f.description]),t.fields);assert.equal(c.fields.length,t.fields.length);assert.ok(c.fields.every(f=>f.typeLabel&&f.label));}
  const doc=getExample('column'),table=splitTable(parseTable('实验批次\t信号强度\t原始备注\nA\t0.004\t未稀释\nB\t0.006\t保留'));
  const imported=importedTableDocument(doc,table,[0,1]);imported.doc.source.name='实验记录';
  assert.deepEqual(dataContract(imported.doc).fields.map(f=>f.header),['实验批次','信号强度']);
  assert.equal(imported.doc.data[0]._extra[2],'未稀释');
  const model=createEditorModel(imported.doc);model.setCell(0,1,'0.005');assert.equal(model.doc.data[0]._extra[2],'未稀释');
  const reopened=createEditorModel(JSON.parse(JSON.stringify(model.doc)));assert.deepEqual(reopened.doc,model.doc);
});

test('rename, insertion, deletion, rectangular overwrite and undo preserve stored record identity',()=>{
  const original=getExample('column'),model=createEditorModel(original),ids=model.doc.data.map(recordId);
  model.setCell(0,0,'重新命名');assert.equal(model.doc.data[0]._id,ids[0]);
  model.insertRows(0,1);model.setRow(0,['新增','3']);assert.equal(model.doc.data[1]._id,ids[0]);assert.ok(!ids.includes(model.doc.data[0]._id));
  model.deleteRow(0);assert.deepEqual(model.doc.data.map(recordId),ids);model.paste([['甲','0.002'],['乙','0.003']],0,0);assert.deepEqual(model.doc.data.map(recordId),ids);
  model.undo();assert.equal(model.doc.data[0].label,'重新命名');assert.deepEqual(model.doc.data.map(recordId),ids);
  assert.ok(original.data.every(r=>r._id===undefined),'input must not be mutated');
  const work=newWork([{doc:model.doc,dataGroup:'observations',view:'columns'},{doc:model.doc,dataGroup:'observations',view:'line'}]);
  const next=work.steps[1];next.doc.data.reverse();next.doc.data[0].label='再次改名';
  assert.equal(transitionPlan(work.steps[0],next).matched.length,ids.length);
  const saved=JSON.parse(JSON.stringify(work));assert.deepEqual(cleanWork(saved),cleanWork(saved));assert.deepEqual(cleanWork(saved).steps[1].doc.data,next.doc.data);
  const brokenDraft=model.snapshot;brokenDraft.rowMeta[1]._id=brokenDraft.rowMeta[0]._id;
  assert.throws(()=>createEditorModel(model.doc,brokenDraft),/草稿.*ID/);
});

test('same display labels in independently imported tables never create record correspondence',()=>{
  const base=getExample('column'),table=splitTable(parseTable('类别\t值\n甲\t1\n乙\t2'));
  const a=importedTableDocument(base,table,[0,1]).doc,b=importedTableDocument(base,table,[0,1]).doc;a.source.name=b.source.name='用户原始记录';
  const w=newWork([{doc:a,dataGroup:'explicit'},{doc:b,dataGroup:'explicit',view:'line'}]);
  assert.equal(transitionPlan(...w.steps).canMorph,false);assert.equal(transitionPlan(...w.steps).effect,'entrance');
  assert.throws(()=>withRecordIds({...a,data:[a.data[0],a.data[0]]}),/ID.*重复/);
});

test('explicit imported IDs allow intentional correspondence and reject blank or duplicate IDs',()=>{
  const base=getExample('xy'),table=splitTable(parseTable('编号\t显示名\t投入\t结果\nS1\t样本甲\t1\t2\nS2\t样本乙\t2\t3\nS3\t样本丙\t3\t4'));
  const {doc}=importedTableDocument(base,table,[1,2,3],{idColumn:0});assert.deepEqual(doc.data.map(recordId),['S1','S2','S3']);
  table.rows[1][0]='S1';assert.throws(()=>importedTableDocument(base,table,[1,2,3],{idColumn:0}),/ID.*重复/);
});

test('layout limits preserve all data and permit a compatible wider view, save and export',()=>{
  const model=createEditorModel(getExample('column'));model.paste(Array.from({length:40},(_,i)=>[`项目${i+1}`,String(i+1)]),0,0);
  assert.equal(model.doc.data.length,40);assert.equal(model.report.dataValid,true);assert.equal(model.report.valid,false);assert.ok(model.report.layoutErrors.length);
  const work=newWork([{doc:model.doc,view:'radialbars'}]);assert.equal(stepEligibility(work.steps[0]).valid,true);assert.equal(workReport(work).valid,true);assert.equal(cleanWork(JSON.parse(JSON.stringify(work))).steps[0].doc.data.length,40);
  assert.match(workAgentBrief(work),/项目40/);
});

test('real invalid numeric cells, probability bounds and reversed intervals locate the exact fields',()=>{
  const m=createEditorModel(getExample('volcano'));const col=catalog.find(t=>t.id==='volcano').fields.findIndex(f=>f[0]==='padj');
  m.setCell(2,col,'0');assert.equal(m.report.valid,false);assert.ok(m.report.cellErrors.some(e=>e.row===2&&e.col===col));assert.equal(m.cells[2][col],'0');
  m.undo();m.setCell(2,col,'');assert.ok(m.report.cellErrors.some(e=>e.row===2&&e.col===col));assert.notEqual(m.doc.data[2].padj,0);
  const doc=getExample('interval'),fields=catalog.find(t=>t.id==='interval').fields;const cells=doc.data.map(r=>fields.map(([k])=>String(r[k])));cells[0][fields.findIndex(f=>f[0]==='low')]='99999';
  assert.ok(cellsToDocument(doc,cells).errors.some(e=>e.row===0));
});

test('blank rows and missing cells survive parsing and are not silently zero-filled',()=>{
  const matrix=parseTable('名字\t数值\n甲\t1\n\t\n乙\t\n\t');assert.equal(matrix.length,5);assert.deepEqual(matrix[2],['','']);assert.deepEqual(matrix[4],['','']);
  const imported=importedTableDocument(getExample('column'),splitTable(matrix),[0,1]);assert.equal(imported.cells.length,4);assert.ok(Number.isNaN(imported.doc.data[1].value));
});

test('axis domains honor zero-based bars, measurement extents, tiny values and explicitly separate sources',()=>{
  const w=presetWork('series-revenue');for(const s of w.steps)s.doc.data.forEach(r=>r.value*=1e-8);
  assert.ok(stepDomain(w.steps[0],w.steps)[1]<.00001);
  const pair=presetWork('paired-evaluation');const isolated={...pair.steps[0],scale:'shared'};assert.ok(stepDomain(isolated,[isolated])[0]>0);
  assert.equal(stepDomain(pair.steps.find(s=>s.view==='paired-bars'),pair.steps)[0],0);
  const simple=presetWork('classic'),step=simple.steps[0],other=structuredClone(step);other.id='separate';other.relation='separate';other.doc.data.forEach(r=>r.value=1e9);assert.deepEqual(stepDomain(step,[step,other]),stepDomain(step,[step]));
  const doc={...step.doc,data:step.doc.data.map((r,i)=>({...r,value:(i%2?-1:1)*(i+1)*1e-8}))};
  const tiny=layoutMorph(doc,'diverging',800,440),normal=layoutMorph({...doc,data:doc.data.map(r=>({...r,value:r.value*1e8}))},'diverging',800,440);
  // Scientific notation can reserve more label space; relative bar lengths
  // must still be invariant under a change of measurement unit.
  const tinyMax=Math.max(...tiny.marks.map(m=>m.geometry.width)),normalMax=Math.max(...normal.marks.map(m=>m.geometry.width));
  assert.ok(tinyMax>100&&normalMax>100);
  tiny.marks.forEach((mark,i)=>assert.ok(Math.abs(mark.geometry.width/tinyMax-normal.marks[i].geometry.width/normalMax)<1e-8));
});

test('shared KDE bandwidth and density shape scale with the measurement unit',()=>{
  const groups=[{group:'A',values:Array.from({length:24},(_,i)=>2+i/8)},{group:'B',values:Array.from({length:24},(_,i)=>3+Math.sin(i)/2)}],base=violinDensity(groups);
  for(const scale of [1e-8,.1,1e5]){
    const scaled=violinDensity(groups.map(g=>({...g,values:g.values.map(v=>v*scale)})));
    assert.ok(Math.abs(scaled.bandwidth/(base.bandwidth*scale)-1)<1e-12);
    for(let g=0;g<groups.length;g++)for(let i=0;i<base.series[g].points.length;i++){
      const a=base.series[g].points[i],b=scaled.series[g].points[i];
      assert.ok(Math.abs(a.x-b.x/scale)<1e-10);assert.ok(Math.abs(a.density-b.density*scale)<1e-10);
    }
  }
});

test('sync previews changed meanings, maps axes by field, retains presentation and can wholly undo after serialization',()=>{
  const doc=getExample('bar');doc.axes={x:'销售额 / 万元',y:'渠道'};const target={...getExample('singleline'),axes:{x:'旧月份',y:'旧指标'}};
  const work=newWork([{doc,dataGroup:'sync'},{doc:target,dataGroup:'sync'}]);work.steps[1].options.palette='cobalt';work.steps[1].duration=2400;
  const preview=previewDataSync(work);const row=preview.targets[0];assert.equal(row.eligible,true);assert.ok(row.semanticChanges.some(c=>c.key==='axes'));assert.equal(row.titleReview,true);
  const result=applyDataSync(work,preview,[row.id]),reopened=cleanWork(JSON.parse(JSON.stringify(result.work)));
  assert.deepEqual(reopened.steps[1].doc.axes,{x:'渠道',y:'销售额 / 万元'});assert.equal(reopened.steps[1].duration,2400);assert.equal(reopened.steps[1].options.palette,result.work.steps[1].options.palette);
  assert.deepEqual(reopened.steps[1].doc.data.map(recordId),reopened.steps[0].doc.data.map(recordId));
  assert.deepEqual(undoDataSync(reopened,result.transaction).steps,cleanWork(work).steps);
  assert.equal(previewDataSync({...reopened,steps:reopened.steps.map((s,i)=>i?{...s,doc:{...s.doc,data:s.doc.data.toReversed()}}:s)}).targets[0].changed,0);
});

test('diagnostic output retains semantic notices, units, source and IDs in static and timeline export',()=>{
  const win=new Window(),previous={document:globalThis.document,XMLSerializer:globalThis.XMLSerializer};Object.assign(globalThis,{document:win.document,XMLSerializer:win.XMLSerializer});
  const work=presetWork('method-agreement');
  try{const svg=stepSVG(work.steps[1],work.steps);assert.match(svg,/方法|A − B/);assert.match(svg,/legacy:/);
    const renderer=createWorkExportRenderer(work),timeline=workTimeline(work);try{const text=renderer.frame(timeline.duration);assert.match(text,/FORMA/);assert.ok(text.includes(work.steps.at(-1).doc.source.name));}finally{renderer.destroy();}
  }finally{Object.assign(globalThis,previous);win.happyDOM.close();}
});

test('explicit sync, saved reopening and five export checkpoints yield the same chart content',()=>{
  const win=new Window(),previous={document:globalThis.document,XMLSerializer:globalThis.XMLSerializer};Object.assign(globalThis,{document:win.document,XMLSerializer:win.XMLSerializer});
  const work=presetWork('method-agreement');work.steps[0].doc.data[0].a+=1.25;work.steps[0].doc.unit='mg/L';work.steps[0].doc.source={type:'user',name:'实验室实测数据'};
  const preview=previewDataSync(work),synced=applyDataSync(work,preview,preview.targets.filter(t=>t.eligible).map(t=>t.id)).work;
  const reopened=cleanWork(JSON.parse(JSON.stringify(synced))),a=createWorkExportRenderer(synced),b=createWorkExportRenderer(reopened);
  // SVG IDs are instance-local references; retain the actual paths, labels,
  // colours, annotation text and transforms in this comparison.
  const content=svg=>svg.replace(/\bid="[^"]*"/g,'').replace(/url\(#[^)]*\)/g,'url(#instance-pattern)');
  try{
    for(const segment of a.timeline.segments.slice(1))for(const p of [0,.25,.5,.75,1,.5]){
      const at=segment.start+segment.duration*p;
      assert.equal(content(a.frame(at)),content(b.frame(at)),`${segment.index} / ${p}`);
    }
    assert.ok(a.frame(a.timeline.duration).includes('实验室实测数据'));
    assert.ok(a.frame(a.timeline.duration).includes('mg/L'));
  }finally{a.destroy();b.destroy();Object.assign(globalThis,previous);win.happyDOM.close();}
});

test('changing an encoding keeps source headers, IDs and observation meanings, including legacy sequence conversion',async()=>{
  const {morphDocument}=await import('../../src/forma/work-model.js'),{morphBaseDocument}=await import('../../src/forma/scenario-presets.js'),{sequenceSource}=await import('../../src/forma/morph-sequence.js');
  const base=getExample('column');base.source={type:'user',name:'完整台账'};
  const table=splitTable(parseTable('月份名称\t年度收入\t备注\n一月\t12\t原始\n二月\t18\t原始'));
  const doc=importedTableDocument(base,table,[0,1]).doc;doc.axes={x:'月份',y:'年度收入 / 万元'};
  const source=makeStep({doc,dataGroup:'imported'}),mapped=morphBaseDocument(morphDocument(source));
  assert.deepEqual(mapped.data.map(recordId),source.doc.data.map(recordId));assert.deepEqual(mapped.tableInput.headers,table.headers);assert.deepEqual(mapped.axes,{x:'年度收入 / 万元',y:'月份'});assert.equal(mapped.data[0]._extra[2],'原始');assert.equal(sequenceSource({doc:mapped}).ok,true);
  const target=makeStep({doc:mapped,dataGroup:'imported',view:'line'});target.doc.axes.x='员工人数';assert.equal(transitionPlan(source,target).canMorph,false);assert.match(transitionPlan(source,target).reason,/观测指标/);
});
