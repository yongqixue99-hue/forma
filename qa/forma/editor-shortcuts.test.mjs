import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';

let win,server,mountWorkEditor,newWork,getExample;
const originals=new Map();
before(async()=>{
  win=new Window({url:'http://localhost:4232/#editor'});
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
function fixture(t){
  const host=document.createElement('main');document.body.append(host);const messages=[],items=new Map(),storage={getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v)};
  const app=mountWorkEditor(host,{initial:newWork([{doc:getExample('column'),options:{palette:'ink',ratio:'portrait'}}]),storage,toast:m=>messages.push(m)});
  t.after(()=>{app.destroy();host.remove();});return {host,app,messages};
}
function press(target,init){const event=new win.KeyboardEvent('keydown',{bubbles:true,cancelable:true,...init});target.dispatchEvent(event);return event.defaultPrevented;}
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));

test('the platform save shortcut saves a valid work and is announced on the button',async t=>{
  const {host,messages}=fixture(t),button=host.querySelector('[data-we=save]');
  assert.match(button.getAttribute('aria-keyshortcuts'),/^(Meta|Control)\+S$/);assert.ok(button.title);
  assert.equal(press(document.body,{key:'s',ctrlKey:true}),true);await settle();
  assert.match(messages.at(-1),/已保存/);
  const count=messages.length;assert.equal(press(document.body,{key:'s',ctrlKey:true,shiftKey:true}),false);await settle();assert.equal(messages.length,count);
});
test('the save shortcut reports unfinished data instead of saving it',async t=>{
  const {host,messages}=fixture(t),cell=host.querySelector('[data-dw-cell="0:1"]');
  cell.value='unfinished';cell.dispatchEvent(new win.Event('input',{bubbles:true}));
  assert.equal(press(document.body,{key:'s',metaKey:true}),true);await settle();
  assert.ok(messages.length);assert.doesNotMatch(messages.at(-1),/已保存/);
});
test('Space toggles the visible player only when no control has focus',t=>{
  const {host}=fixture(t),play=host.querySelector('[data-workspace=play]');let clicks=0;play.addEventListener('click',()=>clicks++);
  assert.equal(press(document.body,{key:' '}),true);assert.equal(clicks,1);
  assert.equal(press(host.querySelector('[data-dw-cell="0:1"]'),{key:' '}),false);
  assert.equal(press(host.querySelector('[data-we=save]'),{key:' '}),false);
  assert.equal(press(document.body,{key:' ',repeat:true}),false);assert.equal(clicks,1);
});
test('shortcuts stop after the editor is destroyed',t=>{
  const {host,app}=fixture(t);app.destroy();host.remove();
  assert.equal(press(document.body,{key:'s',ctrlKey:true}),false);assert.equal(press(document.body,{key:' '}),false);
});
