import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {presetWork,makeStep,cleanWork,transitionPlan} from '../../src/forma/work-model.js';
import {getExample} from '../../src/forma/catalog.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';
import {ScientificMorphChart,layoutScientific} from '../../src/forma/scientific-morph.js';
import {autocorrelation10,pacf10} from '../../src/forma/volume10-data.js';
import {interpolateSerialMark} from '../../src/forma/serial-morph.js';
import {newAnnotation,annotationStatus,cleanAnnotations,applyAnnotation,undoAnnotation} from '../../src/forma/annotations.js';
import {annotationAnchor,renderAnnotations,assertAnnotationLayout,annotationCaption} from '../../src/forma/annotation-view.js';
import {previewDataSync,applyDataSync} from '../../src/forma/work-data-sync.js';

test('ACF/PACF reuse native estimators, fixed coefficient axis and ordered lag identities',()=>{
 const w=presetWork('serial-diagnostics'),[a,b]=w.steps.map(s=>layoutScientific(scientificDocument(s),s.view));
 assert.deepEqual(a.coefficients,autocorrelation10(w.steps[0].doc.data.map(r=>r.value),16));assert.deepEqual(b.coefficients,pacf10(w.steps[0].doc.data.map(r=>r.value),16));
 assert.deepEqual(a.scales.y.domain(),[-1,1]);assert.deepEqual(a.marks.map(m=>m.key),b.marks.map(m=>m.key));
 for(let i=0;i<a.marks.length;i++){assert.deepEqual(interpolateSerialMark(a.marks[i].points,a.marks[i],b.marks[i],.5),b.marks[i].entrance);assert.deepEqual(interpolateSerialMark(b.marks[i].points,b.marks[i],a.marks[i],.5),a.marks[i].entrance);}
 for(const change of [s=>s.doc.maxLag=8,s=>s.doc.data.reverse(),s=>s.doc.data[0].value+=1,s=>s.doc.source.name+=' changed',s=>s.doc.unit='new']){const changed=structuredClone(w.steps[1]);change(changed);assert.equal(transitionPlan(w.steps[0],changed).mode,'gather');}
 assert.equal(transitionPlan(w.steps[0],w.steps[1]).mode,'morph');assert.deepEqual(cleanWork(w),w);
});
test('serial renderer retains exact reverse, non-guided and interrupted poses',()=>{
 const win=new Window();try{const w=presetWork('serial-diagnostics');for(const effect of ['guided','smooth','arc','turn']){
 const c=new ScientificMorphChart(win.document.createElement('div'),scientificDocument(w.steps[0]),{view:'serial-acf',width:800,height:440});const seek=c.setDocument(scientificDocument(w.steps[1]),'serial-pacf',{manual:true,effect});seek(.5);assert.equal(c.guideLayer.getAttribute('opacity'),'1');assert.match(c.guideLayer.querySelector('[data-serial-estimator]').textContent,/ACF → 0 → PACF/);for(const m of c.layout.marks)for(const p of c.current.get(m.key))assert.ok(Math.abs(p[1]-m.entrance[0][1])<1e-8);
 seek(.1);const start=structuredClone([...c.current]),back=c.setDocument(scientificDocument(w.steps[0]),'serial-acf',{manual:true,resume:true,effect});back(0);assert.deepEqual([...c.current],start);back(.4);const frame=structuredClone([...c.current]);back(1);back(.4);assert.deepEqual([...c.current],frame);c.destroy();}
 }finally{win.happyDOM.close();}
});
test('scientific annotations track input IDs and canonical endpoint fields after edits and reorder',()=>{
 const win=new Window();try{for(const template of ['interval','forest','raincloud','heatmap','clusterheatmap','ribbon']){
 const s=makeStep({doc:getExample(template)}),a=newAnnotation(s.doc);a.text='科研结果说明';s.options.annotations=[a];const c=new ScientificMorphChart(win.document.createElement('div'),scientificDocument(s),{view:({'interval':'estimate-horizontal','forest':'estimate-horizontal','raincloud':'sample-raincloud','heatmap':'matrix-heatmap','clusterheatmap':'matrix-clustered','ribbon':'ordered-estimate-band'})[template],annotations:[a]});
 assert.ok(annotationAnchor(c,a.targets[0],a.binding.family),template);renderAnnotations(c,s,{staticFrame:true});assert.equal(c.annotationReport.warnings.length,0,template);assertAnnotationLayout(c);
 s.doc.data.reverse();assert.equal(annotationStatus(s.doc,a).valid,true);const row=s.doc.data.find(r=>r._id===a.targets[0].recordId);if('estimate'in row){row.estimate+=.01;const endpoint=newAnnotation(s.doc,{targets:[{recordId:row._id,field:'low'}]});assert.equal(annotationStatus(s.doc,endpoint).valid,true);assert.ok(annotationAnchor(c,endpoint.targets[0],endpoint.binding.family));assert.ok(annotationCaption(s.doc,endpoint));}else row.value+=.01;
 assert.equal(annotationStatus(s.doc,a).valid,true);s.doc.data=s.doc.data.filter(r=>r._id!==row._id);assert.equal(annotationStatus(s.doc,a).valid,false);c.destroy();}
 }finally{win.happyDOM.close();}
});
test('narrative presets reserve annotation space in landscape and portrait and keep reversible bindings',()=>{
 const win=new Window();try{for(const id of ['interval-story','distribution-story','matrix-story']){const w=presetWork(id);for(const s of w.steps)for(const [width,height]of [[800,440],[390,650]]){
 const c=new ScientificMorphChart(win.document.createElement('div'),scientificDocument(s),{view:s.view,width,height,...s.options});renderAnnotations(c,s,{staticFrame:true});assert.equal(c.annotationReport.warnings.length,0);assertAnnotationLayout(c);assert.ok(c.layout.annotationRail);const box=[...c.annotationPositions.values()][0],p=c.layout.plot;assert.ok(box.x>=p.x+p.w||box.y>=p.y+p.h);c.destroy();}
 const a={...w.steps[0].options.annotations[0],position:{x:.3,y:.7}},applied=applyAnnotation(w,w.steps[0].id,a);assert.deepEqual(undoAnnotation(applied.work,applied.transaction).steps,w.steps);assert.deepEqual(cleanAnnotations([a])[0].position,a.position);assert.throws(()=>cleanAnnotations([{...a,position:{x:2,y:0}}]));}
 }finally{win.happyDOM.close();}
});
test('explicit serial synchronization restores compatible source values without changing target estimator',()=>{
 const w=presetWork('serial-diagnostics');w.steps[0].doc.data[0].value+=.4;const preview=previewDataSync(w,w.steps[0].id),ids=preview.targets.filter(t=>t.eligible).map(t=>t.id);assert.ok(ids.includes(w.steps[1].id));const next=applyDataSync(w,preview,ids).work;assert.equal(next.steps[1].view,'serial-pacf');assert.equal(transitionPlan(next.steps[0],next.steps[1]).mode,'morph');
});
test('three simultaneous endpoint cards avoid each other and preserve interval meaning in both ratios',()=>{
 const win=new Window();try{const w=presetWork('interval-story'),s=w.steps[1];s.options.annotations=['estimate','low','high'].map((field,i)=>newAnnotation(s.doc,{text:['点估计','输入下界','输入上界'][i],targets:[{recordId:s.doc.data[i]._id,field}]}));
 for(const[width,height]of [[800,440],[390,650]]){const c=new ScientificMorphChart(win.document.createElement('div'),scientificDocument(s),{...s.options,view:s.view,width,height});renderAnnotations(c,s,{staticFrame:true});assertAnnotationLayout(c);assert.equal(c.annotationPositions.size,3);const boxes=[...c.annotationPositions.values()];for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}c.destroy();}
 s.doc.intervalLabel+=' changed';assert.ok(s.options.annotations.every(a=>!annotationStatus(s.doc,a).valid));
 }finally{win.happyDOM.close();}
});
