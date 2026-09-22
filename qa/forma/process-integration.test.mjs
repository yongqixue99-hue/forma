import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {presetWork,transitionPlan,stepDomain,cleanWork,morphReady,stepView,makeStep} from '../../src/forma/work-model.js';
import {getExample} from '../../src/forma/catalog.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {workTimeline,timelineFrame} from '../../src/forma/work-timeline.js';
import {stepSVG,workAgentBrief} from '../../src/forma/work-export.js';
import {previewDataSync,applyDataSync,undoDataSync} from '../../src/forma/work-data-sync.js';

test('native I-MR adaptation and saved work preserve the original complete data schema',()=>{
 const original=getExample('imr'),s=makeStep({doc:original});assert.ok(morphReady(s));assert.equal(stepView(s),'process-imr');
 assert.deepEqual(s.doc.data.map(({_id,...r})=>r),original.data);const w=presetWork('process-variation');assert.deepEqual(cleanWork(w),w);
 const renamed=structuredClone(w.steps[1]);renamed.doc.data.forEach((r,i)=>r.period=`renamed ${i}`);assert.equal(transitionPlan(w.steps[0],renamed,{steps:w.steps}).mode,'morph');
 for(const mutate of [s=>s.doc.data.reverse(),s=>s.doc.data[2].value+=.1,s=>s.doc.unit='kg',s=>s.doc.source.name='Another process']){const changed=structuredClone(w.steps[1]);mutate(changed);const p=transitionPlan(w.steps[0],changed,{steps:[w.steps[0],changed]});assert.equal(p.mode,'gather');assert.equal(p.effect,'entrance');}
});

test('real scientific renderer keeps exact repeated/reversed/interrupted contours and distinguishable limit flags',()=>{
 const win=new Window(),w=presetWork('process-variation');try{
 for(const [a,b]of [[w.steps[0],w.steps[1]],[w.steps[1],w.steps[0]]]){
  const c=new ScientificMorphChart(win.document.createElement('div'),scientificDocument(a),{view:a.view,width:800,height:440,domain:stepDomain(a,w.steps)}),seek=c.setDocument(scientificDocument(b),b.view,{manual:true,effect:'guided',domain:stepDomain(b,w.steps)}),nodes=new Map([...c.nodes].map(([k,n])=>[k,n.shape]));
  const frames=[];for(const q of [0,.25,.5,.75,1]){seek(q);frames.push(structuredClone([...c.current]));}seek(.25);assert.deepEqual([...c.current],frames[1]);seek(1);for(const m of c.layout.marks)assert.deepEqual(c.current.get(m.key),m.points);
  const flagged=c.layout.marks.find(m=>m.role==='individual'&&m.accent),normal=c.layout.marks.find(m=>m.role==='individual'&&!m.accent);assert.notEqual(c.nodes.get(flagged.key).shape.getAttribute('fill'),c.nodes.get(normal.key).shape.getAttribute('fill'));
  seek(.5);const current=structuredClone([...c.current]),resume=c.setDocument(scientificDocument(a),a.view,{manual:true,resume:true,effect:'guided',domain:stepDomain(a,w.steps)});resume(0);assert.deepEqual([...c.current],current);resume(.5);const half=structuredClone([...c.current]);resume(1);resume(.5);assert.deepEqual([...c.current],half);for(const[k,n]of nodes)assert.equal(c.nodes.get(k).shape,n);c.destroy();
 }
 }finally{win.happyDOM.close();}
});

test('limit rings remain distinct when user color bindings make normal and flagged points identical colors',()=>{
 const win=new Window(),w=presetWork('process-variation'),d=scientificDocument(w.steps[1]);try{
  const c=new ScientificMorphChart(win.document.createElement('div'),d,{view:'process-imr',width:360,height:370,colors:['#d94e36','#d94e36'],colorBindings:[{id:'process:measurement',color:'#d94e36'}]});
  const flagged=c.layout.marks.find(m=>m.role==='individual'&&m.accent),normal=c.layout.marks.find(m=>m.role==='individual'&&!m.accent);assert.equal(c.nodes.get(flagged.key).shape.getAttribute('fill'),c.nodes.get(normal.key).shape.getAttribute('fill'));
  const flags=c.layout.marks.filter(m=>m.limitFlag);assert.equal(flags.length,2);for(const ring of flags){const point=c.layout.marks.find(m=>m.identity===ring.identity&&!m.limitFlag&&['individual','moving-range'].includes(m.role));assert.ok(ring.radius>point.radius+2);assert.equal(ring.paper,true);assert.ok(ring.opacity>0);assert.equal(c.nodes.get(ring.key).shape.getAttribute('fill'),c.theme.bg);assert.ok(Number(c.nodes.get(ring.key).shape.getAttribute('stroke-width'))>=1);assert.deepEqual(ring.anchor,point.anchor);assert.ok(c.layout.marks.indexOf(ring)<c.layout.marks.indexOf(point));}c.destroy();
 }finally{win.happyDOM.close();}
});

test('process explicit synchronization, whole undo and exported frames retain styles, timing and adjacent-pair meaning',()=>{
 const win=new Window(),saved={document:globalThis.document,XMLSerializer:globalThis.XMLSerializer};Object.assign(globalThis,{document:win.document,XMLSerializer:win.XMLSerializer});
 try{const w=presetWork('process-variation'),a=w.steps[0];a.doc.data[5].value+=.35;a.doc.unit='mL/s';a.doc.source={type:'user',name:'Reviewed process records'};w.steps[1].options.palette='cobalt';w.steps[1].duration=1800;w.steps[1].hold=2300;
  const preview=previewDataSync(w,a.id),target=preview.targets.find(t=>t.id===w.steps[1].id);assert.equal(target.eligible,true);const applied=applyDataSync(w,preview,[target.id]);assert.deepEqual(undoDataSync(applied.work,applied.transaction),w);assert.deepEqual(cleanWork(applied.work),applied.work);assert.deepEqual(applied.work.steps[0].doc.data,applied.work.steps[1].doc.data);assert.equal(applied.work.steps[1].options.palette,'cobalt');assert.equal(applied.work.steps[1].duration,1800);assert.equal(applied.work.steps[1].hold,2300);assert.equal(transitionPlan(...applied.work.steps,{steps:applied.work.steps}).mode,'morph');
  for(const s of applied.work.steps){assert.match(stepSVG(s,applied.work.steps),new RegExp(`data-view="${s.view}"`));}
  const renderer=new WorkFrameRenderer(win.document.createElement('div'),applied.work.steps,{width:800,height:440}),tl=workTimeline(applied.work),at=tl.segments[1].start+tl.segments[1].duration*.5;renderer.render(timelineFrame(tl,at));const paths=()=>[...renderer.host.querySelectorAll('[data-morph-shape]')].map(n=>({d:n.getAttribute('d'),fill:n.getAttribute('fill'),opacity:n.getAttribute('fill-opacity')})),frame=paths();assert.ok(frame.length);renderer.render(timelineFrame(tl,0));renderer.render(timelineFrame(tl,at));assert.deepEqual(paths(),frame);renderer.destroy();
  const brief=workAgentBrief(applied.work);assert.match(brief,/process-individual/);assert.match(brief,/process-imr/);assert.match(brief,/1\.128/);assert.match(brief,/3\.267/);assert.match(brief,/MR\[0\]/);
 }finally{Object.assign(globalThis,saved);win.happyDOM.close();}
});
