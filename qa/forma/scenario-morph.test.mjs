import {layoutScientific} from '../../src/forma/scientific-morph.js';
import {scientificDocument,isScientificView} from '../../src/forma/scientific-rules.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {MorphChart,layoutMorph,morphExample,morphViews} from '../../src/forma/morph.js';
import {morphEligibility,signedViews} from '../../src/forma/morph-rules.js';
import {layoutPaired} from '../../src/forma/paired-morph.js';
import {layoutHierarchy} from '../../src/forma/hierarchy-morph.js';
import {relationalDocument,isPairedView,isHierarchyView} from '../../src/forma/relational-rules.js';
import {layoutSeries} from '../../src/forma/series-morph.js';
import {seriesDocument,isSeriesView} from '../../src/forma/series-rules.js';
import {scenarioPresets,morphBaseDocument} from '../../src/forma/scenario-presets.js';
import {presetWork,morphDocument,stepView,stepDomain,transitionPlan,makeStep,newWork,cleanWork,workReport} from '../../src/forma/work-model.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const finite=layout=>{for(const m of layout.marks){assert.equal(m.points.length,layout.view==='unit'&&m.value?m.value*20:layout.view.startsWith('distribution-')&&m.role==='density'?layout.density.curves[0].points.length*2:128);assert.ok(m.points.every(p=>p.every(Number.isFinite)),`${layout.view}/${m.key}`);}};
const doc=values=>({...structuredClone(morphExample),data:values.map((value,i)=>({label:`项目${i+1}`,value}))});

test('scenario presets own suitable independent data and remain valid in every step',()=>{
  assert.equal(scenarioPresets.length,164);
  const data=[];
  for(const p of scenarioPresets){const work=presetWork(p.id);assert.equal(workReport(work).valid,true,p.id);data.push(JSON.stringify(work.steps[0].doc.data));
    for(const step of work.steps)finite(isScientificView(stepView(step))?layoutScientific(scientificDocument(step),stepView(step),380,260):isPairedView(stepView(step))?layoutPaired(relationalDocument(step),stepView(step),380,260):isHierarchyView(stepView(step))?layoutHierarchy(relationalDocument(step),stepView(step),380,260):isSeriesView(stepView(step))?layoutSeries(seriesDocument(step),stepView(step),380,260):layoutMorph(morphDocument(step),stepView(step),380,260));
    const original=work.steps[1].doc.data[0].value;work.steps[0].doc.data[0].value=900;assert.equal(work.steps[1].doc.data[0].value,original);
  }
  assert.equal(new Set(data).size,scenarioPresets.length);
  const monthly=presetWork('monthly');assert.equal(monthly.steps[0].doc.data.length,12);assert.equal(monthly.steps[0].doc.data[4].value,null);
  const stages=presetWork('conversion').steps[0].doc.data;assert.ok(stages.every((r,i)=>i===0||r.value<=stages[i-1].value));
});

test('two to twenty-four observations render without discarding rows; radar still needs three axes',()=>{
  for(const n of [2,12,24])for(const view of morphViews){const d=doc(Array.from({length:n},(_,i)=>view.id==='funnel-bars'?n-i:i+1));if(n===2&&view.id==='radar'||n===24&&view.id==='unit'){assert.equal(morphEligibility(d,view.id).valid,false);continue;}const l=layoutMorph(d,view.id,900,400);finite(l);assert.equal(l.marks.length,n);}
  assert.equal(morphEligibility(doc(Array(25).fill(1)),'columns').valid,false);
});

test('signed values and zeros use a real common zero baseline without negative rectangle dimensions',()=>{
  const d=doc([-12,0,24,9]);
  for(const view of signedViews){const l=layoutMorph(d,view,800,350);finite(l);for(const m of l.marks){const g=m.geometry;
    if(view==='bars'){near((g.valueX-g.baseline)/g.scale,m.value);assert.ok(g.width>=0);}
    if(view==='columns'){near((g.baseline-g.valueY)/g.scale,m.value);assert.ok(g.height>=0);}
    if(view==='line'||view==='area'||view==='lollipop')near((g.baseline-g.cy)/g.scale,m.value);
    if(view==='dot')near((g.cx-g.baseline)/g.scale,m.value);
  }}
  for(const view of ['pie','donut','waffle','radar','waterfall','funnel'])assert.equal(morphEligibility(d,view).valid,false,view);
  for(const view of signedViews)finite(layoutMorph(doc([0,0]),view,700,300));
  assert.equal(morphEligibility(doc([0,0]),'pie').valid,false);
});

test('missing observations keep empty geometry and break both neighboring line segments',()=>{
  const d=doc([5,10,null,20,15]),line=layoutMorph(d,'line',800,350),area=layoutMorph(d,'area',800,350);
  for(const l of [line,area]){finite(l);const gap=l.marks[2];assert.equal(gap.value,null);assert.ok(gap.points.every(p=>p[0]===gap.points[0][0]&&p[1]===gap.points[0][1]));near(l.marks[1].geometry.right[0],l.marks[1].geometry.cx);near(l.marks[3].geometry.left[0],l.marks[3].geometry.cx);}
  assert.equal(morphEligibility(d,'pie').valid,false);assert.equal(morphBaseDocument(d).data[2].value,null);
});

test('unrelated sources cannot morph by matching names alone; explicit correspondence still respects units',()=>{
  const a=makeStep({doc:morphBaseDocument(doc([1,2,3])) ,view:'columns'}),b=makeStep({doc:a.doc,view:'line'});
  assert.notEqual(a.dataGroup,b.dataGroup);assert.equal(transitionPlan(a,b).effect,'entrance');
  b.relation='related';assert.equal(transitionPlan(a,b).mode,'morph');assert.equal(transitionPlan(a,b).recipe,'endpoints');
  b.doc.unit='件';assert.equal(transitionPlan(a,b).mode,'gather');b.doc.unit=a.doc.unit;b.relation='separate';assert.equal(transitionPlan(a,b).mode,'gather');
});

test('shared axes cover every related step and explicit scale opt-out survives serialization',()=>{
  const w=presetWork('comparison'),a=w.steps[0],b=w.steps[1];assert.deepEqual(stepDomain(a,w.steps),stepDomain(b,w.steps));assert.equal(stepDomain(a,w.steps)[1],103);
  b.dataGroup='independent';b.relation='related';assert.deepEqual(stepDomain(a,w.steps),stepDomain(b,w.steps));
  b.scale='step';const saved=cleanWork(w);assert.equal(stepDomain(saved.steps[1],saved.steps),undefined);assert.equal(saved.steps[1].relation,'related');assert.equal(saved.steps[1].dataGroup,'independent');
  assert.equal(workReport(newWork([{doc:morphBaseDocument(doc(Array(24).fill(2))),view:'columns'}])).valid,true);
});

test('guided column-line transition passes through endpoints and lands on exact target geometry',()=>{
  const win=new Window(),host=win.document.createElement('div'),queue=new Map();let serial=0;
  win.requestAnimationFrame=f=>{queue.set(++serial,f);return serial;};win.cancelAnimationFrame=id=>queue.delete(id);
  const advance=t=>{const callbacks=[...queue.values()];queue.clear();callbacks.forEach(f=>f(t));};
  const d=doc([12,18,9]),chart=new MorphChart(host,d,{width:800,height:350,view:'columns',reducedMotion:false});
  const node=host.querySelector('[data-key="项目1"]');chart.setDocument(d,'line',{effect:'guided',recipe:'endpoints',duration:1000});advance(0);advance(450);
  const points=chart.current.get('项目1'),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);assert.ok(Math.max(...xs)-Math.min(...xs)<=6.001);assert.ok(Math.max(...ys)-Math.min(...ys)<=6.001);
  advance(1000);assert.equal(host.querySelector('[data-key="项目1"]'),node);for(const m of chart.layout.marks)assert.deepEqual(chart.current.get(m.key),m.points);
  chart.destroy();win.happyDOM.close();
});

test('an invalid dataset for the current shape does not replace an existing rendered document',()=>{
  const win=new Window(),host=win.document.createElement('div'),chart=new MorphChart(host,doc([1,2,3]),{view:'pie'}),before=chart.doc;
  assert.throws(()=>chart.setData(doc([-1,2,3])));assert.equal(chart.doc,before);assert.equal(chart.view,'pie');chart.destroy();win.happyDOM.close();
});
