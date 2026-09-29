import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mountWorkPlayer} from '../../src/forma/work-player.js';
import {presetWork} from '../../src/forma/work-model.js';
import {workTimeline} from '../../src/forma/work-timeline.js';
function setup(id='classifier-comparison',options={}){
 const win=new Window(),queue=new Map(),listeners=new Set(),media={matches:false,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};let next=0;
 win.matchMedia=()=>media;
 win.requestAnimationFrame=fn=>{queue.set(++next,fn);return next;};win.cancelAnimationFrame=id=>queue.delete(id);
 const host=win.document.createElement('main'),work=presetWork(id),player=mountWorkPlayer(host,work,options);
 return {win,host,work,player,queue,setReduced(value){media.matches=value;[...listeners].forEach(fn=>fn());},tick(now){const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(now));},async close(){player.destroy();await win.happyDOM.close();}};
}

test('unchanged player status does not traverse chart DOM or rewrite identical accessibility state',async()=>{
 const s=setup();
 try{
  s.player.seek(600);s.player.stop();const query=s.host.querySelector.bind(s.host),queryAll=s.host.querySelectorAll.bind(s.host);let scans=0,writes=0;
  const buttons=[...queryAll('[data-wp-play],[data-wp-seek],[data-wp-step]')];
  for(const node of buttons){const set=node.setAttribute.bind(node);node.setAttribute=(name,value)=>{if(node.getAttribute(name)===String(value))writes++;return set(name,value);};}
  s.host.querySelector=selector=>{scans++;return query(selector);};s.host.querySelectorAll=selector=>{scans++;return queryAll(selector);};
  const chart=query('.wp-graphic').innerHTML;
  for(let i=0;i<60;i++)s.player.stop();
  assert.equal(scans,0,'status-only updates must not search through a potentially large chart');assert.equal(writes,0,'unchanged playback state should not rewrite identical ARIA attributes');
  assert.equal(query('.wp-graphic').innerHTML,chart);assert.equal(s.queue.size,0);
 }finally{await s.close();}
});

test('cached controls stay correct through reverse pair inspection, playback and timeline timing edits',async()=>{
 const s=setup('series-revenue',{editableTiming:true});
 try{
  const {host,work,player,win}=s,original=structuredClone(work),timeline=workTimeline(work),from=work.steps.at(-1),to=work.steps[0],seek=host.querySelector('[data-wp-seek]'),play=host.querySelector('[data-wp-play]'),time=host.querySelector('[data-wp-time]');
  player.inspectBetween(from.id,to.id,.5);const chart=host.querySelector('.wp-graphic').innerHTML;
  assert.equal(play.getAttribute('aria-pressed'),'false');assert.equal(host.querySelector('[data-wp-position]').textContent,`01 / ${String(work.steps.length).padStart(2,'0')}`);assert.ok(host.querySelector(`[data-wp-step="${to.id}"]`).getAttribute('aria-pressed')==='true');
  player.stop();assert.equal(host.querySelector('.wp-graphic').innerHTML,chart);
  player.play();assert.equal(play.getAttribute('aria-pressed'),'true');s.tick(0);s.tick(80);assert.equal(host.querySelector('[data-wp-play]'),play);assert.ok(player.getTime()>0);
  player.stop();assert.equal(play.getAttribute('aria-pressed'),'false');player.seek(timeline.duration);assert.equal(Number(seek.value),timeline.duration);assert.match(time.textContent,/\d:\d\d\.\d/);
  const hold=host.querySelector(`[data-wp-hold="${work.steps[0].id}"]`);hold.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(player.duration,timeline.duration+100);assert.equal(Number(seek.max),player.duration);assert.ok(host.querySelector('[data-wp-seek]')===seek);assert.equal(player.getWork().steps[0].hold,original.steps[0].hold+100);
  assert.deepEqual(player.getWork().steps.map(s=>s.doc),original.steps.map(s=>s.doc));
 }finally{await s.close();}
});

test('control updates also work when the step strip is hidden',async()=>{
 const s=setup('classic',{showSteps:false});
 try{assert.equal(s.host.querySelector('[data-wp-step]'),null);s.player.seek(600);s.player.play();s.tick(0);s.tick(30);assert.equal(s.host.querySelector('[data-wp-play]').getAttribute('aria-pressed'),'true');s.player.stop();assert.equal(s.host.querySelector('[data-wp-play]').getAttribute('aria-pressed'),'false');}
 finally{await s.close();}
});

test('retained control nodes reflect reduced motion and hidden-page stops without stale playback state',async()=>{
 const s=setup('classic');let hidden=false;
 Object.defineProperty(s.win.document,'hidden',{get:()=>hidden,configurable:true});
 try{
  const play=s.host.querySelector('[data-wp-play]'),restart=s.host.querySelector('[data-wp-restart]');
  s.player.play();assert.equal(play.getAttribute('aria-pressed'),'true');s.setReduced(true);
  assert.equal(play.disabled,true);assert.equal(restart.disabled,true);assert.equal(play.getAttribute('aria-pressed'),'false');assert.equal(s.player.isPlaying(),false);assert.equal(s.queue.size,0);
  s.setReduced(false);assert.equal(play.disabled,false);assert.equal(restart.disabled,false);s.player.play();s.tick(0);s.tick(40);
  hidden=true;s.win.document.dispatchEvent(new s.win.Event('visibilitychange'));assert.equal(play.getAttribute('aria-pressed'),'false');assert.equal(s.queue.size,0);
  hidden=false;s.win.document.dispatchEvent(new s.win.Event('visibilitychange'));assert.equal(s.player.isPlaying(),false);assert.ok(s.host.querySelector('[data-wp-play]')===play);
 }finally{await s.close();}
});
