import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {validateDocument} from '../../src/forma/data.js';
import {ChartScene} from '../../src/forma/charts.js';
import {ridgeDensity} from '../../src/forma/density.js';
import {createEditorModel} from '../../src/forma/editor-model.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)),`${a} ≈ ${b}`);
function scene(doc){return new ChartScene(document.createElement('div'),doc,{width:840,height:420,editable:true,interactive:false});}
async function withDOM(fn){const win=new Window(),old={document:globalThis.document,XMLSerializer:globalThis.XMLSerializer};Object.assign(globalThis,{document:win.document,XMLSerializer:win.XMLSerializer});try{await fn();}finally{Object.assign(globalThis,old);await win.happyDOM.close();}}

test('native ridge density is unchanged by measurement unit conversion',()=>{
 const groups=[{group:'A',values:[2,2.5,3,3.5,4]},{group:'B',values:[3,4,5,6,7]}],base=ridgeDensity(groups),scale=1e-8;
 const converted=ridgeDensity(groups.map(g=>({...g,values:g.values.map(v=>v*scale)})));
 near(converted.bandwidth/scale,base.bandwidth);
 converted.series.forEach((g,j)=>g.points.forEach((p,i)=>{near(p.x/scale,base.series[j].points[i].x);near(p.density*scale,base.series[j].points[i].density);}));
});

test('valid regression does not become invalid when its x unit is scaled',()=>{
 const doc=getExample('regression');assert.equal(validateDocument(doc).valid,true);
 doc.data.forEach(r=>{r.x*=1e-13;});const report=validateDocument(doc);assert.equal(report.dataValid,true,report.errors.join('\n'));
});

test('native spatial points preserve their geometry when a constant coordinate is rescaled',()=>withDOM(()=>{
 const doc=getExample('voronoi');doc.data.forEach((r,i)=>{r.x=4;r.y=2+i;});
 const a=scene(doc),scaled=structuredClone(doc);scaled.data.forEach(r=>{r.x*=1e-8;r.y*=1e-8;});const b=scene(scaled);
 const coords=s=>[...s.svg.querySelectorAll('circle[data-tip]')].map(e=>[+e.getAttribute('cx'),+e.getAttribute('cy')]);
 const ca=coords(a),cb=coords(b);assert.equal(ca.length,doc.data.length);assert.equal(cb.length,ca.length);ca.forEach((xy,i)=>xy.forEach((v,j)=>near(v,cb[i][j])));a.destroy();b.destroy();
}));

test('native research observations are linked to their exact record after sorting and copying',()=>withDOM(()=>{
 for(const id of ['volcano','ma','pca','dose','learning','enrichment','upset','manhattan','metafunnel']){
  const model=createEditorModel(getExample(id)),doc=model.doc,s=scene(doc);
  const marks=[...s.svg.querySelectorAll('[data-edit-row]')];
  assert.ok(marks.length>=doc.data.length,`${id}: every raw record needs a chart/table target`);
  assert.ok(marks.every(el=>el.dataset.recordId===doc.data[+el.dataset.editRow]._id),`${id}: must use persistent record IDs`);
  s.destroy();
 }
}));

test('impossible dates and reversed task dates locate the affected cells without deleting input',()=>{
 const m=createEditorModel(getExample('gantt')),fields=findTemplate('gantt').fields;
 const col=fields.findIndex(f=>f[0]==='start');assert.ok(col>=0);
 m.setCell(0,col,'2026-02-30');assert.equal(m.report.dataValid,false);assert.ok(m.report.cellErrors.some(e=>e.row===0&&e.col===col));assert.equal(m.cells[0][col],'2026-02-30');
 m.undo();m.setCell(0,col,'2099-01-01');assert.ok(m.report.cellErrors.some(e=>e.row===0&&e.col===col));
});

test('fitted values, confidence bounds and residual scale survive very small measurement units',async()=>{
 const {linearFit}=await import('../../src/forma/volume8-data.js');
 const rows=getExample('regression').data,fit=linearFit(rows);
 for(const [sx,sy]of [[1e-150,1e-140],[1e8,1e-8]]){
  const scaled=linearFit(rows.map(r=>({...r,x:r.x*sx,y:r.y*sy})));
  near(scaled.slope*sx/sy,fit.slope);near(scaled.r2,fit.r2);near(scaled.sd/sy,fit.sd);
  for(const r of rows){const a=fit.interval(r.x),b=scaled.interval(r.x*sx);for(const k of ['center','lower','upper'])near(b[k]/sy,a[k]);}
 }
 const constant=getExample('regression');constant.data.forEach(r=>r.x=2e-100);assert.equal(validateDocument(constant).dataValid,false);
});

test('native scientific percentage axes preserve small positive ratios',()=>withDOM(()=>{
 const doc=getExample('enrichment');doc.data.forEach(r=>r.total=1000000);
 const s=scene(doc),ticks=[...s.svg.querySelectorAll('text')].map(e=>e.textContent).filter(t=>/%$/.test(t));
 assert.ok(ticks.length>=3);assert.ok(ticks.some(t=>Number(t.replace('%',''))>0&&Number(t.replace('%',''))<1));assert.equal(new Set(ticks).size,ticks.length);s.destroy();
}));

test('measurement plots zoom to data while count and loss baselines remain anchored',()=>withDOM(()=>{
 const diff=getExample('difference');diff.data.forEach(r=>{r.a+=1e6;r.b+=1e6;});const a=scene(diff);
 const pts=[...a.svg.querySelectorAll('circle[data-edit-row]')].map(e=>+e.getAttribute('cy'));
 assert.ok(Math.max(...pts)-Math.min(...pts)>200,'differences cannot collapse against an unrelated zero');a.destroy();
 const learning=getExample('learning');learning.data.forEach(r=>{r.train=0;r.validation=0;});const b=scene(learning);
 assert.ok(![...b.svg.querySelectorAll('text')].some(e=>/^−|^-\d/.test(e.textContent)),'zero loss cannot produce negative ticks');b.destroy();
}));

test('all mapped research marks address existing fields and sorted records',()=>withDOM(()=>{
 for(const id of ['errorbar','paired','regression','blandaltman','forest','residual','scree','confusion','ribbon','difference']){
  const doc=createEditorModel(getExample(id)).doc,s=scene(doc),keys=findTemplate(id).fields.map(f=>f[0]),marks=[...s.svg.querySelectorAll('[data-edit-row]')];
  assert.equal(new Set(marks.map(e=>e.dataset.recordId)).size,doc.data.length,id);
  for(const e of marks){assert.equal(e.dataset.recordId,doc.data[+e.dataset.editRow]._id);assert.ok(!e.dataset.editField||keys.includes(e.dataset.editField),id);}
  s.destroy();
 }
}));

test('date errors use declared formats, month precision and exact duplicate locations',()=>{
 for(const id of ['calendar','barcode','cohort','gantt','ledger','smallmultiples','range','ribbon','trajectory','step','difference','trajectory3d','eventline']){
  const m=createEditorModel(getExample(id)),f=findTemplate(id).fields,c=f.findIndex(f=>f[1].startsWith('YYYY'));
  m.setCell(0,c,f[c][1]==='YYYY-MM'?'2026-13':'2026-02-30');assert.equal(m.report.dataValid,false,id);assert.ok(m.report.cellErrors.some(e=>e.row===0&&e.col===c),id);m.undo();assert.equal(m.report.valid,true,id);
 }
 const m=createEditorModel(getExample('range')),c=findTemplate('range').fields.findIndex(f=>f[0]==='period');m.setCell(1,c,m.cells[0][c]);
 assert.ok(m.report.cellErrors.some(e=>e.row===0&&e.col===c));assert.ok(m.report.cellErrors.some(e=>e.row===1&&e.col===c));assert.equal(m.cells.length,getExample('range').data.length);
});
