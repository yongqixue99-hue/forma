import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {withRecordIds} from '../../src/forma/data-identity.js';
import {openTableEditor} from '../../src/forma/table-editor.js';

const win=new Window();globalThis.window=win;globalThis.document=win.document;
after(()=>win.happyDOM.close());
function fixture(t,template='groupedbar'){
  const original=withRecordIds({...getExample(template),source:{type:'user',name:'合成数据 · 编辑回归'}});original.data[0]._extra={4:'0012',5:''};
  const before=structuredClone(original),applied=[];
  const editor=openTableEditor(original,{onApply:doc=>applied.push(doc)}),dialog=document.querySelector('.table-workflow');
  t.after(()=>editor.close());return{original,before,applied,dialog};
}
function fill(dialog,row,col,value){
  const input=dialog.querySelector(`[data-row="${row}"][data-col="${col}"]`);assert.ok(input);
  input.value=value;input.dispatchEvent(new win.Event('input',{bubbles:true}));return input;
}
const click=(dialog,action)=>dialog.querySelector(`[data-table="${action}"]`).click();
function paste(input,text){
  const event=new win.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(event,'clipboardData',{value:{getData:()=>text}});input.dispatchEvent(event);assert.equal(event.defaultPrevented,true);
}

test('series tables can draft an empty row and paste its observations without changing the current chart',t=>{
  const {original,before,applied,dialog}=fixture(t),length=original.data.length,series=original.entities.items[0],addedCount=original.entities.items.length;
  click(dialog,'add');assert.equal(dialog.querySelectorAll('tbody tr').length,length+1);
  assert.deepEqual(original,before);assert.equal(applied.length,0);
  click(dialog,'apply');assert.equal(applied.length,0);assert.ok(dialog.querySelector(`[data-row="${length}"][aria-invalid=true]`));
  paste(dialog.querySelector(`[data-row="${length}"][data-col="0"]`),original.entities.items.map((entity,i)=>`新增观测\t${entity.name}\t${17+i}`).join('\n'));
  click(dialog,'undo');assert.equal(dialog.querySelector(`[data-row="${length}"][data-col="2"]`).value,'');
  click(dialog,'undo');assert.equal(dialog.querySelectorAll('tbody tr').length,length);
  click(dialog,'redo');click(dialog,'redo');click(dialog,'apply');
  assert.equal(applied.length,1);const next=applied[0],added=next.data[length];
  assert.deepEqual(next.data.slice(0,length),before.data);assert.equal(added.value,17);assert.equal(added._seriesId,series.id);
  assert.ok(added._id);assert.equal(new Set(next.data.map(row=>row._id)).size,length+addedCount);assert.deepEqual(original,before);
  const reopened=openTableEditor(next,{onApply:doc=>applied.push(doc)}),second=document.querySelector('.table-workflow');t.after(()=>reopened.close());
  fill(second,length,2,'21');click(second,'apply');assert.equal(applied[1].data[length]._id,added._id);
});

test('assigning an existing series keeps observation IDs and original extra columns',t=>{
  const {original,before,applied,dialog}=fixture(t),source=original.entities.items.find(e=>e.id===original.data[0]._seriesId),target=original.entities.items.find(e=>e.id!==source.id);
  fill(dialog,0,1,target.name);fill(dialog,1,1,source.name);click(dialog,'grid');
  assert.equal(dialog.querySelector('[data-row="0"][data-col="1"]').value,target.name);
  assert.deepEqual(original,before);click(dialog,'apply');assert.equal(applied.length,1);
  assert.equal(applied[0].data[0]._id,before.data[0]._id);assert.equal(applied[0].data[0]._seriesId,target.id);
  assert.deepEqual(applied[0].data[0]._extra,before.data[0]._extra);assert.equal(applied[0].data[1]._id,before.data[1]._id);assert.equal(applied[0].data[1]._seriesId,source.id);
  assert.deepEqual(applied[0].entities,before.entities);assert.deepEqual(applied[0].data.slice(2),before.data.slice(2));
});

test('unregistered series names and invalid numbers retain exact draft text until corrected or undone',t=>{
  const {original,before,applied,dialog}=fixture(t),raw='  尚未登记的系列  ';
  fill(dialog,0,1,raw);fill(dialog,0,2,'1e-');click(dialog,'grid');
  assert.equal(dialog.querySelector('[data-row="0"][data-col="1"]').value,raw);
  assert.equal(dialog.querySelector('[data-row="0"][data-col="2"]').value,'1e-');
  click(dialog,'apply');assert.equal(applied.length,0);assert.ok(dialog.querySelector('[data-row="0"][data-col="1"][aria-invalid=true]'));
  assert.deepEqual(original,before);click(dialog,'undo');click(dialog,'undo');
  assert.equal(dialog.querySelector('[data-row="0"][data-col="1"]').value,before.data[0].series);
  click(dialog,'apply');assert.deepEqual(applied[0],before);
});

test('keyboard undo clears validation from the discarded draft',t=>{
  const {dialog}=fixture(t,'column');fill(dialog,0,1,'bad');click(dialog,'apply');
  const input=dialog.querySelector('[data-row="0"][data-col="1"]');input.focus();
  input.dispatchEvent(new win.KeyboardEvent('keydown',{key:'z',metaKey:true,bubbles:true,cancelable:true}));
  assert.equal(dialog.querySelector('[data-row="0"][data-col="1"]').value,'42');
  assert.equal(dialog.querySelector('[aria-invalid=true]'),null);assert.equal(dialog.querySelector('.table-errors'),null);
  assert.doesNotMatch(dialog.querySelector('#table-message').textContent,/有效数字/);
});

test('IME Enter keeps focus and commits its completed text once',t=>{
  const {before,dialog}=fixture(t,'column'),input=dialog.querySelector('[data-row="0"][data-col="0"]');input.focus();
  input.dispatchEvent(new win.Event('compositionstart',{bubbles:true}));input.value='中文观测';
  input.dispatchEvent(new win.InputEvent('input',{bubbles:true,isComposing:true}));
  const enter=new win.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true});input.dispatchEvent(enter);
  assert.equal(enter.defaultPrevented,false);assert.equal(document.activeElement,input);
  input.dispatchEvent(new win.Event('compositionend',{bubbles:true}));click(dialog,'grid');
  assert.equal(dialog.querySelector('[data-row="0"][data-col="0"]').value,'中文观测');
  click(dialog,'undo');assert.equal(dialog.querySelector('[data-row="0"][data-col="0"]').value,before.data[0].label);
  const fallback=new win.KeyboardEvent('keydown',{key:'Enter',keyCode:229,bubbles:true,cancelable:true});
  dialog.querySelector('[data-row="0"][data-col="0"]').dispatchEvent(fallback);assert.equal(fallback.defaultPrevented,false);
});

test('mapped source cells and optional missing values survive invalid draft edits',t=>{
  const original=withRecordIds({...getExample('singleline'),source:{type:'user',name:'合成原表'}}),fields=findTemplate(original.template).fields,valueColumn=fields.findIndex(f=>f[0]==='value');
  original.data[0]._extra={2:'0012',3:''};original.tableInput={headers:['时期','读数','原始编号','备注'],fieldColumns:{period:0,value:1}};
  const before=structuredClone(original),applied=[],editor=openTableEditor(original,{onApply:doc=>applied.push(doc)}),dialog=document.querySelector('.table-workflow');t.after(()=>editor.close());
  fill(dialog,0,valueColumn,'n/a');click(dialog,'apply');assert.equal(applied.length,0);
  fill(dialog,0,valueColumn,'');click(dialog,'apply');assert.equal(applied.length,1);
  assert.equal(applied[0].data[0].value,null);assert.equal(applied[0].data[0]._id,before.data[0]._id);
  assert.deepEqual(applied[0].data[0]._extra,before.data[0]._extra);assert.deepEqual(applied[0].tableInput,before.tableInput);assert.deepEqual(original,before);
});
