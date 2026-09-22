import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import {MorphChart,layoutMorph,morphExample,morphViews} from '../../src/forma/morph.js';
import {newSequence,sequencePresets,sequenceSource,cleanSequence,readSequences,writeSequences,SEQUENCE_KEY} from '../../src/forma/morph-sequence.js';
import {getExample} from '../../src/forma/catalog.js';

let win,server,mountMorphWorkspace,sequenceAgentBrief,sequenceStandaloneHTML;
const original=new Map();
before(async()=>{
  win=new Window({url:'http://localhost:4189/#motion'});
  for(const [key,value] of Object.entries({window:win,document:win.document,XMLSerializer:win.XMLSerializer,ResizeObserver:win.ResizeObserver,matchMedia:win.matchMedia.bind(win),requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win)})){
    original.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  ({mountMorphWorkspace}=await server.ssrLoadModule('/src/forma/morph-workspace.js'));
  ({sequenceAgentBrief,sequenceStandaloneHTML}=await server.ssrLoadModule('/src/forma/morph-sequence-export.js'));
});
after(async()=>{await server?.close();await win.happyDOM.close();for(const [key,value]of original){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
function memory(){const records=new Map();return {records,getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)};}
function change(host,selector,value,type='change'){const el=host.querySelector(selector);assert.ok(el,selector);el.value=value;el.dispatchEvent(new win.Event(type,{bubbles:true}));}
function fixture(t,{storage=memory(),host=win.document.createElement('main')}={}){
  document.body.append(host);const messages=[],source={key:'column',doc:getExample('column'),options:{palette:'mauve',colors:['#527B91','#80688F']}};
  const app=mountMorphWorkspace(host,{storage,getSources:()=>({editor:[source,{key:'xy',doc:getExample('xy')},{key:'3d',doc:getExample('scatter3d')}] }),toast:m=>messages.push(m)});
  let alive=true;t.after(()=>{if(alive)app.destroy();host.remove();});
  return {host,storage,messages,source,destroy(){app.destroy();alive=false;}};
}

test('line and area use true ordered coordinates with joined midpoints and a shared zero baseline',()=>{
  const doc=structuredClone(morphExample);doc.data[0].value=8;doc.data[1].value=28;
  for(const view of ['line','area'])for(const [w,h]of [[300,300],[1000,420]]){
    const {marks}=layoutMorph(doc,view,w,h);for(const [i,m]of marks.entries()){
      assert.equal(m.points.length,128);assert.equal(m.geometry.type,view);
      assert.ok(Math.abs((m.geometry.baseline-m.geometry.cy)/m.value-m.geometry.scale)<1e-8);
      if(i)assert.deepEqual(m.geometry.left,marks[i-1].geometry.right);
      assert.ok(m.points.every(p=>p.every(Number.isFinite)));
    }
    assert.ok(marks[1].geometry.cy<marks[0].geometry.cy);assert.ok(marks[1].geometry.cx>marks[0].geometry.cx);
  }
});
test('column → line → pie changes the same visible paths continuously, including rapid retargets',()=>{
  const host=win.document.createElement('div'),queue=new Map();let n=0;
  const oldRAF=win.requestAnimationFrame,oldCancel=win.cancelAnimationFrame;
  win.requestAnimationFrame=fn=>{queue.set(++n,fn);return n;};win.cancelAnimationFrame=id=>queue.delete(id);
  try{
    const chart=new MorphChart(host,morphExample,{view:'columns',width:900,height:400,reducedMotion:false});
    const paths=[...host.querySelectorAll('[data-morph-shape]')],first=paths[0],columns=first.getAttribute('d');
    const frame=time=>{const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(time));};
    chart.setView('line');frame(0);frame(650);const middle=first.getAttribute('d');assert.notEqual(middle,columns);
    assert.equal(first,host.querySelector('[data-morph-shape]'));assert.equal(host.querySelector('[data-morph-marks]').getAttribute('opacity'),null);
    chart.setView('pie');assert.equal(first.getAttribute('d'),middle);frame(700);frame(2200);
    assert.deepEqual(paths,[...host.querySelectorAll('[data-morph-shape]')]);assert.equal(chart.view,'pie');assert.equal(chart.animating,false);
    chart.setView('line',{animate:false});assert.equal(host.querySelectorAll('[data-line-point]').length,6);
    assert.equal(chart.layout.total,100);chart.destroy();
  }finally{win.requestAnimationFrame=oldRAF;win.cancelAnimationFrame=oldCancel;}
});
test('the old eight-view preset remains exact and every new preset shares a single dataset',()=>{
  assert.deepEqual(newSequence('classic').views,['bars','bubbles','donut','treemap','columns','pie','rose','stacked']);
  assert.equal(morphViews.length,25);
  for(const preset of sequencePresets){const p=newSequence(preset.id);assert.equal(p.doc.data.length,6);assert.ok(!('scenes'in p));assert.ok(!('panels'in p));assert.deepEqual(cleanSequence(p),p);}
});
test('data sources are independent complete series; incompatible or incomplete tables are never truncated',()=>{
  const source={doc:getExample('column')},copy=structuredClone(source),mapped=sequenceSource(source);assert.equal(mapped.ok,true);mapped.doc.data[0].value=999;assert.deepEqual(source,copy);
  for(const id of ['xy','volcano','scatter3d','upset'])assert.equal(sequenceSource({doc:getExample(id)}).ok,false,id);
  const grouped=structuredClone(source);grouped.doc.data[0].group='extra';assert.equal(sequenceSource(grouped).ok,false);
  assert.equal(sequenceSource({...source,disabled:true}).ok,false);
  const dates=structuredClone(source);dates.doc.data=dates.doc.data.map((r,i)=>({date:`2026-0${i+1}-01`,value:r.value}));assert.equal(sequenceSource(dates).ok,true);
});
test('sequence persistence restores order, current view, data and custom colors without touching editor storage',()=>{
  const s=memory();s.setItem('forma.editor.v1','existing records');const p=newSequence();p.views=['pie','line','columns'];p.currentView='line';p.colors=['#527B91','#80688F'];p.duration=2400;
  writeSequences(s,[p],p);const read=readSequences(s);assert.deepEqual(read.draft.views,p.views);assert.equal(read.draft.currentView,'line');assert.equal(read.draft.duration,2400);assert.deepEqual(read.draft.colors,['#527b91','#80688f']);assert.equal(s.getItem('forma.editor.v1'),'existing records');
});
test('invalid projects and storage failures leave the last stored sequence intact',()=>{
  const s=memory(),p=newSequence();writeSequences(s,[p],p);const old=s.getItem(SEQUENCE_KEY);
  for(const bad of [{...p,views:['columns']},{...p,views:['line','line']},{...p,effect:'slide'},{...p,colors:['red']},{...p,hold:0}])assert.throws(()=>writeSequences(s,[bad],bad));assert.equal(s.getItem(SEQUENCE_KEY),old);
  const broken=memory();broken.setItem(SEQUENCE_KEY,'{not JSON');writeSequences(broken,[],p);assert.equal([...broken.records].find(([key])=>key.includes('.recovery.'))[1],'{not JSON');
  const quota={getItem:s.getItem,setItem(){throw new Error('quota full');}};assert.throws(()=>writeSequences(quota,[],p),/quota/);assert.equal(s.getItem(SEQUENCE_KEY),old);
});
test('workspace contains one main chart and composes selectable graph types, not multiple chart panels',t=>{
  const f=fixture(t);assert.equal(f.host.querySelectorAll('[data-morph-chart]').length,1);assert.equal(f.host.querySelectorAll('[data-ms-view]').length,4);assert.equal(f.host.querySelector('[data-morph-chart]').dataset.view,'columns');
  f.host.querySelector('[data-ms-edit]').click();assert.equal(f.host.querySelector('#mw-tool-order').hidden,false);assert.equal(f.host.querySelector('[data-mw-panel]').hidden,true);
  f.host.querySelector('[data-mw-tab=types]').click();
  f.host.querySelector('[data-mw-toggle=area]').click();assert.equal(f.host.querySelectorAll('[data-ms-view]').length,5);
  f.host.querySelector('[data-ms-edit]').click();
  f.host.querySelector('[data-mw-move="4:-1"]').click();assert.deepEqual(readSequences(f.storage).draft.views,['columns','line','pie','area','donut']);
  f.host.querySelector('[data-mw-remove=pie]').click();assert.deepEqual(readSequences(f.storage).draft.views,['columns','line','area','donut']);assert.equal(f.host.querySelectorAll('[data-morph-chart]').length,1);
});
test('choosing existing data preserves custom colors and originals, and save / reopen preserves the complete recipe',t=>{
  const f=fixture(t),original=structuredClone(f.source);change(f.host,'[data-mw-source]','0');assert.deepEqual(f.source,original);assert.equal(f.host.querySelector('[data-ms-title]').textContent,original.doc.title);assert.deepEqual(readSequences(f.storage).draft.colors,['#527b91','#80688f']);
  change(f.host,'[data-mw-name]','销售形变','input');change(f.host,'[data-mw-effect]','gather');change(f.host,'[data-mw-duration]','2400');f.host.querySelector('[data-mw=save]').click();
  const saved=readSequences(f.storage).projects[0];assert.equal(saved.name,'销售形变');assert.equal(saved.effect,'gather');assert.equal(saved.duration,2400);
  f.host.querySelector('[data-mw=presets]').click();f.host.querySelector('[data-mw-preset=classic]').click();f.host.querySelector('[data-mw=saved]').click();f.host.querySelector('[data-mw-open]').click();assert.equal(f.host.querySelectorAll('[data-ms-view]').length,4);assert.equal(f.host.querySelector('[data-mw-name]').value,'销售形变');
  f.destroy();const next=fixture(t,{storage:f.storage});assert.equal(next.host.querySelector('[data-mw-name]').value,'销售形变');assert.equal(next.host.querySelector('[data-mw-effect]').value,'gather');
});
test('deleting saved combinations can be undone and route remount does not leave duplicate handlers',t=>{
  const f=fixture(t);f.host.querySelector('[data-mw=save]').click();f.host.querySelector('[data-mw=saved]').click();f.host.querySelector('[data-mw-delete]').click();assert.equal(readSequences(f.storage).projects.length,0);
  f.host.querySelector('[data-mw=restore]').click();assert.equal(readSequences(f.storage).projects.length,1);
  const host=f.host;f.destroy();const next=fixture(t,{host,storage:f.storage});next.host.querySelector('[data-mw=save]').click();assert.equal(next.messages.length,1);assert.equal(f.messages.filter(m=>m.startsWith('已保存到')).length,1);
});
test('copy produces a complete Agent creation manual containing this sequence, not a JSON reimport task',async t=>{
  const f=fixture(t);let copied='';win.navigator.clipboard.writeText=async text=>{copied=text;};f.host.querySelector('[data-mw=copy]').click();await new Promise(r=>setTimeout(r,0));
  assert.match(copied,/Agent 制作说明书/);assert.match(copied,/128/);assert.match(copied,/forma-original-runtime/);assert.match(copied,/agent-runtimes\/sequence-/);assert.match(copied,/"views"/);assert.match(copied,/"value": 28/);assert.match(copied,/完整源代码/);assert.ok(f.messages.some(m=>m.startsWith('已复制')));
});
test('export escapes user text and standalone HTML uses the same actual morph engine offline',async()=>{
  const p=newSequence();p.doc.title='销售 </script><img src=x onerror=alert(1)>';p.views=morphViews.map(v=>v.id);p.duration=600;
  const engine=await readFile('public/forma/morph-sequence-player.js','utf8'),html=sequenceStandaloneHTML(p,engine);
  assert.doesNotMatch(html,/<img src=x/);assert.match(html,/forma-morph-sequence/);assert.doesNotMatch(html,/<script[^>]*src=/);
  const page=new Window({url:'https://example.test/morph.html',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true,disableErrorCapturing:true}});page.structuredClone=structuredClone;
  try{page.document.write(html);await page.happyDOM.waitUntilComplete();assert.equal(page.document.querySelectorAll('[data-morph-chart]').length,1);assert.equal(page.document.querySelectorAll('[data-ms-view]').length,25);
    page.document.querySelector('[data-ms-view=line]').click();await page.happyDOM.waitUntilComplete();assert.equal(page.document.querySelector('[data-morph-chart]').dataset.view,'line');assert.equal(page.document.querySelectorAll('[data-line-point]').length,6);
    page.document.querySelector('[data-ms-view=pie]').click();await page.happyDOM.waitUntilComplete();assert.equal(page.document.querySelector('[data-morph-chart]').dataset.view,'pie');assert.equal(page.document.querySelectorAll('[data-morph-shape]').length,6);
    const paths=[...page.document.querySelectorAll('[data-morph-shape]')];for(const id of ['waffle','radar','pareto']){page.document.querySelector(`[data-ms-view=${id}]`).click();await page.happyDOM.waitUntilComplete();assert.equal(page.document.querySelector('[data-morph-chart]').dataset.view,id);assert.deepEqual([...page.document.querySelectorAll('[data-morph-shape]')],paths);}
  }finally{await page.happyDOM.close();}
});

test('presets are an optional unblurred popover and all graph choices stay in the tool panel',t=>{
  const f=fixture(t);assert.equal(f.host.querySelectorAll('[data-mw-toggle]').length,25);assert.equal(f.host.querySelectorAll('[data-mw-preset]').length,0);
  f.host.querySelector('[data-mw=presets]').click();const panel=f.host.querySelector('[data-mw-panel]');assert.equal(panel.hidden,false);assert.equal(panel.getAttribute('aria-modal'),'false');assert.equal(panel.querySelectorAll('[data-mw-preset]').length,6);
  f.host.querySelector('[data-mw-preset=geometry]').click();assert.equal(panel.hidden,true);assert.deepEqual(readSequences(f.storage).draft.views,['semidonut','waffle','squares','radialbars','radar','funnel']);assert.equal(f.host.querySelectorAll('[data-morph-chart]').length,1);
  change(f.host,'[data-mw-family]','new');assert.equal([...f.host.querySelectorAll('[data-mw-toggle]')].filter(b=>!b.hidden).length,10);
  f.host.querySelector('[data-mw-tab=settings]').click();assert.equal(f.host.querySelector('#mw-tool-types').hidden,true);assert.equal(f.host.querySelector('#mw-tool-settings').hidden,false);
  f.host.querySelector('[data-mw=tools]').click();assert.equal(f.host.querySelector('.mw-tools').hidden,true);f.host.querySelector('[data-ms-edit]').click();assert.equal(f.host.querySelector('.mw-tools').hidden,false);assert.equal(f.host.querySelector('#mw-tool-order').hidden,false);
});
test('all supported types can be composed, dragged, saved and reopened as one sequence',t=>{
  const f=fixture(t);for(const v of morphViews)if(!readSequences(f.storage).draft?.views.includes(v.id)&&!['columns','line','pie','donut'].includes(v.id))f.host.querySelector(`[data-mw-toggle=${v.id}]`).click();
  assert.equal(f.host.querySelectorAll('[data-ms-view]').length,25);assert.equal(f.host.querySelectorAll('[data-morph-chart]').length,1);
  const first=f.host.querySelector('[data-ms-view]'),last=[...f.host.querySelectorAll('[data-ms-view]')].at(-1),firstId=first.dataset.msView;
  first.dispatchEvent(new win.Event('dragstart',{bubbles:true}));last.dispatchEvent(new win.Event('drop',{bubbles:true,cancelable:true}));assert.equal(readSequences(f.storage).draft.views.at(-1),firstId);
  f.host.querySelector('[data-mw=save]').click();const saved=readSequences(f.storage).projects[0];assert.equal(saved.views.length,25);
  f.destroy();const restored=fixture(t,{storage:f.storage});assert.deepEqual([...restored.host.querySelectorAll('[data-ms-view]')].map(b=>b.dataset.msView),saved.views);
});
