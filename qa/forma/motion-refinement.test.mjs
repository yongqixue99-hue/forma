import {refinementRecords} from '../../src/forma/refinement-presets.js';
import {newWork} from '../../src/forma/work-model.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';
import {entityKey} from '../../src/forma/entity-identity.js';
import {recordId} from '../../src/forma/data-identity.js';
import {refinementPresets} from '../../src/forma/refinement-presets.js';
import {presetWork,makeStep,stepDomain,stepView,stepEligibility,transitionPlan,cleanWork,workReport,morphReady} from '../../src/forma/work-model.js';
import {seriesDocument,seriesDomain,seriesPeriods,isSeriesDatePeriod} from '../../src/forma/series-rules.js';
import {SeriesMorphChart,layoutSeries} from '../../src/forma/series-morph.js';
import {scientificDocument,scientificEligibility} from '../../src/forma/scientific-rules.js';
import {ScientificMorphChart,layoutScientific} from '../../src/forma/scientific-morph.js';
import {clusterNumericMatrix} from '../../src/forma/matrix-clustering.js';
import {encodingMeaning,frameMeaning} from '../../src/forma/data-semantics.js';
import {valueColorFor} from '../../src/forma/color-semantics.js';
import {previewDataSync,applyDataSync,undoDataSync} from '../../src/forma/work-data-sync.js';
import {stepSVG,workAgentBrief} from '../../src/forma/work-export.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {workTimeline,timelineFrame} from '../../src/forma/work-timeline.js';
const rank=s=>stepView(s)==='series-rank'||['multi-line','grouped-columns'].includes(stepView(s));
const doc=s=>rank(s)?seriesDocument(s):scientificDocument(s);
const Chart=s=>rank(s)?SeriesMorphChart:ScientificMorphChart;
const layout=s=>rank(s)?layoutSeries:layoutScientific;
const keys=l=>l.marks.map(m=>m.key).sort();
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('new morph entries retain original schemas and existing series identities migrate once',()=>{
 for(const id of ['race','ridges','clusterheatmap']){const original=getExample(id),step=makeStep({doc:original});assert.ok(morphReady(step),id);assert.equal(step.doc.data.length,original.data.length);for(const key of Object.keys(original.data[0]))assert.deepEqual(step.doc.data.map(r=>r[key]),original.data.map(r=>r[key]));}
 for(const id of ['race','smallmultiples']){const step=makeStep({doc:getExample(id),dataGroup:'legacy:series'});assert.ok(step.doc.entities);assert.ok(step.doc.data.every(r=>r._seriesId));const before=step.doc.data.map(r=>[recordId(r),entityKey(r,'series')]),again=makeStep(step);assert.deepEqual(again.doc.data.map(r=>[recordId(r),entityKey(r,'series')]),before);}
 const original=getExample('smallmultiples'),oldName=original.data[0].series,legacy=makeStep({doc:original,options:{colorBindings:[{id:`unmigrated:${JSON.stringify(['series',oldName])}`,color:'#123456'}]}});assert.equal(legacy.options.colorBindings[0].id,legacy.doc.data[0]._seriesId);assert.equal(legacy.options.colorBindings[0].color,'#123456');
 for(const p of refinementPresets){const w=presetWork(p.id);assert.ok(workReport(w).valid,p.id);assert.deepEqual(cleanWork(w),w);for(const s of w.steps){assert.ok(encodingMeaning(s.view)||!s.view.includes('rank'));}}
});
test('date-connected series preserve chronological geometry when spreadsheet rows are reordered',()=>{
 const s=newWork(refinementRecords('values-to-ranks')).steps[0];s.doc.data.forEach(r=>r.period=`2025-0${r.period[0]}-01`);const a=seriesDocument(s),shuffled=structuredClone(a);shuffled.data.sort((a,b)=>[3,1,6,2,5,4].indexOf(+a.period.slice(5,7))-[3,1,6,2,5,4].indexOf(+b.period.slice(5,7)));
 for(const view of ['multi-line','small-multiples','series-rank']){const before=layoutSeries(a,view),after=layoutSeries(shuffled,view);assert.deepEqual(new Map(after.marks.map(m=>[m.key,m.points])),new Map(before.marks.map(m=>[m.key,m.points])));}
 assert.match(frameMeaning('multi-line',{fromView:'series-rank',mode:'morph',progress:.5}),/由名次返回原值/);assert.equal(frameMeaning('multi-line',{fromView:'series-rank',mode:'morph',progress:1}),'');
});
test('competition ranking preserves raw values, ties and series identity; rank and value domains remain separate',()=>{
 const work=newWork(refinementRecords('values-to-ranks')),step=work.steps[1],d=seriesDocument(step),l=layoutSeries(d,'series-rank'),firstPeriod=d.data[0].period,rows=d.data.filter(r=>r.period===firstPeriod),top=Math.max(...rows.map(r=>r.value));
 const tied=l.marks.filter(m=>m.period===firstPeriod&&m.value===top);assert.equal(tied.length,2);assert.deepEqual(tied.map(m=>m.rank),[1,1]);near(tied[0].geometry.cy,tied[1].geometry.cy);assert.ok(l.marks.some(m=>m.period===firstPeriod&&m.rank===3));
 assert.deepEqual(stepDomain(step,work.steps),[1,5]);assert.deepEqual(stepDomain(work.steps[0],work.steps),stepDomain(work.steps[0],work.steps.filter(s=>s!==step)));
 const changed=structuredClone(step);changed.doc.data.reverse();const old=changed.doc.entities.items[0],replacement='renamed series';changed.doc.data.forEach(r=>{if(r._seriesId===old.id)r.series=replacement;});old.name=replacement;
 const b=layoutSeries(seriesDocument(changed),'series-rank');assert.deepEqual(new Map(b.marks.map(m=>[m.key,[m.value,m.rank,m.seriesId]])),new Map(l.marks.map(m=>[m.key,[m.value,m.rank,m.seriesId]])));
 const missing=structuredClone(step);missing.doc.template='tide';missing.doc.data[0].value=null;assert.equal(stepEligibility(missing,'series-rank').valid,false);assert.equal(stepEligibility(missing,'multi-line').valid,true);assert.equal(missing.doc.data[0].value,null);
});
test('matrix clustering moves the same cells and leaves input values/colors untouched, even under equal-distance ties',()=>{
 const w=presetWork('matrix-reordering'),d=scientificDocument(w.steps[0]),cluster=clusterNumericMatrix(d.data),a=layoutScientific(d,'matrix-heatmap'),b=layoutScientific(d,'matrix-clustered');assert.deepEqual(keys(a),keys(b));assert.deepEqual(a.valueDomain,b.valueDomain);assert.ok(b.marks.some(m=>m.role==='join'&&m.opacity));
 const cells=b.marks.filter(m=>m.role==='cell');for(const cell of cells)assert.equal(cell.value,d.data[cell.row].value);
 const changed=structuredClone(d);changed.data.reverse();const oldName=d.data[0].rowName;changed.data.forEach(r=>{if(r.rowName===oldName)r.rowName='renamed';});const c=layoutScientific(changed,'matrix-clustered');assert.deepEqual(new Map(c.marks.filter(m=>m.role==='cell').map(m=>[m.key,m.points])),new Map(cells.map(m=>[m.key,m.points])));
 const constant=structuredClone(d);constant.data.forEach(r=>r.value=2);const t=clusterNumericMatrix(constant.data);assert.equal(t.rowTree.distance,0);constant.data.reverse();assert.deepEqual(clusterNumericMatrix(constant.data),t);assert.ok(cluster.rowTree.distance>0);
 const missing=structuredClone(d);missing.data[0].value=null;assert.equal(scientificEligibility(missing,'matrix-clustered').valid,false);assert.equal(scientificEligibility(missing,'matrix-heatmap').valid,true);const signed=structuredClone(d);signed.data[0].value=-3;assert.equal(scientificEligibility(signed,'matrix-clustered').valid,true);assert.equal(scientificEligibility(signed,'matrix-bubbles').valid,false);assert.equal(signed.data[0].value,-3);
});
test('ridge and raincloud use the same raw samples, Gaussian density and comparable shared amplitude',()=>{
 const d=scientificDocument(presetWork('distribution-ridges').steps[0]),ridge=layoutScientific(d,'sample-ridge'),cloud=layoutScientific(d,'sample-raincloud'),violin=layoutScientific(d,'sample-violin');
 assert.deepEqual(ridge.density,cloud.density);assert.deepEqual(ridge.density,violin.density);assert.deepEqual(keys(ridge),keys(cloud));const samples=ridge.marks.filter(m=>m.role==='sample');assert.equal(samples.length,d.data.length);assert.ok(samples.every(m=>m.opacity>0));for(const m of samples)near(m.anchor[0],ridge.scales.value(d.data[m.row].value));
 const [low,high]=ridge.scales.value.domain();assert.ok(low<=ridge.density.domain[0]&&high>=ridge.density.domain[1]);assert.ok(high-low<(ridge.density.domain[1]-ridge.density.domain[0])*1.25);assert.deepEqual(ridge.scales.value.domain(),cloud.scales.value.domain());
 const small=structuredClone(d),seen=new Map();small.data=small.data.filter(r=>{const n=seen.get(r.group)||0;seen.set(r.group,n+1);return n<5;});assert.equal(scientificEligibility(small,'sample-ridge').valid,false);
});
test('matrix zeros use the configured numeric color and dendrograms wait until the cells settle',()=>{
 const win=new Window(),w=presetWork('matrix-reordering'),d=scientificDocument(w.steps[0]);d.data[0].value=0;d.data[1].value=-5;const options={width:800,height:440,valueColors:{mode:'diverging',center:2,low:'#244a7b',middle:'#f7f4ee',high:'#b35432'}};
 try{for(const view of ['matrix-heatmap','matrix-clustered']){const c=new ScientificMorphChart(win.document.createElement('div'),d,{...options,view}),zero=c.layout.marks.find(m=>m.role==='cell'&&m.value===0);assert.equal(zero.paper,false);assert.equal(c.nodes.get(zero.key).shape.getAttribute('fill'),valueColorFor(options,0,c.layout.valueDomain,'x'));c.destroy();}
 const c=new ScientificMorphChart(win.document.createElement('div'),d,{...options,view:'matrix-heatmap'}),seek=c.setDocument(d,'matrix-clustered',{manual:true,effect:'guided'});seek(.5);const branches=c.layout.marks.filter(m=>m.clusterBranch);assert.ok(branches.length);assert.ok(branches.every(m=>+c.nodes.get(m.key).shape.getAttribute('fill-opacity')===0));seek(1);assert.ok(branches.every(m=>+c.nodes.get(m.key).shape.getAttribute('fill-opacity')>0));c.destroy();
 }finally{win.happyDOM.close();}
});
test('all directed new preset routes have repeatable quarters, exact endpoints and uninterrupted object nodes',()=>{
 const win=new Window();let count=0;try{for(const p of refinementPresets){const w=presetWork(p.id);for(const a of w.steps)for(const b of w.steps){if(a===b)continue;count++;const plan=transitionPlan(a,b,{steps:w.steps});assert.equal(plan.mode,'morph',`${a.view}->${b.view}`);const C=Chart(a),c=new C(win.document.createElement('div'),doc(a),{view:a.view,width:760,height:440,domain:stepDomain(a,w.steps)}),original=new Map([...c.nodes].map(([k,n])=>[k,n.shape]));
 const seek=c.setDocument(doc(b),b.view,{manual:true,effect:plan.effect,domain:stepDomain(b,w.steps)}),frames=[];for(const q of [0,.25,.5,.75,1]){seek(q);frames.push(structuredClone([...c.current]));}assert.notDeepEqual(frames[1],frames[3]);seek(.25);assert.deepEqual([...c.current],frames[1]);seek(1);for(const m of c.layout.marks)assert.deepEqual(c.current.get(m.key),m.points);seek(.5);const before=structuredClone([...c.current]),resume=c.setDocument(doc(a),a.view,{manual:true,resume:true,effect:'guided',domain:stepDomain(a,w.steps)});resume(0);assert.deepEqual([...c.current],before);resume(.5);const half=structuredClone([...c.current]);resume(1);resume(.5);assert.deepEqual([...c.current],half);for(const [key,node]of original)assert.equal(c.nodes.get(key).shape,node);c.destroy();}
 }}finally{win.happyDOM.close();}assert.equal(count,24);
});
test('refinement sync, saved reopening, actual frame renderer and SVG use the same data and view',()=>{
 const win=new Window(),oldDoc=globalThis.document,oldXML=globalThis.XMLSerializer;globalThis.document=win.document;globalThis.XMLSerializer=win.XMLSerializer;
 try{for(const p of refinementPresets){const w=presetWork(p.id),source=w.steps[0];source.doc.unit='updated unit';source.doc.source={type:'user',name:'Actual source'};const preview=previewDataSync(w,source.id),targets=preview.targets.filter(t=>t.eligible);assert.equal(targets.length,w.steps.length-1,p.id);const synced=applyDataSync(w,preview,targets.map(t=>t.id));assert.deepEqual(undoDataSync(synced.work,synced.transaction),w);assert.deepEqual(cleanWork(synced.work),synced.work);for(const step of synced.work.steps){assert.equal(step.doc.unit,'updated unit');assert.equal(step.doc.source.name,'Actual source');assert.deepEqual(step.options,w.steps.find(s=>s.id===step.id).options);}
 const host=win.document.createElement('div'),r=new WorkFrameRenderer(host,w.steps,{width:800,height:440}),t=workTimeline(w),at=t.segments[1].start+t.segments[1].duration*.5;r.render(timelineFrame(t,at));const paths=[...host.querySelectorAll('[data-morph-shape]')].map(n=>n.getAttribute('d'));r.render(timelineFrame(t,0));r.render(timelineFrame(t,at));assert.deepEqual([...host.querySelectorAll('[data-morph-shape]')].map(n=>n.getAttribute('d')),paths);r.destroy();for(const s of w.steps)assert.match(stepSVG(s,w.steps),new RegExp(`data-view="${s.view}"`));assert.match(workAgentBrief(w),new RegExp(w.steps[1].view));
 }}finally{globalThis.document=oldDoc;globalThis.XMLSerializer=oldXML;win.happyDOM.close();}
});


test('invalid ISO-looking period labels stay distinct categorical positions in every line layout',()=>{
 assert.equal(isSeriesDatePeriod('2024-02-29'),true);assert.equal(isSeriesDatePeriod('2025-02-29'),false);assert.equal(isSeriesDatePeriod('2025-02-30'),false);assert.equal(isSeriesDatePeriod('2025-03-02'),true);
 const step=newWork(refinementRecords('values-to-ranks')).steps[0],originalPeriods=[...new Set(step.doc.data.map(r=>r.period))],labels=['2025-02-30','2025-03-02','2025-03-01','2025-03-10','2025-03-04','2025-03-06'];
 step.doc.data.forEach(r=>r.period=labels[originalPeriods.indexOf(r.period)]);const d=seriesDocument(step);assert.deepEqual(seriesPeriods(d),labels);
 for(const view of ['multi-line','small-multiples','series-rank']){const l=layoutSeries(d,view);for(const name of new Set(d.data.map(r=>r.series))){const xs=labels.map(p=>l.marks.find(m=>m.series===name&&m.period===p).geometry.cx);assert.equal(new Set(xs).size,labels.length,`${view} must not normalize February 30 into March 2`);const gap=xs[1]-xs[0];assert.ok(gap>0);for(let i=2;i<xs.length;i++)near(xs[i]-xs[i-1],gap);}}
});
