import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';
import {withRecordIds,recordId,populationId} from '../../src/forma/data-identity.js';
import {distributionViews,distributionViewMap,distributionDocument,distributionEligibility,distributionBounds,distributionCompatibility,distributionGuide} from '../../src/forma/distribution-rules.js';
import {layoutDistribution,packDistributionQuantiles} from '../../src/forma/distribution-morph.js';
import {distributionRecords,distributionPresets} from '../../src/forma/distribution-presets.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {boxen17} from '../../src/forma/volume17-data.js';
import {halfeye12,quantileDots12} from '../../src/forma/volume12-data.js';
import {presetWork,makeStep,stepView,morphReady,transitionPlan,workReport,cleanWork} from '../../src/forma/work-model.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {workTimeline,timelineFrame} from '../../src/forma/work-timeline.js';
import {workAgentBrief,stepSVG} from '../../src/forma/work-export.js';
import {scenarioPresets} from '../../src/forma/scenario-presets.js';
import {frequencyViews} from '../../src/forma/frequency-rules.js';
import {viewName} from '../../src/forma/morph-sequence-player.js';
import {setLocale,uiText} from '../../src/forma/locale.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const d=()=>distributionDocument(distributionRecords('distribution-probability-story')[0].doc);
const viewIds=distributionViews.map(v=>v.id);
const raw=l=>l.marks.filter(m=>m.role==='sample');

test('all four existing templates enter the series without altering native rows or metadata',()=>{
 assert.equal(distributionViews.length,4);
 for(const [template,view]of Object.entries(distributionViewMap)){
  const native=withRecordIds(getExample(template)),before=structuredClone(native),doc=distributionDocument(native);
  assert.ok(distributionEligibility(doc,view).valid,template);assert.equal(doc.family,'distribution');
  assert.deepEqual(native,before);assert.equal(doc.data.length,native.data.length);
  for(const [i,row]of native.data.entries())for(const field of Object.keys(row))assert.deepEqual(doc.data[i][field],row[field]);
  assert.equal(doc.unit,native.unit);assert.deepEqual(doc.source,native.source);
 }
});

test('every raw sample stays visible, editable, exact-valued and identity-stable in every encoding',()=>{
 const doc=d(),before=structuredClone(doc);let keys;
 for(const view of viewIds){
  const l=layoutDistribution(doc,view),marks=raw(l);assert.equal(marks.length,doc.data.length);
  for(const m of marks){const r=doc.data[m.row];assert.equal(m.identity,recordId(r));assert.equal(m.value,r.value);assert.equal(m.editable,'value');assert.equal(m.opacity,.76);assert.equal(m.derived,undefined);assert.ok(m.tooltip.includes(String(r.value)));assert.equal(m.colorIdentity,populationId('sample-group',doc.data));near(m.anchor[view==='distribution-sina'||view==='distribution-boxen'?1:0],l.scales.value(r.value));}
  const next=l.marks.map(m=>m.key).sort();assert.equal(new Set(next).size,next.length);if(keys)assert.deepEqual(next,keys);keys=next;
  for(const m of l.marks.filter(m=>m.derived)){assert.equal(m.editable,undefined);assert.equal(m.recordIds.length,doc.data.length);assert.ok(!marks.some(r=>r.identity===m.identity));}
 }assert.deepEqual(doc,before);
});

test('nested boxes and half-eye summaries match the native estimators and never invent confidence intervals',()=>{
 const doc=d(),native=boxen17(doc.data)[0],box=layoutDistribution(doc,'distribution-boxen'),half=layoutDistribution(doc,'distribution-halfeye'),stats=halfeye12(doc.data,doc.bandwidth).curves[0];
 assert.deepEqual(box.statistics,boxen17(doc.data));
 const middle=box.marks.find(m=>m.role==='central-50');near(middle.low,native.intervals[0].low);near(middle.high,native.intervals[0].high);
 for(const level of native.intervals.slice(1)){const m=box.marks.find(m=>m.role===`tail-${level.level}`);near(m.low,level.low);near(m.high,level.high);assert.equal(m.tailProbability,level.p);}
 const inner=half.marks.find(m=>m.role==='central-50'),outer=half.marks.find(m=>m.role==='central-90');assert.deepEqual([inner.low,inner.high],stats.inner);assert.deepEqual([outer.low,outer.high],stats.outer);assert.match(inner.tooltip,/非置信区间/);assert.equal(half.marks.find(m=>m.role==='median').value,stats.median);
});

test('quantile summaries have distinct probability identities, exact Type 7 values and total mass one',()=>{
 const doc=d(),l=layoutDistribution(doc,'distribution-quantiledot'),summaries=l.marks.filter(m=>m.role==='quantile-summary'),expected=quantileDots12(doc.data,doc.dotCount);
 assert.equal(summaries.length,doc.dotCount);near(summaries.reduce((n,m)=>n+m.mass,0),1);
 for(const [i,m]of summaries.entries()){near(m.value,expected[i].value);near(m.quantile,expected[i].p);near(m.anchor[0],l.scales.value(expected[i].value));assert.ok(m.derived);assert.ok(m.opacity>0);assert.match(m.tooltip,/非原始观测/);assert.equal(m.editable,undefined);}
 assert.ok(Math.max(...raw(l).map(m=>m.anchor[1]))<l.plot.y+l.plot.h);assert.equal(raw(l).length,doc.data.length);
});

test('record renames and row reorder keep jitter and source identities while measured edits move the correct point',()=>{
 const doc=d(),a=layoutDistribution(doc,'distribution-sina'),changed=structuredClone(doc);changed.data.reverse();changed.data.forEach((r,i)=>r.label=`renamed ${i}`);
 const b=layoutDistribution(changed,'distribution-sina');for(const m of raw(a)){const other=raw(b).find(n=>n.key===m.key);assert.ok(other);m.points.forEach((p,i)=>p.forEach((v,j)=>near(v,other.points[i][j])));}assert.equal(distributionCompatibility(doc,changed),'');
 const edited=structuredClone(doc),target=edited.data[5];target.value+=.25;const c=layoutDistribution(edited,'distribution-sina',800,440,{domain:distributionBounds(doc)});
 const original=raw(a).find(m=>m.identity===recordId(target)),after=raw(c).find(m=>m.identity===recordId(target));assert.equal(original.key,after.key);assert.equal(after.value,target.value);assert.notDeepEqual(original.points,after.points);
});

test('eligibility rejects missingness, duplicate identities, insufficient tail samples and silent group pooling',()=>{
 const doc=d(),mutations=[x=>x.data[0].value=null,x=>x.data[0].value=NaN,x=>x.data[0].value=Infinity,x=>x.data[1]._id=x.data[0]._id,x=>x.bandwidth=0,x=>x.bandwidth=1e-320,x=>x.dotCount=19];
 for(const mutate of mutations){const invalid=structuredClone(doc);mutate(invalid);const before=structuredClone(invalid);assert.equal(distributionEligibility(invalid,'distribution-sina').valid,false);assert.deepEqual(invalid,before);}
 const small=structuredClone(doc);small.data=small.data.slice(0,15);assert.equal(distributionEligibility(small,'distribution-boxen').valid,false);assert.equal(distributionEligibility(small,'distribution-sina').valid,true);
 const grouped=distributionDocument(distributionRecords('distribution-tail-story')[0].doc),before=structuredClone(grouped);assert.equal(distributionEligibility(grouped,'distribution-quantiledot').valid,false);assert.deepEqual(grouped,before);
 const changed=structuredClone(doc);changed.unit='kg';assert.match(distributionCompatibility(doc,changed),/单位/);changed.unit=doc.unit;changed.dotCount=40;assert.match(distributionCompatibility(doc,changed),/概率质量/);
});

test('different source URLs or measurement definitions cannot morph even with identical record IDs and values',()=>{
 const doc=d();doc.source.url='https://example.org/study-a';doc.axes={value:'Latency / ms',group:'Cohort'};
 for(const change of [other=>other.source.url='https://example.org/study-b',other=>delete other.source.url,other=>other.axes.value='Recovery time / ms',other=>other.axes.group='Treatment',other=>delete other.axes]){
  const other=structuredClone(doc);change(other);const before=structuredClone(other);assert.notEqual(distributionCompatibility(doc,other),'');assert.deepEqual(other.data,doc.data);assert.deepEqual(other,before);
 }
 const reordered=structuredClone(doc);reordered.axes={group:doc.axes.group,value:doc.axes.value};assert.equal(distributionCompatibility(doc,reordered),'');
 const work=presetWork('distribution-tail-story'),[from,to]=work.steps;from.doc.source.url='https://example.org/study-a';to.doc.source.url='https://example.org/study-b';
 assert.equal(transitionPlan(from,to,{steps:work.steps}).mode,'gather');to.doc.source.url=from.doc.source.url;assert.equal(transitionPlan(from,to,{steps:work.steps}).mode,'morph');
 from.doc.axes={value:'Latency / ms'};to.doc.axes={value:'Recovery time / ms'};assert.equal(transitionPlan(from,to,{steps:work.steps}).mode,'gather');to.doc.axes=structuredClone(from.doc.axes);assert.equal(transitionPlan(from,to,{steps:work.steps}).mode,'morph');
});

test('constant, negative, very small and large legal inputs retain finite on-canvas marks in compact and wide frames',()=>{
 for(const input of [0,-7,1e-10,1,1e10]){
  const doc=d();doc.data.forEach((r,i)=>r.value=input===0?0:input===-7?-7:input*(2+Math.sin(i*.7)));const canonical=distributionDocument({...doc,bandwidth:undefined});
  for(const view of viewIds)for(const [w,h]of [[800,440],[380,280],[300,155]]){
   assert.ok(distributionEligibility(canonical,view).valid,`${input}/${view}`);const l=layoutDistribution(canonical,view,w,h);
   for(const mark of l.marks){assert.equal(mark.points.length,mark.entrance.length);assert.ok(mark.points.flat().every(Number.isFinite));if(mark.opacity)for(const [x,y]of mark.points){assert.ok(x>=0&&x<=w,`${view}: x=${x}/${w}`);assert.ok(y>=0&&y<=h,`${view}: y=${y}/${h}`);}}
   assert.equal(raw(l).length,canonical.data.length);
  }
 }
});

test('equal quantiles pack inside the available height without snapping their value coordinates',()=>{
 const points=Array.from({length:100},(_,i)=>({p:(i+.5)/100,value:7,mass:.01})),packed=packDistributionQuantiles(points,v=>v*20,280,20);
 assert.ok(packed.radius>0);assert.ok((Math.max(...packed.points.map(p=>p.level))+1)*packed.radius*2.2<=20);assert.ok(packed.points.every(p=>p.x===140));assert.equal(new Set(packed.points.map(p=>p.level)).size,100);
});

test('all directed routes use persistent SVG nodes, nontrivial quarter frames, reverse and interruption continuity',()=>{
 const win=new Window(),doc=d();let routes=0;
 try{for(const from of viewIds)for(const to of viewIds){if(from===to)continue;routes++;
  const chart=new ScientificMorphChart(win.document.createElement('div'),doc,{view:from,width:760,height:420,editable:true}),nodes=new Map([...chart.nodes].map(([k,n])=>[k,n.shape])),seek=chart.setDocument(doc,to,{manual:true,effect:'guided'}),frames=[];
  for(const q of [0,.25,.5,.75,1]){seek(q);frames.push(structuredClone([...chart.current]));for(const m of raw(chart.layout)){near(Number(chart.nodes.get(m.key).shape.getAttribute('fill-opacity')),.76);assert.equal(chart.nodes.get(m.key).group.dataset.editField,'value');}assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));}
  assert.notDeepEqual(frames[1],frames[3],`${from}→${to}`);seek(.25);assert.deepEqual([...chart.current],frames[1]);seek(1);for(const m of chart.layout.marks)assert.deepEqual(chart.current.get(m.key),m.points);
  seek(.5);const before=structuredClone([...chart.current]),resume=chart.setDocument(doc,from,{manual:true,resume:true,effect:'guided'});resume(0);assert.deepEqual([...chart.current],before);resume(.5);const middle=structuredClone([...chart.current]);resume(1);resume(.5);assert.deepEqual([...chart.current],middle);
  for(const [key,node]of nodes)assert.equal(chart.nodes.get(key).shape,node);chart.destroy();
 }}finally{win.happyDOM.close();}assert.equal(routes,12);
});

test('both presets preserve one source population, persisted record IDs and explicit synthetic provenance',()=>{
 for(const p of distributionPresets){const steps=distributionRecords(p.id,'blue');assert.deepEqual(steps.map(s=>s.view),p.views);for(const s of steps){assert.deepEqual(s.doc.data,steps[0].doc.data);assert.equal(s.dataGroup,steps[0].dataGroup);assert.equal(s.doc.source.type,'demo');assert.ok(s.doc.data.every(r=>r._id));assert.equal(s.options.palette,'blue');assert.ok(distributionEligibility(distributionDocument(s.doc),s.view).valid);}}
 assert.equal(distributionRecords('missing'),null);
});

test('native editor routes and saved presets register true morphs without converting the source table',()=>{
 for(const [template,view]of Object.entries(distributionViewMap)){const step=makeStep({doc:getExample(template)});assert.equal(stepView(step),view);assert.ok(morphReady(step));}
 for(const p of distributionPresets){const work=presetWork(p.id);assert.ok(workReport(work).valid,p.id);assert.deepEqual(cleanWork(work),work);for(const a of work.steps)for(const b of work.steps)if(a!==b)assert.equal(transitionPlan(a,b,{steps:work.steps}).mode,'morph',`${a.view} → ${b.view}`);}
});

test('the frame renderer, SVG export and Agent brief retain the actual new series and reversible frames',()=>{
 const win=new Window(),oldDocument=globalThis.document,oldXML=globalThis.XMLSerializer;globalThis.document=win.document;globalThis.XMLSerializer=win.XMLSerializer;
 try{for(const p of distributionPresets){
  const work=presetWork(p.id),host=win.document.createElement('div'),renderer=new WorkFrameRenderer(host,work.steps,{width:800,height:440}),timeline=workTimeline(work),segment=timeline.segments[1],time=segment.start+segment.duration*.5;
  renderer.render(timelineFrame(timeline,time));const paths=[...host.querySelectorAll('[data-morph-shape]')].map(n=>n.getAttribute('d'));assert.ok(paths.length>work.steps[0].doc.data.length);
  renderer.render(timelineFrame(timeline,0));renderer.render(timelineFrame(timeline,time));assert.deepEqual([...host.querySelectorAll('[data-morph-shape]')].map(n=>n.getAttribute('d')),paths);renderer.destroy();
  for(const step of work.steps){const svg=stepSVG(step,work.steps);assert.match(svg,new RegExp(`data-view="${step.view}"`));assert.equal(/\b(?:d|points|x|y|x1|x2|y1|y2|cx|cy|r|width|height|transform)="[^"]*(?:NaN|Infinity)[^"]*"/.test(svg),false,step.view);}
  for(const view of p.views)assert.ok(workAgentBrief(work).includes(view));
 }}finally{globalThis.document=oldDocument;globalThis.XMLSerializer=oldXML;win.happyDOM.close();}
});

test('English chart details, tooltips and data guides do not leak authored Chinese text',()=>{
 const doc=d();doc.data.forEach(r=>r.group='Sample A');
 try{setLocale('en');for(const info of distributionViews)assert.doesNotMatch(info.name+info.note,/[\u3400-\u9fff]/);for(const view of viewIds){const l=layoutDistribution(doc,view);assert.doesNotMatch(l.heading+l.details+l.marks.map(m=>m.tooltip).join('')+distributionGuide(doc,view).join(''),/[\u3400-\u9fff]/);}}finally{setLocale('zh-CN');}
});

test('both new series translate preset metadata frozen by the scenario registry and all seven view names',()=>{
 const ids=['distribution-tail-story','distribution-probability-story','frequency-response'];
 try{setLocale('en');for(const id of ids){const p=scenarioPresets.find(s=>s.id===id);assert.ok(p);for(const field of ['name','description','dataNote','relation'])assert.doesNotMatch(uiText(p[field]),/[\u3400-\u9fff]/,`${id}.${field}`);}
  for(const v of [...distributionViews,...frequencyViews]){assert.doesNotMatch(v.name+v.note,/[\u3400-\u9fff]/);assert.equal(viewName(v.id),v.name);}
 }finally{setLocale('zh-CN');}
});
