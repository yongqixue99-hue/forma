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
function userDocument({rows=3,extra=true}={}){
  const doc=getExample('column');doc.title='真实实验信号';doc.subtitle='复核后的原始观测';doc.unit='μg';doc.source={type:'user',name:'实际实验记录',url:'https://example.org/lab.csv'};doc.provenance={origin:'public',partialEdit:true};doc.axes={x:'处理组',y:'实测信号 / μg'};
  doc.data=Array.from({length:rows},(_,i)=>({_id:`lab:${i+1}`,label:`真实样本 ${i+1}`,value:(i+1)*11,...(extra?{_extra:{2:`复核备注 ${i+1}`}}:{})}));
  const headers=extra?['类别','销售额','备注']:['类别','销售额'];doc.tableInput={headers,fieldColumns:{label:0,value:1},headerRefs:headers.map((_,c)=>String.fromCharCode(67+c)+'3'),origin:{kind:'xlsx',file:'实验记录.xlsx',sheet:'原表',range:extra?`C3:E${rows+3}`:`C3:D${rows+3}`},rowRefs:Object.fromEntries(doc.data.map((r,i)=>[r._id,headers.map((_,c)=>String.fromCharCode(67+c)+(i+4))]))};return doc;
}
function fixture(t,doc=userDocument()){
  const host=document.createElement('main');document.body.append(host);const messages=[],items=new Map(),storage={getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v)},app=mountWorkEditor(host,{initial:newWork([{doc,options:{palette:'ink',ratio:'portrait'}}]),storage,toast:m=>messages.push(m)});
  t.after(()=>{app.destroy();host.remove();document.querySelectorAll('.workflow-dialog').forEach(d=>{d.close();d.remove();});});return {host,app,messages};
}
function input(container,query,value){const el=container.querySelector(query);assert.ok(el,query);el.value=value;el.dispatchEvent(new win.Event('input',{bubbles:true}));}
async function until(query){for(let i=0;i<40;i++){const el=document.querySelector(query);if(el)return el;await new Promise(r=>setTimeout(r,25));}assert.fail(`Missing ${query}`);}
async function recommend(host){host.querySelector('[data-workspace=recommend]').click();return until('.task-picker-dialog');}
async function review(dialog,id){
  for(let i=0;i<34&&!dialog.querySelector(`[data-task-use="${id}"]`);i++){const more=dialog.querySelector('[data-task-more]');assert.equal(more.hidden,false,`No usable ${id} recommendation`);more.click();}
  const button=dialog.querySelector(`[data-task-use="${id}"]`);assert.ok(button,id);button.click();const importer=await until('.data-importer');
  importer.querySelector('footer [data-di=mapping]').click();assert.ok(importer.querySelector('[data-di-mapping="0"]'));importer.querySelector('footer [data-di=prepare]').click();assert.ok(importer.querySelector('.di-result'),importer.textContent);return importer;
}

test('current user data has real preview and reviewed replacement retains identity, extras and meaning',async t=>{
  const {host,app}=fixture(t),before=app.getWork().steps[0],dialog=await recommend(host),preview=dialog.querySelector('[data-task-preview=bar]');
  assert.ok(preview?.querySelector('svg'));assert.match(preview.textContent,/真实样/);assert.match(preview.textContent,/11.*22.*33/);assert.doesNotMatch(preview.textContent,/官网|FORMA 设计演示/);assert.match(dialog.querySelector('[data-task-profile]').textContent,/3 行.*3 列/);
  const importer=await review(dialog,'bar');assert.deepEqual(app.getWork().steps[0],before);assert.match(importer.querySelector('.di-grid').textContent,/真实样本/);importer.querySelector('footer [data-di=apply]').click();
  const after=app.getWork().steps[0];assert.equal(after.doc.template,'bar');assert.equal(after.dataGroup,before.dataGroup);assert.equal(after.id,before.id);assert.deepEqual(after.doc.data,before.doc.data);assert.deepEqual(after.doc.tableInput.headers,before.doc.tableInput.headers);assert.deepEqual(after.doc.tableInput.rowRefs,before.doc.tableInput.rowRefs);assert.equal(after.doc.title,before.doc.title);assert.equal(after.doc.subtitle,before.doc.subtitle);assert.equal(after.doc.unit,before.doc.unit);assert.deepEqual(after.doc.source,before.doc.source);assert.deepEqual(after.doc.provenance,before.doc.provenance);assert.deepEqual(after.doc.axes,{x:before.doc.axes.y,y:before.doc.axes.x});assert.deepEqual(after.options,before.options);
  host.querySelector('[data-we=undo-chart]').click();assert.deepEqual(app.getWork().steps[0].doc,before.doc);assert.equal(app.getWork().steps[0].dataGroup,before.dataGroup);
});
test('editing the recommendation source creates a new dataset and chart undo recovers the original',async t=>{
  const {host,app}=fixture(t),before=app.getWork().steps[0],dialog=await recommend(host);input(dialog,'[data-task-table]','类别\t销售额\t备注\n新观测甲\t101\t新备注甲\n新观测乙\t202\t新备注乙\n新观测丙\t303\t新备注丙');dialog.querySelector('[data-task-analyze]').click();
  const importer=await review(dialog,'bar');importer.querySelector('footer [data-di=apply]').click();const after=app.getWork().steps[0];assert.equal(after.doc.template,'bar');assert.notEqual(after.dataGroup,before.dataGroup);assert.equal(after.doc.data[0].label,'新观测甲');assert.equal(after.doc.data[0].value,101);assert.equal(after.doc.data[0]._extra[2],'新备注甲');assert.notDeepEqual(after.doc.data.map(r=>r._id),before.doc.data.map(r=>r._id));
  host.querySelector('[data-we=undo-chart]').click();assert.deepEqual(app.getWork().steps[0].doc,before.doc);assert.equal(app.getWork().steps[0].dataGroup,before.dataGroup);
});
test('capacity-invalid native data can be matched to a full compatible chart without dropping rows',async t=>{
  const {host,app}=fixture(t,userDocument({rows:26,extra:false})),before=app.getWork().steps[0];assert.equal(host.querySelector('[data-we=export]').disabled,true);const dialog=await recommend(host),importer=await review(dialog,'singleline');importer.querySelector('footer [data-di=apply]').click();
  const after=app.getWork().steps[0];assert.equal(after.doc.template,'singleline');assert.equal(after.doc.data.length,26);assert.deepEqual(after.doc.data.map(r=>[r.period,r.value]),before.doc.data.map(r=>[r.label,r.value]));assert.equal(host.querySelector('[data-we=export]').disabled,false);
  host.querySelector('[data-we=undo-chart]').click();assert.deepEqual(app.getWork().steps[0].doc,before.doc);assert.equal(host.querySelector('[data-we=export]').disabled,true);
});
test('unfinished data never open matching against a stale chart and every draft edit remains undoable',t=>{
  const {host,app,messages}=fixture(t);input(host,'[data-dw-cell="0:1"]','unfinished');const before=app.getWork().steps[0];host.querySelector('[data-workspace=recommend]').click();assert.equal(document.querySelector('.task-picker-dialog'),null);assert.deepEqual(app.getWork().steps[0],before);assert.equal(host.querySelector('[data-dw-cell="0:1"]').value,'unfinished');assert.match(messages.at(-1),/先修正/);host.querySelector('[data-workspace=undo]').click();assert.equal(host.querySelector('[data-dw-cell="0:1"]').value,'11');
});
test('editing the current table after opening matching blocks an outdated replacement',async t=>{
  const {host,app}=fixture(t),dialog=await recommend(host);input(host,'[data-dw-cell="0:1"]','777');const before=app.getWork().steps[0];dialog.querySelector('[data-task-use=bar]').click();assert.equal(document.querySelector('.data-importer'),null);assert.match(dialog.querySelector('[data-task-status]').textContent,/当前数据已变化/);assert.deepEqual(app.getWork().steps[0],before);
});
test('same physical series records preserve entity IDs and bindings through a native recommendation',async t=>{
  const doc=getExample('groupedbar');doc.title='真实系列比较';doc.unit='mg';doc.source={type:'user',name:'系列实验记录'};doc.data=doc.data.map((r,i)=>({...r,_id:`series-lab:${i+1}`,_extra:{3:`复核备注 ${i+1}`}}));doc.tableInput={headers:['类别','系列','数值','备注'],fieldColumns:{label:0,series:1,value:2}};
  const {host,app}=fixture(t,doc),before=app.getWork().steps[0],dialog=await recommend(host),importer=await review(dialog,'stackedbar');importer.querySelector('footer [data-di=apply]').click();const after=app.getWork().steps[0];assert.equal(after.doc.template,'stackedbar');assert.equal(after.dataGroup,before.dataGroup);assert.deepEqual(after.doc.entities,before.doc.entities);assert.deepEqual(after.doc.data,before.doc.data);assert.deepEqual(after.doc.tableInput.headers,before.doc.tableInput.headers);
  host.querySelector('[data-we=undo-chart]').click();assert.deepEqual(app.getWork().steps[0].doc,before.doc);
});
