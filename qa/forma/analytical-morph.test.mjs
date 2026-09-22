import {payload} from './payload.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';
import {analyticalViews,analyticalViewMap,analyticalFamily,fixedBins} from '../../src/forma/analytical-rules.js';
import {analyticalPresets} from '../../src/forma/analytical-presets.js';
import {scientificDocument,scientificEligibility,scientificGuide} from '../../src/forma/scientific-rules.js';
import {ScientificMorphChart,layoutScientific} from '../../src/forma/scientific-morph.js';
import {presetWork,makeStep,newWork,stepView,stepDomain,transitionPlan,morphReady,cleanWork,replaceStepData,workReport} from '../../src/forma/work-model.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {workAgentBrief,stepSVG} from '../../src/forma/work-export.js';
import {viewName,viewIcon} from '../../src/forma/morph-sequence-player.js';
import {compactContour,segment} from '../../src/forma/scientific-geometry.js';
import {rectPoints,circlePoints} from '../../src/forma/morph.js';

const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const mapped=id=>scientificDocument({doc:getExample(id)});
const finite=layout=>{const keys=new Set();for(const m of layout.marks){assert.equal(m.points.length,128);assert.ok(m.points.every(p=>p.every(Number.isFinite)),`${layout.view}/${m.key}`);assert.ok(!keys.has(m.key),m.key);keys.add(m.key);}};
function familyWork(family){const doc=getExample({univariate:'histogram',evaluation:'calibration',correlation:'correlation'}[family]);return newWork(analyticalViews.filter(v=>analyticalFamily(v.id)===family).map(v=>({doc,view:v.id,dataGroup:'test:analysis'})));}

test('three batches expose twelve views and six native adapters with full editable source documents',()=>{
  assert.equal(analyticalViews.length,12);assert.equal(Object.keys(analyticalViewMap).length,6);assert.equal(analyticalPresets.length,6);
  for(const v of analyticalViews){assert.equal(viewName(v.id),v.name);assert.match(viewIcon(v.id),/<path|<circle/);}
  for(const template of Object.keys(analyticalViewMap)){
    const doc=getExample(template),step=makeStep({doc}),d=scientificDocument(step);assert.equal(morphReady(step),true,template);assert.deepEqual(payload(step.doc),payload(doc));assert.equal(d.data.length,doc.data.length);assert.equal(new Set(d.data.map(r=>r.label)).size,d.data.length);
    finite(layoutScientific(d,stepView(step),800,430));finite(layoutScientific(d,stepView(step),300,260));
  }
  for(const p of analyticalPresets){const w=presetWork(p.id);assert.equal(workReport(w).valid,true,p.id);assert.deepEqual(cleanWork(w),w);assert.match(scientificGuide(scientificDocument(w.steps[0]),stepView(w.steps[0])).join(' '),/每行/);}
});

test('fixed bins conserve every observation including ties, boundaries, negative and constant values',()=>{
  const rows=Array.from({length:25},(_,i)=>({value:i/2-6})),b=fixedBins(rows,6,[-6,6]);assert.equal(b.bins.reduce((s,r)=>s+r.count,0),rows.length);assert.equal(b.bins[0].count,4);assert.equal(b.bins.at(-1).count,5);near(b.bins.at(-1).probability,1);assert.equal(b.bins.at(-1).high,6);
  const equal=fixedBins(Array.from({length:30},()=>({value:0})),12);assert.ok(equal.domain[0]<0&&equal.domain[1]>0);assert.equal(equal.bins.reduce((s,r)=>s+r.count,0),30);
  const d=mapped('histogram');d.data=Array.from({length:24},(_,i)=>({row:i,label:`S${i}`,group:'分布',value:Math.floor(i/8)-1}));
  const l=layoutScientific(d,'uni-ecdf',800,430);assert.deepEqual(l.distribution.map(p=>p.count),[8,16,24]);assert.deepEqual(l.distribution.map(p=>p.probability),[1/3,2/3,1]);
  for(const m of l.marks.filter(m=>m.role==='observation')){near(l.scales.x.invert(m.points.reduce((s,p)=>s+p[0],0)/128),d.data[m.row].value);}
  assert.equal(l.marks.filter(m=>m.role==='observation').length,24);
});

test('shared bin edges and count scales are recomputed for the union of related steps, never clipped',()=>{
  const w=familyWork('univariate');w.steps[1].doc.data[0].value=-200;w.steps[2].doc.data[1].value=300;
  const domain=stepDomain(w.steps[0],w.steps);near(domain.value[0],-200);near(domain.value[1],300);
  for(const s of w.steps){assert.deepEqual(stepDomain(s,w.steps),domain);const l=layoutScientific(scientificDocument(s),stepView(s),750,400,{domain});assert.equal(l.histogram.bins.reduce((n,b)=>n+b.count,0),s.doc.data.length);near(l.histogram.domain[0],-200);near(l.histogram.domain[1],300);assert.ok(Math.max(...l.histogram.bins.map(b=>b.count))<=domain.count[1]);}
  w.steps[1].doc.binCount=8;assert.equal(transitionPlan(w.steps[0],w.steps[1]).effect,'entrance');assert.match(transitionPlan(w.steps[0],w.steps[1]).reason,/分箱/);
});

test('ROC ties, AUC concordance, AP and threshold identities retain their distinct meanings',()=>{
  const d=mapped('calibration');d.data=[['a',1,.9],['b',0,.8],['c',1,.8],['d',0,.6],['e',1,.6],['f',0,.4],['g',0,.2],['h',1,.1]].map(([sample,actual,score],row)=>({sample,label:JSON.stringify(['M',sample]),actual,score,model:'M',group:'M',row}));
  const roc=layoutScientific(d,'eval-roc',780,430),pr=layoutScientific(d,'eval-pr',780,430),threshold=layoutScientific(d,'eval-threshold',780,430),curve=roc.evaluations[0];
  const pos=d.data.filter(r=>r.actual),neg=d.data.filter(r=>!r.actual),expected=pos.reduce((sum,p)=>sum+neg.reduce((n,q)=>n+(p.score>q.score?1:p.score===q.score?.5:0),0),0)/(pos.length*neg.length);near(curve.auc,expected);assert.equal(curve.points.length,7);
  near(curve.ap,.25*1+.25*(2/3)+.25*(3/5)+.25*(4/8));
  const dots=roc.marks.filter(m=>m.role==='threshold-point');for(const m of dots){assert.ok(pr.marks.some(n=>n.key===m.key));assert.ok(threshold.marks.some(n=>n.key===m.key));}
  assert.equal(dots[0].opacity,0);assert.match(dots[0].tooltip,/未定义/);assert.ok(threshold.marks.find(m=>m.role==='threshold-run-a'&&m.index===1).opacity>0);
  const tRun=threshold.marks.find(m=>m.role==='threshold-run-a'&&m.index===2);assert.ok(Math.max(...tRun.points.map(p=>p[1]))-Math.min(...tRun.points.map(p=>p[1]))<2);
  const permuted=structuredClone(d);permuted.data.reverse();assert.deepEqual(layoutScientific(permuted,'eval-roc').evaluations[0].points,curve.points);
});

test('calibration needs actual probabilities, preserves empty bins, and never joins across gaps',()=>{
  const scores=mapped('roc');assert.equal(scientificEligibility(scores,'eval-calibration').valid,false);assert.match(scientificEligibility(scores,'eval-calibration').reason,/普通得分/);
  const d=mapped('calibration');d.bins=6;d.data=Array.from({length:12},(_,i)=>({row:i,label:`M-${i}`,sample:`S${i}`,model:'M',group:'M',actual:i%2,score:i<6?0:1}));
  const l=layoutScientific(d,'eval-calibration',800,440),bins=l.evaluations[0].bins;assert.equal(bins.filter(Boolean).length,2);assert.equal(bins[0].n,6);assert.equal(bins[5].n,6);near(bins[0].frequency,.5);near(bins[5].probability,1);
  assert.equal(l.marks.filter(m=>m.role==='calibration-bin'&&m.opacity).length,2);assert.equal(l.marks.filter(m=>m.role==='calibration-link'&&m.opacity).length,0);
  d.data[0].score=1.1;assert.equal(scientificEligibility(d,'eval-calibration').valid,false);
});

test('correlation signs, fixed scale, unique pairs, circle areas and constant variables are honest',()=>{
  const d=mapped('correlation');d.data=Array.from({length:8},(_,i)=>[['A',i],['B',i*2+3],['C',-i],['D',7]].map(([variable,value])=>({sample:`S${i}`,variable,value,label:JSON.stringify([`S${i}`,variable]),group:'相关系数',row:i*4+['A','B','C','D'].indexOf(variable)}))).flat();
  const heat=layoutScientific(d,'corr-heatmap'),bubble=layoutScientific(d,'corr-bubbles'),pairs=layoutScientific(d,'corr-pairs'),tri=layoutScientific(d,'corr-triangle');
  near(heat.matrix.matrix[0][1].coefficient,1);near(heat.matrix.matrix[0][2].coefficient,-1);assert.equal(heat.matrix.matrix[3][3].coefficient,null);assert.deepEqual(pairs.scales.x.domain(),[-1,1]);assert.equal(pairs.pairs.length,6);assert.ok(pairs.pairs.slice(-3).every(p=>p.coefficient===null));
  for(const p of pairs.marks.filter(m=>m.role==='pair')){assert.ok(heat.marks.some(m=>m.key===p.key));assert.ok(bubble.marks.some(m=>m.key===p.key));}
  assert.ok(tri.marks.filter(m=>m.role==='mirror').every(m=>m.opacity===0));assert.ok(pairs.marks.filter(m=>m.role==='mirror'||m.role==='diagonal').every(m=>m.opacity===0));
  for(const l of [heat,bubble,pairs,tri])finite(l);
  const reversed=structuredClone(d);reversed.data.reverse();const other=layoutScientific(reversed,'corr-triangle');assert.deepEqual(new Set(other.marks.filter(m=>m.role==='pair').map(m=>m.key)),new Set(tri.marks.filter(m=>m.role==='pair').map(m=>m.key)));
  const real=layoutScientific(mapped('correlation'),'corr-bubbles');const sizes=real.marks.filter(m=>m.role==='pair'&&m.tone);const area=m=>(Math.max(...m.points.map(p=>p[0]))-Math.min(...m.points.map(p=>p[0])))**2;for(const m of sizes)near(area(m)/area(sizes[0]),Math.abs(m.tone/sizes[0].tone));
});

test('all 36 ordered within-family directions retain nodes and deterministic backward seeking',()=>{
  const win=new Window();let n=0;
  for(const family of ['univariate','evaluation','correlation']){const w=familyWork(family);for(const a of w.steps)for(const b of w.steps){if(a===b)continue;n++;const plan=transitionPlan(a,b,{steps:w.steps});assert.equal(plan.mode,'morph',`${a.view}->${b.view}`);
    const chart=new ScientificMorphChart(win.document.createElement('div'),scientificDocument(a),{view:a.view,width:740,height:420,domain:stepDomain(a,w.steps)}),nodes=new Map([...chart.nodes].map(([k,n])=>[k,n.shape]));
    const seek=chart.setDocument(scientificDocument(b),b.view,{manual:true,effect:plan.effect,recipe:plan.recipe,domain:stepDomain(b,w.steps)});seek(.38);const middle=structuredClone([...chart.current]);seek(1);seek(.38);assert.deepEqual([...chart.current],middle);seek(0);seek(1);
    chart.layout.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));for(const [k,node]of nodes)assert.equal(chart.nodes.get(k).shape,node);chart.destroy();
  }}assert.equal(n,36);win.happyDOM.close();
});

test('independent cohorts, changed truth, variable sets and incompatible schemas fall back to native entrance',()=>{
  const w=familyWork('evaluation');w.steps[1].doc.data[0].actual=1-w.steps[1].doc.data[0].actual;assert.equal(transitionPlan(w.steps[0],w.steps[1]).effect,'entrance');
  const c=familyWork('correlation');c.steps[1].doc.data.forEach(r=>{if(r.variable===c.steps[0].doc.data[0].variable)r.variable='新指标';});assert.equal(transitionPlan(c.steps[0],c.steps[1]).effect,'entrance');
  const u=familyWork('univariate');u.steps[1].relation='separate';assert.equal(transitionPlan(u.steps[0],u.steps[1]).effect,'entrance');
  const replaced=replaceStepData(u.steps[0],{doc:getExample('roc')});assert.equal(replaced.doc.template,'roc');assert.notEqual(replaced.view,'uni-histogram');assert.equal(morphReady(replaced),true);
  const different=familyWork('evaluation');different.steps[1].doc.data.forEach(r=>r.score+=.00001);const plan=transitionPlan(different.steps[0],different.steps[1]);assert.equal(plan.effect,'entrance');assert.match(plan.reason,/对应阈值/);
});

test('six presets use the same deterministic frame engine for native entry, SVG and a full Agent manual',t=>{
  const win=new Window(),previous=new Map();for(const [k,value]of Object.entries({document:win.document,XMLSerializer:win.XMLSerializer})){previous.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});}t.after(()=>{for(const [k,d]of previous){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}win.happyDOM.close();});
  for(const p of analyticalPresets){const w=presetWork(p.id),s=w.steps[0],host=win.document.createElement('div'),renderer=new WorkFrameRenderer(host,w.steps,{width:700,height:410});
    renderer.render({step:s,index:0,phase:'entrance',progress:0});const start=host.innerHTML;renderer.render({step:s,index:0,phase:'entrance',progress:1});assert.notEqual(host.innerHTML,start);
    const svg=stepSVG(s,w.steps);assert.match(svg,/data-science-role/);assert.ok(!/NaN|Infinity/.test(svg.replace(/<style[\s\S]*?<\/style>/g,'')));const manual=workAgentBrief(w);assert.match(manual,s.view.startsWith('uni-')?/ECDF/:s.view.startsWith('eval-')?/普通得分/:/Pearson/);assert.match(manual,/可直接打开的交互 HTML/);renderer.destroy();
  }
});

test('SVG compression removes only redundant line vertices and keeps matrix values above colored cells',()=>{
  const area=points=>Math.abs(points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-p[1]*q[0];},0)/2);
  for(const points of [rectPoints(20,30,90,50),segment([20,30],[80,140],1.4),circlePoints(40,50,20)]){const compressed=compactContour(points);near(area(points),area(compressed));for(const axis of [0,1]){near(Math.min(...points.map(p=>p[axis])),Math.min(...compressed.map(p=>p[axis])));near(Math.max(...points.map(p=>p[axis])),Math.max(...compressed.map(p=>p[axis])));}}
  assert.ok(compactContour(rectPoints(0,0,100,100)).length<=8);assert.equal(compactContour(Array.from({length:128},()=>[0,0])).length,1);
  const win=new Window(),chart=new ScientificMorphChart(win.document.createElement('div'),mapped('correlation'),{view:'corr-heatmap',width:800,height:430});assert.ok(chart.labelLayer.querySelectorAll('text').length>=9);assert.match(chart.labelLayer.textContent,/1.00/);chart.render(0);assert.equal(chart.labelLayer.getAttribute('opacity'),'0');chart.render(1);assert.equal(chart.labelLayer.getAttribute('opacity'),'1');chart.destroy();win.happyDOM.close();
});

test('maximum source sizes keep every row and valid finite geometry without truncation',()=>{
  const histogram=getExample('histogram');histogram.data=Array.from({length:600},(_,i)=>({label:`S${i}`,value:Math.round((i*.031+Math.sin(i)*2)*100)/100}));
  const h=scientificDocument({doc:histogram}),ecdf=layoutScientific(h,'uni-ecdf',800,430);assert.equal(h.data.length,600);assert.equal(ecdf.distribution.at(-1).count,600);finite(ecdf);
  const evaluation=getExample('calibration');evaluation.data=['A','B','C'].flatMap(model=>Array.from({length:300},(_,i)=>({label:`S${i}`,model,actual:i%2,score:(i*97%300)/300})));const d=scientificDocument({doc:evaluation}),roc=layoutScientific(d,'eval-roc',800,430);assert.equal(d.data.length,900);assert.ok(roc.evaluations.every(c=>c.n===300));finite(roc);
  const matrix=getExample('correlation');matrix.data=Array.from({length:120},(_,i)=>Array.from({length:6},(_,j)=>({sample:`S${i}`,variable:`V${j}`,value:i+j*Math.sin(i+j)}))).flat();const c=scientificDocument({doc:matrix}),pairs=layoutScientific(c,'corr-pairs',300,260);assert.equal(c.data.length,720);assert.equal(pairs.pairs.length,15);finite(pairs);
});
