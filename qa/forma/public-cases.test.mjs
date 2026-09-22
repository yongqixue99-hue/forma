import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {presetWork,cleanWork,workReport,transitionPlan} from '../../src/forma/work-model.js';
import {publicCases} from '../../src/forma/public-cases.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {previewDataSync,applyDataSync,undoDataSync} from '../../src/forma/work-data-sync.js';
import {workAgentBrief,stepSVG} from '../../src/forma/work-export.js';
import {staticSVG} from '../../src/forma/export.js';
import {Window} from 'happy-dom';
import {parseTable,splitTable} from '../../src/forma/table-data.js';

test('public GDP values are exact WDI observations, including negative values and full precision',async()=>{
 const raw=JSON.parse(await readFile(new URL('../../public/data/worldbank-gdp-growth.json',import.meta.url),'utf8'))[1],work=presetWork('public-growth');
 assert.equal(workReport(work).valid,true);assert.equal(work.steps.length,3);assert.equal(work.steps[0].doc.data.length,30);assert.equal(work.steps[0].doc.source.type,'public');
 for(const row of work.steps[0].doc.data){const source=raw.find(v=>v.date===row.period&&v.countryiso3code===row.series);assert.ok(source);assert.equal(row.value,source.value);}
 assert.ok(work.steps[0].doc.data.some(r=>r.value<0));assert.deepEqual(work.steps[0].doc.tableInput.headers,['year','country','growth']);
});

test('penguins retain every mass observation and original unused columns, with explicit missing row provenance',async()=>{
 const raw=splitTable(parseTable(await readFile(new URL('../../public/data/palmer-penguins.csv',import.meta.url),'utf8'))),mass=raw.headers.indexOf('body_mass_g'),work=presetWork('public-penguins');
 assert.equal(raw.rows.length,344);assert.equal(workReport(work).valid,true);assert.equal(work.steps[0].doc.data.length,342);
 const missing=raw.rows.flatMap((r,i)=>r[mass]==='NA'?[i+2]:[]);assert.deepEqual(missing,[5,273]);
 for(const row of work.steps[0].doc.data){assert.notEqual(row._id,row.label);const line=Number(row.label.replace('原表行 ','')),original=raw.rows[line-2];assert.equal(row.value,Number(original[mass]));assert.equal(row.group,original[0]);assert.equal(Object.keys(row._extra).length,6);assert.equal(row._extra[3],original[1]);}
 assert.match(publicCases.find(p=>p.id==='public-penguins').dataNote,/342.*5、273.*不补零/);
 const prepared=splitTable(parseTable(await readFile(new URL('../../public/data/palmer-penguins-observed.csv',import.meta.url),'utf8')));assert.equal(prepared.rows.length,342);assert.ok(!prepared.rows.some(r=>r[2]==='NA'||r[2]==='0'));
});

test('public-case edits sync explicitly; provenance, units, IDs and independent styling survive reopen, Agent copy and undo',()=>{
 for(const meta of publicCases){const original=presetWork(meta.id),work=structuredClone(original),s=work.steps[0],m=createEditorModel(s.doc),valueColumn=['public-revenue','public-process'].includes(meta.id)?1:2;
  m.setCell(0,valueColumn,String(s.doc.data[0].value+0.125));s.doc=m.doc;assert.equal(s.doc.source.type,'user');assert.equal(s.doc.provenance.origin,'public');s.doc.source.name+=' · 核对修订';work.steps[1].options.palette='cobalt';work.steps[1].duration=2400;
  assert.deepEqual(work.steps[1].doc.data,original.steps[1].doc.data);
  const preview=previewDataSync(work),eligible=preview.targets.filter(t=>t.eligible);assert.equal(eligible.length,work.steps.length-1);assert.ok(eligible.every(t=>t.metadataChanged));
  const applied=applyDataSync(work,preview,eligible.map(t=>t.id)),saved=cleanWork(JSON.parse(JSON.stringify(applied.work)));
  for(const step of saved.steps){assert.deepEqual(step.doc.data,s.doc.data);assert.equal(step.doc.unit,s.doc.unit);assert.equal(step.doc.source.url,meta.sourceUrl);assert.deepEqual(step.doc.tableInput,s.doc.tableInput);}
  assert.equal(saved.steps[1].options.palette,'cobalt');assert.equal(saved.steps[1].duration,2400);
  for(const a of saved.steps)for(const b of saved.steps)if(a!==b)assert.equal(transitionPlan(a,b,{steps:saved.steps}).mode,'morph');
  const json=JSON.parse(workAgentBrief(saved).match(/```json\n([\s\S]*?)\n```/)[1]);assert.deepEqual(json.steps,saved.steps);
  const undone=undoDataSync(saved,applied.transaction);assert.deepEqual(undone.steps[1].doc,original.steps[1].doc);assert.deepEqual(undone.steps[0].doc,s.doc);
 }
});

test('work static export uses the selected sample encoding capacity, while rejecting invalid data and native overflow',()=>{
 const win=new Window(),prior={document:globalThis.document,XMLSerializer:globalThis.XMLSerializer};Object.assign(globalThis,{document:win.document,XMLSerializer:win.XMLSerializer});
 try{const work=presetWork('public-penguins');for(const step of work.steps){const svg=stepSVG(step,work.steps);assert.match(svg,/342 \/ 344/);assert.ok(svg.includes('Palmer Penguins'));assert.ok(svg.includes(step.view));}
  assert.throws(()=>staticSVG(work.steps[0].doc),/8–40/);
  const invalid=structuredClone(work.steps[0]);invalid.doc.data[0].value=null;assert.throws(()=>stepSVG(invalid),/数|空|有限/);
 }finally{Object.assign(globalThis,prior);win.happyDOM.close();}
});
