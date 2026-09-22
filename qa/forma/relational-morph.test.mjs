import {payload} from './payload.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';
import {pairedViews,hierarchyViews,relationalDocument,relationalEligibility,relationKey} from '../../src/forma/relational-rules.js';
import {layoutPaired,PairedMorphChart} from '../../src/forma/paired-morph.js';
import {layoutHierarchy,HierarchyMorphChart} from '../../src/forma/hierarchy-morph.js';
import {makeStep,morphReady,stepView,stepMorphDocument,presetWork,transitionPlan,stepDomain,replaceStepData,stepReport} from '../../src/forma/work-model.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {workAgentBrief} from '../../src/forma/work-export.js';

const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} ≠ ${b}`);
const finite=layout=>layout.marks.forEach(m=>{assert.equal(m.points.length,128);assert.ok(m.points.every(p=>p.every(Number.isFinite)));});
const center=points=>points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[1]/points.length],[0,0]);

test('five native templates map full paired or hierarchical records without dropping fields',()=>{
  for(const id of ['slope','dumbbell','paired','sunburst','icicle']){const doc=getExample(id),s=makeStep({doc}),mapped=stepMorphDocument(s);assert.equal(morphReady(s),true,id);assert.deepEqual(payload(s.doc),payload(doc));assert.equal(mapped.data.length,doc.data.length);mapped.data.forEach((r,i)=>{if(mapped.family==='paired'){assert.equal(r.before,doc.data[i].before);assert.equal(r.after,doc.data[i].after);}else{assert.equal(r.parent,doc.data[i].parent);assert.equal(r.child,doc.data[i].label);assert.equal(r.value,doc.data[i].value);}assert.equal(r.row,i);});}
});

test('paired layouts keep negative values, zero change and complete raw pairs; large tables use appropriate views',()=>{
  const d=relationalDocument(presetWork('paired-evaluation').steps[0]);d.data.slice(0,3).forEach((r,i)=>{r.before=[-8,0,10][i];r.after=[4,0,-12][i];});
  for(const v of pairedViews){assert.equal(relationalEligibility(d,v.id).valid,true);finite(layoutPaired(d,v.id,600,350));}
  const change=layoutPaired(d,'paired-change',600,350),ends=change.rowEnds;
  const scale=(ends[0].a[1]-ends[0].b[1])/(d.data[0].after-d.data[0].before);
  ends.forEach(({a,b,row})=>{near((a[1]-b[1])/scale,row.after-row.before);near(a[1],ends[0].a[1]);});
  const large=relationalDocument(makeStep({doc:getExample('paired')}));assert.equal(large.data.length,20);
  assert.equal(relationalEligibility(large,'paired-slope').valid,false);assert.equal(relationalEligibility(large,'paired-points').valid,true);assert.equal(relationalEligibility(large,'paired-change').valid,true);
  large.data[0].after=null;assert.equal(relationalEligibility(large,'paired-points').valid,false);
  const duplicate=structuredClone(d);duplicate.data[1].label=duplicate.data[0].label;assert.equal(relationalEligibility(duplicate,'paired-slope').valid,false);
});

test('all 26 ordered directions work, including A to C, retaining actual nodes through reverse seeking',()=>{
  const win=new Window();let directions=0;
  for(const id of ['paired-evaluation','research-budget']){
    const work=presetWork(id),Renderer=id==='paired-evaluation'?PairedMorphChart:HierarchyMorphChart;
    for(const from of work.steps)for(const to of work.steps){if(from.id===to.id)continue;directions++;
      const plan=transitionPlan(from,to,{steps:work.steps});assert.equal(plan.mode,'morph');
      const host=win.document.createElement('div'),chart=new Renderer(host,stepMorphDocument(from),{view:stepView(from),width:760,height:390,domain:stepDomain(from,work.steps)});
      const identities=new Map([...chart.nodes].map(([key,n])=>[key,n.shape]));const seek=chart.setDocument(stepMorphDocument(to),stepView(to),{manual:true,effect:plan.effect,recipe:plan.recipe,domain:stepDomain(to,work.steps)});
      seek(.37);const middle=[...chart.current].map(([k,p])=>[k,structuredClone(p)]);seek(1);seek(.37);assert.deepEqual([...chart.current],middle);
      for(const [key,node]of identities)assert.equal(chart.nodes.get(key).shape,node);
      seek(1);chart.layout.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));finite(chart.layout);chart.destroy();
    }
  }
  assert.equal(directions,26);win.happyDOM.close();
});

test('paired connectors follow both endpoints during smooth, cascade, arc and turn transitions',()=>{
  const win=new Window(),d=relationalDocument(presetWork('paired-evaluation').steps[0]);
  for(const effect of ['guided','smooth','cascade','arc','turn']){
    const chart=new PairedMorphChart(win.document.createElement('div'),d,{view:'paired-slope',width:760,height:390});
    const seek=chart.setDocument(d,'paired-dumbbell',{manual:true,effect,recipe:'paired-reorient'});seek(.46);
    for(const row of d.data){const line=chart.current.get(relationKey(row._id,'link'));for(const field of ['before','after']){const c=center(chart.current.get(relationKey(row._id,field))),distance=Math.min(...line.map(p=>Math.hypot(p[0]-c[0],p[1]-c[1])));assert.ok(distance<.6,`${effect} ${row.label}/${field}: ${distance}`);}}
    chart.destroy();
  }
  win.happyDOM.close();
});

test('transition endpoints preserve visible parent bands and hollow paired markers',()=>{
  const win=new Window(),tree=relationalDocument(presetWork('research-budget').steps[0]);
  const chart=new HierarchyMorphChart(win.document.createElement('div'),tree,{view:'hierarchy-sunburst'}),parent=chart.nodes.get(relationKey('parent',tree.data.find(r=>r.parent==='实验')._parentId)).shape;
  const seek=chart.setDocument(tree,'hierarchy-treemap',{manual:true});seek(0);near(Number(parent.getAttribute('fill-opacity')),.87);seek(.5);assert.ok(Number(parent.getAttribute('fill-opacity'))<.1);seek(1);near(Number(parent.getAttribute('fill-opacity')),0);seek(0);near(Number(parent.getAttribute('fill-opacity')),.87);chart.destroy();
  const pair=relationalDocument(presetWork('paired-evaluation').steps[0]),paired=new PairedMorphChart(win.document.createElement('div'),pair,{view:'paired-slope'}),node=paired.nodes.get(relationKey(pair.data[0]._id,'before')).shape;
  const frame=paired.setDocument(pair,'paired-bars',{manual:true});frame(0);near(Number(node.getAttribute('stroke-width')),1.3);const first=node.getAttribute('fill');frame(1);near(Number(node.getAttribute('stroke-width')),0);assert.notEqual(node.getAttribute('fill'),first);paired.destroy();win.happyDOM.close();
});

test('hierarchy angles, widths and leaf areas use exactly the same totals and parent sums',()=>{
  const d=relationalDocument(presetWork('research-budget').steps[0]),total=d.data.reduce((s,r)=>s+r.value,0);
  for(const v of hierarchyViews){const l=layoutHierarchy(d,v.id,820,420);finite(l);near(l.total,total);
    const leaves=l.marks.filter(m=>!m.branch);assert.equal(leaves.length,d.data.length);
    for(const leaf of leaves){const g=leaf.geometry;if(g.type==='sector')near((g.a1-g.a0)/(Math.PI*2),leaf.value/total);else if(v.id==='hierarchy-icicle')near(g.width/l.plot.w,leaf.value/total);else near(g.width*g.height/(l.plot.w*l.plot.h),leaf.value/total);}
    l.marks.filter(m=>m.branch).forEach(m=>near(m.value,leaves.filter(r=>r.parent===m.parent).reduce((s,r)=>s+r.value,0)));
  }
});

test('identical child names stay separate; renaming a stored record preserves its identity',()=>{
  const doc=getExample('icicle');doc.data[0].label='公共项';doc.data[3].label='公共项';const from=makeStep({doc,dataGroup:'tree'}),to=makeStep({doc,dataGroup:'tree',view:'hierarchy-sunburst'});
  const mapped=relationalDocument(from);assert.equal(new Set(mapped.data.map(r=>r.label)).size,doc.data.length);assert.equal(transitionPlan(from,to).matched.length,doc.data.length);
  to.doc.data[0].label='新子项';const plan=transitionPlan(from,to);assert.equal(plan.matched.length,doc.data.length);
  const win=new Window(),chart=new HierarchyMorphChart(win.document.createElement('div'),mapped,{view:'hierarchy-icicle'});const seek=chart.setDocument(relationalDocument(to),'hierarchy-sunburst',{manual:true});seek(1);seek(0);seek(.5);assert.doesNotMatch(chart.svg.outerHTML,/NaN|undefined|Infinity/);chart.destroy();win.happyDOM.close();
});

test('cross-family, unrelated and different-unit steps use native entrance instead of false morphing',()=>{
  const a=presetWork('paired-evaluation').steps[0],tree=presetWork('research-budget').steps[0];tree.relation='related';tree.doc.unit=a.doc.unit;assert.equal(transitionPlan(a,tree).effect,'entrance');
  const b=structuredClone(a);b.id='other';b.dataGroup='other';assert.equal(transitionPlan(a,b).effect,'entrance');b.relation='related';assert.equal(transitionPlan(a,b).mode,'morph');b.doc.unit='秒';assert.equal(transitionPlan(a,b).effect,'entrance');b.doc.unit=a.doc.unit;b.doc.periodLabels=[...a.doc.periodLabels].reverse();assert.equal(transitionPlan(a,b).effect,'entrance');assert.match(transitionPlan(a,b).reason,/顺序/);
});

test('replacing data preserves all pairs and only keeps views that can render the full input',()=>{
  const small=presetWork('paired-evaluation').steps[0],source={doc:getExample('paired')},updated=replaceStepData(small,source);
  assert.equal(updated.doc.data.length,20);assert.equal(stepView(updated),'paired-points');assert.equal(stepReport(updated).valid,true);
  const retained=replaceStepData(presetWork('paired-evaluation').steps[4],source);assert.equal(retained.view,'paired-change');assert.deepEqual(payload(retained.doc.data),payload(source.doc.data));assert.equal(stepReport(retained).valid,true);
});

test('paired and hierarchical charts have native entrance and use the shared export frame geometry',()=>{
  const win=new Window();
  for(const id of ['paired-evaluation','paired-study','research-budget']){
    const work=presetWork(id),a=work.steps[0],b=work.steps.at(-1),host=win.document.createElement('div'),renderer=new WorkFrameRenderer(host,work.steps,{width:700,height:380});
    const frame={from:a,step:b,index:work.steps.length-1,phase:'transition',progress:.4,plan:transitionPlan(a,b,{steps:work.steps})};
    renderer.render(frame);const middle=host.querySelector('[data-morph-marks]').innerHTML;renderer.render({...frame,progress:1});renderer.render(frame);assert.equal(host.querySelector('[data-morph-marks]').innerHTML,middle);
    renderer.destroy();const intro=new WorkFrameRenderer(host,[a],{width:700,height:380});intro.render({step:a,index:0,phase:'entrance',progress:0});const start=host.querySelector('[data-morph-marks]').innerHTML;intro.render({step:a,index:0,phase:'entrance',progress:1});assert.notEqual(host.querySelector('[data-morph-marks]').innerHTML,start);intro.destroy();
    const brief=workAgentBrief(work);assert.match(brief,/前后|层级|配对/);assert.ok(brief.includes(JSON.stringify(work.steps[0].doc.data[0].label)));
  }
  win.happyDOM.close();
});

test('sunburst bands unroll without folding through their own contour, in both directions',()=>{
  const doc=relationalDocument(presetWork('research-budget').steps[0]),ring=layoutHierarchy(doc,'hierarchy-sunburst',1000,500);
  const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  function crossed(points){for(let i=0;i<points.length;i++)for(let j=i+2;j<points.length;j++){if(i===0&&j===points.length-1)continue;const a=points[i],b=points[(i+1)%points.length],c=points[j],d=points[(j+1)%points.length];if(orient(a,b,c)*orient(a,b,d)<-1e-9&&orient(c,d,a)*orient(c,d,b)<-1e-9)return true;}return false;}
  for(const view of ['hierarchy-icicle','hierarchy-treemap']){const target=layoutHierarchy(doc,view,1000,500);for(const mark of ring.marks){const next=target.marks.find(m=>m.key===mark.key);for(const q of [.25,.5,.75]){const points=HierarchyMorphChart.prototype.interpolateMark(mark,next,q),back=HierarchyMorphChart.prototype.interpolateMark(next,mark,1-q);assert.equal(crossed(points),false,`${view} ${mark.key} ${q}`);assert.deepEqual(points,back);}}}
});

test('interrupting an unrolling band keeps its two-arc correspondence on the way to a rectangle',()=>{
  const win=new Window(),doc=relationalDocument(presetWork('research-budget').steps[0]);
  const chart=new HierarchyMorphChart(win.document.createElement('div'),doc,{view:'hierarchy-sunburst',width:1000,height:500});
  chart.setDocument(doc,'hierarchy-icicle',{manual:true})(.5);
  const before=new Map([...chart.current].map(([k,p])=>[k,structuredClone(p)]));
  const frame=chart.setDocument(doc,'hierarchy-treemap',{manual:true,resume:true});
  assert.deepEqual(chart.current,before);
  assert.equal(chart.resumedBandContour,true);
  for(const q of [.25,.5,.75]){
    frame(q);
    for(const mark of chart.layout.marks){
      const p=chart.current.get(mark.key),orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      for(let i=0;i<p.length;i++)for(let j=i+2;j<p.length;j++){
        if(i===0&&j===p.length-1)continue;
        const a=p[i],b=p[(i+1)%p.length],c=p[j],d=p[(j+1)%p.length];
        assert.ok(!(orient(a,b,c)*orient(a,b,d)<-1e-9&&orient(c,d,a)*orient(c,d,b)<-1e-9),`band crosses itself at ${mark.key}/${i}/${j}`);
      }
    }
  }
  frame(1);for(const mark of chart.layout.marks)assert.deepEqual(chart.current.get(mark.key),mark.points);
  chart.destroy();win.happyDOM.close();
});
