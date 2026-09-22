import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';

let win,server,mountDataWorkspace,createStepScene,makeStep,getExample,copied='';const previous=new Map();
before(async()=>{
  win=new Window({url:'http://localhost:4189/#editor'});
  for(const [key,value] of Object.entries({window:win,document:win.document,navigator:{clipboard:{writeText:async text=>{copied=text;}}},XMLSerializer:win.XMLSerializer,ResizeObserver:win.ResizeObserver,requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win)})){
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  }
  server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  ({mountDataWorkspace}=await server.ssrLoadModule('/src/forma/data-workspace.js'));
  ({createStepScene}=await server.ssrLoadModule('/src/forma/work-scene.js'));
  ({makeStep}=await server.ssrLoadModule('/src/forma/work-model.js'));
  ({getExample}=await server.ssrLoadModule('/src/forma/catalog.js'));
});
after(async()=>{await server.close();await win.happyDOM.close();for(const [key,value] of previous){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
const settle=()=>new Promise(resolve=>setTimeout(resolve,180));
function fixture(t){
  const doc=getExample('errorbar'),groups=Object.values(Object.groupBy(doc.data,r=>r.group));doc.data=groups[0].flatMap((_,i)=>groups.map(g=>g[i]));
  doc.tableInput={headers:['实验编号','处理组','信号'],fieldColumns:{label:0,group:1,value:2}};
  const records=[{key:'samples',doc:makeStep({doc}).doc,options:{palette:'ink'}},{key:'fit',doc:makeStep({doc:getExample('regression')}).doc,options:{palette:'ink'}}];
  const host=win.document.createElement('main');win.document.body.append(host);
  const app=mountDataWorkspace(host,{records,onChange(){},onActive(){},onRemove(){},onSave(){},toast(){},createScene(h,d,o){return createStepScene(h,makeStep({doc:d,view:d.template==='errorbar'?'sample-box':'obs-confidence'}),o);}});
  t.after(()=>{app.destroy();host.remove();});return {host,records,app};
}
const box=host=>host.querySelector('[data-science-role="box"][data-record-ids]');
const selectedRows=host=>[...host.querySelectorAll('.dw-related-row')].map(n=>Number(n.dataset.dwRow));

test('a summary links only contributing rows, across pages, without creating a rectangular edit selection',t=>{
  const {host,records}=fixture(t),before=structuredClone(records[0].doc),mark=box(host),ids=JSON.parse(mark.dataset.recordIds);
  mark.dispatchEvent(new win.MouseEvent('pointerover',{bubbles:true}));
  assert.deepEqual(selectedRows(host),records[0].doc.data.flatMap((r,i)=>ids.includes(r._id)&&i<40?[i]:[]));
  assert.equal(host.querySelector('.dw-record-links').hidden,true,'hover does not create a persistent selection');
  mark.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
  assert.equal(host.querySelector('.dw-record-links').hidden,false);assert.match(host.querySelector('[data-record-title]').textContent,/16 条原始记录/);
  assert.equal(host.querySelector('#dw-cell-ref').textContent,'C1');assert.equal(host.querySelectorAll('.dw-in-range').length,0);
  for(let i=0;i<14;i++)host.querySelector('[data-record-action="next"]').click();
  assert.equal(host.querySelector('#dw-cell-ref').textContent,'C43');assert.deepEqual(selectedRows(host),[42,45]);assert.deepEqual(records[0].doc,before);
});

test('copying related records retains original headers and excludes interleaved unrelated rows',async t=>{
  const {host,records}=fixture(t),mark=box(host),ids=JSON.parse(mark.dataset.recordIds);mark.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
  host.querySelector('[data-record-action="copy"]').click();await settle();
  const rows=copied.split('\n').map(line=>line.split('\t'));assert.deepEqual(rows[0],['实验编号','处理组','信号']);
  assert.deepEqual(rows.slice(1).map(r=>r[0]),records[0].doc.data.filter(r=>ids.includes(r._id)).map(r=>r.label));
  assert.equal(rows.length,17);assert.equal(host.querySelectorAll('.dw-in-range').length,0);
});

test('summary links follow edits and undo by record ID and clear when changing works',async t=>{
  const {host,records}=fixture(t);box(host).dispatchEvent(new win.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  const before=records[0].doc.data.map(r=>r._id),cell=host.querySelector('[data-dw-cell="0:2"]');cell.value='75';cell.dispatchEvent(new win.Event('input',{bubbles:true}));await settle();
  assert.deepEqual(records[0].doc.data.map(r=>r._id),before);assert.match(host.querySelector('[data-record-title]').textContent,/16 条原始记录/);
  host.querySelector('[data-workspace="delete"][data-row="0"]').click();await settle();assert.match(host.querySelector('[data-record-title]').textContent,/15 条原始记录/);
  host.querySelector('[data-workspace="undo"]').click();await settle();assert.match(host.querySelector('[data-record-title]').textContent,/16 条原始记录/);
  host.querySelector('[data-workspace="switch"][data-key="fit"]').click();assert.equal(host.querySelector('.dw-record-links').hidden,true);
  const fit=host.querySelector('[data-science-role="fit"][data-record-ids]');fit.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
  assert.match(host.querySelector('[data-record-title]').textContent,/42 条原始记录/);assert.equal(JSON.parse(fit.dataset.recordIds).length,records[1].doc.data.length);
  host.querySelector('[data-record-action="clear"]').click();assert.equal(host.querySelector('.dw-record-links').hidden,true);assert.equal(host.querySelectorAll('.dw-related-row').length,0);
});

test('hovering a sheet row highlights its summaries and preserves the current cell',t=>{
  const {host}=fixture(t),ref=host.querySelector('#dw-cell-ref').textContent;
  host.querySelector('[data-dw-cell="4:2"]').dispatchEvent(new win.MouseEvent('pointerover',{bubbles:true}));
  assert.ok(host.querySelectorAll('[data-record-ids].dw-related-mark').length>0);
  assert.equal(host.querySelector('#dw-cell-ref').textContent,ref);assert.equal(host.querySelectorAll('.dw-inline-editor').length,0);
});

test('rectangular paste renames a whole population without losing the selected summary',async t=>{
  const {host,records}=fixture(t),mark=box(host),key=mark.dataset.morphKey,group=records[0].doc.data[0].group;
  mark.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
  const cell=host.querySelector('[data-dw-cell="0:0"]'),matrix=records[0].doc.data.map(r=>[r.label,r.group===group?'重命名对照':r.group,r.value].join('\t')).join('\n');
  cell.focus();const event=new win.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(event,'clipboardData',{value:{getData:()=>matrix}});cell.dispatchEvent(event);await settle();
  assert.equal(box(host).dataset.morphKey,key);assert.match(host.querySelector('[data-record-title]').textContent,/重命名对照.*16 条原始记录/);
  host.querySelector('[data-workspace="undo"]').click();await settle();assert.equal(box(host).dataset.morphKey,key);assert.match(host.querySelector('[data-record-title]').textContent,/对照.*16 条原始记录/);
});
