import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {workTimeline,timelineFrame,timelineTime} from '../../src/forma/work-timeline.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {WorkStage,mountWorkPlayer} from '../../src/forma/work-player.js';
import {workVideoPlan,createWorkExportRenderer,encodeWorkMP4} from '../../src/forma/work-video.js';
import {presetWork,makeStep,newWork} from '../../src/forma/work-model.js';
import {catalog,getExample} from '../../src/forma/catalog.js';

let win;const globals=new Map();
before(()=>{win=new Window();for(const [k,v] of Object.entries({window:win,document:win.document,XMLSerializer:win.XMLSerializer})){globals.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}});
after(()=>{win.happyDOM.close();for(const [k,v] of globals){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}});
const host=()=>document.createElement('div');
const geometry=renderer=>[...renderer.scene.current].map(([key,points])=>[key,points]);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≠ ${b}`);

test('scientific intermediate positions are labelled in both playback and exported frames',()=>{
  const work=presetWork('probability-reliability'),timeline=workTimeline(work),segment=timeline.segments[1],element=host(),stage=new WorkStage(element,work.steps[0],{steps:work.steps}),output=createWorkExportRenderer(work);
  try{
    for(const p of [0,.25,.5,.75,1]){
      const time=segment.start+segment.duration*p;stage.seek(timelineFrame(timeline,time));
      const moving=p>0&&p<1;assert.equal(element.querySelector('[data-wp-meaning]').textContent.includes('停稳后读数'),moving);assert.equal(output.frame(time).includes('停稳后读数'),moving);
    }
  }finally{stage.destroy();output.destroy();}
});

test('responsive stage lays out its meaning and legend before measuring a seeked frame',()=>{
  const work=presetWork('public-penguins'),timeline=workTimeline(work),element=host(),stage=new WorkStage(element,work.steps[0],{steps:work.steps});
  // A browser flex stage gives the chart less room when the meaning note appears.
  Object.defineProperties(stage.graphic,{clientWidth:{get:()=>982},clientHeight:{get:()=>element.querySelector('[data-wp-meaning]').hidden?419:394}});
  try{
    stage.seek(timelineFrame(timeline,5600));const expected=geometry(stage.timelineRenderer);
    stage.seek(timelineFrame(timeline,11000));
    stage.seek(timelineFrame(timeline,5600));
    assert.ok(JSON.stringify(geometry(stage.timelineRenderer))===JSON.stringify(expected),'the same time must use the same geometry without waiting for ResizeObserver');
    assert.equal(stage.timelineRenderer.scene.svg.getAttribute('viewBox').split(' ').at(-1),'419');
    stage.seek(timelineFrame(timeline,4800));assert.match(element.querySelector('[data-wp-meaning]').textContent,/停稳后读数/);
  }finally{stage.destroy();}
});

test('timeline accounts for first entrance and every transition and hold, with exact finite boundaries',()=>{
  const work=presetWork('series-revenue');work.steps[0].duration=600;work.steps[1].duration=2400;work.steps[1].hold=4000;
  const t=workTimeline(work);assert.equal(t.duration,work.steps.reduce((sum,s)=>sum+s.duration+s.hold,0));
  for(const s of t.segments){
    assert.equal(timelineFrame(t,s.start).index,s.index);assert.equal(timelineFrame(t,s.start).progress,0);
    assert.equal(timelineFrame(t,s.settled).phase,'hold');assert.equal(timelineFrame(t,s.end-1).index,s.index);
  }
  assert.equal(timelineFrame(t,-50).time,0);assert.equal(timelineFrame(t,Infinity).progress,1);
  assert.equal(timelineFrame(t,t.duration).index,work.steps.length-1);
  work.steps[0].doc.title='changed';assert.notEqual(t.work.steps[0].doc.title,'changed');
  assert.equal(timelineTime(59999),'1:00.0');assert.equal(timelineTime(61550),'1:01.6');
});

test('all single and series presets seek reversibly with identical geometry regardless of history',()=>{
  for(const id of ['classic','monthly','independent','series-revenue','series-change']){
    const t=workTimeline(presetWork(id));
    const renderer=new WorkFrameRenderer(host(),t.work.steps,{width:900,height:450});
    try{
      for(const s of t.segments.filter(s=>s.plan?.mode==='morph')){
        const at=s.start+s.duration*.45;renderer.render(timelineFrame(t,at));const expected=geometry(renderer);
        const node=renderer.scene.nodes.values().next().value.shape;
        renderer.render(timelineFrame(t,s.settled));renderer.render(timelineFrame(t,at));
        assert.deepEqual(geometry(renderer),expected,`${id}:${s.index}`);assert.equal(renderer.scene.nodes.values().next().value.shape,node);
        const fresh=new WorkFrameRenderer(host(),t.work.steps,{width:900,height:450});fresh.render(timelineFrame(t,at));assert.deepEqual(geometry(fresh),expected);fresh.destroy();
        renderer.render(timelineFrame(t,s.settled));for(const m of renderer.scene.layout.marks)assert.deepEqual(renderer.scene.current.get(m.key),m.points);
      }
    }finally{renderer.destroy();}
  }
});

test('interrupting a work transition retains displayed keyed paths and guide visibility before the next frame',()=>{
  const oldRAF=win.requestAnimationFrame,oldCancel=win.cancelAnimationFrame,queue=new Map();let nextId=0;
  win.requestAnimationFrame=fn=>{queue.set(++nextId,fn);return nextId;};win.cancelAnimationFrame=id=>queue.delete(id);
  const advance=time=>{const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(time));};
  try{for(const id of ['monthly','series-revenue','paired-evaluation','research-budget','sample-distributions','method-agreement','prediction-diagnostics','classification-diagnostics']){
    const work=presetWork(id),h=host(),player=mountWorkPlayer(h,work),timeline=workTimeline(work),segment=timeline.segments[1];
    const shapes=()=>new Map([...h.querySelectorAll('[data-morph-shape]')].map(el=>[el.getAttribute('data-key'),{element:el,d:el.getAttribute('d')}]));
    try{
      player.seek(segment.start+segment.duration*.5);const before=shapes(),guides=[...h.querySelectorAll('[data-morph-guides],[data-morph-labels]')].map(el=>el.outerHTML);
      player.select(work.steps.at(-1).id);const after=shapes();
      assert.deepEqual([...h.querySelectorAll('[data-morph-guides],[data-morph-labels]')].map(el=>el.outerHTML),guides,id+': annotations retained at retarget');
      for(const [key,shape]of before)if(after.has(key)){assert.equal(after.get(key).element,shape.element,id+': node retained');assert.equal(after.get(key).d,shape.d,id+': displayed path retained');}
      advance(0);advance(1);
      const progressed=shapes();for(const [key,shape]of after)if(progressed.has(key)){
        const a=shape.d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number),b=progressed.get(key).d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number);
        if(a?.length===b?.length)assert.ok(a.every((v,i)=>Math.abs(v-b[i])<2),id+': no first-frame geometry jump');
      }
      advance(6000);assert.equal(h.querySelector('[data-wp-title]').textContent,work.steps.at(-1).doc.title);
    }finally{player.destroy();}
  }}finally{win.requestAnimationFrame=oldRAF;win.cancelAnimationFrame=oldCancel;}
});

test('native charts grow at seeked timestamps, all scene effects remain reversible',()=>{
  for(const effect of ['entrance','slide','fade','gather']){
    const a=makeStep({doc:getExample('column')}),b=makeStep({doc:getExample('variwide'),transition:effect});
    const t=workTimeline(newWork([a,b])),s=t.segments[1],renderer=new WorkFrameRenderer(host(),t.work.steps,{width:800,height:360});
    const frame=p=>timelineFrame(t,s.start+s.duration*p);
    const at0=renderer.render(frame(.28));assert.equal(Number(renderer.scene.svg.dataset.entranceProgress),0);assert.equal(at0.step.doc.template,'variwide');
    renderer.render(frame(.7));assert.ok(Number(renderer.scene.svg.dataset.entranceProgress)>0&&Number(renderer.scene.svg.dataset.entranceProgress)<1);
    const expected=renderer.scene.svg.outerHTML;
    renderer.render(frame(1));renderer.render(frame(.7));assert.equal(renderer.scene.svg.outerHTML,expected);
    renderer.render(frame(.1));assert.equal(renderer.state.step.doc.template,'column');
    renderer.render(frame(.7));assert.equal(renderer.state.step.doc.template,'variwide');renderer.destroy();
  }
});

test('player scrubbing pauses, updates the selected step, and continues from that exact time',()=>{
  const queue=new Map();let id=0;const oldRAF=win.requestAnimationFrame,oldCancel=win.cancelAnimationFrame;
  win.requestAnimationFrame=fn=>{queue.set(++id,fn);return id;};win.cancelAnimationFrame=id=>queue.delete(id);
  const advance=time=>{const list=[...queue.values()];queue.clear();list.forEach(fn=>fn(time));};
  const h=host(),work=presetWork('series-revenue'),steps=[],p=mountWorkPlayer(h,work,{onStep:id=>steps.push(id)}),t=workTimeline(work);
  try{
    const at=t.segments[1].start+500;p.seek(at);assert.equal(p.getTime(),at);assert.equal(queue.size,0);
    assert.equal(h.querySelector('[data-wp-play]').getAttribute('aria-pressed'),'false');
    assert.equal(steps.at(-1),work.steps[1].id);
    p.play();advance(0);advance(100);near(p.getTime(),at+100);
    p.stop();const paused=p.getTime();advance(1000);assert.equal(p.getTime(),paused);assert.equal(queue.size,0);
    p.seek(t.duration);assert.equal(h.querySelector('[data-wp-seek]').value,String(t.duration));
    p.play();advance(2000);advance(2100);assert.equal(p.getTime(),100);
    p.seek(t.duration-20);p.play();advance(3000);advance(3100);assert.equal(p.getTime(),t.duration);assert.equal(queue.size,0);
    const slider=h.querySelector('[data-wp-seek]');slider.value='400';slider.dispatchEvent(new win.Event('input',{bubbles:true}));assert.equal(p.getTime(),400);assert.equal(queue.size,0);
  }finally{p.destroy();win.requestAnimationFrame=oldRAF;win.cancelAnimationFrame=oldCancel;}
});

test('reverse navigation keeps the boundary duration even when the first entrance is shorter',()=>{
  const queue=new Map();let id=0;const oldRAF=win.requestAnimationFrame,oldCancel=win.cancelAnimationFrame;
  win.requestAnimationFrame=fn=>{queue.set(++id,fn);return id;};win.cancelAnimationFrame=id=>queue.delete(id);
  const advance=time=>{const list=[...queue.values()];queue.clear();list.forEach(fn=>fn(time));};
  const work=presetWork('series-revenue');work.steps[0].duration=600;work.steps[1].duration=2400;
  const t=workTimeline(work),h=host(),p=mountWorkPlayer(h,work);
  try{
    p.seek(t.segments[1].settled);p.select(work.steps[0].id);advance(0);advance(1200);
    near(p.getTime(),300);near(Number(h.querySelector('.wp-artboard').dataset.timelineProgress),.5);
    assert.equal(h.querySelector('[data-wp-play]').getAttribute('aria-pressed'),'true');
    advance(2400);assert.equal(p.getTime(),600);assert.equal(queue.size,0);
    p.select(work.steps[0].id);advance(3000);advance(3600);assert.equal(p.getTime(),600);assert.equal(queue.size,0);
  }finally{p.destroy();win.requestAnimationFrame=oldRAF;win.cancelAnimationFrame=oldCancel;}
});

test('player and video use the same contour frame; video duration and final hold are not real-time dependent',()=>{
  const work=presetWork('series-revenue'),plan=workVideoPlan(work,{fps:24,longEdge:720}),out=createWorkExportRenderer(work),s=plan.timeline.segments[1],at=s.start+s.duration*.45;
  try{
    const svg=out.frame(at),renderer=new WorkFrameRenderer(host(),plan.timeline.work.steps,{...out.renderer.options});renderer.render(timelineFrame(plan.timeline,at));
    assert.deepEqual(geometry(out.renderer),geometry(renderer));renderer.destroy();assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity|<script/);
    assert.equal(plan.width,720);assert.equal(plan.height,406);assert.equal(plan.frames,Math.ceil(plan.timeline.duration/1000*24));
    assert.equal(timelineFrame(plan.timeline,plan.time(plan.frames-1)).phase,'hold');
    for(const ratio of ['landscape','wide','square','portrait','story']){const p=workVideoPlan(work,{ratio});assert.ok(p.width%2===0&&p.height%2===0);}
    assert.throws(()=>workVideoPlan(work,{fps:25}));assert.throws(()=>workVideoPlan(work,{longEdge:4000}));
  }finally{out.destroy();}
});

test('all current native templates retain valid deterministic entrance frames in whole-work export',async()=>{
  for(const t of catalog){const work=newWork([{doc:getExample(t.id)}]),out=createWorkExportRenderer(work);try{
    for(const time of [0,800,work.steps[0].duration+1])assert.doesNotMatch(out.frame(time).replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity|undefined/,t.id);
  }finally{out.destroy();}
    // Let DOM mutation/observer deliveries finish before rendering the next chart.
    await new Promise(resolve=>setTimeout(resolve,0));
  }
});

test('cancelled MP4 work never starts encoding or allocates a render scene',async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(encodeWorkMP4(presetWork('classic'),{}, {signal:controller.signal}),{name:'AbortError'});
});
