import {recordId} from '../../src/forma/data-identity.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {SeriesMorphChart,layoutSeries} from '../../src/forma/series-morph.js';
import {seriesViews,seriesDocument,seriesEligibility,seriesKey} from '../../src/forma/series-rules.js';
import {presetWork,stepDomain,transitionPlan,makeStep,availableTransitions,workReport} from '../../src/forma/work-model.js';
import {WorkStage} from '../../src/forma/work-player.js';
import {getExample} from '../../src/forma/catalog.js';

function clock(){
  const win=new Window(),host=win.document.createElement('div'),queue=new Map();let id=0;
  win.requestAnimationFrame=fn=>{queue.set(++id,fn);return id;};win.cancelAnimationFrame=id=>queue.delete(id);
  const advance=time=>{const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(time));};
  return {win,host,queue,advance};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≠ ${b}`);

test('six series encodings preserve observations and normalize each period from its actual total',()=>{
  const w=presetWork('series-revenue'),d=seriesDocument(w.steps[0]),original=structuredClone(d);
  for(const view of seriesViews){
    const l=layoutSeries(d,view.id,760,390);assert.equal(l.marks.length,d.data.length);
    for(const m of l.marks){assert.equal(m.points.length,128);assert.ok(m.points.every(p=>p.every(Number.isFinite)));assert.equal(m.value,d.data.find(r=>recordId(r)===m.key).value);}
    if(view.id==='percent-columns')for(const p of ['Q1','Q2','Q3','Q4']){const marks=l.marks.filter(m=>m.period===p);near(marks.reduce((s,m)=>s+m.geometry.height,0),l.plot.h-8);near(marks.reduce((s,m)=>s+m.share,0),1);}
    if(view.id==='stacked-columns')for(const p of ['Q1','Q2','Q3','Q4']){const marks=l.marks.filter(m=>m.period===p);near(marks[0].geometry.y,marks[1].geometry.y+marks[1].geometry.height);}
  }
  assert.deepEqual(d,original);assert.equal(workReport(w).valid,true);
  near(stepDomain(w.steps[0],w.steps)[1],192);assert.deepEqual(stepDomain(w.steps[2],w.steps),[0,100]);
});

test('signed series retain gaps and reject unsuitable share views, incomplete pairs and duplicate keys',()=>{
  const d=seriesDocument(presetWork('series-change').steps[0]),l=layoutSeries(d,'multi-line',740,340);
  const gap=l.marks.find(m=>m.period==='3月'&&m.series==='业务 A');assert.equal(gap.value,null);assert.equal(new Set(gap.points.map(p=>p.join(','))).size,1);
  const before=l.marks.find(m=>m.period==='2月'&&m.series==='业务 A'),after=l.marks.find(m=>m.period==='4月'&&m.series==='业务 A');
  near(before.geometry.right[0],before.geometry.cx);near(after.geometry.left[0],after.geometry.cx);
  for(const id of ['percent-columns','stacked-columns','stacked-area','percent-area'])assert.equal(seriesEligibility(d,id).valid,false);
  assert.equal(seriesEligibility({...d,data:d.data.slice(1)},'multi-line').valid,false);
  assert.equal(seriesEligibility({...d,data:[...d.data,d.data[0]]},'multi-line').valid,false);
  const positive=seriesDocument(presetWork('series-revenue').steps[0]);positive.data.filter(r=>r.period==='Q1').forEach(r=>r.value=0);assert.equal(seriesEligibility(positive,'percent-columns').valid,false);assert.equal(seriesEligibility(positive,'grouped-columns').valid,true);
});

test('every series-to-series pair keeps actual SVG nodes, series colors and exact endpoint geometry',()=>{
  const c=clock(),work=presetWork('series-revenue'),doc=seriesDocument(work.steps[0]);
  try{
    for(const from of seriesViews)for(const to of seriesViews){
      const a={...work.steps[0],view:from.id},b={...work.steps[1],view:to.id};
      const chart=new SeriesMorphChart(c.host,doc,{width:800,height:370,view:from.id,reducedMotion:false});
      const key=recordId(doc.data[0]),node=chart.nodes.get(key).shape,fill=node.getAttribute('fill'),plan=transitionPlan(a,b);
      assert.equal(plan.mode,'morph');chart.setDocument(doc,to.id,{duration:1000,effect:'guided',recipe:plan.recipe});c.advance(0);c.advance(450);
      assert.equal(chart.nodes.get(key).shape,node);assert.equal(node.getAttribute('fill'),fill);assert.equal(chart.animating,true);
      c.advance(1000);assert.equal(chart.animating,false);for(const m of chart.layout.marks)assert.deepEqual(chart.current.get(m.key),m.points);
      chart.destroy();assert.equal(c.queue.size,0);
    }
  }finally{c.win.happyDOM.close();}
});

test('series animation can be interrupted, including reordered observations and entering series',()=>{
  const c=clock(),doc=seriesDocument(presetWork('series-revenue').steps[0]);
  const chart=new SeriesMorphChart(c.host,doc,{width:800,height:370,view:'grouped-columns',reducedMotion:false});
  try{
    const key=recordId(doc.data[0]),node=chart.nodes.get(key).shape,next=structuredClone(doc);
    next.data=next.data.toReversed();next.data.filter(r=>r.series==='线上').forEach(r=>{r.series='海外';r.label=seriesKey(r.period,r.series);r.value+=9;});
    chart.setDocument(next,'stacked-columns');c.advance(0);c.advance(550);chart.setDocument(doc,'multi-line');c.advance(600);c.advance(2100);
    assert.equal(chart.nodes.get(key).shape,node);assert.equal(chart.nodes.size,doc.data.length);assert.equal(chart.animating,false);
    for(const m of chart.layout.marks)assert.deepEqual(chart.current.get(m.key),m.points);
  }finally{chart.destroy();assert.equal(c.queue.size,0);c.win.happyDOM.close();}
});

test('independent native charts run their own growth tracks during all full-scene transition choices',()=>{
  const c=clock(),original=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:c.win.document,configurable:true});
  try{
    for(const effect of ['auto','entrance','slide','gather','fade']){
      const a=makeStep({doc:getExample('column')}),b=makeStep({doc:getExample('variwide'),transition:effect,duration:1000});
      const stage=new WorkStage(c.host,a,{steps:[a,b]});const plan=stage.go(b);assert.equal(plan.mode,'gather');c.advance(0);c.advance(280);
      const chart=stage.scene,marks=chart.layout.marks.filter(m=>m.role==='business-variwide-record'),nodes=marks.map(m=>chart.nodes.get(m.key).shape);
      const area=points=>Math.abs(points.reduce((sum,[x,y],i)=>{const [nx,ny]=points[(i+1)%points.length];return sum+x*ny-y*nx;},0))/2;
      assert.equal(marks.length,b.doc.data.length);assert.equal(chart.svg.dataset.view,'complete-business-variwide');assert.ok(marks.every(m=>area(chart.current.get(m.key))<1e-6));
      c.advance(500);const middle=marks.map(m=>area(chart.current.get(m.key)));assert.ok(middle.some(v=>v>0));assert.equal(chart.svg.dataset.entranceProgress,String((.5-.28)/.72));
      c.advance(1000);assert.ok(marks.some((m,i)=>area(chart.current.get(m.key))>middle[i]));
      for(const [i,m] of marks.entries()){assert.equal(chart.nodes.get(m.key).shape,nodes[i]);assert.deepEqual(chart.current.get(m.key),m.points);}
      assert.equal(stage.busy,false);assert.equal(c.host.querySelector('[data-wp-title]').textContent,b.doc.title);
      stage.go(a);c.advance(1100);c.advance(1450);stage.go(b);c.advance(1500);c.advance(2500);assert.equal(stage.busy,false);assert.equal(stage.scene.doc.title,b.doc.title);
      stage.destroy();assert.equal(c.queue.size,0);
    }
  }finally{if(original)Object.defineProperty(globalThis,'document',original);else delete globalThis.document;c.win.happyDOM.close();}
});

test('a correspondence claim never overrides units; unsupported morph effects are visibly unavailable',()=>{
  const [a,b]=presetWork('series-revenue').steps;b.dataGroup='independent';
  assert.equal(transitionPlan(a,b).effect,'entrance');assert.equal(availableTransitions(a,b).find(v=>v.id==='arc').disabled,true);
  b.relation='related';b.transition='arc';b.duration=2400;assert.equal(transitionPlan(a,b).mode,'morph');const reverse=transitionPlan(b,a,{steps:[a,b]});assert.equal(reverse.mode,'morph');assert.equal(reverse.effect,'arc');assert.equal(reverse.duration,2400);b.doc.unit='件';assert.equal(transitionPlan(a,b).mode,'gather');
});

test('dense data keep all 144 observations and a wrapped legend clear of the plot',()=>{
  const doc=seriesDocument(presetWork('series-revenue').steps[0]);doc.data=Array.from({length:24},(_,i)=>Array.from({length:6},(_,j)=>{const period=`第${i+1}月`,series=`这是一条较长的业务线名称${j+1}`;return {period,series,label:seriesKey(period,series),value:i+j+1,row:i*6+j};})).flat();
  for(const view of seriesViews){const layout=layoutSeries(doc,view.id,320,200);assert.equal(layout.marks.length,144);assert.ok(layout.seriesLegend.every(e=>e.y<layout.plot.y-10));assert.ok(layout.marks.every(m=>m.points.every(p=>p.every(Number.isFinite))));}
});
