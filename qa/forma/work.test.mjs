import {payload} from './payload.mjs';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {newSequence} from '../../src/forma/morph-sequence.js';
import {MorphChart,morphExample} from '../../src/forma/morph.js';
import {makeStep,newWork,presetWork,cleanWork,morphDocument,transitionPlan,workReport,workFromSequence,replaceStepData,readWorks,writeWorks,listWorks,WORK_KEY} from '../../src/forma/work-model.js';

let win,server,mountWorkEditor,workAgentBrief,workHTML,stepSVG,mountStandalone;
const original=new Map();
before(async()=>{
  win=new Window({url:'http://localhost:4189/#editor'});
  for(const [key,value] of Object.entries({window:win,document:win.document,XMLSerializer:win.XMLSerializer,ResizeObserver:win.ResizeObserver,requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win)})){
    original.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  ({mountWorkEditor}=await server.ssrLoadModule('/src/forma/work-editor.js'));
  ({workAgentBrief,workHTML,stepSVG}=await server.ssrLoadModule('/src/forma/work-export.js'));
  ({mount:mountStandalone}=await server.ssrLoadModule('/src/forma/work-player-entry.js'));
});
after(async()=>{await server?.close();await win?.happyDOM.close();for(const [key,value] of original){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
function mount(t,initial=presetWork('independent'),storage=memory()){
  const host=document.createElement('main'),messages=[];document.body.append(host);
  const app=mountWorkEditor(host,{initial,storage,toast:m=>messages.push(m),getSources:()=>[{doc:getExample('column'),options:{palette:'cobalt'},group:'测试来源'},{doc:getExample('xy'),options:{palette:'ink'},group:'测试来源'}]});
  let alive=true;const destroy=()=>{if(alive){app.destroy();host.remove();alive=false;}};t.after(destroy);
  return {host,app,messages,storage,destroy};
}
function change(host,selector,value,type='input'){const e=host.querySelector(selector);assert.ok(e,selector);e.value=value;e.dispatchEvent(new win.Event(type,{bubbles:true}));}
const settle=()=>new Promise(resolve=>setTimeout(resolve,190));

test('entity manager renames all model records through the real UI, saves and syncs IDs explicitly',async t=>{
  const f=mount(t,presetWork('classifier-comparison')),before=structuredClone(f.app.getWork()),id=before.steps[0].doc.entities.items[0].id;
  f.host.querySelector('[data-workspace=entities]').click();const panel=document.querySelector('.entity-editor');assert.ok(panel.open);assert.equal(panel.getAttribute('aria-modal'),'false');
  const row=panel.querySelector('[data-entity-id]');row.querySelector('[data-entity-name]').value='试验算法';row.querySelector('[data-entity-action=rename]').click();
  const current=f.app.getWork();assert.ok(current.steps[0].doc.data.filter(r=>r._modelId===id).every(r=>r.model==='试验算法'));assert.deepEqual(current.steps[1].doc,before.steps[1].doc);assert.deepEqual(current.steps[0].doc.data.map(r=>r._id),before.steps[0].doc.data.map(r=>r._id));
  panel.querySelector('[data-dialog-close]').click();f.host.querySelector('[data-we=save]').click();await settle();
  const restored=readWorks(f.storage).draft;assert.equal(restored.steps[0].doc.entities.items[0].id,id);assert.equal(restored.steps[0].doc.entities.items[0].name,'试验算法');
  f.host.querySelector('[data-we=sync-data]').click();assert.match(f.host.querySelector('.we-panel-content').textContent,/模型身份与名称/);assert.match(f.host.querySelector('.we-panel-content').textContent,/改名/);
  assert.ok(workAgentBrief(restored).includes('_modelId'));assert.ok(workHTML(restored,'/* engine fixture */').includes('_modelId'));
});

test('entity manager handles matrix order, delete preview and undo without changing observations',async t=>{
  const f=mount(t,presetWork('correlation-exploration')),before=structuredClone(f.app.getWork().steps[0].doc),id=before.entities.items[0].id;
  f.host.querySelector('[data-workspace=entities]').click();const panel=document.querySelector('.entity-editor');
  const order=panel.querySelector('[data-entity-order]');order.value='2';order.dispatchEvent(new win.Event('change',{bubbles:true}));
  assert.equal(f.app.getWork().steps[0].doc.entities.items[2].id,id);assert.deepEqual(f.app.getWork().steps[0].doc.data,before.data);
  panel.querySelector('[data-entity-action=delete]').click();assert.ok(panel.querySelector('.ee-confirm'));const rows=f.app.getWork().steps[0].doc.data.length;
  panel.querySelector('[data-entity-action=confirm]').click();assert.ok(f.app.getWork().steps[0].doc.data.length<rows);
  panel.querySelector('[data-entity-action=undo]').click();assert.equal(f.app.getWork().steps[0].doc.data.length,rows);panel.querySelector('[data-dialog-close]').click();await settle();
  const mark=f.host.querySelector('[data-science-role=pair][data-record-ids]');assert.ok(mark);mark.dispatchEvent(new win.Event('click',{bubbles:true}));assert.ok(!f.host.querySelector('.dw-record-links').hidden);assert.match(f.host.querySelector('.dw-record-links').textContent,/原始记录/);
});

test('entity merge reports sample collisions and replacement requires an explicit reviewed action',async t=>{
  const f=mount(t,presetWork('classifier-comparison')),before=structuredClone(f.app.getWork().steps[0].doc);
  f.host.querySelector('[data-science-role=threshold-point][data-record-ids]:not([aria-hidden=true])').dispatchEvent(new win.Event('click',{bubbles:true}));assert.equal(f.host.querySelector('.dw-record-links').hidden,false);
  f.host.querySelector('[data-workspace=entities]').click();const panel=document.querySelector('.entity-editor');
  panel.querySelector('[data-entity-action=merge]').click();assert.match(panel.querySelector('.ee-status').textContent,/同一样本/);assert.deepEqual(f.app.getWork().steps[0].doc,before);
  panel.querySelector('[data-entity-action=replace]').click();assert.deepEqual(f.app.getWork().steps[0].doc,before);assert.match(panel.querySelector('.ee-confirm').textContent,/名称和数值保留/);
  panel.querySelector('[data-entity-action=confirm]').click();const after=f.app.getWork().steps[0].doc;assert.notEqual(after.entities.items[0].id,before.entities.items[0].id);assert.equal(after.entities.items[0].name,before.entities.items[0].name);assert.deepEqual(after.data.map(r=>r.score),before.data.map(r=>r.score));
  await settle();assert.equal(f.host.querySelector('.dw-record-links').hidden,true,'a new entity cannot inherit the old statistical selection just because its row IDs survived');
});

test('new model blank measurements persist as an unfinished draft and remain manageable after reopening',async t=>{
  const f=mount(t,presetWork('classifier-comparison')),before=f.app.getWork().steps[0].doc;
  f.host.querySelector('[data-workspace=entities]').click();const panel=document.querySelector('.entity-editor');panel.querySelector('#ee-new-name').value='新算法';panel.querySelector('[data-entity-action=create]').click();panel.querySelector('[data-dialog-close]').click();await settle();
  const work=readWorks(f.storage).draft;assert.equal(work.steps[0].doc.data.length,before.data.length);assert.equal(work.steps[0].draft.meta.entities.items.length,3);assert.equal(work.steps[0].draft.cells.at(-1).at(-1),'');
  f.destroy();const g=mount(t,work,f.storage);assert.equal(g.host.querySelector('[data-we=export]').disabled,true);g.host.querySelector('[data-workspace=entities]').click();const reopened=document.querySelector('.entity-editor'),item=[...reopened.querySelectorAll('[data-entity-id]')].find(el=>el.querySelector('input').value==='新算法');assert.ok(item);item.querySelector('[data-entity-action=delete]').click();reopened.querySelector('[data-entity-action=confirm]').click();assert.equal(g.app.getWork().steps[0].doc.entities.items.length,2);assert.equal(g.host.querySelector('[data-we=export]').disabled,false);
});

test('every catalog schema can be a complete independent step, without truncating fields or rows',()=>{
  for(const t of catalog){const doc=getExample(t.id),step=makeStep({doc}),work=newWork([{doc}]);assert.equal(workReport(work).valid,true,t.id);assert.deepEqual(payload(work.steps[0].doc.data),payload(doc.data));for(const [field,value]of Object.entries(doc))assert.deepEqual(payload(step.doc[field]),payload(value),t.id+': '+field);}
  const work=presetWork('classic'),source=structuredClone(work.steps[0].doc);work.steps[0].doc.data[0].value=999;
  assert.equal(work.steps[1].doc.data[0].value,source.data[0].value);
  work.steps[0].transition='arc';work.steps[0].duration=2400;const copy=makeStep(work.steps[0]);assert.notEqual(copy.id,work.steps[0].id);assert.equal(copy.duration,2400);assert.equal(copy.transition,'arc');
});
test('transition correspondence respects units, identities, chart schema and explicit gather',()=>{
  const [a,b,c]=presetWork('independent').steps;
  assert.deepEqual(transitionPlan(a,b).matched,a.doc.data.filter(r=>['官网','门店','电商','其他'].includes(r.label)).map(r=>r._id));assert.equal(transitionPlan(a,b).mode,'morph');assert.equal(transitionPlan(b,c).mode,'gather');
  assert.equal(transitionPlan(a,{...b,doc:{...b.doc,unit:'元'}}).mode,'gather');assert.equal(transitionPlan(a,{...b,transition:'gather'}).mode,'gather');
  assert.equal(transitionPlan(a,makeStep({doc:getExample('volcano')})).mode,'gather');
  const long={...a,doc:{...a.doc,data:Array.from({length:25},(_,i)=>({label:`类${i}`,value:i+1}))}};assert.equal(morphDocument(long).data.length,25);assert.equal(workReport({...presetWork('independent'),steps:[long]}).valid,false);
});
test('using compatible data preserves the chosen chart and settings; incompatible schemas stay intact',()=>{
  const old=presetWork('independent').steps[2];old.transition='arc';old.duration=2400;
  const source={doc:getExample('column')},result=replaceStepData(old,source);assert.equal(result.view,'pie');assert.equal(result.doc.data.length,8);assert.equal(result.duration,2400);assert.equal(result.transition,'arc');assert.deepEqual(source.doc,getExample('column'));
  const xy=replaceStepData(old,{doc:getExample('xy')});assert.equal(xy.view,undefined);assert.equal(xy.doc.template,'xy');assert.deepEqual(payload(xy.doc.data),payload(getExample('xy').data));
  const simple=replaceStepData(presetWork('series-revenue').steps[0],{doc:getExample('column')});assert.equal(simple.view,undefined);assert.equal(simple.doc.template,'column');assert.equal(workReport(newWork([simple])).valid,true);
});
test('old sequences retain exact data, order and settings when opened as independent steps',()=>{
  const sequence=newSequence('classic');sequence.doc.data[0].value=111;sequence.colors=['#123456','#abcdef'];sequence.currentView='pie';sequence.duration=2400;
  const work=workFromSequence(sequence);assert.deepEqual(work.steps.map(s=>s.view),sequence.views);assert.equal(work.steps.find(s=>s.id===work.activeStep).view,'pie');assert.ok(work.steps.every(s=>s.duration===2400&&s.doc.data[0].value===111));
  work.steps[0].doc.data[0].value=9;assert.equal(work.steps[1].doc.data[0].value,111);assert.equal(sequence.doc.data[0].value,111);
});
test('autosave keeps multiple drafts, isolates old storage, and backs up corrupt storage before writing',()=>{
  const s=memory(),a=presetWork('independent'),b=presetWork('classic');s.setItem('forma.editor.v1','old charts');writeWorks(s,[],a);writeWorks(s,[],b);assert.equal(listWorks(s).length,2);assert.equal(readWorks(s).draft.id,b.id);assert.equal(s.getItem('forma.editor.v1'),'old charts');
  writeWorks(s,[a],b);assert.equal(listWorks(s).length,2);const raw=s.getItem(WORK_KEY);assert.throws(()=>writeWorks(s,[{...a,steps:[a.steps[0],a.steps[0]]}],b));assert.equal(s.getItem(WORK_KEY),raw);
  s.setItem(WORK_KEY,'broken');writeWorks(s,[],a);assert.equal([...s.data].find(([key])=>key.includes('.recovery.'))[1],'broken');assert.equal(readWorks(s).draft.id,a.id);
});
test('work files reject malformed structure and normalize rendering settings',()=>{
  const w=presetWork('independent');for(const bad of [{...w,name:''},{...w,steps:[]},{...w,steps:Array(21).fill(w.steps[0])},{...w,steps:[{...w.steps[0],transition:'bad'}]}])assert.throws(()=>cleanWork(bad));
  w.steps[0].options={palette:'nonsense',ratio:'invalid',callback:()=>{}};assert.deepEqual(cleanWork(w).steps[0].options,{palette:'ink',dark:false,ratio:'wide',duration:8});
});
test('editor initializes complete preview, data tools and real step thumbnails without cloning callbacks',t=>{
  const f=mount(t);assert.equal(f.host.querySelectorAll('.we-step-item').length,3);assert.ok(f.host.querySelector('#dw-chart svg'));assert.equal(f.host.querySelectorAll('[data-we-tool]').length,4);assert.equal(f.host.querySelector('[data-we-type]').textContent,'柱状图');assert.deepEqual(f.messages,[]);
});
test('editing and undo stay independent across steps and through preview mode',async t=>{
  const f=mount(t),ids=f.app.getWork().steps.map(s=>s.id);change(f.host,'[data-dw-cell="0:1"]','173');await settle();
  f.host.querySelector(`[data-we-step="${ids[1]}"]`).click();assert.equal(f.host.querySelector('[data-dw-cell="0:1"]').value,'152');
  f.host.querySelector(`[data-we-step="${ids[0]}"]`).click();assert.equal(f.host.querySelector('[data-dw-cell="0:1"]').value,'173');
  f.host.querySelector('[data-workspace="undo"]').click();assert.equal(f.host.querySelector('[data-dw-cell="0:1"]').value,'128');
  f.host.querySelector('[data-we="preview"]').click();assert.ok(f.host.querySelector('.wp-artboard'));assert.equal(f.host.querySelectorAll('.wp-artboard').length,1);f.host.querySelector('[data-we="edit"]').click();assert.equal(f.host.querySelector('[data-dw-cell="0:1"]').value,'128');
});
test('incomplete data remain editable after reload and block whole-work export',t=>{
  const f=mount(t);change(f.host,'[data-dw-cell="0:1"]','unfinished');assert.equal(f.host.querySelector('[data-we="export"]').disabled,true);assert.ok(f.host.querySelector('#dw-chart svg'));
  const work=f.app.getWork();assert.throws(()=>workAgentBrief(work));f.destroy();const g=mount(t,readWorks(f.storage).draft,f.storage);assert.equal(g.host.querySelector('[data-dw-cell="0:1"]').value,'unfinished');assert.equal(g.host.querySelector('[data-we="save"]').disabled,true);
});
test('picker adds a research chart without data loss, and remove/restore retains it',t=>{
  const f=mount(t);f.host.querySelector('[data-we="add"]').click();f.host.querySelector('[data-we-picker-tab="library"]').click();f.host.querySelector('[data-we-template="volcano"]').click();
  assert.equal(f.app.getWork().steps.length,4);assert.deepEqual(payload(f.app.getWork().steps[1].doc.data),payload(getExample('volcano').data));assert.equal(f.host.querySelector('[data-we-type]').textContent, catalog.find(t=>t.id==='volcano').name);
  f.host.querySelector('[data-we="remove"]').click();assert.equal(f.app.getWork().steps.length,3);f.host.querySelector('[data-we="restore"]').click();assert.equal(f.app.getWork().steps.length,4);assert.equal(f.app.getWork().steps[1].doc.template,'volcano');
});
test('saved work restores all steps and the Agent manual describes finished independent HTML',t=>{
  const f=mount(t);change(f.host,'[data-we-name]','三步作品');f.host.querySelector('[data-we="save"]').click();assert.equal(readWorks(f.storage).projects[0].name,'三步作品');
  const work=f.app.getWork(),brief=workAgentBrief(work);assert.match(brief,/交付可直接打开的交互 HTML/);assert.match(brief,/每一步拥有独立数据/);assert.match(brief,/quarter|季度/);assert.match(brief,/128/);
  work.name='</script><script>alert(1)</script>';const html=workHTML(work,'window.engine=true;');assert.equal((html.match(/<script>/g)||[]).length,2);assert.match(html,/\\u003c\/script>/);assert.match(html,/FormaWorkPlayer.mount/);
  const svg=stepSVG(work.steps[2]);assert.match(svg,/data-view="pie"/);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);assert.match(svg,/季度项目交付量/);
});
test('changing datasets keeps matched SVG nodes, animates arrivals/departures and settles to exact new values',()=>{
  const host=document.createElement('div'),queue=new Map();let id=0;const raf=win.requestAnimationFrame,cancel=win.cancelAnimationFrame;
  win.requestAnimationFrame=fn=>{queue.set(++id,fn);return id;};win.cancelAnimationFrame=id=>queue.delete(id);
  const frame=time=>{const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(time));};
  try{
    const chart=new MorphChart(host,morphExample,{width:800,height:360,view:'columns',reducedMotion:false}),node=host.querySelector('[data-key="设计"]');
    const doc=structuredClone(morphExample);doc.data[0].value=49;doc.data[1]={label:'新类别',value:17};
    chart.setDocument(doc,'pie');assert.equal(host.querySelector('[data-key="设计"]'),node);assert.ok(host.querySelector('[data-key="技术"]'));assert.ok(host.querySelector('[data-key="新类别"]'));
    frame(0);frame(700);assert.equal(chart.animating,true);frame(1500);assert.equal(chart.animating,false);assert.equal(host.querySelector('[data-key="技术"]'),null);assert.match(node.parentElement.getAttribute('aria-label'),/49/);
    for(const mark of chart.layout.marks)assert.deepEqual(chart.current.get(mark.key),mark.points);
    chart.destroy();assert.equal(queue.size,0);
  }finally{win.requestAnimationFrame=raf;win.cancelAnimationFrame=cancel;}
});
test('standalone output exposes the documented controls and restores the selected step',()=>{
  const host=document.createElement('main'),work=presetWork('independent');document.body.append(host);work.activeStep=work.steps[2].id;
  const player=mountStandalone(host,work);assert.equal(typeof player.play,'function');assert.equal(typeof player.stop,'function');assert.equal(typeof player.select,'function');assert.equal(host.querySelector('[data-wp-title]').textContent,'季度项目交付量');player.destroy();host.remove();
});
test('the morph picker filters encodings without changing data and inline edits share the data table',async t=>{
  const f=mount(t),original=f.app.getWork();f.host.querySelector('[data-we="type"]').click();assert.equal(f.host.querySelectorAll('[data-we-view]').length,25);
  f.host.querySelector('[data-we-family="cycle"]').click();
  assert.deepEqual([...f.host.querySelectorAll('[data-we-view]:not([hidden])')].map(b=>b.dataset.weView).sort(),['polarline','radar','radialbars','rose']);
  assert.equal(f.host.querySelector('[data-we-family="cycle"]').getAttribute('aria-pressed'),'true');assert.deepEqual(f.app.getWork().steps,original.steps);
  f.host.querySelector('[data-we-family="all"]').click();assert.equal(f.host.querySelectorAll('[data-we-view]:not([hidden])').length,25);f.host.querySelector('[data-we="close"]').click();
  f.host.querySelector('.we-edit-legend [data-edit-row="0"]').click();change(f.host,'.dw-inline-editor input','新官网');f.host.querySelector('.dw-inline-editor').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));await settle();assert.equal(f.host.querySelector('[data-dw-cell="0:0"]').value,'新官网');assert.equal(f.app.getWork().steps[1].doc.data[0].label,'官网');
});
test('static work exports honor portrait dimensions and wrap long titles',()=>{
  const step=presetWork('independent').steps[2];step.options.ratio='portrait';step.doc.title='这是一个用于检查静态图表导出时长标题换行与完整记录保留的详细说明标题并且保证在不同画幅中完整展示';
  const svg=stepSVG(step);assert.match(svg,/width="1200" height="1600"/);assert.match(svg,/viewBox="0 0 900 1200"/);assert.ok((svg.match(/font-size="30"/g)||[]).length>=2);assert.match(svg,/data-view="pie"/);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);
});

test('native templates use the same work renderer in editing, playback and static export',t=>{
  const initial=newWork([{doc:getExample('singleline'),dataGroup:'signal'},{doc:getExample('singleline'),dataGroup:'signal'}]);
  initial.steps[0].doc.data.forEach((r,i)=>r.value=.004+i*.0001);
  initial.steps[1].doc.data.forEach((r,i)=>r.value=.008+i*.0001);
  const f=mount(t,initial),edited=f.host.querySelector('#dw-chart svg');
  assert.equal(edited.dataset.view,'line');
  const svg=stepSVG(initial.steps[0],initial.steps);assert.match(svg,/data-view="line"/);assert.match(svg,/0\.00[4-9]/);
  const native=newWork([{doc:getExample('volcano')}]);
  assert.match(stepSVG(native.steps[0]),/差异表达筛选/);assert.doesNotMatch(stepSVG(native.steps[0]),/data-morph-chart/);
});

test('mapped native forest endpoints edit real lower/upper fields, and ranked charts preserve table rows',async t=>{
  const forest=mount(t,newWork([{doc:getExample('forest')}]));
  assert.equal(forest.host.querySelector('#dw-chart svg').dataset.view,'estimate-horizontal');
  const forestMarks=forest.host.querySelectorAll('#dw-chart [data-edit-field]');assert.ok(forestMarks.length);for(const mark of forestMarks)assert.ok(['estimate','lower','upper'].includes(mark.dataset.editField));
  const source=getExample('pareto');source.data.reverse();const funnel=mount(t,newWork([{doc:source}]));
  const model=funnel.app.getWork().steps[0];
  for(const mark of funnel.host.querySelectorAll('#dw-chart [data-edit-row]')){
    const key=mark.dataset.key||mark.querySelector('[data-key]')?.dataset.key;
    if(key)assert.equal(model.doc.data[Number(mark.dataset.editRow)]._id,key);
  }
});

test('a local transition preview edits only its target step and keeps the background spreadsheet usable',t=>{
  const f=mount(t,presetWork('monthly')),before=f.app.getWork(),target=before.steps[1].id;
  f.host.querySelector(`[data-we-pair="${target}"]`).click();
  const panel=f.host.querySelector('[data-we-panel]');assert.equal(panel.getAttribute('aria-modal'),'false');assert.ok(panel.querySelector('.wp-artboard'));assert.ok(f.host.querySelector('[data-dw-cell="0:1"]'));
  change(f.host,'[data-we-pair-setting="duration"]','2400','change');
  assert.equal(f.app.getWork().steps[1].duration,2400);assert.equal(f.app.getWork().steps[0].duration,before.steps[0].duration);assert.equal(f.app.getWork().activeStep,before.activeStep);
  change(f.host,'[data-we-pair-setting="relation"]','separate','change');assert.equal(f.app.getWork().steps[1].relation,'separate');assert.match(panel.querySelector('.we-pair-description').textContent,/原生入场/);
  f.host.querySelector('[data-we="close"]').click();assert.equal(panel.hidden,true);assert.equal(panel.querySelector('.wp-artboard'),null);
});

test('view picker explains incompatible negative and missing data without losing the draft',t=>{
  const f=mount(t,presetWork('cashflow'));f.host.querySelector('[data-we="type"]').click();
  assert.equal(f.host.querySelector('[data-we-view="pie"]').disabled,true);assert.match(f.host.querySelector('[data-we-view="pie"]').title,/负数/);assert.equal(f.host.querySelector('[data-we-view="line"]').disabled,false);
  const original=f.app.getWork().steps[0].doc.data;f.host.querySelector('[data-we-view="line"]').click();assert.deepEqual(f.app.getWork().steps[0].doc.data,original);assert.equal(f.app.getWork().steps[0].view,'line');
});

test('scenario gallery separates reusable scenes from effect studies and preserves data on use',async t=>{
  const {mountMotionGallery}=await server.ssrLoadModule('/src/forma/motion-gallery.js');
  const host=document.createElement('main');document.body.append(host);let chosen;const gallery=mountMotionGallery(host,{onUse:w=>chosen=w});t.after(()=>{gallery.destroy();host.remove();});
  assert.equal(host.querySelectorAll('[data-mg-preset]').length,49);assert.equal(host.querySelector('[data-mg-title]').textContent,'模型筛选效果');host.querySelector('[data-mg-preset=monthly]').click();
  host.querySelector('[data-mg-use]').click();assert.equal(chosen.steps[0].doc.data.length,12);assert.equal(chosen.steps[0].doc.data[4].value,null);
  host.querySelector('[data-mg-group="effects"]').click();assert.equal(host.querySelectorAll('[data-mg-preset]').length,7);assert.ok(host.querySelector('[data-mg-preset="classic"]'));
  host.querySelector('[data-mg-group="scenarios"]').click();host.querySelector('[data-mg-preset="conversion"]').click();assert.match(host.querySelector('[data-mg-data]').textContent,/同一批对象/);
});

test('step drawer starts collapsed, preserves navigation and remembers the user preference',t=>{
  const f=mount(t,presetWork('series-revenue')),toggle=f.host.querySelector('[data-we=toggle-steps]');
  assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(f.host.querySelectorAll('.we-thumb svg').length,0);
  const initial=f.app.getWork().activeStep;f.host.querySelector('[data-we=next-step]').click();assert.notEqual(f.app.getWork().activeStep,initial);assert.equal(f.host.querySelector('[data-we-type]').textContent,'堆叠柱图');
  toggle.click();assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.equal(f.host.querySelectorAll('.we-thumb svg').length,6);
  f.host.querySelector('[data-we=previous-step]').click();assert.equal(f.app.getWork().activeStep,initial);
  const work=f.app.getWork();f.destroy();const g=mount(t,work,f.storage);assert.equal(g.host.querySelector('[data-we=toggle-steps]').getAttribute('aria-expanded'),'true');
});

test('series picker reuses all three fields, saves the view, and direct edits remain independent',async t=>{
  const initial=newWork([{doc:getExample('percentcolumn')}]),f=mount(t,initial);
  f.host.querySelector('[data-we=add]').click();assert.equal(f.host.querySelectorAll('[data-we-series-view]').length,11);f.host.querySelector('[data-we-series-view="multi-line"]').click();
  const w=f.app.getWork();assert.equal(w.steps[1].view,'multi-line');assert.deepEqual(w.steps[0].doc.data,w.steps[1].doc.data);assert.equal(transitionPlan(w.steps[0],w.steps[1]).mode,'morph');
  change(f.host,'[data-dw-cell="0:2"]','91');await settle();const edited=f.app.getWork();assert.equal(edited.steps[1].doc.data[0].value,91);assert.equal(edited.steps[0].doc.data[0].value,54);
  const svg=stepSVG(edited.steps[1]);assert.match(svg,/data-view="multi-line"/);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);assert.match(workAgentBrief(edited),/多系列连续变形/);
});

test('primary Agent copy and alternate JSON copy preserve the current work',async t=>{
  const f=mount(t),writes=[];
  Object.defineProperty(win.navigator,'clipboard',{configurable:true,value:{async writeText(text){writes.push(text);}}});
  const original=f.app.getWork();f.host.querySelector('.we-header [data-we=copy]').click();await Promise.resolve();
  assert.equal(writes.length,1);assert.match(writes[0],/Agent 制作说明书/);assert.equal(f.host.querySelector('.we-copy-menu').hidden,true);
  const payload=JSON.parse(writes[0].match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.deepEqual(payload.steps,original.steps);
  assert.match(writes[0],/不能要求用户重复提供已包含的数据/);
  assert.match(writes[0],/forma-original-runtime/);
  assert.match(writes[0],/https:\/\/forma\.ovocode\.xyz\/forma\/agent-runtimes\/work-/);
  f.host.querySelector('[data-we=copy-options]').click();assert.equal(writes.length,1);assert.equal(f.host.querySelector('.we-copy-menu').hidden,false);
  f.host.querySelector('[data-we-copy-format=json]').click();await Promise.resolve();assert.equal(writes.length,2);assert.deepEqual(JSON.parse(writes[1]),f.app.getWork());
  assert.deepEqual(f.app.getWork().steps,original.steps);
  f.host.querySelector('[data-we=export]').click();assert.ok(f.host.querySelector('[data-we=video]'));
  f.host.querySelector('[data-we=video]').click();assert.ok(f.host.querySelector('[data-we=encode-video]'));assert.equal(f.host.querySelector('[data-we-video=fps]').value,'30');
});

test('editor catalog combines animation capability with search without changing step data',t=>{
  const f=mount(t,newWork([{doc:getExample('column')}])),before=f.app.getWork();
  f.host.querySelector('[data-we=add]').click();
  f.host.querySelector('[data-we-picker-tab=library]').click();
  const visible=()=>[...f.host.querySelectorAll('[data-we-template]')].filter(b=>!b.hidden);
  assert.equal(visible().length,204);
  const toggle=f.host.querySelector('[data-we-morph-only]');toggle.checked=true;toggle.dispatchEvent(new win.Event('change',{bubbles:true}));
  assert.equal(visible().length,148);assert.equal(f.host.querySelector('[data-we-catalog-count]').textContent,'148 个图表');
  change(f.host,'[data-we-search]','3D');
  assert.equal(visible().length,3);assert.equal(f.host.querySelector('[data-we-catalog-empty]').hidden,true);assert.deepEqual(new Set(visible().map(n=>n.dataset.weTemplate)),new Set(['scatter3d','bubble3d','surface3d']));
  toggle.checked=false;toggle.dispatchEvent(new win.Event('change',{bubbles:true}));
  assert.equal(visible().length,6);assert.equal(f.host.querySelector('[data-we-catalog-empty]').hidden,true);
  assert.deepEqual(f.app.getWork(),before);
});


test('paired chart picker preserves every column, edits the correct endpoint and exports the selected encoding',async t=>{
  const f=mount(t,presetWork('paired-evaluation')),original=f.app.getWork().steps[0].doc.data[0],before=original.before;
  assert.ok(f.host.querySelector('[data-edit-row="0"][data-edit-field="after"]'));
  change(f.host,'[data-dw-cell="0:2"]','83');await settle();assert.equal(f.app.getWork().steps[0].doc.data[0].after,83);assert.equal(f.app.getWork().steps[0].doc.data[0].before,before);
  f.host.querySelector('[data-we="type"]').click();assert.equal(f.host.querySelectorAll('[data-we-relational-view]').length,5);f.host.querySelector('[data-we-relational-view="paired-dumbbell"]').click();
  const work=f.app.getWork(),step=work.steps.find(s=>s.id===work.activeStep);assert.equal(step.view,'paired-dumbbell');assert.deepEqual(payload(step.doc.data[0]),payload({...original,after:83}));assert.equal(step.doc.periodLabels.length,2);
  assert.match(stepSVG(step,work.steps),/data-view="paired-dumbbell"/);f.host.querySelector('[data-we="save"]').click();assert.equal(readWorks(f.storage).projects[0].steps[0].view,'paired-dumbbell');
});

test('research samples keep large tables and disable only layouts that cannot fit them',t=>{
  const f=mount(t,presetWork('paired-study'));f.host.querySelector('[data-we="type"]').click();
  assert.equal(f.host.querySelector('[data-we-relational-view="paired-slope"]').disabled,true);assert.equal(f.host.querySelector('[data-we-relational-view="paired-change"]').disabled,false);
  f.host.querySelector('[data-we-relational-view="paired-change"]').click();assert.equal(f.app.getWork().steps[0].doc.data.length,20);assert.equal(f.host.querySelectorAll('[data-edit-field="after"]').length,20);
});

test('hierarchy picker, single-step SVG and saved files preserve parent plus child identity',t=>{
  const f=mount(t,presetWork('research-budget')),data=f.app.getWork().steps[0].doc.data;f.host.querySelector('[data-we="type"]').click();assert.equal(f.host.querySelectorAll('[data-we-relational-view]').length,3);
  f.host.querySelector('[data-we-relational-view="hierarchy-treemap"]').click();const work=f.app.getWork(),step=work.steps[0];assert.deepEqual(step.doc.data,data);assert.match(stepSVG(step,work.steps),/data-view="hierarchy-treemap"/);assert.deepEqual(cleanWork(work).steps[0].doc.data,data);
});

test('free preview can choose A to C without altering the reusable preset sequence',async t=>{
  const {mountMotionGallery}=await server.ssrLoadModule('/src/forma/motion-gallery.js'),host=document.createElement('main');document.body.append(host);let chosen;const gallery=mountMotionGallery(host,{onUse:w=>chosen=w});t.after(()=>{gallery.destroy();host.remove();});
  host.querySelector('[data-mg-preset=paired-evaluation]').click();
  assert.equal(host.querySelectorAll('[data-mg-from] option').length,5);assert.equal(host.querySelectorAll('[data-mg-pair] option').length,5);
  change(host,'[data-mg-pair]','2','change');assert.match(host.querySelector('[data-mg-recipe]').textContent,/成对端点/);assert.equal(host.querySelector('[data-mg-from]').value,'0');
  host.querySelector('[data-mg-use]').click();assert.equal(chosen.steps[0].view,'paired-slope');assert.equal(chosen.steps[1].view,'paired-dumbbell');assert.equal(chosen.steps[2].view,'paired-bars');
});

test('scientific picker keeps native columns, disables missing size, and saves the chosen view',async t=>{
  const f=mount(t,newWork([{doc:getExample('xy')}])),original=f.app.getWork().steps[0].doc.data;
  f.host.querySelector('[data-we=type]').click();assert.equal(f.host.querySelectorAll('[data-we-scientific-view]').length,4);
  assert.equal(f.host.querySelector('[data-we-scientific-view="obs-bubble"]').disabled,true);assert.match(f.host.querySelector('[data-we-scientific-view="obs-bubble"]').title,/size/);
  f.host.querySelector('[data-we-scientific-view="obs-confidence"]').click();assert.deepEqual(f.app.getWork().steps[0].doc.data,original);
  change(f.host,'[data-dw-cell="0:2"]','73');await settle();const work=f.app.getWork(),step=work.steps[0];assert.equal(step.doc.data[0].y,73);assert.equal(step.doc.data[0].x,original[0].x);
  assert.equal(f.host.querySelectorAll('.dw-chart [data-science-role="sample"]').length,42);assert.match(stepSVG(step,work.steps),/data-view="obs-confidence"/);
  f.host.querySelector('[data-we=save]').click();assert.equal(readWorks(f.storage).projects[0].steps[0].view,'obs-confidence');
});

test('scientific samples preserve all rows through adding, independent editing and Agent copy',async t=>{
  const f=mount(t,presetWork('replicate-summary')),initial=f.app.getWork().steps[0].doc.data;
  f.host.querySelector('[data-we=add]').click();assert.equal(f.host.querySelectorAll('[data-we-scientific-view]').length,6);f.host.querySelector('[data-we-scientific-view="sample-raincloud"]').click();
  const w=f.app.getWork(),step=w.steps.find(s=>s.id===w.activeStep);assert.equal(step.doc.data.length,initial.length);assert.equal(step.view,'sample-raincloud');
  change(f.host,'[data-dw-cell="0:2"]','25');await settle();const edited=f.app.getWork();assert.deepEqual(edited.steps[0].doc.data,initial);assert.equal(edited.steps[1].doc.data[0].value,25);assert.equal(edited.steps[1].doc.data[0].label,initial[0].label);
  assert.match(workAgentBrief(edited),/sample-raincloud/);assert.match(workAgentBrief(edited),/原始点和派生箱体/);
});

test('research gallery keeps focused presets and A-to-C interval preview without changing the saved sequence',async t=>{
  const {mountMotionGallery}=await server.ssrLoadModule('/src/forma/motion-gallery.js'),host=document.createElement('main');document.body.append(host);let chosen;const gallery=mountMotionGallery(host,{onUse:w=>chosen=w});t.after(()=>{gallery.destroy();host.remove();});
  host.querySelector('[data-mg-group="research"]').click();assert.equal(host.querySelectorAll('[data-mg-preset]').length,59);assert.ok(host.querySelector('[data-mg-preset="sample-distributions"]'));assert.equal(host.querySelector('[data-mg-preset=monthly]'),null);
  host.querySelector('[data-mg-preset="ratio-effects"]').click();change(host,'[data-mg-pair]','2','change');assert.match(host.querySelector('[data-mg-recipe]').textContent,/区间转向/);host.querySelector('[data-mg-use]').click();assert.equal(chosen.steps[0].view,'estimate-points');assert.equal(chosen.steps[2].view,'estimate-vertical');assert.equal(chosen.steps[0].doc.template,'forest');
});

test('analytical editor reuses all columns, edits each step independently, and retains the complete family picker',async t=>{
  for(const [id,view,column,field,value]of [['duration-distribution','uni-ecdf',1,'value',24.6],['probability-reliability','eval-calibration',3,'score',.42],['correlation-exploration','corr-pairs',2,'value',43]]){
    const initial=presetWork(id),f=mount(t,initial),before=structuredClone(initial.steps[0].doc.data);
    f.host.querySelector('[data-we=add]').click();assert.equal(f.host.querySelectorAll('[data-we-scientific-view]').length,id==='probability-reliability'?7:4);
    f.host.querySelector(`[data-we-scientific-view="${view}"]`).click();const work=f.app.getWork(),current=work.steps.find(s=>s.id===work.activeStep);assert.equal(current.view,view);assert.deepEqual(current.doc.data,before);
    change(f.host,`[data-dw-cell="0:${column}"]`,String(value));await settle();const edited=f.app.getWork();assert.equal(edited.steps.find(s=>s.id===edited.activeStep).doc.data[0][field],value);assert.deepEqual(edited.steps[0].doc.data,before);
    assert.equal(workReport(edited).valid,true);assert.match(stepSVG(edited.steps.find(s=>s.id===edited.activeStep),edited.steps),/data-science-role/);f.destroy();
  }
  const ordinary=mount(t,newWork([{doc:getExample('roc')}]));ordinary.host.querySelector('[data-we=type]').click();const disabled=ordinary.host.querySelector('[data-we-scientific-view="eval-calibration"]');assert.equal(disabled.disabled,true);assert.match(disabled.title,/概率/);
});


test('data sync offers a non-modal review, updates selected steps and provides a targeted undo',async t=>{
  const w=presetWork('method-agreement'),f=mount(t,w),ids=w.steps.map(s=>s.id),original=w.steps[0].doc.data[0].b;
  change(f.host,'[data-dw-cell="0:2"]',String(original+8));await settle();
  f.host.querySelector('[data-we="sync-data"]').click();const panel=f.host.querySelector('[data-we-panel]');assert.equal(panel.getAttribute('aria-modal'),'false');assert.equal(panel.dataset.kind,'sync-data');
  assert.equal(panel.querySelectorAll('[data-we-sync-target]:not(:disabled)').length,3);assert.equal(panel.querySelector('[data-we=apply-sync]').disabled,true);
  panel.querySelector(`[data-we-sync-target="${ids[2]}"]`).click();assert.equal(panel.querySelector('[data-we=apply-sync]').disabled,false);panel.querySelector('[data-we=apply-sync]').click();
  const next=f.app.getWork();assert.equal(next.steps[0].doc.data[0].b,original+8);assert.equal(next.steps[2].doc.data[0].b,original+8);assert.equal(next.steps[1].doc.data[0].b,original);assert.equal(f.host.querySelector('[data-we-sync-feedback]').hidden,false);assert.equal(panel.hidden,true);
  f.host.querySelector('[data-we=undo-sync]').click();const restored=f.app.getWork();assert.equal(restored.steps[2].doc.data[0].b,original);assert.equal(restored.steps[0].doc.data[0].b,original+8);assert.equal(f.host.querySelector('[data-we-sync-feedback]').hidden,true);assert.ok(f.messages.includes('已撤销本次同步，其他编辑保持不变。'));
});
test('sync review detects editing in the still-operable background and keeps all targets unchanged',async t=>{
  const w=presetWork('method-agreement'),f=mount(t,w);change(f.host,'[data-dw-cell="0:2"]','33');await settle();
  f.host.querySelector('[data-we=sync-data]').click();f.host.querySelector('[data-we=sync-select-all]').click();change(f.host,'[data-dw-cell="1:2"]','44');await settle();
  f.host.querySelector('[data-we=apply-sync]').click();assert.match(f.messages.at(-1),/预览后/);assert.deepEqual(f.app.getWork().steps[1].doc.data,w.steps[1].doc.data);
});

test('sync history remains discoverable after dismissing feedback, saving and reopening, and reverses all chosen targets',async t=>{
  const original=presetWork('method-agreement'),f=mount(t,original),ids=original.steps.map(s=>s.id);
  change(f.host,'[data-dw-cell="0:2"]','33.45');await settle();f.host.querySelector('[data-we=sync-data]').click();f.host.querySelector('[data-we=sync-select-all]').click();f.host.querySelector('[data-we=apply-sync]').click();
  f.host.querySelector('[data-we=dismiss-sync]').click();assert.equal(f.host.querySelector('[data-we=sync-history]').hidden,false);
  f.host.querySelector('[data-we=save]').click();f.destroy();
  const g=mount(t,readWorks(f.storage).projects[0],f.storage);assert.equal(g.host.querySelector('[data-we-history-count]').textContent,'1');g.host.querySelector('[data-we=sync-history]').click();
  const panel=g.host.querySelector('[data-we-panel]');assert.equal(panel.getAttribute('aria-modal'),'false');assert.equal(panel.querySelectorAll('.we-history-target').length,3);assert.match(panel.textContent,/最近 5 次/);assert.equal(panel.querySelector('[data-we=undo-history]').disabled,false);
  panel.querySelector('[data-we=undo-history]').click();const restored=g.app.getWork();assert.equal(restored.steps[0].doc.data[0].b,33.45);for(const id of ids.slice(1))assert.deepEqual(restored.steps.find(s=>s.id===id).doc,original.steps.find(s=>s.id===id).doc);
  assert.equal(g.host.querySelector('[data-we=sync-history]').hidden,true);g.destroy();assert.deepEqual(readWorks(f.storage).syncHistories,{});
});
test('reopened sync history explains a later target edit and cannot overwrite it',async t=>{
  const f=mount(t,presetWork('method-agreement'));change(f.host,'[data-dw-cell="0:2"]','35');await settle();f.host.querySelector('[data-we=sync-data]').click();f.host.querySelector('[data-we=sync-select-all]').click();f.host.querySelector('[data-we=apply-sync]').click();
  f.host.querySelector('[data-we=next-step]').click();change(f.host,'[data-dw-cell="0:2"]','99');await settle();f.destroy();
  const g=mount(t,readWorks(f.storage).draft,f.storage);g.host.querySelector('[data-we=sync-history]').click();assert.equal(g.host.querySelector('[data-we=undo-history]').disabled,true);assert.match(g.host.querySelector('.we-history-reason').textContent,/已被修改/);assert.equal(g.app.getWork().steps[1].doc.data[0].b,99);
});
test('sync recovery payload is omitted from current Agent, HTML and JSON output',async t=>{
  const w=presetWork('method-agreement');w.steps[1].doc.source={name:'PRIVATE_OLD_SYNC_SOURCE_672',type:'user'};const f=mount(t,w);
  change(f.host,'[data-dw-cell="0:2"]','34');await settle();f.host.querySelector('[data-we=sync-data]').click();f.host.querySelector('[data-we=sync-select-all]').click();f.host.querySelector('[data-we=apply-sync]').click();f.host.querySelector('[data-we=save]').click();
  assert.match(f.storage.getItem(WORK_KEY),/PRIVATE_OLD_SYNC_SOURCE_672/);
  const current=f.app.getWork();for(const output of [workAgentBrief(current),workHTML(current,'window.engine=true;'),JSON.stringify(current)])assert.doesNotMatch(output,/PRIVATE_OLD_SYNC_SOURCE_672|syncHistories|syncHistory/);
});
test('storage failure keeps the active work instead of switching away from unsaved history',async t=>{
  const s=memory(),f=mount(t,presetWork('method-agreement'),s);change(f.host,'[data-dw-cell="0:2"]','38');await settle();f.host.querySelector('[data-we=sync-data]').click();f.host.querySelector('[data-we=sync-select-all]').click();f.host.querySelector('[data-we=apply-sync]').click();
  const before=f.app.getWork();s.setItem=()=>{throw new Error('空间已满，尚未保存');};f.host.querySelector('[data-we=works]').click();assert.equal(f.host.querySelector('[data-we=new]'),null);assert.equal(f.app.getWork().id,before.id);assert.match(f.messages.at(-1),/尚未保存/);assert.equal(f.host.querySelector('[data-we-history-count]').textContent,'1');
});

test('palette UI can materialize an unchanged draft without preventing reopened synchronization undo',async t=>{
  const w=presetWork('method-agreement'),f=mount(t,w);change(f.host,'[data-dw-cell="0:2"]','38.5');await settle();f.host.querySelector('[data-we=sync-data]').click();f.host.querySelector('[data-we=sync-select-all]').click();f.host.querySelector('[data-we=apply-sync]').click();
  f.host.querySelector('[data-we=next-step]').click();f.host.querySelector('[data-we-tool=style]').click();f.host.querySelector('[data-we-palette=cobalt]').click();f.destroy();
  const g=mount(t,readWorks(f.storage).draft,f.storage);g.host.querySelector('[data-we=sync-history]').click();assert.equal(g.host.querySelector('[data-we=undo-history]').disabled,false);g.host.querySelector('[data-we=undo-history]').click();
  assert.equal(g.app.getWork().steps[1].options.palette,'cobalt');assert.deepEqual(g.app.getWork().steps[1].doc,w.steps[1].doc);
});
