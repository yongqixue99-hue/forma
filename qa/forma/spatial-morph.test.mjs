import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {presetWork,stepDomain,transitionPlan,recommendedTransitions} from '../../src/forma/work-model.js';
import {scientificDocument,scientificEligibility} from '../../src/forma/scientific-rules.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {createStepScene} from '../../src/forma/work-scene.js';
const picture=c=>[...c.svg.querySelectorAll('[data-spatial-face]')].filter(n=>n.getAttribute('display')!=='none').map(n=>[n.getAttribute('data-spatial-face'),n.getAttribute('d'),n.getAttribute('fill')]);
function fixture(id){const win=new Window(),work=presetWork(id),doc=scientificDocument(work.steps[0]),options={view:work.steps[0].view,width:800,height:500,interactive:false,domain:stepDomain(work.steps[0],work.steps)},chart=new ScientificMorphChart(win.document.createElement('div'),doc,options);return {win,work,doc,options,chart,close(){chart.destroy();win.happyDOM.close();}};}
test('spatial morph updates actual 3D vertices with deterministic reverse, interruption, endpoint and loop geometry',()=>{
 for(const id of ['spatial-surface-morph','spatial-size-morph']){const f=fixture(id),{chart,doc,options,work}=f;
 try{const original=picture(chart),source=structuredClone(doc),keys=[...chart.nodes.keys()].sort();
 for(const step of work.steps.slice(1)){
   const frame=chart.setDocument(doc,step.view,{...options,manual:true});frame(.37);const mid=picture(chart),pose=structuredClone(chart.spatialLayer.pose);frame(.74);assert.notDeepEqual(picture(chart),mid);frame(.37);assert.deepEqual(picture(chart),mid);
   const resume=chart.setDocument(doc,work.steps[0].view,{...options,manual:true,resume:true});resume(0);assert.deepEqual(picture(chart),mid);assert.deepEqual(chart.spatialLayer.pose,pose);resume(1);assert.deepEqual(picture(chart),original);resume(.6);const reverse=picture(chart);resume(.1);resume(.6);assert.deepEqual(picture(chart),reverse);resume(1);
   assert.deepEqual([...chart.nodes.keys()].sort(),keys);assert.ok(chart.spatialLayer.pose.objects.every(o=>o.point.every(Number.isFinite)));
 }
 assert.deepEqual(doc,source);
 chart.setView(work.steps[1].view,{animate:false});assert.equal(chart.spatialLayer.pose.surface,0);
 chart.seekTransition(work.steps[1].view,work.steps[0].view,.5);assert.notDeepEqual(picture(chart),original);chart.seekTransition(work.steps[1].view,work.steps[0].view,1);assert.deepEqual(picture(chart),original);
 }finally{f.close();}}
});
test('bubble projected area uses actual size; unsupported surfaces and missing sizes are rejected',()=>{
 const f=fixture('spatial-size-morph');try{const {doc,chart}=f,objects=chart.spatialLayer.pose.objects,rows=new Map(doc.data.map(r=>[r._id,r]));for(const o of objects)assert.ok(Math.abs((o.radius/objects[0].radius)**2-rows.get(o.id).size/rows.get(objects[0].id).size)<1e-12);
 assert.equal(scientificEligibility(doc,'spatial-surface').valid,false);const invalid=structuredClone(doc);delete invalid.data[0].size;assert.equal(scientificEligibility(invalid,'spatial-bubbles').valid,false);assert.ok(scientificEligibility(invalid,'spatial-3d').valid);
 }finally{f.close();}
 const g=fixture('spatial-surface-morph');try{const {doc,chart,work}=g;assert.equal(chart.spatialLayer.pose.triangles.length,198);const bad=structuredClone(doc);bad.data.pop();assert.equal(scientificEligibility(bad,'spatial-surface').valid,false);const missing=structuredClone(doc);missing.data[0].z=NaN;assert.equal(scientificEligibility(missing,'spatial-surface').valid,false);assert.equal(scientificEligibility(doc,'spatial-bubbles').valid,false);assert.ok(recommendedTransitions(work.steps[0]).some(v=>JSON.stringify(v).includes('spatial-3d')));assert.ok(work.steps.slice(1).every(s=>transitionPlan(work.steps[0],s,{steps:work.steps}).mode==='morph'));}finally{g.close();}
});
test('surface sample editing addresses native value field and renderer carries the source grid',()=>{const win=new Window(),work=presetWork('spatial-surface-morph'),host=win.document.createElement('div'),scene=createStepScene(host,work.steps[0],{editable:true,width:800,height:500});try{assert.equal(host.querySelectorAll('[data-edit-field="value"]').length,120);assert.equal(host.querySelectorAll('[data-edit-field="z"]').length,0);assert.equal(scene.spatialLayer.pose.objects.length,120);}finally{scene.destroy();win.happyDOM.close();}});
test('production SVG video exporter uses the same continuous 3D layer and supports arbitrary seek',async()=>{
 const win=new Window(),oldDocument=globalThis.document,oldXML=globalThis.XMLSerializer;globalThis.document=win.document;globalThis.XMLSerializer=win.XMLSerializer;
 try{const {createWorkExportRenderer}=await import('../../src/forma/work-video.js');const {workTimeline}=await import('../../src/forma/work-timeline.js');
 for(const id of ['spatial-surface-morph','spatial-size-morph']){const work=presetWork(id),timeline=workTimeline(work),segment=timeline.segments[1],time=segment.start+segment.duration*.43,renderer=createWorkExportRenderer(work);try{const a=renderer.frame(time);assert.match(a,/data-spatial-morph/);assert.match(a,/data-world-morph="true"/);assert.doesNotMatch(a.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);renderer.frame(0);const b=renderer.frame(time);const visible=svg=>[...svg.matchAll(/<path data-spatial-face="[^"]+"[^>]+/g)].map(m=>m[0]);assert.deepEqual(visible(a),visible(b));assert.notDeepEqual(visible(renderer.frame(segment.start+segment.duration*.75)),visible(a));}finally{renderer.destroy();}}
 }finally{globalThis.document=oldDocument;globalThis.XMLSerializer=oldXML;win.happyDOM.close();}
});
test('live playback never flashes the target before its first animation frame; recoloring retains displayed world geometry',()=>{
 const f=fixture('spatial-surface-morph');try{const {chart,win,doc,options,work}=f;let callback;win.requestAnimationFrame=fn=>(callback=fn,1);win.cancelAnimationFrame=()=>{};
 const before=picture(chart),pose=structuredClone(chart.spatialLayer.pose);
 chart.setDocument(doc,work.steps[1].view,{...options,duration:1000});assert.deepEqual(picture(chart),before);assert.deepEqual(chart.spatialLayer.pose,pose);
 callback(0);callback(400);const mid=structuredClone(chart.spatialLayer.pose);chart.setPalette('ochre');assert.deepEqual(chart.spatialLayer.pose,mid);callback(1000);assert.equal(chart.spatialLayer.pose.surface,0);
 chart.setView(work.steps[0].view,{animate:false});assert.equal(chart.spatialLayer.pose.surface,1);
 }finally{f.close();}
});
