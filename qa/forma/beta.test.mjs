import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLocale} from '../../src/forma/initial-locale.js';
import {recordUsage,readUsage,clearUsage,setUsageEnabled,feedbackReport,usageChannel,USAGE_KEY} from '../../src/forma/beta-usage.js';
import {presetWork,cleanWork,workReport,transitionPlan} from '../../src/forma/work-model.js';
import {imr10} from '../../src/forma/volume10-data.js';
import {setLocale} from '../../src/forma/locale.js';
import {newAnnotation} from '../../src/forma/annotations.js';
import {Window} from 'happy-dom';
import {stepSVG} from '../../src/forma/work-export.js';
import {layoutMorph} from '../../src/forma/morph.js';
import {morphDocument} from '../../src/forma/work-model.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}};
test('first visit language follows an explicit link, saved choice, then English regardless of browser language',()=>{
  assert.equal(initialLocale({search:'?lang=en',stored:'zh-CN',languages:['zh-CN']}),'en');
  assert.equal(initialLocale({stored:'zh-CN',languages:['en-US']}),'zh-CN');
  assert.equal(initialLocale({languages:['en-GB']}),'en');assert.equal(initialLocale({languages:['zh-TW']}),'en');assert.equal(initialLocale({languages:['fr-FR']}),'en');
  assert.equal(initialLocale({search:'?lang=javascript',stored:'en'}),'en');
});
test('retired local counting removes old counters and never records new ones',()=>{
  const data=new Map([[USAGE_KEY,'old counts']]);const store={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  assert.equal(recordUsage('visit',{},store),false);assert.equal(store.getItem(USAGE_KEY),undefined);
  assert.equal(recordUsage('save',{},store),false);assert.equal(store.getItem(USAGE_KEY),undefined);
});
test('feedback includes only chosen fields and optional sanitized usage',()=>{
  const store=memory(),day=new Date().toISOString().slice(0,10);store.setItem(USAGE_KEY,JSON.stringify({version:1,days:{[day]:{'save:none:direct':2,'SECRET:none:direct':9}},email:'private'}));
  const report=feedbackReport({goal:'A chart',problem:'Cannot export',doc:{data:'SECRET'},includeUsage:true},store);
  assert.equal(report.localUsage.days[day]['save:none:direct'],2);assert.doesNotMatch(JSON.stringify(report),/SECRET|private|"doc"/);
  assert.ok(!feedbackReport({problem:'Issue'},store).localUsage);assert.equal(usageChannel('?ref=private-title'),'other');
});
test('public business example preserves fiscal-year facts, extra columns and compatible transitions',()=>{
  setLocale('en');const work=presetWork('public-revenue');assert.equal(workReport(work).valid,true);
  assert.equal(work.steps[0].doc.data.reduce((a,r)=>a+r.value,0),416161);
  assert.equal(work.steps[0].doc.data[3].value,35686);assert.equal(work.steps[0].doc.data[0]._extra['2'],'2025');
  for(const step of work.steps)assert.deepEqual(step.doc.data,work.steps[0].doc.data);
  assert.equal(transitionPlan(work.steps[0],work.steps[1]).mode,'morph');
  assert.doesNotMatch(work.steps[0].doc.title,/[\u3400-\u9fff]/);setLocale('zh-CN');
});
test('NIST original measurements reproduce the published baseline without inventing physical units',()=>{
  setLocale('en');const work=presetWork('public-process'),doc=work.steps[0].doc,s=imr10(doc.data);
  assert.equal(workReport(work).valid,true);assert.equal(doc.data.length,10);assert.equal(s.moving[0],null);
  assert.ok(Math.abs(s.mean-50.81)<1e-12);assert.ok(Math.abs(s.mrMean-16.9/9)<1e-12);assert.ok(Math.abs(s.high-55.8040898345)<1e-8);
  assert.equal(doc.unit,'Source units unspecified');assert.equal(transitionPlan(...work.steps).mode,'morph');
  const next=structuredClone(work.steps[1]);next.doc.data[0].value=50;assert.notEqual(transitionPlan(work.steps[0],next).mode,'morph');setLocale('zh-CN');
});
test('English public-example annotations retain words in the actual exported SVG',()=>{
 const win=new Window(),prior={document:globalThis.document,XMLSerializer:globalThis.XMLSerializer};
 Object.assign(globalThis,{document:win.document,XMLSerializer:win.XMLSerializer});setLocale('en');
 try{const work=presetWork('public-revenue'),step=work.steps[0];step.options.annotations=[newAnnotation(step.doc,{kind:'note',text:'Custom annotations preserve complete words.'})];const text=step.options.annotations[0].text,host=new win.DOMParser().parseFromString(stepSVG(step,work.steps,{longEdge:1080}),'image/svg+xml');
  const rendered=[...host.querySelectorAll('g[role=note] text')].map(n=>n.textContent).join(' ');assert.equal(rendered,text);
 }finally{Object.assign(globalThis,prior);setLocale('zh-CN');win.happyDOM.abort();}
});
test('narrow revenue axis separates full numeric tick labels without changing observations',()=>{
 const work=presetWork('public-revenue'),doc=morphDocument(work.steps[0]),layout=layoutMorph(doc,'bars',320,340,{axisLabels:true});
 const ticks=layout.labels.filter(l=>l.y===layout.plot.y+layout.plot.h+16);
 for(let i=1;i<ticks.length;i++)assert.ok(ticks[i].x-ticks[i-1].x>(ticks[i].text.length+ticks[i-1].text.length)*2.9+8);
 assert.deepEqual(layout.marks.map(m=>m.value),doc.data.map(r=>r.value));
});

test('donut totals fit the hole at preview and export sizes without rounding source values',()=>{
 const work=presetWork('public-revenue'),doc=morphDocument(work.steps[0]);
 for(const [w,h]of [[320,200],[640,220],[800,440],[1080,600]]){
  const layout=layoutMorph(doc,'donut',w,h),label=layout.labels.find(l=>l.centerTotal),{cx,cy,r0}=layout.marks[0].geometry;
  assert.ok(label);assert.equal(label.text,'416,161');assert.ok(label.fontSize<=24);
  assert.ok(Math.hypot(label.text.length*label.fontSize*.65/2,Math.abs(label.y-cy)+label.fontSize)<r0);
  assert.deepEqual(layout.marks.map(m=>m.value),doc.data.map(r=>r.value));
 }
});
test('public presets keep methodological notes outside the plot',()=>{
 for(const id of ['public-revenue','public-growth','public-penguins','public-process'])for(const s of presetWork(id).steps)assert.equal(s.options.annotations?.length||0,0);
 assert.equal(initialLocale({languages:['zh-CN']}),'en');assert.equal(initialLocale({}),'en');assert.equal(initialLocale({search:'?lang=zh'}),'zh-CN');
});

test('reopening beta.1 removes only untouched generated notes and retains data and custom annotations',()=>{
 const work=presetWork('public-revenue'),step=work.steps[0],note=newAnnotation(step.doc,{kind:'note',text:'同一财年的互斥收入类别；份额由原始金额计算。'});note.placement='top-left';note.when={start:.6,end:1};
 const edited={...structuredClone(note),id:'annotation:edited',text:'My own note'},moved={...structuredClone(note),id:'annotation:moved',position:{x:.8,y:.5}},retimed={...structuredClone(note),id:'annotation:retimed',when:{start:0,end:1}};
 step.options.annotations=[note,edited,moved,retimed];const restored=cleanWork(work);
 assert.deepEqual(restored.steps[0].options.annotations,[edited,moved,retimed]);assert.deepEqual(restored.steps[0].doc,step.doc);assert.equal(step.options.annotations.length,4);
 const ordinary=structuredClone(work);delete ordinary.steps[0].doc.provenance;assert.equal(cleanWork(ordinary).steps[0].options.annotations.length,4);
});
