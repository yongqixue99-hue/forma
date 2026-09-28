import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import * as model from '../../src/forma/canvas-model.js';
import {getExample,catalog} from '../../src/forma/catalog.js';
import {CanvasSurface,canvasRenderItems} from '../../src/forma/canvas-renderer.js';
import {MorphChart,layoutMorph} from '../../src/forma/morph.js';

let win,server,mountCanvasWorkspace,canvasAgentBrief,canvasStandaloneHTML;
const originals=new Map();
before(async()=>{
  win=new Window({url:'http://localhost:4189/#motion'});
  for(const [name,value] of Object.entries({window:win,document:win.document,XMLSerializer:win.XMLSerializer,ResizeObserver:win.ResizeObserver,matchMedia:win.matchMedia.bind(win),requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win)})){
    originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
  }
  server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  ({mountCanvasWorkspace}=await server.ssrLoadModule('/src/forma/canvas-workspace.js'));
  ({canvasAgentBrief,canvasStandaloneHTML}=await server.ssrLoadModule('/src/forma/canvas-export.js'));
});
after(async()=>{await server?.close();await win?.happyDOM.close();for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
const source=(id,key=id)=>({key,doc:getExample(id),options:{palette:'mauve',colors:['#527B91','#80688F','#B8767C'],ratio:'wide',duration:8}});
function memory(){const entries=new Map();return {entries,getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)};}
function composed(ids=['column','xy'],mode='together'){const p=model.newCanvas('研究与比较');model.addSources(p,p.scenes[0].id,ids.map(id=>source(id)),mode);return p;}
function mount(t,{storage=memory(),items=[source('column'),source('xy'),source('volcano')]}={}){
  document.body.innerHTML='<main></main>';const host=document.querySelector('main'),messages=[];
  const controller=mountCanvasWorkspace(host,{storage,getSources:()=>({editor:items,saved:[],selection:[]}),toast:message=>messages.push(message)});
  let alive=true;t.after(()=>{if(alive)controller.destroy();});
  return {host,storage,items,messages,destroy(){controller.destroy();alive=false;},saved(){host.querySelector('[data-fc=save]').click();return model.readCanvasCollection(storage).projects.find(p=>p.id===model.readCanvasCollection(storage).activeId);}};
}
function change(host,selector,value){const el=host.querySelector(selector);assert.ok(el,selector);el.value=value;el.dispatchEvent(new win.Event('change',{bubbles:true}));}
function add(host,keys){keys.forEach(key=>host.querySelector(`[data-source-key="${key}"]`).click());host.querySelector('[data-fc=add-sources]').click();}

test('assembling snapshots preserves data and custom colors without changing editor sources',()=>{
  const p=model.newCanvas(),inputs=[source('column'),source('xy')],before=structuredClone(inputs);model.addSources(p,p.scenes[0].id,inputs);
  assert.equal(p.scenes[0].panels.length,2);assert.equal(p.assets.length,2);assert.deepEqual(inputs,before);
  p.assets[0].doc.data[0].value=999;assert.equal(inputs[0].doc.data[0].value,before[0].doc.data[0].value);
  assert.deepEqual(p.assets[0].options.colors,['#527b91','#80688f','#b8767c']);assert.equal(model.validateCanvas(p),true);
});
test('separate pages reuse the empty first scene and reject overflow before modifying data',()=>{
  const p=composed(['column','xy','volcano'],'pages');assert.equal(p.scenes.length,3);assert.equal(p.assets.length,3);assert.ok(p.scenes.every(s=>s.panels.length===1));
  const many=composed(['column','xy','volcano','scatter3d']);const before=structuredClone(many);assert.throws(()=>model.addSources(many,many.scenes[0].id,[source('pie')]),/最多/);assert.deepEqual(many,before);
  const invalid=source('column');invalid.doc.data[0].value='bad';assert.throws(()=>model.addSources(p,p.scenes[0].id,[source('pie'),invalid]));assert.equal(p.assets.length,3);
});
test('duplicated pages preserve object identity for geometry transitions; new data never silently morphs',()=>{
  const p=composed();const old=p.scenes[0],next=model.duplicateScene(p,old.id);next.panels[0].w=28;next.panels[0].x=12;
  assert.equal(next.panels[0].id,old.panels[0].id);assert.equal(next.panels[0].assetId,old.panels[0].assetId);
  const halfway=canvasRenderItems(p,model.canvasFrame(p,5.5)),shared=halfway.find(i=>i.panel.id===old.panels[0].id);
  assert.equal(shared.panel.w,38);assert.equal(shared.panel.x,6);assert.equal(shared.from,old.panels[0]);
  next.panels[0].assetId=old.panels[1].assetId;
  assert.equal(canvasRenderItems(p,model.canvasFrame(p,5.5)).filter(i=>i.from).length,1);
});
test('all six page effects resolve deterministic endpoints and bounded timing',()=>{
  const p=composed(['column','xy'],'pages');for(const [id] of model.canvasEffects){p.scenes[1].transition=id;assert.equal(model.validateCanvas(p),true);assert.deepEqual(canvasRenderItems(p,model.canvasFrame(p,5.5)),canvasRenderItems(p,model.canvasFrame(p,5.5)));}
  assert.equal(model.canvasDuration(p),10);assert.equal(model.canvasFrame(p,-2).time,0);assert.equal(model.canvasFrame(p,100).index,1);assert.equal(model.canvasFrame(p,100).amount,1);
  p.scenes[1].seconds=0;assert.throws(()=>model.cleanCanvas(p),/0.3/);
});
test('continuous morphing is restricted to valid compatible data and keeps asset totals',()=>{
  const p=composed(['column']);const panel=p.scenes[0].panels[0],old=structuredClone(p.assets[0].doc.data),next=model.appendMorphScene(p,p.scenes[0].id,panel.id,'donut');
  assert.equal(panel.view,'columns');assert.equal(next.panels[0].view,'donut');assert.equal(next.panels[0].id,panel.id);assert.equal(p.assets.length,1);assert.deepEqual(p.assets[0].doc.data,old);
  const q=composed(['volcano']);assert.equal(model.morphCapable(q.assets[0].doc),false);assert.throws(()=>model.appendMorphScene(q,q.scenes[0].id,q.scenes[0].panels[0].id,'donut'));
  p.assets[0].doc.data[0].value=0;assert.equal(model.morphCapable(p.assets[0].doc),false);assert.throws(()=>model.validateCanvas(p));
});
test('morph timeline seek is deterministic at arbitrary times and preserves exact endpoint geometry',()=>{
  const host=document.createElement('div'),doc=getExample('column');const chart=new MorphChart(host,doc,{width:720,height:440,view:'columns',colors:['#527b91','#80688f'],reducedMotion:true});
  chart.seekTransition('columns','donut',0);for(const m of layoutMorph(doc,'columns',720,440).marks)assert.deepEqual(chart.current.get(m.key),m.points);
  chart.seekTransition('columns','donut',.52);const middle=[...host.querySelectorAll('path[data-key]')].map(p=>p.getAttribute('d'));assert.ok(middle.every(d=>!/(NaN|undefined|Infinity)/.test(d)));
  chart.seekTransition('columns','donut',1);for(const m of layoutMorph(doc,'donut',720,440).marks)assert.deepEqual(chart.current.get(m.key),m.points);
  chart.seekTransition('columns','donut',.52);assert.deepEqual([...host.querySelectorAll('path[data-key]')].map(p=>p.getAttribute('d')),middle);assert.equal(chart.frame,null);chart.destroy();
});
test('all current native chart templates compose with finite SVG geometry at a quarter canvas size',()=>{
  for(const t of catalog){const p=composed([t.id]);const panel=p.scenes[0].panels[0];panel.w=48;panel.h=48;const host=document.createElement('div'),surface=new CanvasSurface(host,p);surface.frame(0,{sceneIndex:0});
    assert.ok(host.querySelector('svg'),t.id);for(const node of host.querySelectorAll('svg *'))for(const attr of node.attributes)if(['d','x','y','r','cx','cy','width','height','transform','points'].includes(attr.name))assert.doesNotMatch(attr.value,/NaN|Infinity|undefined/,`${t.id}:${attr.name}`);surface.destroy();
  }
});
test('canvas files retain identities and options, reject invalid links, and handle maximum name length',()=>{
  const p=composed(['column']);p.scenes[0].name='画'.repeat(80);model.duplicateScene(p,p.scenes[0].id);assert.ok(p.scenes[1].name.length<=80);assert.deepEqual(model.readCanvasFile(JSON.stringify(p)),model.cleanCanvas(p));
  const bad=structuredClone(p);bad.scenes[1].panels[0].assetId='missing';assert.throws(()=>model.readCanvasFile(JSON.stringify(bad)),/关联/);assert.throws(()=>model.readCanvasFile('not json'),/JSON/);
});
test('corrupt existing storage is backed up before new writes; quota failure keeps original records',()=>{
  const storage=memory(),raw='{bad old canvas';storage.setItem(model.CANVAS_KEY,raw);assert.equal(model.readCanvasCollection(storage).recoveryRaw,raw);
  const p=composed();model.writeCanvasCollection([p],p.id,storage);assert.equal([...storage.entries].find(([k])=>k.includes('.recovery.'))[1],raw);assert.equal(model.readCanvasCollection(storage).projects.length,1);
  const denied={getItem:()=>raw,setItem(){throw new Error('quota');}};assert.throws(()=>model.writeCanvasCollection([p],p.id,denied));assert.equal(denied.getItem(),raw);
});
test('real workspace actions assemble, save, restore and edit a layout with one-step undo',t=>{
  const f=mount(t);add(f.host,['column','xy']);assert.equal(f.host.querySelectorAll('#fc-overlay [data-panel]').length,2);assert.equal(f.saved().assets.length,2);
  change(f.host,'[data-panel-field=w]','30');const moved=f.saved();assert.equal(moved.scenes[0].panels[1].w,30);f.host.querySelector('[data-fc=undo]').click();assert.equal(f.saved().scenes[0].panels[1].w,48);
  const before=f.saved();f.destroy();const resumed=mount(t,{storage:f.storage});assert.equal(resumed.host.querySelectorAll('#fc-overlay [data-panel]').length,2);assert.deepEqual(resumed.saved().assets,before.assets);
});
test('workspace creates a playable morph page, switches effects and copies a complete Agent manual',async t=>{
  const f=mount(t);add(f.host,['column']);change(f.host,'#fc-next-view','donut');f.host.querySelector('[data-fc=morph-next]').click();assert.equal(f.saved().scenes.length,2);assert.equal(f.saved().scenes[1].panels[0].view,'donut');
  change(f.host,'#fc-effect','wipe');assert.equal(f.saved().scenes[1].transition,'wipe');
  let copied='';Object.defineProperty(win.navigator.clipboard,'writeText',{value:async text=>{copied=text;},configurable:true});
  const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{value:win.navigator,configurable:true});
  try{f.host.querySelector('[data-fc=copy]').click();await new Promise(r=>setTimeout(r,20));assert.match(copied,/直接制作可打开/);assert.match(copied,/布局/);assert.match(copied,/"view": "donut"/);assert.match(copied,/不需要把 JSON 导回/);}finally{if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else delete globalThis.navigator;}
});
test('keyboard and pointer movements change only placement, and incomplete sources are unavailable',t=>{
  const bad=source('xy');bad.disabled=true;const f=mount(t,{items:[source('column'),bad]});assert.equal(f.host.querySelector('[data-source-key=xy]').disabled,true);add(f.host,['column']);change(f.host,'[data-panel-field=w]','50');
  const before=f.saved(),handle=f.host.querySelector('[data-panel]');handle.focus();handle.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowRight',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(f.saved().scenes[0].panels[0].x,5);assert.deepEqual(f.saved().assets,before.assets);
  const overlay=f.host.querySelector('#fc-overlay');overlay.getBoundingClientRect=()=>({width:500,height:300});const target=f.host.querySelector('[data-panel]');target.dispatchEvent(new win.PointerEvent('pointerdown',{button:0,pointerId:1,clientX:20,clientY:20,bubbles:true,cancelable:true}));
  f.host.dispatchEvent(new win.PointerEvent('pointermove',{pointerId:1,clientX:70,clientY:20,bubbles:true}));f.host.dispatchEvent(new win.PointerEvent('pointerup',{pointerId:1,bubbles:true}));assert.equal(f.saved().scenes[0].panels[0].x,15);f.host.querySelector('[data-fc=undo]').click();assert.equal(f.saved().scenes[0].panels[0].x,5);
});
test('project manager removes and restores canvases without losing assembled data',t=>{
  const f=mount(t);add(f.host,['column']);const original=f.saved();f.host.querySelector('[data-fc=projects]').click();f.host.querySelector(`[data-remove-project="${original.id}"]`).click();f.host.querySelector('[data-fc=restore-project]').click();f.host.querySelector(`[data-open-project="${original.id}"]`).click();assert.deepEqual(f.saved().assets,original.assets);
});
test('input-only names and blur-committed numeric edits reach saved and rendered output',t=>{
  const f=mount(t);add(f.host,['column']);
  for(const [selector,value]of [['#fc-name','季度报告'],['#fc-page-name','销售总览']]){const el=f.host.querySelector(selector);el.value=value;el.dispatchEvent(new win.Event('input',{bubbles:true}));}
  const p=f.saved();assert.equal(p.name,'季度报告');assert.equal(p.scenes[0].name,'销售总览');assert.equal(f.host.querySelector('#fc-paint h2').textContent,'销售总览');
  const width=f.host.querySelector('[data-panel-field=w]');width.value='60';width.dispatchEvent(new win.FocusEvent('focusout',{bubbles:true}));assert.equal(f.saved().scenes[0].panels[0].w,60);
});
test('import validation prevents attribute injection through canvas object identifiers',()=>{
  const p=composed();p.scenes[0].panels[0].id='id" onfocus="bad';assert.throws(()=>model.cleanCanvas(p),/关联/);
});
test('Agent manual covers actual scientific fields and HTML safely embeds complete data',()=>{
  const p=composed(['volcano','scatter3d'],'pages');p.name='画布 </script><b> 标题';const manual=canvasAgentBrief(p);assert.match(manual,/log2FC/);assert.match(manual,/assetId/);assert.doesNotMatch(manual,/undefined/);
  const html=canvasStandaloneHTML(p,'window.engineLoaded=true;');assert.doesNotMatch(html,/<script[^>]+src=/);assert.ok(html.includes('\\u003c/script>'));assert.ok(html.includes('FormaCanvas.mount'));assert.ok(html.includes('forma-canvas-document'));
});
test('built independent player mounts, seeks, switches pages and preserves composition',async()=>{
  const engine=await readFile(new URL('../../public/forma/canvas-player.js',import.meta.url),'utf8'),p=composed(['column','volcano'],'pages');
  const standalone=new Window({url:'http://offline.example/',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true,disableErrorCapturing:true}});standalone.structuredClone=structuredClone;standalone.document.write(canvasStandaloneHTML(p,engine));await standalone.happyDOM.waitUntilComplete();
  assert.equal(standalone.document.querySelectorAll('.fcp').length,1);assert.ok(standalone.document.querySelector('.fc-paint-chart svg'));standalone.document.querySelector('[data-page="1"]').click();assert.equal(standalone.document.querySelector('.fc-surface').dataset.scene,p.scenes[1].id);
  assert.equal(standalone.document.querySelectorAll('#fc-overlay,.fc-inspector').length,0);assert.equal(standalone.document.querySelector('.fc-paint-header h3').textContent,p.assets[1].doc.title);await standalone.happyDOM.close();
});
