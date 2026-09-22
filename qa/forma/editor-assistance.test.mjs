import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';

let window,server,openDataHelp,openAgentImport,openChartPicker,getExample,mountDataWorkspace,writes;
const originals=new Map();
before(async()=>{
  window=new Window({url:'http://localhost:4189/#editor'});
  for(const [name,value] of Object.entries({window,document:window.document,navigator:window.navigator,XMLSerializer:window.XMLSerializer,ResizeObserver:window.ResizeObserver,requestAnimationFrame:window.requestAnimationFrame.bind(window),cancelAnimationFrame:window.cancelAnimationFrame.bind(window)})){
    originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
  }
  server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  ({openDataHelp,openAgentImport}=await server.ssrLoadModule('/src/forma/editor-assistance.js'));
  ({openChartPicker}=await server.ssrLoadModule('/src/forma/chart-picker.js'));
  ({getExample}=await server.ssrLoadModule('/src/forma/catalog.js'));
  ({mountDataWorkspace}=await server.ssrLoadModule('/src/forma/data-workspace.js'));
});
after(async()=>{await server?.close();await window?.happyDOM.close();for(const [name,d] of originals){if(d)Object.defineProperty(globalThis,name,d);else delete globalThis[name];}});
beforeEach(()=>{document.body.innerHTML='<button id="opener">打开帮助</button>';document.querySelector('#opener').focus();writes=[];Object.defineProperty(navigator,'clipboard',{value:{async writeText(text){writes.push(text);}},configurable:true});});
const input=(selector,value)=>{const node=document.querySelector(selector);assert.ok(node,selector);node.value=value;node.dispatchEvent(new window.Event('input',{bubbles:true}));};
const click=selector=>document.querySelector(selector).click();
const record=id=>({key:'template:'+id,doc:getExample(id),options:{palette:'ink',duration:8,ratio:'wide'}});
const settle=()=>new Promise(resolve=>setTimeout(resolve,190));

test('help introduces the chart before its fields and copies a complete production manual',async t=>{
  const doc=getExample('upset');doc.title='用户交集';const before=structuredClone(doc),helper=openDataHelp(doc,{options:{palette:'ochre',colors:['#112233','#aa6633']}});t.after(()=>helper.close());
  assert.match(document.querySelector('.assist-window-header').textContent,/UpSet/);assert.match(document.querySelector('.help-introduction').textContent,/请避免将包含更多集合的元素重复计入较小交集/);assert.match(document.querySelector('.help-introduction').textContent,/适合用于/);assert.match(document.querySelector('.help-row-meaning').textContent,/排他交集/);assert.equal(document.querySelectorAll('.help-field-table tbody tr').length,2);
  click('[data-help="agent"]');click('[data-help="copy-brief"]');await settle();assert.ok(writes[0].includes('template=upset'));assert.ok(writes[0].includes(JSON.stringify(doc,null,2)));assert.match(writes[0],/直接.*制作/);assert.match(writes[0],/#112233/);assert.match(writes[0],/forma-document/);assert.equal(document.querySelector('[data-help="import"]'),null);assert.ok(document.querySelector('[data-help="download-code"]'));assert.deepEqual(doc,before);helper.close();assert.equal(document.activeElement.id,'opener');
});
test('manual copy failure exposes the exact selectable instructions without requiring data roundtrips',async t=>{
  Object.defineProperty(navigator,'clipboard',{value:{async writeText(){throw new Error('blocked');}},configurable:true});const helper=openDataHelp(getExample('column'),{mode:'agent'});t.after(()=>helper.close());click('[data-help="copy-brief"]');await settle();assert.match(document.querySelector('.assist-manual-copy').value,/制作说明书/);assert.match(document.querySelector('.assist-manual-copy').value,/完整可运行代码/);assert.equal(document.querySelector('[data-help="copy-json"]'),null);
});
test('Agent import previews only valid data, applies only on request and invalidates stale previews',t=>{
  const original=getExample('column'),candidate=structuredClone(original);candidate.data[0].value=222;candidate.source={type:'user',name:'合成验收数据'};let applied;
  const importer=openAgentImport(original,{onApply:doc=>applied=doc});t.after(()=>importer.close());input('#agent-result',JSON.stringify(candidate));click('[data-agent="check"]');assert.equal(document.querySelector('#agent-preview-chart [data-mark="basic-column"]').dataset.value,'222');assert.equal(applied,undefined);assert.equal(original.data[0].value,42);
  input('#agent-result','bad');assert.equal(document.querySelector('[data-agent="apply"]').disabled,true);click('[data-agent="check"]');assert.match(document.querySelector('#agent-errors').textContent,/JSON 格式/);assert.equal(applied,undefined);
  input('#agent-result',JSON.stringify(getExample('upset')));click('[data-agent="check"]');assert.match(document.querySelector('#agent-errors').textContent,/template 必须是 column/);assert.equal(document.querySelector('[data-agent="apply"]').disabled,true);
  input('#agent-result',JSON.stringify(candidate));click('[data-agent="check"]');click('[data-agent="apply"]');assert.deepEqual(applied,candidate);assert.equal(document.querySelector('.agent-import-dialog'),null);
});
test('Agent file changes invalidate earlier previews and delayed reads cannot replace newer input',async t=>{
  const original=getExample('column'),candidate=structuredClone(original);candidate.data[0].value=222;
  const importer=openAgentImport(original);t.after(()=>importer.close());
  const choose=file=>{const field=document.querySelector('#agent-json-file');Object.defineProperty(field,'files',{value:[file],configurable:true});field.dispatchEvent(new window.Event('change',{bubbles:true}));};
  input('#agent-result',JSON.stringify(original));click('[data-agent="check"]');
  choose({size:2000001});assert.equal(document.querySelector('[data-agent="apply"]').disabled,true);assert.match(document.querySelector('#agent-errors').textContent,/2 MB/);
  let completeRead;choose({size:100,text:()=>new Promise(resolve=>completeRead=resolve)});
  input('#agent-result',JSON.stringify(candidate));click('[data-agent="check"]');completeRead(JSON.stringify(original));await settle();
  assert.equal(document.querySelector('#agent-preview-chart [data-mark="basic-column"]').dataset.value,'222');assert.equal(JSON.parse(document.querySelector('#agent-result').value).data[0].value,222);
  choose({size:100,text:async()=>JSON.stringify(original)});await settle();assert.equal(document.querySelector('#agent-preview-chart [data-mark="basic-column"]').dataset.value,'42');
  choose({size:100,text:()=>new Promise(resolve=>completeRead=resolve)});importer.close();completeRead(JSON.stringify(candidate));await settle();assert.equal(document.querySelector('.agent-import-dialog'),null);
});
test('picker filters keep pending selections, existing charts open in place and cancel makes no additions',t=>{
  const records=[record('column')],before=structuredClone(records),added=[],opened=[],picker=openChartPicker({records,onAdd:ids=>added.push(ids),onOpen:key=>opened.push(key)});t.after(()=>picker.close());
  assert.match(document.querySelector('[data-pick-open]').textContent,/已加入/);click('[data-pick-id="bar"]');input('#picker-search','UpSet');assert.equal(document.querySelectorAll('[data-pick-id]').length,1);click('[data-pick-id="upset"]');assert.match(document.querySelector('#picker-selected').textContent,/2 张/);assert.deepEqual(records,before);click('[data-picker="add"]');assert.deepEqual(added,[['bar','upset']]);
  const cancelled=openChartPicker({records,onAdd:ids=>added.push(ids),onOpen:key=>opened.push(key)});click('[data-pick-id="area"]');cancelled.close();assert.equal(added.length,1);
  const existing=openChartPicker({records,onAdd:ids=>added.push(ids),onOpen:key=>opened.push(key)});click('[data-pick-open="template:column"]');assert.deepEqual(opened,['template:column']);existing.close();
});
test('picker enforces remaining editor capacity without partially adding data',t=>{
  const records=Array.from({length:12},(_,i)=>({...record('column'),key:'saved:'+i}));let added=false;const picker=openChartPicker({records,onAdd:()=>added=true,onOpen(){}});t.after(()=>picker.close());click('[data-pick-id="bar"]');assert.match(document.querySelector('#picker-status').textContent,/最多保留 12/);assert.equal(document.querySelector('[data-picker="add"]').disabled,true);assert.equal(added,false);
});
test('floating help keeps the table editable and scientific history survives picker additions',async t=>{
  document.body.innerHTML='<main></main>';const records=[record('volcano')],host=document.querySelector('main');const controller=mountDataWorkspace(host,{records,activeKey:records[0].key,onChange(){},onActive(){},onRemove(){},onSave(){},toast(){},onAddTemplates(ids){const added=ids.map(record);records.push(...added);return added;}});t.after(()=>controller.destroy());
  click('[data-workspace="help"]');assert.equal(document.querySelector('.assist-window').parentElement,document.body);assert.equal(document.querySelector('.assist-window').getAttribute('aria-modal'),'false');input('[data-dw-meta="qThreshold"]','0.02');await settle();assert.equal(records[0].doc.qThreshold,.02);assert.ok(document.querySelector('.assist-window'));assert.equal(document.querySelector('.dw-help-host'),null);
  const palette=document.querySelector('#dw-palette');palette.value='mauve';palette.dispatchEvent(new window.Event('change',{bubbles:true}));
  click('.assist-tabs [data-help="agent"]');click('[data-help="copy-brief"]');await settle();assert.ok(writes[0].includes('"qThreshold": 0.02'));assert.match(writes[0],/雾紫/);
  input('[data-dw-cell="0:1"]','invalid');click('[data-help="copy-brief"]');await settle();assert.equal(writes.length,1);assert.match(document.querySelector('#help-status').textContent,/请先修正/);
  click('[data-workspace="undo"]');await settle();
  click('[data-workspace="undo"]');await settle();assert.equal(records[0].doc.qThreshold,.05);assert.equal(document.querySelector('[data-dw-meta="qThreshold"]').value,'0.05');
  click('[data-workspace="pick"]');click('[data-pick-id="bar"]');click('[data-picker="add"]');assert.equal(records.length,2);assert.equal(document.querySelector('.dw-tab.active>button').textContent,'基础条形图');click('[data-workspace="switch"][data-key="template:volcano"]');assert.equal(document.querySelector('[data-dw-meta="qThreshold"]').value,'0.05');
});


test('help tabs work with keyboard, minimize without losing the document and reopen the same window',async t=>{
  document.body.innerHTML='<main></main>';const records=[record('column')],host=document.querySelector('main');
  const controller=mountDataWorkspace(host,{records,activeKey:records[0].key,onChange(){},onActive(){},onRemove(){},onSave(){},toast(){}});t.after(()=>controller.destroy());
  click('[data-workspace="help"]');const floating=document.querySelector('.assist-window');
  assert.equal(floating.querySelectorAll('ol').length,0);assert.equal(floating.querySelectorAll('.help-field-table tbody tr').length,2);
  document.querySelector('#help-tab-fill').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(document.querySelector('#help-tab-agent').getAttribute('aria-selected'),'true');
  click('[data-help="minimize"]');assert.equal(floating.querySelector('.assist-window-content').hidden,true);
  input('[data-dw-cell="0:1"]','92');await settle();assert.equal(records[0].doc.data[0].value,92);
  click('[data-workspace="agent"]');assert.equal(document.querySelectorAll('.assist-window').length,1);assert.equal(document.querySelector('.assist-window'),floating);assert.equal(floating.querySelector('.assist-window-content').hidden,false);
  click('[data-help="copy-brief"]');await settle();assert.match(writes[0],/"value": 92/);
  floating.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(floating.isConnected,false);
});
