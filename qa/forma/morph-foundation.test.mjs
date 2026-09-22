import {payload} from './payload.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';
import {layoutMorph,MorphChart,morphExample} from '../../src/forma/morph.js';
import {morphEligibility,pairRecipe} from '../../src/forma/morph-rules.js';
import {layoutSeries} from '../../src/forma/series-morph.js';
import {seriesDocument,seriesEligibility} from '../../src/forma/series-rules.js';
import {makeStep,newWork,morphReady,stepView,stepMorphDocument,presetWork,stepDomain,transitionPlan,replaceStepData,stepReport} from '../../src/forma/work-model.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {workTimeline,timelineFrame} from '../../src/forma/work-timeline.js';

const ids=['mosaic','circlepack','unit','step','diverging','polarline','groupedbarh','stackedbar','orbit','funnel','stream','stacked'];
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≠ ${b}`);
const doc=values=>({...structuredClone(morphExample),data:values.map((value,i)=>({label:`类别${i+1}`,value}))});

test('all eight requested templates and four suitable additions retain every native input row',()=>{
  for(const id of ids){const original=getExample(id),s=makeStep({doc:original});assert.equal(morphReady(s),true,id);const mapped=stepMorphDocument(s);assert.equal(mapped.data.length,original.data.length,id);assert.deepEqual(payload(s.doc),payload(original));assert.deepEqual(mapped.data.map(r=>r.value),original.data.map(r=>r.value));}
  const orbit=makeStep({doc:getExample('orbit')});assert.equal(stepMorphDocument(orbit).data.length,52);assert.equal(morphEligibility(stepMorphDocument(orbit),'columns').valid,false);assert.equal(morphEligibility(stepMorphDocument(orbit),'polarline').valid,true);
  const replaced=replaceStepData(presetWork('cyclic').steps[2],{doc:getExample('orbit')});
  assert.equal(stepReport(replaced).valid,true);assert.equal(replaced.view,'polarline');assert.deepEqual(payload(replaced.doc.data),payload(orbit.doc.data));
});

test('unit stacks retain zero and exact integer counts, and never approximate fractional or oversized counts',()=>{
  const d=doc([0,1,50,24]),layout=layoutMorph(d,'unit',800,390);
  for(const mark of layout.marks){assert.equal(mark.geometry.units.length,mark.value);assert.equal(mark.points.length,mark.value?mark.value*20:128);assert.ok(mark.points.every(p=>p.every(Number.isFinite)));}
  for(const bad of [1.2,-1,51,null])assert.equal(morphEligibility(doc([bad,3]),'unit').valid,false);
  assert.equal(morphEligibility(doc([0,0]),'unit').valid,true);
  const win=new Window(),chart=new MorphChart(win.document.createElement('div'),d,{view:'unit'});
  for(const p of [0,.2,.8,1]){chart.render(p);assert.doesNotMatch(chart.svg.outerHTML,/NaN|undefined|Infinity/);}
  chart.destroy();win.happyDOM.close();
});

test('irregular dates keep their true interval; step-after holds then changes at the next timestamp',()=>{
  const d=doc([12,18,null,9]);d.data.forEach((r,i)=>r.label=['2026-08-01','2026-08-03','2026-08-09','2026-08-11'][i]);
  const l=layoutMorph(d,'step',800,380),[a,b,c,last]=l.marks;
  near((b.geometry.cx-a.geometry.cx)/(last.geometry.cx-a.geometry.cx),.2);
  near(a.geometry.right[1],a.geometry.cy);near(a.geometry.right[0],b.geometry.cx);near(a.geometry.next[1],b.geometry.cy);
  near(b.geometry.right[0],b.geometry.cx);assert.ok(c.points.every(p=>p[0]===c.points[0][0]&&p[1]===c.points[0][1]));
});

test('cyclic traces close in order and radius encodes value, while diverging bars use equal signed scales',()=>{
  const d=doc([3,7,10,8]),polar=layoutMorph(d,'polarline',750,360);
  for(const [i,m] of polar.marks.entries()){near(m.geometry.radius/m.geometry.scale,m.value);const next=polar.marks[(i+1)%4];near(m.geometry.right[0],next.geometry.left[0]);near(m.geometry.right[1],next.geometry.left[1]);}
  const diverging=layoutMorph(doc([-8,16,-4,0]),'diverging',750,360);
  for(const m of diverging.marks){near((m.geometry.valueX-m.geometry.baseline)/m.geometry.scale,m.value);assert.ok(m.geometry.width>=0);}
  assert.equal(morphEligibility(doc([3,null,8]),'polarline').valid,false);
});

test('horizontal grouping, stacking and percent normalization preserve period-series identity',()=>{
  const work=presetWork('channel-comparison'),d=seriesDocument(work.steps[0]);
  for(const view of ['grouped-bars','stacked-bars','percent-bars']){
    const l=layoutSeries(d,view,800,390,{domain:stepDomain(work.steps[work.steps.findIndex(s=>s.view===view)],work.steps)});
    for(const period of new Set(d.data.map(r=>r.period))){const row=l.marks.filter(m=>m.period===period);
      row.forEach(m=>{near(m.geometry.width/m.geometry.scale,view==='percent-bars'?m.share*100:m.value);assert.equal(m.key,d.data.find(r=>r.period===period&&r.series===m.series)._id);});
      if(view==='percent-bars')near(row.reduce((n,m)=>n+m.geometry.width,0),l.plot.w);
      if(view!=='grouped-bars')for(let i=1;i<row.length;i++)near(row[i-1].geometry.x+row[i-1].geometry.width,row[i].geometry.x);
    }
  }
  const signed=seriesDocument(presetWork('series-change').steps[0]);assert.equal(seriesEligibility(signed,'grouped-bars').valid,true);assert.equal(seriesEligibility(signed,'stacked-bars').valid,false);
});

test('new transitions preserve nodes and exact endpoints when seeking in either direction',()=>{
  const win=new Window();
  try{for(const id of ['unit-counts','inventory','cyclic','channel-comparison','channels','cashflow','conversion']){
    const t=workTimeline(presetWork(id)),renderer=new WorkFrameRenderer(win.document.createElement('div'),t.work.steps,{width:800,height:360});
    try{for(const s of t.segments.slice(1)){
      assert.equal(s.plan.mode,'morph',`${id}:${s.index}`);
      renderer.render(timelineFrame(t,s.start));const nodes=[...renderer.scene.nodes.values()].map(n=>n.shape);
      const at=s.start+s.duration*.48;renderer.render(timelineFrame(t,at));const middle=[...renderer.scene.current];
      assert.doesNotMatch(renderer.scene.svg.outerHTML,/NaN|Infinity|undefined/);
      renderer.render(timelineFrame(t,s.settled));renderer.render(timelineFrame(t,at));assert.deepEqual([...renderer.scene.current],middle);
      assert.deepEqual([...renderer.scene.nodes.values()].map(n=>n.shape),nodes);
      renderer.render(timelineFrame(t,s.settled));for(const m of renderer.scene.layout.marks)assert.deepEqual(renderer.scene.current.get(m.key),m.points);
    }}finally{renderer.destroy();}
  }}finally{win.happyDOM.close();}
});

test('count transitions split a bar into actual unit runs and preserve native fallback for unsuitable data',()=>{
  const win=new Window(),d=doc([6,12,8]),chart=new MorphChart(win.document.createElement('div'),d,{view:'columns',width:800,height:360});
  try{const frame=chart.setDocument(d,'unit',{manual:true,effect:'guided',recipe:pairRecipe('columns','unit').id});frame(.5);assert.equal(chart.current.get('类别1').length,120);assert.equal(chart.nodes.get('类别1').shape.getAttribute('stroke-width'),'0');frame(1);assert.equal(chart.layout.marks[0].geometry.count,6);
    const invalid={...makeStep({doc:getExample('bar')}),view:'unit'};assert.equal(morphReady(invalid),false);
    assert.equal(transitionPlan(makeStep({doc:getExample('column')}),makeStep({doc:getExample('bullet')})).effect,'entrance');
  }finally{chart.destroy();win.happyDOM.close();}
});
