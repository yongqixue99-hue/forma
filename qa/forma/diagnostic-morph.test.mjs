import {payload} from './payload.mjs';
import {workTimeline,timelineFrame} from '../../src/forma/work-timeline.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';
import {diagnosticViews,diagnosticViewMap,diagnosticFamily,predictionStatistics,confusionStatistics} from '../../src/forma/diagnostic-rules.js';
import {diagnosticPresets} from '../../src/forma/diagnostic-presets.js';
import {scientificDocument,scientificEligibility,scientificGuide} from '../../src/forma/scientific-rules.js';
import {ScientificMorphChart,layoutScientific} from '../../src/forma/scientific-morph.js';
import {presetWork,makeStep,stepView,stepDomain,transitionPlan,morphReady,cleanWork,workReport} from '../../src/forma/work-model.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {workAgentBrief,stepSVG,workHTML} from '../../src/forma/work-export.js';
import {viewName,viewIcon} from '../../src/forma/morph-sequence-player.js';

const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const familyWork=family=>presetWork({method:'method-agreement',prediction:'prediction-diagnostics',confusion:'classification-diagnostics'}[family]);
const finite=layout=>{const keys=new Set();for(const m of layout.marks){assert.equal(m.points.length,128);assert.equal(m.entrance.length,128);assert.ok(m.points.concat(m.entrance).every(p=>p.every(Number.isFinite)),`${layout.view}/${m.key}`);assert.ok(!keys.has(m.key),m.key);keys.add(m.key);}};

test('three diagnostic batches expose twelve encodings, three native adapters and six complete presets',()=>{
  assert.equal(diagnosticViews.length,12);assert.equal(Object.keys(diagnosticViewMap).length,3);assert.equal(diagnosticPresets.length,6);
  for(const v of diagnosticViews){assert.equal(viewName(v.id),v.name);assert.match(viewIcon(v.id),/<path|<circle|<rect/);}
  for(const id of Object.keys(diagnosticViewMap)){const doc=getExample(id),s=makeStep({doc}),d=scientificDocument(s);assert.ok(morphReady(s),id);assert.deepEqual(payload(s.doc),payload(doc));assert.equal(d.data.length,doc.data.length);}
  for(const p of diagnosticPresets){const w=presetWork(p.id);assert.equal(workReport(w).valid,true);assert.deepEqual(cleanWork(w),w);for(const s of w.steps){const d=scientificDocument(s);assert.ok(scientificEligibility(d,s.view).valid);assert.match(scientificGuide(d,s.view).join(' '),/每行/);for(const [width,height]of [[800,440],[300,260],[300,155]])finite(layoutScientific(d,s.view,width,height));}}
});
test('agreement uses A minus B, sample SD and 1.96 limits; the same sample survives four layouts',()=>{
  const w=familyWork('method');w.steps.forEach(s=>s.doc.data=Array.from({length:6},(_,i)=>({label:`S${i}`,a:10+i,b:10})));
  const d=scientificDocument(w.steps[1]),l=layoutScientific(d,'method-bland'),s=l.statistics;near(s.bias,2.5);near(s.sd,Math.sqrt(3.5));near(s.lower,2.5-1.96*Math.sqrt(3.5));near(s.upper,2.5+1.96*Math.sqrt(3.5));
  for(const v of diagnosticViews.filter(v=>diagnosticFamily(v.id)==='method')){const own=layoutScientific(d,v.id);assert.equal(own.marks.filter(m=>m.role==='sample').length,6);assert.deepEqual(new Set(own.marks.map(m=>m.key)),new Set(l.marks.map(m=>m.key)));}
  w.steps[2].doc.methodLabels.reverse();assert.equal(transitionPlan(w.steps[0],w.steps[2]).effect,'entrance');
});
test('prediction errors retain signs and exact MAE/RMSE without refitting the input predictions',()=>{
  const rows=[{label:'A',observed:7,predicted:5},{label:'B',observed:1,predicted:4},{label:'C',observed:5,predicted:5},{label:'D',observed:9,predicted:8}];
  const original=structuredClone(rows),s=predictionStatistics(rows);assert.deepEqual(s.points.map(r=>r.error),[2,-3,0,1]);assert.deepEqual(s.points.map(r=>r.absolute),[2,3,0,1]);near(s.mae,1.5);near(s.rmse,Math.sqrt(3.5));near(s.bias,0);assert.deepEqual(rows,original);
  const w=familyWork('prediction'),d=scientificDocument(w.steps[0]);for(const step of w.steps){const l=layoutScientific(d,step.view);assert.equal(l.marks.filter(m=>m.role==='sample').length,d.data.length);for(const m of l.marks.filter(m=>m.role==='sample'))assert.ok(m.tooltip.includes(d.data[m.row].label));}
});
test('confusion normalization conserves counts, names the denominator and leaves empty prediction classes undefined',()=>{
  const rows=[{actual:'A',predicted:'A',count:8},{actual:'A',predicted:'B',count:2},{actual:'A',predicted:'C',count:0},{actual:'B',predicted:'A',count:3},{actual:'B',predicted:'B',count:7},{actual:'B',predicted:'C',count:0},{actual:'C',predicted:'A',count:1},{actual:'C',predicted:'B',count:4},{actual:'C',predicted:'C',count:0}],doc={...getExample('confusion'),data:rows},d=scientificDocument({doc}),s=confusionStatistics(rows);
  assert.equal(s.total,25);assert.equal(s.correct,15);near(s.accuracy,.6);for(const c of s.categories){near(s.cells.filter(r=>r.actual===c).reduce((n,r)=>n+r.rowShare,0),1);const col=s.cells.filter(r=>r.predicted===c);if(c==='C')assert.ok(col.every(r=>r.columnShare===null));else near(col.reduce((n,r)=>n+r.columnShare,0),1);}
  const column=layoutScientific(d,'confusion-columns');assert.ok(column.labels.some(l=>l.text==='无预测样本'));assert.match(column.details,/预测类别/);assert.ok(column.marks.filter(m=>m.value===0).every(m=>m.opacity===0));
  for(const v of ['confusion-counts','confusion-bubbles','confusion-rows','confusion-columns']){const l=layoutScientific(d,v);finite(l);assert.equal(l.marks.reduce((n,m)=>n+m.value,0),25);assert.equal(l.marks.length,9);const permuted=structuredClone(doc);permuted.data.reverse();const r=layoutScientific(scientificDocument({doc:permuted}),v);assert.deepEqual(new Set(l.marks.map(m=>m.key)),new Set(r.marks.map(m=>m.key)));}
  const bubble=layoutScientific(d,'confusion-bubbles'),positive=bubble.marks.filter(m=>m.value),area=m=>(Math.max(...m.points.map(p=>p[0]))-Math.min(...m.points.map(p=>p[0])))**2;for(const m of positive)near(area(m)/area(positive[0]),m.value/positive[0].value);
  const l=layoutScientific(d,'confusion-rows');for(const c of s.categories){const own=l.marks.filter(m=>JSON.parse(JSON.parse(m.key)[0])[1]===c),width=own.reduce((sum,m)=>sum+Math.max(...m.points.map(p=>p[0]))-Math.min(...m.points.map(p=>p[0])),0);near(width,l.plot.w);}
});
test('related diagnostic steps share limits without clipping changed measurements or count areas',()=>{
  for(const family of ['method','prediction','confusion']){const w=familyWork(family);if(family==='method')w.steps[1].doc.data[0].a=300;else if(family==='prediction')w.steps[1].doc.data[0].observed=300;else w.steps[1].doc.data[0].count=300;
    const domain=stepDomain(w.steps[0],w.steps);for(const step of w.steps){assert.deepEqual(stepDomain(step,w.steps),domain);const l=layoutScientific(scientificDocument(step),step.view,800,440,{domain});finite(l);for(const m of l.marks.filter(m=>m.opacity>0))for(const [x,y]of m.points){assert.ok(x>=0&&x<=800,`${step.view} x=${x}`);assert.ok(y>=0&&y<=440,`${step.view} y=${y}`);}}
  }
});
test('compact confusion views retain category meaning and distinguish long category names',()=>{
  const names=['设备检测类别甲','设备检测类别乙','设备检测类别丙','设备检测类别丁','设备检测类别戊','设备检测类别己'];
  const doc={...getExample('confusion'),data:names.flatMap((actual,i)=>names.map((predicted,j)=>({actual,predicted,count:i===j?20:1})))},d=scientificDocument({doc});
  for(const view of ['confusion-counts','confusion-bubbles','confusion-rows','confusion-columns']){
    const l=layoutScientific(d,view,340,200);finite(l);
    for(const name of names)assert.ok(l.labels.some(label=>label.fullText===name),`${view} loses ${name}`);
    const categoryLabels=l.labels.filter(label=>label.fullText);assert.equal(new Set(categoryLabels.map(label=>label.text)).size,names.length);
    if(view==='confusion-counts'||view==='confusion-bubbles')assert.ok(l.labels.some(label=>label.text==='预测类别'));
    else assert.equal(l.groupLabels.length,names.length);
  }
});
test('limits never truncate raw observations and degenerate numeric ranges stay finite',()=>{
  const method=scientificDocument({doc:getExample('blandaltman')}),prediction=scientificDocument({doc:getExample('residual')});assert.equal(scientificEligibility(method,'method-pairs').valid,false);assert.equal(scientificEligibility(prediction,'prediction-ranked').valid,false);assert.equal(prediction.data.length,54);assert.equal(method.data.length,36);
  for(const family of ['method','prediction']){const w=familyWork(family);for(const s of w.steps){s.doc.data.forEach(r=>{if(family==='method'){r.a=5;r.b=5;}else{r.observed=0;r.predicted=0;}});const d=scientificDocument(s);assert.ok(scientificEligibility(d,s.view).valid);finite(layoutScientific(d,s.view));}}
  const count=scientificDocument({doc:getExample('confusion')});count.data[0].count=.5;assert.equal(scientificEligibility(count,'confusion-counts').valid,false);
});
test('all 36 directed routes retain glyph nodes and deterministic intermediate shapes, including reverse seeking',()=>{
  const win=new Window();let count=0;
  for(const family of ['method','prediction','confusion']){const w=familyWork(family);for(const a of w.steps)for(const b of w.steps){if(a===b)continue;count++;const plan=transitionPlan(a,b,{steps:w.steps});assert.equal(plan.mode,'morph',`${a.view}->${b.view}`);
    const chart=new ScientificMorphChart(win.document.createElement('div'),scientificDocument(a),{view:a.view,width:740,height:420,domain:stepDomain(a,w.steps)}),nodes=new Map([...chart.nodes].map(([k,n])=>[k,n.shape]));
    const seek=chart.setDocument(scientificDocument(b),b.view,{manual:true,effect:plan.effect,recipe:plan.recipe,domain:stepDomain(b,w.steps)});seek(.38);const middle=structuredClone([...chart.current]);seek(1);seek(.38);assert.deepEqual([...chart.current],middle);seek(0);seek(1);
    chart.layout.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));for(const [k,node]of nodes)assert.equal(chart.nodes.get(k).shape,node);assert.doesNotMatch(chart.svg.outerHTML,/NaN|Infinity/);chart.destroy();
  }}assert.equal(count,36);win.happyDOM.close();
});
test('native-entry replay, copied data, standalone HTML and frame exports use the new diagnostic geometry',()=>{
  const win=new Window();for(const family of ['method','prediction','confusion']){const w=familyWork(family),host=win.document.createElement('div'),renderer=new WorkFrameRenderer(host,w.steps,{width:800,height:500});
    const timeline=workTimeline(w),render=t=>renderer.render(timelineFrame(timeline,t));render(0);const initial=host.innerHTML;render(600);assert.notEqual(host.innerHTML,initial);render(4800);const shapes=()=>[...host.querySelectorAll('[data-morph-shape]')].map(el=>[el.getAttribute('d'),el.getAttribute('fill'),el.getAttribute('fill-opacity')]),later=shapes();render(600);render(4800);assert.deepEqual(shapes(),later);assert.doesNotMatch(host.innerHTML,/NaN|Infinity|="undefined"/);renderer.destroy();
    const brief=workAgentBrief(w);assert.match(brief,w.steps[0].view.startsWith('method-')?/method-bland/:w.steps[0].view.startsWith('prediction-')?/prediction-ranked/:/confusion-columns/);assert.ok(brief.includes(w.steps[0].doc.title));assert.ok(brief.includes(String(w.steps[0].doc.data[0].count??w.steps[0].doc.data[0].a??w.steps[0].doc.data[0].observed)));assert.match(workHTML(w,'test engine'),/FormaWorkPlayer.mount/);
    const oldDocument=globalThis.document,oldSerializer=globalThis.XMLSerializer;globalThis.document=win.document;globalThis.XMLSerializer=win.XMLSerializer;try{const svg=stepSVG(w.steps[0],w.steps);assert.match(svg,/data-science-role/);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);}finally{globalThis.document=oldDocument;globalThis.XMLSerializer=oldSerializer;}
  }win.happyDOM.close();
});
