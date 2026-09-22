import {payload} from './payload.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {validateDocument} from '../../src/forma/data.js';
import {createEditorModel,directEditTemplates,normalizeEditorRecords} from '../../src/forma/editor-model.js';
import {ChartScene} from '../../src/forma/charts.js';
import {staticSVG} from '../../src/forma/export.js';

const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
test('all templates share the draft model without losing observations or scientific parameters',()=>{
  for(const template of catalog){const original=getExample(template.id),m=createEditorModel(original);assert.equal(m.report.valid,true,template.id);assert.deepEqual(payload(m.doc.data),payload(original.data),template.id);for(const [k,v] of Object.entries(original))assert.deepEqual(payload(m.doc[k]),payload(v),`${template.id}.${k}`);const reopened=createEditorModel(m.doc,JSON.parse(JSON.stringify(m.snapshot)));assert.deepEqual(reopened.doc,m.doc,template.id);}
});
test('invalid cells keep their exact draft content and never reach the chart or export document',()=>{
  const m=createEditorModel(getExample('column'));m.setCell(0,1,'88');assert.equal(m.doc.data[0].value,88);assert.equal(m.doc.source.type,'user');m.setCell(0,1,'bad');assert.equal(m.report.valid,false);assert.equal(m.cells[0][1],'bad');assert.equal(m.doc.data[0].value,88);assert.equal(m.report.cellErrors[0].row,0);assert.equal(m.report.cellErrors[0].col,1);
  const restored=createEditorModel(m.doc,JSON.parse(JSON.stringify(m.snapshot)));assert.equal(restored.cells[0][1],'bad');assert.equal(restored.report.valid,false);assert.equal(restored.doc.data[0].value,88);restored.setCell(0,1,'0');assert.equal(restored.doc.data[0].value,0);
});
test('row operations, chart-side edits and rectangle paste share undo and schema validation',()=>{
  const m=createEditorModel(getExample('column'));m.addRow();assert.equal(m.report.valid,false);assert.deepEqual(m.cells.at(-1),['','']);m.setRow(8,['9月','99']);assert.equal(m.doc.data.at(-1).value,99);m.deleteRow(8);assert.equal(m.doc.data.length,8);m.undo();assert.equal(m.doc.data.at(-1).value,99);m.redo();assert.equal(m.doc.data.length,8);
  m.paste([['三月','120'],['四月','156']],0,0);assert.deepEqual(payload(m.doc.data.slice(0,2)),payload([{label:'三月',value:120},{label:'四月',value:156}]));m.undo();assert.equal(m.doc.data[0].value,42);const before=m.cells;assert.throws(()=>m.paste([['x','1']],0,1),/列数/);assert.deepEqual(m.cells,before);
  m.setCell(0,0,m.cells[1][0]);assert.equal(m.report.valid,false);assert.match(m.report.errors.join(' '),/重复/);
});
test('axis names and data values remain distinct and export retains the edited axis names',()=>{
  const m=createEditorModel(getExample('column'));m.setMeta('axes.x','月份');m.setMeta('axes.y','收入 / 万元');assert.equal(m.doc.data[0].value,42);const svg=staticSVG(m.doc);assert.match(svg,/>月份</);assert.match(svg,/>收入 \/ 万元</);assert.doesNotMatch(svg,/data-edit-row|data-edit-meta/);
  m.undo();assert.notEqual(m.doc.axes.y,'收入 / 万元');assert.equal(m.doc.axes.x,'月份');assert.throws(()=>m.setMeta('__proto__.polluted','yes'));assert.equal({}.polluted,undefined);
});
test('direct chart editing maps real marks to valid original rows; exports have no edit controls',()=>{
  for(const id of directEditTemplates){const doc=createEditorModel(getExample(id)).doc,host=document.createElement('div'),scene=new ChartScene(host,doc,{width:680,height:390,editable:true,interactive:false});const marks=[...host.querySelectorAll('[data-edit-row]')];assert.ok(marks.length>0,id);for(const mark of marks){const row=Number(mark.dataset.editRow);assert.ok(Number.isInteger(row)&&row>=0&&row<doc.data.length,id);assert.equal(mark.getAttribute('role'),'button');}scene.destroy();const plain=new ChartScene(host,doc,{width:680,height:390,interactive:false});assert.equal(host.querySelectorAll('[data-edit-row],[data-edit-meta]').length,0,id);plain.destroy();}
});
test('saved editor records recover valid documents, isolate drafts and reject corrupt entries',()=>{
  const doc=getExample('xy'),model=createEditorModel(doc);model.setCell(0,1,'unfinished');const valid={key:'template:xy',doc:model.doc,draft:model.snapshot,options:{palette:'ink'}};const entries=normalizeEditorRecords([valid,{...valid},{key:'broken',doc:{}}]);assert.equal(entries.length,1);assert.equal(createEditorModel(entries[0].doc,entries[0].draft).cells[0][1],'unfinished');entries[0].doc.data[0].x=100;assert.notEqual(valid.doc.data[0].x,100);
});
test('row deletion retains complete data independently of chart layout minimums',()=>{
  for(const id of ['column','singleline','area']){
    const m=createEditorModel(getExample(id));while(m.cells.length>2)m.deleteRow(m.cells.length-1);
    assert.equal(m.report.valid,true,id);const host=document.createElement('div'),scene=new ChartScene(host,m.doc,{width:680,height:390,editable:true,interactive:false});
    const label=host.querySelector('[data-edit-field="label"],[data-edit-field="period"]');assert.ok(label,id);assert.ok(Number.isFinite(Number(label.getAttribute('x'))),id);assert.doesNotMatch(scene.serialize(),/NaN|undefined/);scene.destroy();m.deleteRow(1);assert.equal(m.report.valid,false);assert.equal(m.doc.data.length,1);assert.equal(m.report.dataValid,true);
  }
});
