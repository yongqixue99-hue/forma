import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {createServer} from 'vite';

test('the actual single-chart page preserves record identities across repeated saves and metadata edits',async t=>{
  const win=new Window({url:'http://localhost:4204/#chart/column'}),indexedDB=new IDBFactory(),originals=new Map();
  win.document.body.innerHTML='<div id="app"></div>';
  const globals={window:win,document:win.document,location:win.location,history:win.history,localStorage:win.localStorage,navigator:win.navigator,indexedDB,BroadcastChannel:undefined,XMLSerializer:win.XMLSerializer,ResizeObserver:win.ResizeObserver,MutationObserver:win.MutationObserver,matchMedia:win.matchMedia.bind(win),getComputedStyle:win.getComputedStyle.bind(win),requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{}};
  for(const [key,value] of Object.entries(globals)){originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});}
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  t.after(async()=>{await server.close();await win.happyDOM.close();for(const [key,value] of originals){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
  const until=async condition=>{for(let i=0;i<200;i++){if(condition())return;await new Promise(r=>setTimeout(r,10));}assert.fail('The studio did not finish its operation.');};
  await server.ssrLoadModule('/src/forma/main.js');
  await until(()=>document.querySelector('#studio[open]'));
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('forma.works.v2');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});t.after(()=>db.close());
  const records=()=>new Promise((resolve,reject)=>{const request=db.transaction('works').objectStore('works').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const save=async()=>{const button=document.querySelector('#studio [data-action="save"]');button.click();await until(()=>!button.disabled);assert.match(document.querySelector('#toast').textContent,/已保存/);const all=await records();assert.equal(all.length,1);return all[0];};
  const first=await save(),ids=first.work.steps[0].doc.data.map(r=>r._id);assert.ok(ids.every(Boolean));
  const title=document.querySelector('[data-field="title"]');title.value='更新标题，保留数据对象';title.dispatchEvent(new win.Event('input',{bubbles:true}));
  const second=await save();assert.equal(second.work.id,first.work.id);assert.equal(second.work.steps[0].doc.title,title.value);assert.deepEqual(second.work.steps[0].doc.data.map(r=>r._id),ids);
  const third=await save();assert.deepEqual(third.work.steps[0].doc.data,second.work.steps[0].doc.data);
  // Replacing demo data starts a new population once; later saves keep those IDs.
  document.querySelector('[data-action="studio-tab"][data-id="data"]').click();
  document.querySelector('[data-action="restore-data"]').click();
  const replacement=await save();assert.notDeepEqual(replacement.work.steps[0].doc.data.map(r=>r._id),ids);
  const last=await save();assert.deepEqual(last.work.steps[0].doc.data,replacement.work.steps[0].doc.data);
  const imported=structuredClone(last.work.steps[0].doc);imported.source={type:'user',name:'合成科研验收数据'};imported.unit='mg/L';
  for(const row of imported.data)delete row._id;
  imported.data[0].value=2.1e-15;
  const editor=document.querySelector('#data-editor');editor.value=JSON.stringify(imported);editor.dispatchEvent(new win.Event('input',{bubbles:true}));document.querySelector('[data-action="apply-data"]').click();
  const importedRecord=await save();assert.equal(importedRecord.work.steps[0].doc.data[0].value,2.1e-15);assert.equal(importedRecord.work.steps[0].doc.unit,'mg/L');assert.deepEqual(importedRecord.work.steps[0].doc.source,imported.source);
  assert.notDeepEqual(importedRecord.work.steps[0].doc.data.map(r=>r._id),last.work.steps[0].doc.data.map(r=>r._id));
  assert.deepEqual((await save()).work.steps[0].doc,importedRecord.work.steps[0].doc);
});
