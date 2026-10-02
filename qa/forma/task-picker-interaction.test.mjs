import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';

let win,server,openTaskPicker,textSource,getExample,setLocale;
const originals=new Map();
before(async()=>{
  win=new Window({url:'http://localhost:4241'});
  for(const [key,value]of Object.entries({window:win,document:win.document,XMLSerializer:win.XMLSerializer,ResizeObserver:win.ResizeObserver,requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win)})){
    originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  ({openTaskPicker}=await server.ssrLoadModule('/src/forma/task-picker.js'));
  ({textSource}=await server.ssrLoadModule('/src/forma/source-table.js'));
  ({getExample}=await server.ssrLoadModule('/src/forma/catalog.js'));
  ({setLocale}=await server.ssrLoadModule('/src/forma/locale.js'));
});
after(async()=>{
  await server?.close();await win?.happyDOM.close();
  for(const [key,value]of originals)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];
});
const matrix=[['类别','销售额'],['真实甲','10'],['真实乙','20'],['真实丙','30']];
function fixture(t,options={}){
  setLocale('zh-CN');
  const original={...getExample('column'),source:{type:'user',name:'合成观测记录'},data:matrix.slice(1).map(([label,value],i)=>({_id:`task-test:${i+1}`,label,value:Number(value)}))},used=[];
  const picker=openTaskPicker({initialSource:textSource(matrix),original,initialMetadata:{title:'真实观测',unit:'mg',source:original.source.name},onUse:(doc,meta)=>used.push({doc,meta}),...options});
  t.after(()=>picker.close());return{picker,dialog:picker.dialog,original,used};
}
function input(dialog,value){const area=dialog.querySelector('[data-task-table]');area.value=value;area.dispatchEvent(new win.Event('input',{bubbles:true}));}
function goal(dialog,value){const select=dialog.querySelector('[data-task-goal]');select.value=value;select.dispatchEvent(new win.Event('change',{bubbles:true}));}
const cards=dialog=>[...dialog.querySelectorAll('[data-task-chart]')].map(el=>el.dataset.taskChart);

test('changing goals with unreviewed text never offers a demo replacement',t=>{
  const {dialog,used,original}=fixture(t),before=structuredClone(original);
  input(dialog,'类别\t销售额\n新甲\t101\n新乙\t202\n新丙\t303');goal(dialog,'trend');
  assert.equal(dialog.querySelector('[data-task-results]').hidden,true);assert.deepEqual(cards(dialog),[]);
  assert.equal(dialog.querySelector('[data-task-use]'),null);assert.match(dialog.querySelector('[data-task-status]').textContent,/重新检查/);
  assert.deepEqual(used,[]);assert.deepEqual(original,before);
  dialog.querySelector('[data-task-analyze]').click();assert.ok(dialog.querySelector('[data-task-preview] svg'));
  assert.match(dialog.querySelector('[data-task-preview]').textContent,/新甲|101/);assert.deepEqual(used,[]);
  dialog.querySelector('[data-task-clear]').click();goal(dialog,'comparison');
  assert.equal(dialog.querySelector('[data-task-use]'),null);assert.deepEqual(used,[]);
});

test('new table text keeps purpose changes pending until the table is analyzed',t=>{
  setLocale('zh-CN');const used=[],picker=openTaskPicker({initialGoal:'comparison',onUse:doc=>used.push(doc)}),dialog=picker.dialog;t.after(()=>picker.close());
  assert.ok(dialog.querySelector('[data-task-use]'));
  input(dialog,'类别\t销售额\n新甲\t101\n新乙\t202\n新丙\t303');goal(dialog,'trend');
  assert.equal(dialog.querySelector('[data-task-use]'),null);assert.deepEqual(used,[]);
  dialog.querySelector('[data-task-analyze]').click();assert.ok(dialog.querySelector('[data-task-preview] svg'));assert.deepEqual(used,[]);
});

test('recommendation pages retain at most six real previews and restore the first page',t=>{
  const {dialog}=fixture(t),first=cards(dialog),firstSVG=dialog.querySelector('[data-task-preview] svg');
  assert.equal(first.length,6);assert.equal(dialog.querySelectorAll('[data-task-preview] svg').length,6);
  assert.equal(dialog.querySelector('[data-task-prev]').hidden,true);
  dialog.querySelector('[data-task-more]').click();
  assert.equal(cards(dialog).length,6);assert.notDeepEqual(cards(dialog),first);
  assert.ok(dialog.querySelectorAll('[data-task-preview] svg').length<=6);assert.equal(firstSVG.isConnected,false);
  assert.match(dialog.querySelector('[data-task-page-count]').textContent,/7–12/);assert.equal(dialog.querySelector('[data-task-prev]').hidden,false);
  dialog.querySelector('[data-task-prev]').click();assert.deepEqual(cards(dialog),first);
  assert.equal(dialog.querySelectorAll('[data-task-preview] svg').length,6);assert.match(dialog.querySelector('[data-task-page-count]').textContent,/1–6/);
});

test('editing or clearing the source closes its obsolete child importer',t=>{
  const {dialog,used}=fixture(t);
  dialog.querySelector('[data-task-use=bar]').click();const old=document.querySelector('.data-importer');assert.ok(old);
  input(dialog,'类别\t销售额\n新甲\t101\n新乙\t202\n新丙\t303');assert.equal(old.isConnected,false);assert.equal(document.querySelector('.data-importer'),null);
  dialog.querySelector('[data-task-analyze]').click();dialog.querySelector('[data-task-use=bar]').click();assert.ok(document.querySelector('.data-importer'));
  dialog.querySelector('[data-task-clear]').click();assert.equal(document.querySelector('.data-importer'),null);assert.deepEqual(used,[]);
});

test('closing matching destroys child import and help dialogs as well as chart previews',t=>{
  const {picker,dialog,used}=fixture(t);let helpButton=dialog.querySelector('[data-task-help]');
  while(!helpButton&&!dialog.querySelector('[data-task-more]').hidden){dialog.querySelector('[data-task-more]').click();helpButton=dialog.querySelector('[data-task-help]');}
  assert.ok(helpButton);helpButton.click();assert.ok(document.querySelector('.data-help-dialog'));
  for(let page=0;page<34&&!dialog.querySelector('[data-task-use=bar]');page++){
    assert.equal(dialog.querySelector('[data-task-prev]').hidden,false);dialog.querySelector('[data-task-prev]').click();
  }
  assert.ok(dialog.querySelector('[data-task-use=bar]'));
  dialog.querySelector('[data-task-use=bar]').click();assert.ok(document.querySelector('.data-importer'));const svg=dialog.querySelector('[data-task-preview] svg');
  picker.close();picker.close();assert.equal(document.querySelector('.workflow-dialog'),null);assert.equal(svg.isConnected,false);assert.deepEqual(used,[]);
});

test('English file selection has a native keyboard button and translated labels',t=>{
  setLocale('en');t.after(()=>setLocale('zh-CN'));const picker=openTaskPicker(),dialog=picker.dialog;t.after(()=>picker.close());
  assert.equal(dialog.querySelector('[data-task-format]').getAttribute('aria-label'),'Table text format');
  assert.doesNotMatch(dialog.querySelector('[data-task-table]').getAttribute('placeholder'),/\p{Script=Han}/u);
  const button=dialog.querySelector('[data-task-select-file]'),file=dialog.querySelector('[data-task-file]');
  assert.equal(button.tagName,'BUTTON');assert.equal(button.disabled,false);assert.equal(button.tabIndex,0);
  assert.equal(button.textContent,'Choose CSV / TSV');button.focus();assert.equal(document.activeElement,button);
  let opened=false;file.addEventListener('click',()=>{opened=true;});button.click();assert.equal(opened,true);
  assert.doesNotMatch(dialog.querySelector('.task-pages').getAttribute('aria-label'),/\p{Script=Han}/u);
});
