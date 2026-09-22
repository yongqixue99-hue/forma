import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mountWorkPlayer} from '../../src/forma/work-player.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {presetWork,transitionPlan} from '../../src/forma/work-model.js';
import {workTimeline} from '../../src/forma/work-timeline.js';
import {workVideoPlan} from '../../src/forma/work-video.js';
const shapes=host=>[...host.querySelectorAll('[data-morph-shape]')].map(n=>[n.getAttribute('data-key'),n.getAttribute('d')]);
function setup(id='spatial-projections'){
 const win=new Window(),queue=new Map();let next=0;
 win.requestAnimationFrame=fn=>{queue.set(++next,fn);return next;};win.cancelAnimationFrame=id=>queue.delete(id);
 const host=win.document.createElement('div'),work=presetWork(id),events=[],player=mountWorkPlayer(host,work,{onFrame:frame=>events.push(frame)});
 const tick=time=>{const list=[...queue.values()];queue.clear();list.forEach(fn=>fn(time));};
 return {win,host,work,events,player,tick,close(){player.destroy();win.happyDOM.close();}};
}
test('arbitrary pair inspection is deterministic for reverse, jump and repeat, using the selected source',()=>{
 const s=setup();try{
 const {work,player,host,events,win}=s,timeline=workTimeline(work);
 for(const [a,b]of [[3,0],[0,2],[2,1]]){
  const from=work.steps[a],to=work.steps[b],renderer=new WorkFrameRenderer(win.document.createElement('div'),work.steps),seg=timeline.segments[b];
  const expected=p=>{renderer.render({...seg,from,step:to,plan:transitionPlan(from,to,{steps:work.steps}),progress:p,time:seg.start+seg.duration*p});return shapes(renderer.host);};
  for(const p of [0,.25,.5,.75,1,.25]){player.inspectBetween(from.id,to.id,p);assert.deepEqual(shapes(host),expected(p));const f=events.at(-1);assert.equal(f.fromId,from.id);assert.equal(f.toId,to.id);assert.equal(f.progress,p);assert.equal(f.running,false);assert.equal(f.phase,p===1?'hold':'transition');}
  renderer.destroy();
 }
 }finally{s.close();}
});
test('inspection after interrupted free navigation resets to the requested canonical pair',()=>{
 const s=setup();try{
 const {work,player,host}=s,a=work.steps[0].id,b=work.steps[1].id,c=work.steps[2].id;
 player.inspectBetween(a,c,.25);const expected=shapes(host);
 player.inspectBetween(a,b,.5);player.select(c);s.tick(0);s.tick(200);
 player.inspectBetween(a,c,.25);assert.deepEqual(shapes(host),expected);
 }finally{s.close();}
});
test('preview rates change elapsed playback only and retain authored/export timing',()=>{
 const s=setup('series-revenue');try{
 const {player,work,host,events}=s,original=structuredClone(work),duration=workTimeline(work).duration,frames=workVideoPlan(work).frames;
 player.seek(200);player.setPlaybackRate(.5);player.play();s.tick(0);s.tick(200);assert.equal(player.getTime(),300);assert.equal(events.at(-1).rate,.5);
 player.setPlaybackRate(2);s.tick(300);s.tick(500);assert.equal(player.getTime(),700);assert.equal(host.querySelector('[data-wp-rate]').value,'2');
 player.setPlaybackRate(-2);assert.equal(player.getPlaybackRate(),2);player.stop();assert.deepEqual(work,original);assert.equal(player.duration,duration);assert.equal(workVideoPlan(work).frames,frames);
 }finally{s.close();}
});
test('bad pair requests do not change a valid inspected frame',()=>{
 const s=setup();try{
 const [a,b]=s.work.steps;s.player.inspectBetween(a.id,b.id,.5);const expected=shapes(s.host),time=s.player.getTime();
 for(const args of [[a.id,'missing',.2],[a.id,a.id,.3],[a.id,b.id,NaN]])s.player.inspectBetween(...args);
 assert.equal(s.player.getTime(),time);assert.deepEqual(shapes(s.host),expected);
 }finally{s.close();}
});
test('reverse rank semantics reach both the visible player and deterministic video frame',async()=>{
 const {WorkStage}=await import('../../src/forma/work-player.js'),{createWorkExportRenderer}=await import('../../src/forma/work-video.js');
 const {timelineFrame}=await import('../../src/forma/work-timeline.js');
 const s=setup('values-to-ranks'),oldDoc=globalThis.document,oldXML=globalThis.XMLSerializer;
 globalThis.document=s.win.document;globalThis.XMLSerializer=s.win.XMLSerializer;
 let stage,output;
 try{
 const work=structuredClone(s.work);work.steps=[work.steps[1],work.steps[0]];work.activeStep=work.steps[0].id;
 const timeline=workTimeline(work),seg=timeline.segments[1],at=seg.start+seg.duration*.5,h=s.win.document.createElement('div');
 stage=new WorkStage(h,work.steps[0],{steps:work.steps});stage.seek(timelineFrame(timeline,at));
 assert.match(h.querySelector('[data-wp-meaning]').textContent,/停稳后读数.*名次.*原值/);
 output=createWorkExportRenderer(work);const svg=output.frame(at);assert.match(svg,/名次返回原值/);assert.match(svg,/停稳后读数/);
 }finally{stage?.destroy();output?.destroy();globalThis.document=oldDoc;globalThis.XMLSerializer=oldXML;s.close();}
});
