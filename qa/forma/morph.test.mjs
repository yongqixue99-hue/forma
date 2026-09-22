import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {MorphChart,layoutMorph,morphExample,morphViews,validateMorphDocument} from '../../src/forma/morph.js';

const close=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b)),`${a} ≈ ${b}`);
const polygonArea=points=>Math.abs(points.reduce((sum,[x,y],i)=>{const [nx,ny]=points[(i+1)%points.length];return sum+x*ny-y*nx;},0))/2;
function fixture(options={}){
  const win=new Window(),host=win.document.createElement('div'),queue=new Map(),notifications=[];let count=0;
  win.document.body.append(host);
  win.requestAnimationFrame=callback=>{queue.set(++count,callback);return count;};win.cancelAnimationFrame=id=>queue.delete(id);
  const chart=new MorphChart(host,structuredClone(morphExample),{width:800,height:360,reducedMotion:false,onChange:event=>notifications.push(event),...options});
  return {win,host,chart,queue,notifications,advance(time){const callbacks=[...queue.values()];queue.clear();for(const callback of callbacks)callback(time);}};
}

test('all morph encodings preserve all records and finite closed contours at desktop and narrow sizes',()=>{
  for(const view of morphViews)for(const [w,h]of [[300,340],[464,340],[800,360]]){
    const layout=layoutMorph(morphExample,view.id,w,h);
    assert.equal(layout.total,100);assert.equal(layout.marks.length,6);assert.equal(new Set(layout.marks.map(mark=>mark.key)).size,6);
    for(const [i,mark]of layout.marks.entries()){
      assert.equal(mark.points.length,view.id==='unit'?mark.value*20:128);assert.equal(mark.value,morphExample.data[i].value);
      for(const [x,y]of mark.points){assert.ok(Number.isFinite(x)&&Number.isFinite(y));assert.ok(x>=0&&x<=w);assert.ok(y>=0&&y<=h);}
    }
  }
});

test('bars share a zero baseline, bubbles encode area, sectors encode share and treemaps partition exactly',()=>{
  for(const [w,h]of [[300,340],[800,360]]){
    const bars=layoutMorph(morphExample,'bars',w,h).marks;
    for(const mark of bars){close(mark.geometry.x,bars[0].geometry.x);close(mark.geometry.width/mark.value,bars[0].geometry.width/bars[0].value);}
    const bubbles=layoutMorph(morphExample,'bubbles',w,h).marks;
    for(const [i,mark]of bubbles.entries()){
      close(mark.geometry.area/mark.value,bubbles[0].geometry.area/bubbles[0].value);
      close(polygonArea(mark.points),mark.geometry.area,.0005);
      for(const next of bubbles.slice(i+1))assert.ok(Math.hypot(mark.geometry.cx-next.geometry.cx,mark.geometry.cy-next.geometry.cy)>=mark.geometry.r+next.geometry.r-1e-8);
    }
    const donut=layoutMorph(morphExample,'donut',w,h).marks;
    for(const mark of donut){close(mark.geometry.a1-mark.geometry.a0,mark.value/100*Math.PI*2);close(mark.geometry.area/mark.value,donut[0].geometry.area/donut[0].value);close(polygonArea(mark.points),mark.geometry.area,.0005);}
    close(donut.at(-1).geometry.a1-donut[0].geometry.a0,Math.PI*2);
    const tree=layoutMorph(morphExample,'treemap',w,h);
    close(tree.marks.reduce((sum,mark)=>sum+mark.geometry.area,0),tree.plot.w*tree.plot.h);
    for(const mark of tree.marks){close(mark.geometry.area/mark.value,tree.marks[0].geometry.area/tree.marks[0].value);close(polygonArea(mark.points),mark.geometry.area);}
  }
});

test('each SVG path survives cross-type morphs and retains category color and exact value',()=>{
  const f=fixture(),nodes=new Map([...f.host.querySelectorAll('path[data-key]')].map(node=>[node.dataset.key,{node,color:node.getAttribute('stroke'),value:node.parentElement.getAttribute('aria-label')}]));
  for(const view of morphViews){
    f.chart.setView(view.id);f.advance(0);f.advance(1500);
    for(const [key,before]of nodes){const node=f.host.querySelector(`path[data-key="${key}"]`);assert.equal(node,before.node);assert.equal(node.getAttribute('stroke'),before.color);assert.equal(node.parentElement.getAttribute('aria-label'),before.value);}
    assert.equal(f.chart.animating,false);
    assert.deepEqual(f.notifications.at(-1),{view:view.id,animating:false});
  }
  f.chart.destroy();
});

test('a rapid retarget starts from the visible contour and stale callbacks cannot overwrite it',()=>{
  const f=fixture(),path=f.host.querySelector('path[data-key]'),initial=path.getAttribute('d');
  f.chart.setView('bubbles');f.advance(0);f.advance(600);
  const middle=path.getAttribute('d'),stale=[...f.queue.values()][0];assert.notEqual(middle,initial);
  f.chart.setView('donut');assert.equal(path.getAttribute('d'),middle);assert.equal(f.queue.size,1);
  stale(1500);assert.equal(path.getAttribute('d'),middle);assert.equal(f.chart.view,'donut');
  f.advance(700);assert.equal(path.getAttribute('d'),middle);f.advance(2200);
  assert.equal(f.chart.animating,false);assert.equal(f.queue.size,0);assert.equal(f.chart.view,'donut');
  for(const mark of f.chart.layout.marks)assert.deepEqual(f.chart.current.get(mark.key),mark.points);
  f.chart.destroy();
});

test('the slow 2400 ms setting is respected and explicit static selection finishes a current animation',()=>{
  const f=fixture();f.chart.setView('treemap',{duration:2400});f.advance(0);f.advance(1600);assert.equal(f.chart.animating,true);
  f.chart.setView('treemap',{animate:false});assert.equal(f.chart.animating,false);assert.equal(f.queue.size,0);
  for(const mark of f.chart.layout.marks)assert.deepEqual(f.chart.current.get(mark.key),mark.points);
  f.chart.destroy();
});

test('reduced motion uses final geometry immediately without scheduling frames',()=>{
  const f=fixture({reducedMotion:true});f.chart.setView('donut');assert.equal(f.queue.size,0);assert.equal(f.chart.animating,false);
  for(const mark of f.chart.layout.marks)assert.deepEqual(f.chart.current.get(mark.key),mark.points);
  f.chart.destroy();
});

test('setData validates before changing the scene, preserves keyed nodes and never mutates its input',()=>{
  const f=fixture(),before=f.chart.doc,oldPath=f.host.querySelector('path[data-key="设计"]'),bad=structuredClone(morphExample);bad.data[0].value=NaN;
  assert.throws(()=>f.chart.setData(bad));assert.equal(f.chart.doc,before);assert.equal(f.host.querySelector('path[data-key="设计"]'),oldPath);
  const next=structuredClone(morphExample);next.data[0].value=35;f.chart.setData(next);assert.equal(f.host.querySelector('path[data-key="设计"]'),oldPath);next.data[0].value=99;assert.equal(f.chart.doc.data[0].value,35);
  f.advance(0);f.advance(1500);assert.equal(f.chart.layout.total,107);assert.equal(f.chart.animating,false);
  f.chart.destroy();
});

test('invalid units, provenance, duplicates, row counts and nonfinite values are rejected',()=>{
  const invalid=[doc=>doc.unit='',doc=>doc.source={name:'unknown'},doc=>doc.source.name='',doc=>doc.data.splice(1),doc=>doc.data[1].label=doc.data[0].label,...[NaN,Infinity,'8',1e16].map(value=>doc=>doc.data[0].value=value)];
  for(const mutate of invalid){const doc=structuredClone(morphExample);mutate(doc);assert.throws(()=>validateMorphDocument(doc));}
  const eight=structuredClone(morphExample);eight.data.push({label:'自然',value:4},{label:'历史',value:3});assert.equal(validateMorphDocument(eight),true);
});

test('destroy cancels pending work, removes owned SVG and makes stale callbacks harmless',()=>{
  const f=fixture();f.chart.setView('bubbles');f.advance(0);const stale=[...f.queue.values()][0],events=f.notifications.length;
  f.chart.destroy();assert.equal(f.queue.size,0);assert.equal(f.host.childElementCount,0);stale(1500);f.chart.setView('donut');f.chart.resize();
  assert.equal(f.notifications.length,events);assert.equal(f.chart.nodes.size,0);assert.equal(f.chart.current.size,0);
});

test('reordering records preserves their keyed color and tooltip keeps unrounded raw values',()=>{
  const f=fixture(),path=f.host.querySelector('path[data-key="设计"]'),color=path.getAttribute('stroke'),doc=structuredClone(morphExample);
  doc.data[0].value=28.123456;doc.data.reverse();f.chart.setData(doc);
  assert.equal(f.host.querySelector('path[data-key="设计"]'),path);assert.equal(path.getAttribute('stroke'),color);
  assert.match(path.parentElement.querySelector('title').textContent,/28\.123456/);
  f.chart.setView('bubbles',{animate:false});assert.equal(path.getAttribute('stroke'),color);f.chart.destroy();
});

test('theme changes during a transition preserve geometry and valid interruption behavior',()=>{
  const f=fixture(),path=f.host.querySelector('path[data-key="设计"]');f.chart.setView('bubbles');f.advance(0);f.advance(500);
  const geometry=path.getAttribute('d'),oldColor=path.getAttribute('stroke');f.chart.setPalette('cobalt',true);
  assert.equal(path.getAttribute('d'),geometry);assert.notEqual(path.getAttribute('stroke'),oldColor);assert.equal(f.chart.animating,true);
  f.advance(1500);assert.equal(f.chart.animating,false);assert.equal(f.chart.guideLayer.getAttribute('opacity'),'1');assert.equal(f.chart.labelLayer.getAttribute('opacity'),'1');f.chart.destroy();
});

test('unchanged resize notifications do not terminate a running morph',()=>{
  const f=fixture();f.chart.setView('bubbles');f.advance(0);f.advance(500);const points=f.host.querySelector('path[data-key]').getAttribute('d'),frame=[...f.queue.values()][0];
  f.chart.resize();assert.equal(f.chart.animating,true);assert.equal([...f.queue.values()][0],frame);assert.equal(f.host.querySelector('path[data-key]').getAttribute('d'),points);
  f.advance(1500);assert.equal(f.chart.animating,false);f.chart.destroy();
});

test('small positive observations remain visibly positive rather than rounding to zero',()=>{
  const doc=structuredClone(morphExample);doc.data[0].value=.001;
  const layout=layoutMorph(doc,'bars',800,360);assert.equal(layout.marks[0].label.text,'0.001');
});

test('added views retain zero-based height and proportional sector or rectangle area',()=>{
  for(const view of ['columns','pie','rose','stacked']){
    const {marks}=layoutMorph(morphExample,view,800,360),first=marks[0];
    if(view==='columns')for(const mark of marks){close(mark.geometry.baseline,first.geometry.baseline);close(mark.geometry.height/mark.value,first.geometry.height/first.value);}
    else for(const mark of marks){close(mark.geometry.area/mark.value,first.geometry.area/first.value);close(polygonArea(mark.points),mark.geometry.area,.0005);}
    if(view==='rose')for(const mark of marks)close(mark.geometry.a1-mark.geometry.a0,Math.PI*2/marks.length);
    if(view==='pie')for(const mark of marks)assert.equal(mark.geometry.r0,0);
  }
});

test('five motion paths differ during the transition and settle to identical data geometry',()=>{
  const midpoints=[];
  for(const effect of ['smooth','cascade','arc','gather','turn']){
    const f=fixture({effect});f.chart.setView('columns');f.advance(0);f.advance(600);midpoints.push(f.host.querySelector('path[data-key="生活"]').getAttribute('d'));
    assert.doesNotMatch(f.host.innerHTML,/NaN|Infinity/);f.chart.setView('rose');f.advance(700);f.advance(2200);
    for(const mark of f.chart.layout.marks)assert.deepEqual(f.chart.current.get(mark.key),mark.points);assert.equal(f.chart.animating,false);f.chart.destroy();
  }
  assert.equal(new Set(midpoints).size,5);
});

test('forward and reverse endpoints retain the settled fill and hatch appearance',async()=>{
  const f=fixture({view:'columns'}),style=chart=>[...chart.nodes].map(([key,n])=>[key,n.shape.getAttribute('fill'),n.shape.getAttribute('fill-opacity'),n.shape.getAttribute('stroke-width'),n.texture.getAttribute('opacity')]);
  const column=style(f.chart),forward=f.chart.setDocument(morphExample,'line',{manual:true,effect:'guided',recipe:'endpoints'});
  forward(0);assert.deepEqual(style(f.chart),column);forward(1);const line=style(f.chart);
  const reverse=f.chart.setDocument(morphExample,'columns',{manual:true,effect:'guided',recipe:'endpoints'});reverse(0);assert.deepEqual(style(f.chart),line);reverse(.5);reverse(1);assert.deepEqual(style(f.chart),column);reverse(0);assert.deepEqual(style(f.chart),line);
  f.chart.destroy();await f.win.happyDOM.close();
});
