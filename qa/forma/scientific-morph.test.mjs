import {payload} from './payload.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';
import {scientificViews,scientificViewMap,scientificDocument,scientificEligibility,scientificFamily,scientificGuide} from '../../src/forma/scientific-rules.js';
import {viewName} from '../../src/forma/morph-sequence-player.js';
import {ScientificMorphChart,layoutScientific} from '../../src/forma/scientific-morph.js';
import {scientificPresets} from '../../src/forma/scientific-presets.js';
import {makeStep,newWork,presetWork,stepView,stepDomain,transitionPlan,morphReady,stepReport,replaceStepData,cleanWork} from '../../src/forma/work-model.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {workAgentBrief,stepSVG} from '../../src/forma/work-export.js';

const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const mapped=id=>scientificDocument({doc:getExample(id)});
const finite=layout=>{for(const m of layout.marks){assert.equal(m.points.length,layout.view.startsWith('distribution-')&&m.role==='density'?layout.density.curves[0].points.length*2:128);assert.ok(m.points.every(p=>p.every(Number.isFinite)),`${layout.view}/${m.key}`);}};
function caseWork(family){
  const doc=getExample(family==='observations'?'scatter':family==='samples'?'errorbar':'interval');
  if(family==='observations')doc.data.forEach(r=>r.group='实验组');
  return newWork(scientificViews.filter(v=>scientificFamily(v.id)===family).map(v=>({doc,view:v.id,dataGroup:'test:family'})));
}

test('all scientific native templates map their full schemas and encodings without dropping metadata',()=>{
  assert.equal(Object.keys(scientificViewMap).length,170);assert.equal(scientificViews.length,286);scientificViews.forEach(v=>assert.equal(viewName(v.id),v.name));
  for(const template of Object.keys(scientificViewMap)){
    const doc=getExample(template),s=makeStep({doc}),d=scientificDocument(s);assert.equal(morphReady(s),true,template);assert.equal(d.data.length,doc.data.length);for(const [field,value]of Object.entries(doc))assert.deepEqual(payload(s.doc[field]),payload(value),template+': '+field);d.data.forEach((r,i)=>assert.equal(r.inputIndex??r.row,i));
    finite(layoutScientific(d,stepView(s),800,410));finite(layoutScientific(d,stepView(s),300,240));
  }
  for(const family of ['observations','samples','estimates']){const w=caseWork(family);assert.deepEqual(cleanWork(w).steps.map(s=>s.doc),w.steps.map(s=>s.doc));w.steps.forEach(s=>assert.equal(stepReport(s).valid,true));}
});

test('data eligibility refuses invented size, pooled regression, missing samples and invalid intervals',()=>{
  const d=mapped('xy');assert.equal(scientificEligibility(d,'obs-bubble').valid,false);assert.equal(scientificEligibility(d,'obs-regression').valid,true);
  d.data.forEach(r=>r.x=4);assert.equal(scientificEligibility(d,'obs-confidence').valid,false);
  const bubble=mapped('scatter');assert.equal(scientificEligibility(bubble,'obs-regression').valid,false);bubble.data[0].size=0;assert.equal(scientificEligibility(bubble,'obs-bubble').valid,false);
  const raw=mapped('errorbar');raw.data=raw.data.filter((r,i)=>raw.data.filter(x=>x.group===r.group).indexOf(r)<3);assert.equal(scientificEligibility(raw,'sample-sd').valid,true);assert.equal(scientificEligibility(raw,'sample-violin').valid,false);raw.data[0].value=null;assert.equal(scientificEligibility(raw,'sample-box').valid,false);
  assert.match(scientificGuide(mapped('errorbar'),'sample-box').join(' '),/每组 3–60/);
  const ci=mapped('forest');ci.data[0].low=0;assert.equal(scientificEligibility(ci,'estimate-horizontal').valid,false);ci.data[0].low=ci.data[0].estimate+1;assert.equal(scientificEligibility(ci,'estimate-points').valid,false);
});

test('scatter retains coordinates and bubble area is exactly proportional to the real size',()=>{
  const w=caseWork('observations'),d=scientificDocument(w.steps[0]),domain=stepDomain(w.steps[0],w.steps);
  const a=layoutScientific(d,'obs-scatter',780,400,{domain}),b=layoutScientific(d,'obs-bubble',780,400,{domain});
  const first=b.marks.find(m=>m.role==='sample'),r0=d.data[first.row];
  for(const m of b.marks.filter(m=>m.role==='sample')){const old=a.marks.find(x=>x.key===m.key),r=d.data[m.row];assert.deepEqual(m.point,old.point);near(m.radius**2/first.radius**2,r.size/r0.size);near(b.scales.x.invert(m.point[0]),r.x);near(b.scales.y.invert(m.point[1]),r.y);}
});

test('OLS and mean-response CI are derived from actual observations; a perfect line has zero-width CI',()=>{
  const d=mapped('regression');d.data=Array.from({length:8},(_,i)=>({label:`S${i}`,group:'观测',row:i,x:i+1,y:2+3*(i+1)}));
  const l=layoutScientific(d,'obs-confidence',760,400);near(l.fit.slope,3);near(l.fit.intercept,2);near(l.fit.sd,0);near(l.fit.r2,1);near(l.fit.interval(4).upper,l.fit.interval(4).lower);
  assert.equal(l.marks.filter(m=>m.role==='sample').length,8);l.marks.filter(m=>m.role==='sample').forEach(m=>near(l.scales.y.invert(m.point[1]),d.data[m.row].y));
  const constant=structuredClone(d);constant.data.forEach(r=>r.y=5);const fitted=layoutScientific(constant,'obs-confidence');assert.equal(fitted.fit.r2,null);finite(fitted);
});

test('raw samples, quartiles, SD and common-bandwidth density retain duplicates and outliers',()=>{
  const d=mapped('errorbar');d.data=['A','B'].flatMap((group,g)=>Array.from({length:20},(_,i)=>({label:`${group}${i}`,sampleName:`${group}${i}`,row:g*20+i,group,value:i+1})));
  for(const view of scientificViews.filter(v=>scientificFamily(v.id)==='samples')){
    const l=layoutScientific(d,view.id,800,430);finite(l);assert.equal(l.marks.filter(m=>m.role==='sample').length,40);
    for(const s of l.statistics){near(s.q1,5.75);near(s.median,10.5);near(s.q3,15.25);near(s.mean,10.5);near(s.sd,Math.sqrt(35));assert.equal(s.low,1);assert.equal(s.high,20);}
    l.marks.filter(m=>m.role==='sample').forEach(m=>near(l.scales.value.invert(m.point[['sample-swarm','sample-raincloud','sample-ridge'].includes(view.id)?0:1]),d.data[m.row].value));
    for(const series of l.density.series){const integral=series.points.slice(1).reduce((sum,p,i)=>sum+(p.x-series.points[i].x)*(p.density+series.points[i].density)/2,0);near(integral,1,.001);}
  }
  d.data[0].value=200;d.data[1].value=3;const out=layoutScientific(d,'sample-box');assert.ok(out.statistics[0].outliers.includes(200));assert.equal(out.marks.filter(m=>m.role==='sample').length,40);
});

test('migrated sample IDs survive reordering and value changes; labelled samples retain identity',()=>{
  const doc=getExample('raincloud'),a=makeStep({doc,dataGroup:'samples'}),b=makeStep({doc,dataGroup:'samples',view:'sample-box'});b.doc.data.reverse();assert.equal(transitionPlan(a,b).matched.length,doc.data.length);
  b.doc.data[0].value+=.001;assert.equal(transitionPlan(a,b).matched.length,doc.data.length);
  const labels=makeStep({doc:getExample('errorbar'),dataGroup:'labels'}),next=makeStep({...labels,view:'sample-box'});next.doc.data[0].value+=10;assert.equal(transitionPlan(labels,next).matched.length,labels.doc.data.length);
  const equal=structuredClone(doc);equal.data[1]={...equal.data[0]};const mapped=scientificDocument({doc:equal});assert.equal(new Set(mapped.data.map(r=>r.label)).size,equal.data.length);
});

test('all 48 ordered directions keep actual nodes and reversible exact geometry, including A to C',()=>{
  const win=new Window();let directions=0;
  for(const family of ['observations','samples','estimates']){
    const work=caseWork(family);
    for(const a of work.steps)for(const b of work.steps){if(a.id===b.id)continue;directions++;const plan=transitionPlan(a,b,{steps:work.steps});assert.equal(plan.mode,'morph');
      const chart=new ScientificMorphChart(win.document.createElement('div'),scientificDocument(a),{view:stepView(a),width:760,height:390,domain:stepDomain(a,work.steps)}),identities=new Map([...chart.nodes].map(([k,n])=>[k,n.shape]));
      const seek=chart.setDocument(scientificDocument(b),stepView(b),{manual:true,effect:plan.effect,recipe:plan.recipe,domain:stepDomain(b,work.steps)});
      seek(.41);const middle=structuredClone([...chart.current]);seek(1);seek(.41);assert.deepEqual([...chart.current],middle);seek(1);chart.layout.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));
      for(const [k,node]of identities)assert.equal(chart.nodes.get(k).shape,node);finite(chart.layout);chart.destroy();
    }
  }
  assert.equal(directions,48);win.happyDOM.close();
});

test('interval bounds and logarithmic reference are preserved; sample size never changes marker area',()=>{
  const d=mapped('forest'),layouts=['estimate-points','estimate-horizontal','estimate-vertical'].map(v=>layoutScientific(d,v,800,430));
  for(const l of layouts){finite(l);assert.equal(l.scales.value(1),l.guides.find(g=>g.major)[l.view==='estimate-vertical'?'y1':'x1']);const dots=l.marks.filter(m=>m.role==='point');assert.ok(dots.every(m=>m.radius===dots[0].radius));dots.forEach(m=>near(l.scales.value.invert(m.point[l.view==='estimate-vertical'?1:0]),d.data[m.row].estimate));}
  const log=layouts[1].scales.value;near(log(2)-log(1),log(1)-log(.5));assert.equal(layouts[0].marks.find(m=>m.role==='range').opacity,0);
  const small=layoutScientific(d,'estimate-vertical',300,240),names=small.labels.filter(l=>l.fullText);assert.equal(new Set(names.map(l=>l.text)).size,d.data.length);assert.deepEqual(names.map(l=>l.fullText),d.data.map(r=>r.label));
  const win=new Window(),chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:'estimate-vertical',width:300,height:240});assert.match(chart.guideLayer.textContent,/对数轴/);chart.destroy();win.happyDOM.close();
});

test('scientific transitions reject mismatched axes, interval definitions, scales and independent sources',()=>{
  const w=caseWork('observations'),a=w.steps[0],b=w.steps[1];b.doc.axes.x='另一种指标 / 秒';assert.equal(transitionPlan(a,b).effect,'entrance');assert.match(transitionPlan(a,b).reason,/含义/);
  const e=caseWork('estimates'),f=e.steps[0],g=e.steps[1];g.doc.intervalLabel='另一个统计区间';assert.equal(transitionPlan(f,g).effect,'entrance');assert.match(transitionPlan(f,g).reason,/区间定义/);
  const independent=makeStep({doc:f.doc,view:f.view});assert.equal(transitionPlan(f,independent).effect,'entrance');
  const own=caseWork('samples');const bounds=stepDomain(own.steps[0],own.steps);own.steps.forEach(s=>assert.deepEqual(stepDomain(s,own.steps),bounds));own.steps[0].scale='step';assert.equal(stepDomain(own.steps[0],own.steps),undefined);
});

test('new scenes use the shared video frame engine, native entrance, save, SVG and full Agent manual',t=>{
  const win=new Window(),previous=new Map();for(const [k,value] of Object.entries({document:win.document,XMLSerializer:win.XMLSerializer})){previous.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});}t.after(()=>{for(const [k,d]of previous){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}});
  for(const preset of scientificPresets){
    const work=presetWork(preset.id),a=work.steps[0],b=work.steps.at(-1),host=win.document.createElement('div'),renderer=new WorkFrameRenderer(host,work.steps,{width:700,height:380});
    renderer.render({step:a,index:0,phase:'entrance',progress:0});const first=host.innerHTML;renderer.render({step:a,index:0,phase:'entrance',progress:1});assert.notEqual(host.innerHTML,first);
    const frame={from:a,step:b,index:work.steps.length-1,phase:'transition',progress:.43,plan:transitionPlan(a,b,{steps:work.steps})};renderer.render(frame);const mid=host.innerHTML;renderer.render({...frame,progress:1});renderer.render(frame);assert.equal(host.innerHTML,mid);renderer.destroy();
    const svg=stepSVG(b,work.steps);assert.match(svg,new RegExp(`data-view="${b.view}"`));assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);assert.deepEqual(cleanWork(work).steps[0].doc,a.doc);
    const brief=workAgentBrief(work);if(a.view.startsWith('obs-'))assert.match(brief,/Student t/);else if(a.view.startsWith('sample-'))assert.match(brief,/不是 SEM/);else assert.match(brief,/区间定义/);assert.ok(brief.includes(JSON.stringify(b.doc.data[0].label||b.doc.data[0].group)));
  }
  const bubble=caseWork('observations').steps[1],replacement=replaceStepData(bubble,{doc:getExample('xy')});assert.equal(replacement.view,undefined);assert.equal(stepView(replacement),'obs-scatter');assert.equal(replacement.doc.data.length,42);win.happyDOM.close();
});
