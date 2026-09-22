import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {presetWork} from '../../src/forma/work-model.js';
import {workTimeline} from '../../src/forma/work-timeline.js';
import {mountWorkPlayer} from '../../src/forma/work-player.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';

const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function intersections(points){
  let count=0;
  for(let i=0;i<points.length;i++)for(let j=i+2;j<points.length;j++){
    if(i===0&&j===points.length-1)continue;
    const a=points[i],b=points[(i+1)%points.length],c=points[j],d=points[(j+1)%points.length];
    if(cross(a,b,c)*cross(a,b,d)<-1e-7&&cross(c,d,a)*cross(c,d,b)<-1e-7)count++;
  }
  return count;
}

test('mid-transition retarget to raincloud keeps visible density contours untwisted',()=>{
  const win=new Window(),previous={window:globalThis.window,document:globalThis.document},queue=new Map();let next=0;
  Object.assign(globalThis,{window:win,document:win.document});
  win.requestAnimationFrame=fn=>{queue.set(++next,fn);return next;};win.cancelAnimationFrame=id=>queue.delete(id);
  const advance=time=>{const pending=[...queue.values()];queue.clear();pending.forEach(fn=>fn(time));};
  const work=presetWork('sample-distributions');work.steps=[work.steps[0],work.steps[1],work.steps.at(-1)];
  const timeline=workTimeline(work),segment=timeline.segments[1],host=win.document.createElement('div');
  const player=mountWorkPlayer(host,work);
  try{
    player.seek(segment.start+segment.duration*.5);player.select(work.steps.at(-1).id);advance(0);
    for(const fraction of [.25,.5,.75]){
      advance(segment.duration*fraction);
      const outlines=[...host.querySelectorAll('[data-science-role="density"] [data-morph-shape]')];
      assert.ok(outlines.length>0);
      for(const outline of outlines){
        const numbers=outline.getAttribute('d').match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi).map(Number);
        const points=Array.from({length:numbers.length/2},(_,i)=>numbers.slice(i*2,i*2+2));
        assert.equal(intersections(points),0,`${fraction*100}% density ${outline.dataset.key} folds across itself`);
      }
    }
  }finally{player.destroy();Object.assign(globalThis,previous);win.happyDOM.close();}
});

test('density rotates in both directions and can be interrupted again without changing nodes or folding',()=>{
  const win=new Window(),work=presetWork('sample-distributions'),doc=scientificDocument(work.steps[0]);
  for(const width of [340,900])for(const start of ['sample-swarm','sample-box','sample-violin','sample-raincloud','sample-sd']){
    const host=win.document.createElement('div'),chart=new ScientificMorphChart(host,doc,{view:start,width,height:400});
    try{
      for(const target of ['sample-violin','sample-raincloud','sample-violin']){
        const before=new Map(chart.current),nodes=new Map([...chart.nodes].map(([k,n])=>[k,n.shape]));
        const seek=chart.setDocument(doc,target,{manual:true,resume:true});seek(0);
        assert.deepEqual(chart.current,before,'retarget begins at the displayed geometry');
        for(const q of [.25,.5,.75,1,.5]){
          seek(q);
          for(const m of chart.layout.marks.filter(m=>m.role==='density')){
            assert.equal(intersections(chart.current.get(m.key)),0,`${width}px ${start} → ${target} at ${q}`);
            assert.equal(chart.nodes.get(m.key).shape,nodes.get(m.key));
          }
        }
      }
    }finally{chart.destroy();}
  }
  win.happyDOM.close();
});
