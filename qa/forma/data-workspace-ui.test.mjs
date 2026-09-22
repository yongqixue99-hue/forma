import {withRecordIds} from '../../src/forma/data-identity.js';
import {payload} from './payload.mjs';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';

let window,server,mountDataWorkspace,getExample;
const originals=new Map();
before(async()=>{
  window=new Window({url:'http://localhost:4189/#editor'});
  for(const [name,value] of Object.entries({window,document:window.document,XMLSerializer:window.XMLSerializer,ResizeObserver:window.ResizeObserver,requestAnimationFrame:window.requestAnimationFrame.bind(window),cancelAnimationFrame:window.cancelAnimationFrame.bind(window)})){
    originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
  }
  server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  ({mountDataWorkspace}=await server.ssrLoadModule('/src/forma/data-workspace.js'));
  ({getExample}=await server.ssrLoadModule('/src/forma/catalog.js'));
});
after(async()=>{
  await server?.close();await window?.happyDOM.close();
  for(const [name,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
});
const settle=()=>new Promise(resolve=>setTimeout(resolve,180));
function mount(t,records=['column','xy'].map(id=>({key:id,doc:getExample(id),options:{palette:'ink',ratio:'wide',duration:8}}))){
  document.body.innerHTML='<main></main>';const host=document.querySelector('main'),changes=[],messages=[];
  const controller=mountDataWorkspace(host,{records,activeKey:records[0].key,onChange:record=>changes.push(structuredClone(record)),onActive(){},onRemove(){},onSave:()=> 'saved-test',toast:message=>messages.push(message)});
  t.after(()=>controller.destroy());return{host,records,changes,messages,controller};
}
function fill(host,selector,value){const input=host.querySelector(selector);assert.ok(input,selector);input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}));}
function submit(host){host.querySelector('.dw-inline-editor').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));}
const firstMark=host=>host.querySelector('[data-mark="basic-column"]').dataset.value;

test('actual cell events persist and repaint; in-place chart inputs update the same table',async t=>{
  const {host,records,changes,messages}=mount(t);
  fill(host,'[data-dw-cell="0:1"]','96');await settle();
  assert.equal(firstMark(host),'96');assert.equal(records[0].doc.data[0].value,96);assert.equal(changes.at(-1).doc.data[0].value,96);assert.deepEqual(messages,[]);
  host.querySelector('[data-edit-row="0"][data-edit-field="value"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  fill(host,'.dw-inline-editor [data-inline-index="0"]','120');submit(host);await settle();
  assert.equal(firstMark(host),'120');assert.equal(host.querySelector('[data-dw-cell="0:1"]').value,'120');assert.equal(host.querySelector('.dw-inline-editor'),null);
  host.querySelector('.dw-axis-controls [data-edit-meta="axes.x"]').click();fill(host,'.dw-inline-editor [data-inline-index="0"]','月份');submit(host);await settle();
  assert.equal(host.querySelector('#dw-chart [data-edit-meta="axes.x"]').textContent,'月份');assert.equal(records[0].doc.data[0].value,120);
});
test('in-place editing commits on blur without stealing the next cell focus and cancels with Escape',async t=>{
  const {host,records}=mount(t);const original=records[0].doc.title;
  host.querySelector('[data-edit-meta="title"]').click();fill(host,'.dw-inline-editor input','新的图表标题');const next=host.querySelector('[data-dw-cell="1:1"]');next.focus();await settle();assert.equal(records[0].doc.title,'新的图表标题');assert.equal(document.activeElement,next);
  host.querySelector('[data-edit-meta="title"]').click();fill(host,'.dw-inline-editor input','取消这次修改');host.querySelector('.dw-inline-editor input').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await settle();assert.equal(records[0].doc.title,'新的图表标题');assert.equal(host.querySelector('.dw-inline-editor'),null);
  host.querySelector('[data-workspace="undo"]').click();assert.equal(records[0].doc.title,original);
});
test('unfinished rows block export while preserving the visible chart, with undo and draft recovery',async t=>{
  const {host,records,controller}=mount(t);
  host.querySelector('[data-workspace="add"]').click();await settle();
  assert.equal(host.querySelector('[data-workspace="export"]').disabled,true);assert.equal(host.querySelectorAll('[data-mark="basic-column"]').length,8);
  fill(host,'[data-dw-cell="8:0"]','9月');fill(host,'[data-dw-cell="8:1"]','105');await settle();
  assert.equal(host.querySelectorAll('[data-mark="basic-column"]').length,9);assert.equal(host.querySelector('[data-workspace="export"]').disabled,false);
  host.querySelector('[data-workspace="delete"][data-row="8"]').click();host.querySelector('[data-workspace="undo"]').click();await settle();assert.equal(host.querySelector('[data-dw-cell="8:1"]').value,'105');
  fill(host,'[data-dw-cell="8:1"]','pending');await settle();const restoredRecords=JSON.parse(JSON.stringify(records));controller.destroy();
  const restored=mount(t,restoredRecords);assert.equal(restored.host.querySelector('[data-dw-cell="8:1"]').value,'pending');assert.equal(restored.host.querySelector('[data-workspace="export"]').disabled,true);assert.equal(restored.host.querySelectorAll('[data-mark="basic-column"]').length,9);
});
test('chart tabs isolate data and setting events preserve the record callback',async t=>{
  const {host,records,messages}=mount(t);
  fill(host,'[data-dw-cell="0:1"]','93');await settle();
  host.querySelector('[data-workspace="switch"][data-key="xy"]').click();assert.equal(host.querySelectorAll('thead th').length,5);
  fill(host,'[data-dw-cell="0:1"]','21');await settle();assert.equal(host.querySelector('[data-mark="basic-scatter"]').dataset.x,'21');
  const palette=host.querySelector('#dw-palette');palette.value='cobalt';palette.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(records[1].options.palette,'cobalt');
  const ratio=host.querySelector('#dw-ratio');ratio.value='square';ratio.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(records[1].options.exportSettings.ratio,'square');host.querySelector('[data-workspace="save"]').click();assert.equal(records[1].savedId,'saved-test');
  host.querySelector('[data-workspace="switch"][data-key="column"]').click();assert.equal(firstMark(host),'93');assert.equal(host.querySelector('#dw-palette').value,'ink');assert.deepEqual(messages,[]);
});
test('custom color counts, HEX input and deleting colors reach chart marks and retain draft data',async t=>{
  const {host,records}=mount(t);const before=structuredClone(records[0].doc.data);host.querySelector('[data-workspace="colors"]').click();
  const count=host.querySelector('[data-color-count]');count.value='3';count.dispatchEvent(new window.Event('change',{bubbles:true}));
  fill(host,'[data-color-hex="0"]','#123456');await settle();assert.equal(records[0].options.colors.length,3);assert.equal(records[0].options.colors[0],'#123456');assert.equal(host.querySelector('[data-mark="basic-column"]').getAttribute('fill'),'#123456');
  const bars=[...host.querySelectorAll('[data-mark="basic-column"]')];assert.equal(bars[3].getAttribute('fill'),'#123456');assert.equal(host.querySelector('#dw-palette').value,'custom');
  host.querySelector('[data-color-remove="1"]').click();assert.equal(records[0].options.colors.length,2);host.querySelector('[data-color-action="add"]').click();assert.equal(records[0].options.colors.length,3);assert.deepEqual(payload(records[0].doc.data),payload(before));
  host.querySelector('[data-color-action="reset"]').click();assert.equal(records[0].options.colors,undefined);assert.equal(host.querySelector('#dw-palette').value,'ink');
});


test('spreadsheet navigation crosses page boundaries and locates invalid cells',t=>{
  const doc=getExample('histogram');doc.data=Array.from({length:42},(_,i)=>({label:`项目 ${i+1}`,value:i+1}));
  const {host}=mount(t,[{key:'column',doc,options:{palette:'ink',duration:8}}]);
  const key=(cell,k,shiftKey=false)=>{cell.focus();cell.dispatchEvent(new window.KeyboardEvent('keydown',{key:k,shiftKey,bubbles:true,cancelable:true}));};
  key(host.querySelector('[data-dw-cell="39:1"]'),'Tab');assert.equal(document.activeElement.dataset.dwCell,'40:0');
  key(document.activeElement,'Tab',true);assert.equal(document.activeElement.dataset.dwCell,'39:1');
  key(document.activeElement,'Enter',true);assert.equal(document.activeElement.dataset.dwCell,'38:1');
  fill(host,'[data-dw-cell="38:1"]','bad');host.querySelector('[data-workspace="next"]').click();
  host.querySelector('[data-workspace="locate-error"]').click();assert.equal(document.activeElement.dataset.dwCell,'38:1');assert.equal(document.activeElement.getAttribute('aria-invalid'),'true');
  assert.equal(host.querySelector('[data-workspace="export"]').disabled,true);
});
test('grid header buttons retain native keyboard activation and tab order',t=>{
  const {host}=mount(t);
  for(const selector of ['[data-workspace="select-row"]','[data-workspace="select-column"]','[data-workspace="delete"]']){
    const button=host.querySelector(selector);button.focus();
    for(const key of ['Enter',' ','Tab']){
      const event=new window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});button.dispatchEvent(event);
      assert.equal(event.defaultPrevented,false);assert.equal(document.activeElement,button);
    }
  }
});
test('moving a draft out of the editor can be undone, including unfinished input and edit history',t=>{
  const {host,records}=mount(t);fill(host,'[data-dw-cell="0:1"]','not finished');
  host.querySelector('[data-workspace="remove"][data-key="column"]').click();assert.equal(records.length,1);
  host.querySelector('[data-workspace="restore"]').click();assert.equal(records.length,2);assert.equal(host.querySelector('[data-dw-cell="0:1"]').value,'not finished');
  host.querySelector('[data-workspace="undo"]').click();assert.equal(host.querySelector('[data-dw-cell="0:1"]').value,'42');
  host.querySelector('[data-workspace="remove"][data-key="column"]').click();host.querySelector('[data-workspace="remove"][data-key="xy"]').click();assert.ok(host.querySelector('.dw-empty'));
  host.querySelector('[data-workspace="restore"]').click();assert.equal(records.length,1);assert.equal(records[0].key,'xy');assert.ok(host.querySelector('.dw-layout'));
});
test('split pane width is keyboard adjustable and remains a layout preference across chart changes',t=>{
  const {host,records}=mount(t),before=structuredClone(records.map(r=>r.options)),separator=host.querySelector('[data-dw-split]');
  separator.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert.equal(separator.getAttribute('aria-valuenow'),'35');
  separator.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',shiftKey:true,bubbles:true}));assert.equal(separator.getAttribute('aria-valuenow'),'40');
  host.querySelector('[data-workspace="switch"][data-key="xy"]').click();assert.equal(host.querySelector('[data-dw-split]').getAttribute('aria-valuenow'),'40');assert.deepEqual(records.map(r=>r.options),before);
  host.querySelector('[data-dw-split]').dispatchEvent(new window.MouseEvent('dblclick',{bubbles:true}));assert.equal(host.querySelector('[data-dw-split]').getAttribute('aria-valuenow'),'56');
});

function clipboard(target,type,text=''){
  let copied;const event=new window.Event(type,{bubbles:true,cancelable:true});
  Object.defineProperty(event,'clipboardData',{value:{getData:()=>text,setData:(mime,value)=>{copied=value;},files:[]}});
  target.dispatchEvent(event);return{copied,prevented:event.defaultPrevented};
}
function sheetKey(target,key,options={}){target.dispatchEvent(new window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options}));}
test('Excel 3 × 3 paste updates exact cells in one undo step and selects the pasted region',async t=>{
  const doc=getExample('xy'),before=structuredClone(doc.data);const{host,records}=mount(t,[{key:'xy',doc,options:{palette:'ink'}}]);
  const cell=host.querySelector('[data-dw-cell="1:0"]');cell.focus();clipboard(cell,'paste','项目甲\t12\t25\n项目乙\t18\t31\n项目丙\t24\t39');await settle();
  assert.equal(host.querySelector('#dw-cell-ref').textContent,'A2:C4');assert.equal(host.querySelectorAll('.dw-in-range').length,9);
  assert.deepEqual(payload(records[0].doc.data.slice(1,4)),payload([{label:'项目甲',x:12,y:25},{label:'项目乙',x:18,y:31},{label:'项目丙',x:24,y:39}]));
  assert.deepEqual(payload(records[0].doc.data[0]),payload(before[0]));assert.deepEqual(payload(records[0].doc.data[4]),payload(before[4]));
  host.querySelector('[data-workspace="undo"]').click();assert.deepEqual(payload(records[0].doc.data),payload(before));
});
test('rectangle selection supports copy, cut, clear, and one-value fill with undo',t=>{
  const {host}=mount(t);const first=host.querySelector('[data-dw-cell="0:1"]');first.focus();
  sheetKey(first,'ArrowDown',{shiftKey:true});sheetKey(host.querySelector('#dw-grid'),'ArrowDown',{shiftKey:true});
  assert.equal(host.querySelector('#dw-cell-ref').textContent,'B1:B3');
  assert.equal(clipboard(host.querySelector('#dw-grid'),'copy').copied,'42\n48\n45');
  clipboard(host.querySelector('#dw-grid'),'paste','90');assert.deepEqual([...host.querySelectorAll('.dw-in-range')].map(n=>n.value),['90','90','90']);
  assert.equal(clipboard(host.querySelector('#dw-grid'),'cut').copied,'90\n90\n90');assert.deepEqual([...host.querySelectorAll('.dw-in-range')].map(n=>n.value),['','','']);
  assert.equal(host.querySelector('[data-workspace="export"]').disabled,true);
  host.querySelector('[data-workspace="undo"]').click();assert.equal(host.querySelector('[data-dw-cell="2:1"]').value,'90');
  host.querySelector('[data-workspace="undo"]').click();assert.equal(host.querySelector('[data-dw-cell="2:1"]').value,'45');
});
test('page and whole-table selection operate on records beyond the visible page',t=>{
  const doc=getExample('histogram');doc.data=Array.from({length:82},(_,i)=>({label:`记录${i+1}`,value:i+1}));
  const {host,records}=mount(t,[{key:'histogram',doc,options:{palette:'ink'}}]);
  host.querySelector('[data-workspace="select-page"]').click();assert.equal(host.querySelector('#dw-cell-ref').textContent,'A1:B40');
  host.querySelector('[data-workspace="delete-rows"]').click();assert.equal(records[0].doc.data.length,42);assert.equal(records[0].doc.data[0].value,41);
  host.querySelector('[data-workspace="undo"]').click();assert.equal(records[0].doc.data.length,82);
  host.querySelector('[data-workspace="select-all"]').click();const copied=clipboard(host.querySelector('#dw-grid'),'copy').copied;assert.equal(copied.split('\n').length,82);
  assert.equal(host.querySelectorAll('[data-dw-row]').length,40);
  host.querySelector('[data-workspace="delete-rows"]').click();assert.equal(host.querySelectorAll('[data-dw-row]').length,0);assert.equal(records[0].doc.data.length,82);assert.equal(host.querySelector('[data-workspace="export"]').disabled,true);
  clipboard(host.querySelector('#dw-grid'),'paste','新甲\t10\n新乙\t20\n新丙\t30');assert.equal(host.querySelectorAll('[data-dw-row]').length,3);
});
test('row, column, and drag selection plus bulk insertion preserve a single history operation',t=>{
  const {host}=mount(t);host.querySelector('[data-workspace="select-row"][data-row="1"]').click();
  host.querySelector('[data-workspace="select-row"][data-row="3"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true,shiftKey:true}));assert.equal(host.querySelector('#dw-cell-ref').textContent,'A2:B4');
  fill(host,'#dw-insert-count','2');host.querySelector('[data-workspace="insert-before"]').click();assert.equal(host.querySelectorAll('[data-dw-row]').length,10);assert.equal(host.querySelector('[data-dw-cell="1:0"]').value,'');
  host.querySelector('[data-workspace="undo"]').click();assert.equal(host.querySelectorAll('[data-dw-row]').length,8);
  host.querySelector('[data-workspace="select-column"][data-col="1"]').click();assert.equal(host.querySelector('#dw-cell-ref').textContent,'B1:B8');
  host.querySelector('[data-workspace="fill-down"]').click();assert.equal(host.querySelector('[data-dw-cell="7:1"]').value,'42');host.querySelector('[data-workspace="undo"]').click();
  host.querySelector('[data-dw-cell="0:0"]').dispatchEvent(new window.PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}));
  host.querySelector('[data-dw-cell="2:1"]').dispatchEvent(new window.PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
  document.dispatchEvent(new window.PointerEvent('pointerup'));assert.equal(host.querySelector('#dw-cell-ref').textContent,'A1:B3');assert.equal(host.querySelectorAll('.dw-in-range').length,6);
});
test('mismatched rectangles, extra columns, files and row limits never partially overwrite a draft',t=>{
  const {host,records,messages}=mount(t);const before=structuredClone(records[0].doc.data);
  host.querySelector('[data-workspace="select-row"][data-row="0"]').click();clipboard(host.querySelector('#dw-grid'),'paste','a\t1\n b\t2');assert.match(messages.at(-1),/选区大小不同/);assert.deepEqual(payload(records[0].doc.data),payload(before));
  host.querySelector('[data-dw-cell="0:0"]').focus();clipboard(document.activeElement,'paste','a\t1\t2');assert.match(messages.at(-1),/超出列数/);assert.deepEqual(payload(records[0].doc.data),payload(before));
  fill(host,'#dw-insert-count','1500');host.querySelector('[data-workspace="insert-after"]').click();assert.match(messages.at(-1),/1,500/);assert.equal(host.querySelectorAll('[data-dw-row]').length,8);
  const filePaste=new window.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(filePaste,'clipboardData',{value:{files:[{name:'a.xlsx'}]}});host.querySelector('#dw-grid').dispatchEvent(filePaste);assert.match(messages.at(-1),/CSV 或 TSV/);assert.deepEqual(payload(records[0].doc.data),payload(before));
});

test('the compact field map and real sheet retain imported headers and reveal original examples explicitly',async t=>{
  const doc=getExample('column');doc.tableInput={headers:['实验批次','信号强度'],fieldColumns:{label:0,value:1}};doc.source={type:'user',name:'实际实验表'};
  const {host}=mount(t,[{key:'mapped',doc,options:{palette:'ink'}}]);
  const structure=host.querySelector('.dw-structure');assert.equal(structure.open,false);assert.match(structure.textContent,/类别与数值/);assert.match(structure.textContent,/填写示例仅说明格式/);
  structure.open=true;const headers=[...host.querySelectorAll('#dw-grid thead th[scope="col"]')].map(el=>el.textContent);
  assert.match(headers[0],/实验批次/);assert.match(headers[1],/信号强度/);assert.match(structure.textContent,/信号强度/);assert.equal(host.querySelectorAll('.dw-field-map>div').length,2);
});
test('hover highlights travel in both directions without modifying cells or changing selection',t=>{
  const {host}=mount(t),cell=host.querySelector('[data-dw-cell="2:1"]'),mark=host.querySelector('[data-edit-row="2"][data-edit-field="value"]'),before=host.querySelector('#dw-cell-ref').textContent;
  cell.dispatchEvent(new window.PointerEvent('pointerover',{bubbles:true}));assert.ok(mark.classList.contains('dw-hover-mark'));
  mark.dispatchEvent(new window.PointerEvent('pointerover',{bubbles:true}));assert.ok(host.querySelector('[data-dw-row="2"]').classList.contains('dw-hover-row'));assert.equal(host.querySelector('#dw-cell-ref').textContent,before);
  host.dispatchEvent(new window.PointerEvent('pointerleave'));assert.equal(host.querySelectorAll('.dw-hover-mark,.dw-hover-row').length,0);
});

test('native research marks and field selection target the source row after visual sorting',async t=>{
 const {host}=mount(t,[{key:'upset',doc:getExample('upset'),options:{}}]);
 const bars=[...host.querySelectorAll('[data-mark="upset-bar"]')],bar=bars.find(e=>+e.dataset.editRow!==bars.indexOf(e));assert.ok(bar,'fixture must have a sorted display');
 const row=+bar.dataset.editRow;bar.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
 assert.equal(host.querySelector('#dw-cell-ref').textContent,`B${row+1}`);
 assert.equal(host.querySelector('.dw-inline-editor input').value,getExample('upset').data[row].count.toString());
});

test('date error navigation locates every affected field and undo restores the data',async t=>{
 const {host,records}=mount(t,[{key:'gantt',doc:withRecordIds(getExample('gantt')),options:{}}]),initial=structuredClone(records[0].doc);
 fill(host,'[data-dw-cell="0:1"]','2099-01-01');
 host.querySelector('[data-workspace="locate-error"]').click();assert.equal(document.activeElement.dataset.dwCell,'0:1');
 host.querySelector('[data-workspace="next-error"]').click();assert.equal(document.activeElement.dataset.dwCell,'0:2');
 host.querySelector('[data-workspace="undo"]').click();await settle();assert.deepEqual(records[0].doc.data,initial.data);assert.equal(host.querySelectorAll('[aria-invalid="true"]').length,0);
});
