import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';
import {recordId} from '../../src/forma/data-identity.js';
import {exploratoryViews,exploratoryViewMap,exploratoryEligibility} from '../../src/forma/exploratory-rules.js';
import {exploratoryRecords,exploratoryPresets} from '../../src/forma/exploratory-presets.js';
import {scientificDocument,scientificEligibility} from '../../src/forma/scientific-rules.js';
import {ScientificMorphChart,layoutScientific} from '../../src/forma/scientific-morph.js';
import {SeriesMorphChart,layoutSeries} from '../../src/forma/series-morph.js';
import {seriesDocument} from '../../src/forma/series-rules.js';
import {newWork,presetWork,makeStep,stepView,stepDomain,transitionPlan,morphReady,cleanWork,workReport,recommendedTransitions} from '../../src/forma/work-model.js';
import {previewDataSync,applyDataSync,undoDataSync} from '../../src/forma/work-data-sync.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {workTimeline,timelineFrame} from '../../src/forma/work-timeline.js';
import {workAgentBrief,stepSVG} from '../../src/forma/work-export.js';
import {viewName,viewIcon} from '../../src/forma/morph-sequence-player.js';
import {compactContour} from '../../src/forma/scientific-geometry.js';
import {valueColorFor} from '../../src/forma/color-semantics.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const area=m=>Math.abs(m.points.reduce((s,p,i)=>{const q=m.points[(i+1)%m.points.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2);
const finite=l=>{assert.ok(l.plot.w>0&&l.plot.h>0);for(const m of l.marks){assert.equal(m.points.length,128);assert.ok(m.points.every(p=>p.every(Number.isFinite)),`${l.view}/${m.key}`);if(m.opacity!==0)for(const [x,y]of m.points){assert.ok(x>=-1&&x<=l.w+1,`${l.view} x=${x}`);assert.ok(y>=-1&&y<=l.h+1,`${l.view} y=${y}`);}}};
const mapped=s=>s.view==='small-multiples'||s.view==='multi-line'||s.view==='grouped-columns'?seriesDocument(s):scientificDocument(s);
const layout=s=>s.view==='small-multiples'||s.view==='multi-line'||s.view==='grouped-columns'?layoutSeries:layoutScientific;

test('five coherent presets and expanded numeric matrix views retain native source fields',()=>{
 assert.equal(exploratoryViews.length,14);assert.equal(exploratoryPresets.length,7);
 for(const id of [...Object.keys(exploratoryViewMap),'smallmultiples']){const original=getExample(id),step=makeStep({doc:original});assert.ok(morphReady(step),id);assert.equal(step.doc.data.length,original.data.length);for(const key of Object.keys(original.data[0]))assert.deepEqual(step.doc.data.map(r=>r[key]),original.data.map(r=>r[key]));}
 for(const p of exploratoryPresets){const work=presetWork(p.id);assert.ok(workReport(work).valid,p.id);assert.deepEqual(cleanWork(work),work);assert.ok(recommendedTransitions(work.steps[0]).length);for(const s of work.steps){assert.equal(viewName(s.view),s.view==='small-multiples'?'共尺分面折线':viewName(s.view));assert.match(viewIcon(s.view),/<path|<circle/);for(const [w,h]of [[800,440],[300,260],[300,155]])finite(layout(s)(mapped(s),s.view,w,h,{domain:stepDomain(s,work.steps)}));}}
});
test('matrix cell identities survive rename/reorder; bubbles preserve exact area ratios, zeros and missingness',()=>{
 const w=newWork(exploratoryRecords('matrix-encoding')),d=scientificDocument(w.steps[0]),a=layoutScientific(d,'matrix-heatmap'),b=layoutScientific(d,'matrix-bubbles');
 const cells=b.marks.filter(m=>m.role==='cell'),positive=cells.filter(m=>m.value>0);for(const m of positive)near(area(m)/area(positive[0]),m.value/positive[0].value);
 assert.equal(area(cells.find(m=>m.value===0)),0);assert.ok(b.labels.some(l=>l.text==='0'));
 assert.ok(b.marks.some(m=>m.role==='missing-a'&&m.opacity>0));assert.equal(cells.filter(m=>m.value===null).length,d.data.filter(r=>r.value===null).length);
 const renamed=structuredClone(d);renamed.data.reverse();renamed.data.forEach(r=>{if(r.rowName===d.data[0].rowName)r.rowName='新名称';});const c=layoutScientific(renamed,'matrix-bubbles');assert.deepEqual(new Set(c.marks.map(m=>m.key)),new Set(b.marks.map(m=>m.key)));
 d.data[0].value=-4;assert.ok(scientificEligibility(d,'matrix-heatmap').valid);assert.equal(scientificEligibility(d,'matrix-bubbles').valid,false);assert.equal(d.data[0].value,-4);
 assert.deepEqual(new Set(a.marks.map(m=>m.key)),new Set(b.marks.map(m=>m.key)));
});
test('ordered intervals use actual dates, never bridge missing estimates or recompute uncertainty',()=>{
 const w=presetWork('uncertainty-over-time'),d=scientificDocument(w.steps[0]),l=layoutScientific(d,'ordered-estimate-band'),missing=d.data.find(r=>r.estimate===null),id=recordId(missing);
 assert.ok(l.marks.filter(m=>m.key.includes(id)&&['trend','interval','estimate'].includes(m.role)).every(m=>m.opacity===0));
 for(const r of d.data.filter(r=>r.estimate!==null)){const mark=l.marks.find(m=>m.role==='estimate'&&m.row===r.row);near(mark.anchor[0],l.scales.x(Date.parse(r.period)));near(mark.anchor[1],l.scales.y(r.estimate));}
 const changed=structuredClone(w.steps[1]);changed.doc.intervalLabel='另一种区间';assert.equal(transitionPlan(w.steps[0],changed).mode,'gather');
 const shuffled=structuredClone(d);shuffled.data.reverse();const result=layoutScientific(shuffled,'ordered-estimate-band');assert.deepEqual(new Map(result.marks.map(m=>[m.key,m.points])),new Map(l.marks.map(m=>[m.key,m.points])));
});
test('time paths use chronological dates and projections preserve every object and axis meaning',()=>{
 const t=scientificDocument(presetWork('time-path').steps[0]),first=layoutScientific(t,'trajectory-path');t.data.reverse();const reordered=layoutScientific(t,'trajectory-path');assert.deepEqual(new Map(reordered.marks.map(m=>[m.key,m.points])),new Map(first.marks.map(m=>[m.key,m.points])));
 const w=presetWork('spatial-projections'),d=scientificDocument(w.steps[0]);let keys;
 for(const s of w.steps){const l=layoutScientific(d,s.view),now=l.marks.map(m=>m.key).sort();if(keys)assert.deepEqual(now,keys);keys=now;assert.equal(l.marks.length,d.data.length);for(const m of l.marks){const r=d.data[m.row];assert.ok(m.tooltip.includes(r.label));assert.ok(m.tooltip.includes(d.axes.z));}}
 const changed=structuredClone(w.steps[1]);changed.doc.axes.x='另一种指标';assert.equal(transitionPlan(w.steps[0],changed).mode,'gather');
 const duplicate=structuredClone(d);duplicate.data[1]._id=duplicate.data[0]._id;assert.equal(exploratoryEligibility(duplicate,'spatial-3d').valid,false);
});
test('every directed preset route has deterministic quarters, endpoint geometry, reverse and interrupted continuation',()=>{
 const win=new Window();let routes=0;
 for(const p of exploratoryPresets){const work=presetWork(p.id);for(const a of work.steps)for(const b of work.steps){if(a===b)continue;routes++;const plan=transitionPlan(a,b,{steps:work.steps});assert.equal(plan.mode,'morph',`${a.view}→${b.view}`);
  const C=p.id==='series-focus'?SeriesMorphChart:ScientificMorphChart,chart=new C(win.document.createElement('div'),mapped(a),{view:a.view,width:760,height:430,domain:stepDomain(a,work.steps)}),nodes=new Map([...chart.nodes].map(([k,n])=>[k,n.shape]));
  const seek=chart.setDocument(mapped(b),b.view,{manual:true,effect:plan.effect,recipe:plan.recipe,domain:stepDomain(b,work.steps)}),frames=[];
  for(const q of [0,.25,.5,.75,1]){seek(q);frames.push(structuredClone([...chart.current]));}
  assert.notDeepEqual(frames[1],frames[3],`${a.view}→${b.view} must change geometry`);seek(.25);assert.deepEqual([...chart.current],frames[1]);seek(1);for(const m of chart.layout.marks)assert.deepEqual(chart.current.get(m.key),m.points);
  seek(.5);const before=structuredClone([...chart.current]);const resume=chart.setDocument(mapped(a),a.view,{manual:true,resume:true,effect:'guided',domain:stepDomain(a,work.steps)});resume(0);assert.deepEqual([...chart.current],before);resume(.5);const mid=structuredClone([...chart.current]);resume(1);resume(.5);assert.deepEqual([...chart.current],mid);for(const [k,node]of nodes)assert.equal(chart.nodes.get(k).shape,node);chart.destroy();
 }}assert.equal(routes,40);win.happyDOM.close();
});
test('new family sync preserves style and rhythm, explicitly updates semantic metadata and is wholly undoable',()=>{
 for(const p of exploratoryPresets){const w=presetWork(p.id),source=w.steps[0];source.doc.unit='新单位';source.doc.source={type:'user',name:'真实输入来源'};const preview=previewDataSync(w,source.id),targets=preview.targets.filter(t=>t.eligible);assert.equal(targets.length,w.steps.length-1,p.id);
  const result=applyDataSync(w,preview,targets.map(t=>t.id));for(const s of result.work.steps){assert.equal(s.doc.unit,'新单位');assert.equal(s.doc.source.name,'真实输入来源');assert.deepEqual(s.options,w.steps.find(x=>x.id===s.id).options);assert.equal(s.duration,w.steps.find(x=>x.id===s.id).duration);}
  assert.deepEqual(undoDataSync(result.work,result.transaction),w);assert.deepEqual(cleanWork(result.work),result.work);
 }
});
test('new layouts participate in real frame renderer, SVG export and Agent explanation',()=>{
 const win=new Window(),oldDoc=globalThis.document,oldXML=globalThis.XMLSerializer;globalThis.document=win.document;globalThis.XMLSerializer=win.XMLSerializer;
 try{for(const p of exploratoryPresets){const w=presetWork(p.id),host=win.document.createElement('div'),renderer=new WorkFrameRenderer(host,w.steps,{width:800,height:440}),timeline=workTimeline(w),at=timeline.segments[1].start+timeline.segments[1].duration*.5;
   renderer.render(timelineFrame(timeline,at));const paths=[...host.querySelectorAll('[data-morph-shape]')].map(n=>n.getAttribute('d'));renderer.render(timelineFrame(timeline,0));renderer.render(timelineFrame(timeline,at));assert.deepEqual([...host.querySelectorAll('[data-morph-shape]')].map(n=>n.getAttribute('d')),paths);renderer.destroy();
   const svg=stepSVG(w.steps.at(-1),w.steps);assert.match(svg,new RegExp(`data-view="${w.steps.at(-1).view}"`));assert.match(workAgentBrief(w),new RegExp(w.steps.at(-1).view));
 }}finally{globalThis.document=oldDoc;globalThis.XMLSerializer=oldXML;win.happyDOM.close();}
});
test('SVG contour compaction retains repeated endpoint corners and interval pieces at missing gaps',()=>{
 const points=[[0,0],[0,0],[4,0],[4,2],[0,2],[0,2]],compact=compactContour(points);assert.deepEqual(compact,[[0,0],[4,0],[4,2],[0,2]]);
 const doc=scientificDocument(presetWork('uncertainty-over-time').steps[0]),l=layoutScientific(doc,'ordered-estimate-band');
 for(const m of l.marks.filter(m=>m.role==='interval'&&m.opacity)){const compact=compactContour(m.points);assert.ok(compact.length>=4);near(area({...m,points:compact}),area(m));assert.ok(m.entrance.every((p,i)=>p[0]===m.points[i][0]),'ribbon expands toward bounds without shrinking the time dimension');}
});
test('matrix and correlation glyph colors and legends share the exact configured numeric scale',()=>{
 const win=new Window(),valueColors={mode:'diverging',low:'#254f75',middle:'#f8f5ef',high:'#a45432',center:0};
 for(const [id,view]of [['matrix-encoding','matrix-heatmap'],['correlation-exploration','corr-heatmap']]){
  const work=presetWork(id),doc=scientificDocument(work.steps[0]),options={view,width:800,height:440,valueColors};const chart=new ScientificMorphChart(win.document.createElement('div'),doc,options);
  for(const m of chart.layout.marks.filter(m=>m.role==='cell'&&m.value!==null||m.role==='pair'&&m.tone!==null)){const domain=m.valueDomain||[-1,1],value=m.valueDomain?m.value:m.tone;assert.equal(chart.markColor(m),valueColorFor(options,value,domain,'fallback'));}
  const swatches=chart.svg.querySelectorAll('[data-value-color-swatch]');assert.ok(swatches.length>=40);assert.match(chart.svg.textContent,/参考中心 0/);assert.equal(swatches[0].getAttribute('fill'),valueColorFor(options,chart.layout.valueDomain?.[0]??-1,chart.layout.valueDomain||[-1,1],'fallback'));chart.destroy();
 }win.happyDOM.close();
});
