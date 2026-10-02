import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';

let win,server,mountWorkEditor,newWork,getExample;
const originals=new Map();
before(async()=>{
  win=new Window({url:'http://localhost:4231/#editor'});
  for(const [key,value]of Object.entries({window:win,document:win.document,XMLSerializer:win.XMLSerializer,ResizeObserver:win.ResizeObserver,requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win)})){
    originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  ({mountWorkEditor}=await server.ssrLoadModule('/src/forma/work-editor.js'));
  ({newWork}=await server.ssrLoadModule('/src/forma/work-model.js'));
  ({getExample}=await server.ssrLoadModule('/src/forma/catalog.js'));
});
after(async()=>{
  await server?.close();await win?.happyDOM.close();
  for(const [key,value]of originals)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];
});
function fixture(t,id='column',{doc=getExample(id),view}={}){
  const host=document.createElement('main');document.body.append(host);const messages=[],items=new Map(),storage={getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v)};
  const app=mountWorkEditor(host,{initial:newWork([{doc,...(view?{view}:{}),options:{palette:'ink',ratio:'portrait'}}]),storage,toast:m=>messages.push(m)});
  t.after(()=>{app.destroy();host.remove();});return {host,app,messages};
}
function input(host,query,value,type='input'){
  const el=host.querySelector(query);assert.ok(el,query);el.value=value;el.dispatchEvent(new win.Event(type,{bubbles:true}));
}
function changeView(host,id){host.querySelector('[data-we=type]').click();const button=host.querySelector(`[data-we-view="${id}"]`);assert.ok(button,id);assert.equal(button.disabled,false);button.click();}

test('unfinished cell data cannot reuse a stale valid chart or lose its draft',t=>{
  const {host,app}=fixture(t);input(host,'[data-dw-cell="0:1"]','unfinished');const before=app.getWork().steps[0];
  host.querySelector('[data-we=type]').click();assert.equal(host.querySelector('[data-we-view]'),null);assert.match(host.querySelector('.we-picker-note').textContent,/未完成/);
  host.querySelector('[data-we=repair-data]').click();assert.equal(host.querySelector('[data-dw-cell="0:1"]').value,'unfinished');assert.deepEqual(app.getWork().steps[0],before);
  host.querySelector('[data-workspace=undo]').click();assert.equal(host.querySelector('[data-dw-cell="0:1"]').value,'42');
});
test('a valid picker choice is rejected when background edits become incomplete',t=>{
  const {host,app,messages}=fixture(t);host.querySelector('[data-we=type]').click();const choice=host.querySelector('[data-we-view=line]');
  input(host,'[data-dw-cell="0:1"]','unfinished');const before=app.getWork().steps[0];choice.click();assert.deepEqual(app.getWork().steps[0],before);assert.match(messages.at(-1),/先修正/);assert.equal(host.querySelector('[data-dw-cell="0:1"]').value,'unfinished');
});
test('view changes keep native schema, IDs, metadata, and cell undo history',t=>{
  const {host,app}=fixture(t,'singleline');input(host,'[data-dw-cell="0:1"]','999');const before=app.getWork().steps[0];changeView(host,'bars');
  const switched=app.getWork().steps[0];assert.equal(switched.view,'bars');assert.equal(switched.doc.template,'singleline');assert.deepEqual(switched.doc,before.doc);assert.equal(switched.dataGroup,before.dataGroup);
  host.querySelector('[data-workspace=undo]').click();assert.notEqual(host.querySelector('[data-dw-cell="0:1"]').value,'999');host.querySelector('[data-workspace=redo]').click();
  host.querySelector('[data-we=undo-chart]').click();assert.equal(app.getWork().steps[0].view,before.view);assert.deepEqual(app.getWork().steps[0].doc,before.doc);assert.equal(host.querySelector('[data-workspace=undo]').disabled,false);
});
test('layout limits do not prevent using a compatible view with every original row',t=>{
  const doc=getExample('column');doc.data=Array.from({length:26},(_,i)=>({label:`真实项目 ${i+1}`,value:i+1}));const {host,app}=fixture(t,'column',{doc});
  assert.equal(host.querySelector('[data-we=export]').disabled,true);const before=app.getWork().steps[0];changeView(host,'step');
  assert.equal(app.getWork().steps[0].view,'step');assert.deepEqual(app.getWork().steps[0].doc,before.doc);assert.equal(app.getWork().steps[0].doc.data.length,26);assert.equal(host.querySelector('[data-we=export]').disabled,false);
});
test('template replacements disclose demo data and undo restores native data and its edit history',t=>{
  const {host,app,messages}=fixture(t);input(host,'[data-dw-cell="0:0"]','实际实验甲');input(host,'[data-dw-cell="0:1"]','999');const before=app.getWork().steps[0];
  host.querySelector('[data-we=type]').click();host.querySelector('[data-we-picker-tab=library]').click();assert.match(host.querySelector('.we-picker-note').textContent,/演示数据/);assert.match(host.querySelector('.we-picker-note').textContent,/替换/);
  host.querySelector('[data-we-template=volcano]').click();assert.equal(app.getWork().steps[0].doc.template,'volcano');assert.equal(app.getWork().steps[0].options.ratio,'portrait');assert.match(messages.at(-1),/演示模板/);
  input(host,'#dw-palette','cobalt','change');host.querySelector('[data-we=undo-chart]').click();const restored=app.getWork().steps[0];assert.deepEqual(restored.doc,before.doc);assert.equal(restored.dataGroup,before.dataGroup);assert.equal(restored.options.palette,'cobalt');assert.equal(host.querySelector('[data-dw-cell="0:1"]').value,'999');host.querySelector('[data-workspace=undo]').click();assert.equal(host.querySelector('[data-dw-cell="0:1"]').value,'42');assert.equal(host.querySelector('[data-dw-cell="0:0"]').value,'实际实验甲');
});
test('chart undo never overwrites later data edits and resumes after their undo',t=>{
  const {host,app,messages}=fixture(t);const before=app.getWork().steps[0];changeView(host,'line');input(host,'[data-dw-cell="0:1"]','123');
  host.querySelector('[data-we=undo-chart]').click();assert.equal(app.getWork().steps[0].view,'line');assert.equal(app.getWork().steps[0].doc.data[0].value,123);assert.match(messages.at(-1),/先撤销后续/);
  host.querySelector('[data-workspace=undo]').click();host.querySelector('[data-we=undo-chart]').click();assert.deepEqual(app.getWork().steps[0].doc,before.doc);assert.equal(app.getWork().steps[0].view,before.view);
});
test('chart replacement undo survives editor locale session reconstruction',async t=>{
  const {host,app}=fixture(t);input(host,'[data-dw-cell="0:1"]','999');const before=app.getWork().steps[0];changeView(host,'line');const session=app.captureSession();await app.restoreSession(session);
  assert.equal(host.querySelector('[data-we=undo-chart]').hidden,false);host.querySelector('[data-we=undo-chart]').click();assert.deepEqual(app.getWork().steps[0].doc,before.doc);assert.equal(app.getWork().steps[0].view,before.view);assert.equal(host.querySelector('[data-workspace=undo]').disabled,false);
});
test('an explicit demo replacement can restore an unfinished original table and its history',t=>{
  const {host,app}=fixture(t);input(host,'[data-dw-cell="0:1"]','unfinished');const before=app.getWork().steps[0];host.querySelector('[data-we=type]').click();host.querySelector('[data-we-picker-tab=library]').click();host.querySelector('[data-we-template=volcano]').click();assert.equal(app.getWork().steps[0].doc.template,'volcano');
  host.querySelector('[data-we=undo-chart]').click();assert.deepEqual(app.getWork().steps[0].doc,before.doc);assert.deepEqual(app.getWork().steps[0].draft,before.draft);assert.equal(host.querySelector('[data-dw-cell="0:1"]').value,'unfinished');assert.equal(host.querySelector('[data-we=export]').disabled,true);host.querySelector('[data-workspace=undo]').click();assert.equal(host.querySelector('[data-dw-cell="0:1"]').value,'42');
});
