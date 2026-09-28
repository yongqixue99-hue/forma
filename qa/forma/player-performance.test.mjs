import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mount} from '../../src/forma/player.js';
import {getExample} from '../../src/forma/catalog.js';

function setup(){
 const win=new Window(),queue=new Map(),listeners=new Set(),original=new Map();let id=0;
 const media={matches:false,addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f)};
 win.matchMedia=()=>media;win.requestAnimationFrame=fn=>{queue.set(++id,fn);return id;};win.cancelAnimationFrame=id=>queue.delete(id);
 for(const [k,v]of Object.entries({document:win.document,window:win,ResizeObserver:win.ResizeObserver,requestAnimationFrame:win.requestAnimationFrame,cancelAnimationFrame:win.cancelAnimationFrame})){
  original.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
 }
 const host=win.document.createElement('main');win.document.body.append(host);
 return {win,host,queue,media,listeners,tick(now){const list=[...queue.values()];queue.clear();list.forEach(fn=>fn(now));},async close(){await win.happyDOM.close();for(const[k,v]of original){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}};
}

test('exported single-chart player releases all animation frames when paused, finished or reduced',async()=>{
 const s=setup();let player;
 try{
  player=mount(s.host,{doc:getExample('column'),options:{duration:1}});
  assert.equal(s.queue.size,1);
  player.pause();assert.equal(s.queue.size,0,'pause must release scheduled frames');
  player.play();assert.equal(s.queue.size,1);player.play();assert.equal(s.queue.size,1,'play is idempotent');
  s.tick(performance.now()+2000);assert.equal(s.host.querySelector('input').value,'1000');assert.equal(s.queue.size,0,'the completed chart must not keep ticking');
  player.play();assert.equal(s.queue.size,1);player.seek(.5);assert.equal(s.queue.size,0,'manual seek stops the clock');
  player.play();s.media.matches=true;for(const fn of s.listeners)fn();assert.equal(s.queue.size,0,'reduced motion cancels pending animation');
  s.media.matches=false;for(const fn of s.listeners)fn();player.play();assert.equal(s.queue.size,1);
  player.destroy();assert.equal(s.queue.size,0);player.play();assert.equal(s.queue.size,0,'destroyed player cannot restart');player=null;
 }finally{player?.destroy();await s.close();}
});

test('work playback retains unchanged header and legend nodes across sampled morph frames',async()=>{
 const {WorkStage}=await import('../../src/forma/work-player.js'),{presetWork}=await import('../../src/forma/work-model.js'),{workTimeline,timelineFrame}=await import('../../src/forma/work-timeline.js');
 const s=setup(),work=presetWork('classic'),timeline=workTimeline(work),segment=timeline.segments[1];let stage;
 try{
  stage=new WorkStage(s.host,work.steps[0],{steps:work.steps});stage.seek(timelineFrame(timeline,segment.start+segment.duration*.1));
  const title=s.host.querySelector('[data-wp-title]').firstChild,legend=s.host.querySelector('.wp-data-legend').firstElementChild,meaning=s.host.querySelector('[data-wp-meaning]').firstChild;
  assert.ok(legend,'the preset has a real legend');
  for(let i=2;i<10;i++)stage.seek(timelineFrame(timeline,segment.start+segment.duration*i/10));
  assert.ok(s.host.querySelector('[data-wp-title]').firstChild===title,'unchanged headings keep their text nodes');
  assert.ok(s.host.querySelector('.wp-data-legend').firstElementChild===legend,'unchanged legend keeps its nodes');
  assert.ok(s.host.querySelector('[data-wp-meaning]').firstChild===meaning,'unchanged phase semantics keep their text nodes');
 }finally{stage?.destroy();await s.close();}
});

test('single-chart visibility suspends its clock without skipping hidden time',async()=>{
 const s=setup();let player,hidden=false;
 Object.defineProperty(s.win.document,'hidden',{get:()=>hidden,configurable:true});
 const visibility=value=>{hidden=value;s.win.document.dispatchEvent(new s.win.Event('visibilitychange'));};
 try{
  player=mount(s.host,{doc:getExample('column'),options:{duration:8}});player.seek(.25);player.play();visibility(true);
  assert.equal(s.queue.size,0,'hidden document has no pending player frame');s.tick(s.win.performance.now()+60000);assert.equal(s.host.querySelector('input').value,'250');
  visibility(false);assert.equal(s.queue.size,1);s.tick(s.win.performance.now()+16);assert.ok(Number(s.host.querySelector('input').value)<260,'resume does not include hidden elapsed time');
  visibility(true);player.pause();visibility(false);assert.equal(s.queue.size,0,'manual pause while hidden prevents resume');
  player.destroy();player=null;visibility(true);visibility(false);assert.equal(s.queue.size,0);
 }finally{player?.destroy();await s.close();}
});

test('retained work chrome still updates edited metadata, values, labels, colors and phase',async()=>{
 const {WorkStage}=await import('../../src/forma/work-player.js'),{presetWork}=await import('../../src/forma/work-model.js');
 const s=setup(),work=presetWork('classic'),step=work.steps[0];let stage;
 try{
  stage=new WorkStage(s.host,step,{steps:work.steps});const firstLegend=s.host.querySelector('.wp-data-legend').firstElementChild;
  step.doc.title='Edited <title>';step.doc.subtitle='Updated subtitle';step.doc.source.name='Updated source';
  const row=step.doc.data[0];row.label='Renamed & <one>';row.value=123;step.options.colorBindings=[{id:row._id,color:'#123abc'}];
  stage.header(step);
  assert.equal(s.host.querySelector('[data-wp-title]').textContent,'Edited <title>');
  assert.equal(s.host.querySelector('[data-wp-subtitle]').textContent,'Updated subtitle');assert.equal(s.host.querySelector('[data-wp-source]').textContent,'Updated source');
  const legend=s.host.querySelector('.wp-data-legend').firstElementChild;assert.ok(legend!==firstLegend);assert.match(legend.textContent,/Renamed & <one>123/);assert.match(legend.querySelector('i').getAttribute('style'),/#123abc/);assert.equal(legend.querySelector('one'),null);
  stage.header(step);assert.ok(s.host.querySelector('.wp-data-legend').firstElementChild===legend,'escaped labels must not force HTML replacement');
  const target=presetWork('probability-reliability').steps[1];stage.header(target,{progress:.5,mode:'morph',fromView:'column'});
  const moving=s.host.querySelector('[data-wp-meaning]').textContent;stage.header(target,{progress:1,mode:'morph',fromView:'column'});
  assert.notEqual(s.host.querySelector('[data-wp-meaning]').textContent,moving,'phase-dependent reading guidance refreshes at the endpoint');
 }finally{stage?.destroy();await s.close();}
});

test('scientific playback does not rescan observations for an absent scalar legend',async()=>{
 const {WorkStage}=await import('../../src/forma/work-player.js'),{presetWork}=await import('../../src/forma/work-model.js');
 const s=setup(),work=presetWork('statistical-lifetime-story'),step=work.steps[0];let stage,reads=0;
 try{
  stage=new WorkStage(s.host,step,{steps:work.steps});
  for(const row of step.doc.data){const value=row.value;Object.defineProperty(row,'value',{enumerable:true,configurable:true,get(){reads++;return value;}});}
  for(let i=0;i<60;i++)stage.header(step,{progress:(i+1)/61,mode:'morph',fromView:work.steps[1].view});
  assert.equal(s.host.querySelector('.wp-data-legend').hidden,true);assert.equal(s.host.querySelector('.wp-data-legend').childElementCount,0);
  assert.equal(reads,0,'header-only updates must not revalidate all scientific observations for a legend that is absent');
 }finally{stage?.destroy();await s.close();}
});

test('brand updates use their own style roots and preserve nested SVG artwork',async()=>{
 const {applyChartBrand,applyFrameBrand}=await import('../../src/forma/brand-view.js'),s=setup();
 try{
  const root=s.host;root.innerHTML='<header><span>Type</span><h2>Title</h2></header><svg xmlns="http://www.w3.org/2000/svg"><g><style data-brand-type="nested">.art{fill:red}</style><style data-brand-frame="nested">.art{stroke:blue}</style><path class="art" d="M 0 0 L 12 16"/></g></svg>';
  const svg=root.querySelector('svg'),art=svg.firstElementChild,original=art.outerHTML;
  for(const typography of ['sans','editorial','mono']){
   const options={brand:{typography}};applyChartBrand(svg,options);applyFrameBrand(root,options);
   const own=[...svg.children].filter(el=>el.localName==='style');assert.equal(own.length,1);assert.ok(own[0].textContent.includes(typography==='mono'?'DM Mono':'Manrope'));
   assert.equal(art.outerHTML,original,'brand styles must not rewrite nested chart artwork');
  }
  applyChartBrand(svg,{});applyFrameBrand(root,{});assert.equal([...svg.children].filter(el=>el.localName==='style').length,0);assert.equal(art.outerHTML,original,'removing a frame brand leaves nested styles intact');
 }finally{await s.close();}
});
