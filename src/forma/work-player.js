import {isEnglish,uiText,uiMarkup,uiMessage} from './locale.js';
import {applyChartBrand,applyFrameBrand} from './brand-view.js';
import {mountPlayerViewport} from './player-viewport.js';
import {frameMeaning} from './data-semantics.js';
import {recordId} from './data-identity.js';
import {formatNumber as format} from './number-format.js';
import {MorphChart} from './morph.js';
import {isSeriesView} from './series-rules.js';
import {resolveBoundColor} from './color-semantics.js';
import {themeFor} from './palettes.js';
import {escapeHtml as esc} from './data.js';
import {workTimeline,timelineFrame,timelineTime,holdDuration,advanceTimeline} from './work-timeline.js';
import {WorkFrameRenderer,framePresentation} from './work-frame.js';
import {morphDocument,stepMorphDocument,morphReady,stepView,transitionPlan,workReport,stepDomain,relatedSteps,viewFamily} from './work-model.js';

import {stepName,stepIcon,createStepScene,workColorMap} from './work-scene.js';
export {stepName,stepIcon,createStepScene} from './work-scene.js';

// Avoid rebuilding accessible headings and controls at animation-frame frequency.
function updateText(node,value){const text=String(value??'');if(node.textContent!==text)node.textContent=text;}

/** One stage owns one visible chart. Matched data use persistent contour nodes;
 * unrelated documents meet only at the collapsed midpoint. */
export class WorkStage{
  constructor(host,step,{onComplete=()=>{},onPhase=()=>{},steps=[step]}={}){
    this.host=host;this.win=host.ownerDocument.defaultView;this.onComplete=onComplete;this.onPhase=onPhase;this.token=0;this.frame=null;this.step=step;this.steps=steps;this.colorGroups=new Map();
    this.media=this.win.matchMedia?.('(prefers-reduced-motion: reduce)');
    host.innerHTML=uiText('<article class="wp-artboard"><header><span data-wp-type></span><h2 data-wp-title></h2><p data-wp-subtitle></p><p data-wp-meaning role="note"></p></header><div class="wp-graphic"></div><div class="wp-data-legend"></div><footer><span data-wp-source></span><span>数相 / FORMA</span></footer></article>');
    this.root=host.querySelector('.wp-artboard');this.graphic=host.querySelector('.wp-graphic');
    this.headerNodes=Object.fromEntries(['type','title','subtitle','source','meaning'].map(key=>[key,this.root.querySelector(`[data-wp-${key}]`)]));this.headerNodes.legend=this.root.querySelector('.wp-data-legend');this.draw(step);
    this.resize=new this.win.ResizeObserver(()=>{if(this.timelineAt)this.seek(this.timelineAt);else if(!this.busy)this.draw(this.step);});this.resize.observe(this.graphic);
    this.reduce=()=>{if(this.media.matches&&this.busy){this.stop();this.draw(this.step);this.onComplete(this.step.id);}};this.media?.addEventListener('change',this.reduce);
  }
  colorMap(step){
    const related=relatedSteps(step,this.steps),key=related.map(s=>s.id).sort().join('|');
    if(!this.colorGroups.has(key)){
      const colors=workColorMap(step,this.steps);
      this.colorGroups.set(key,colors);
    }
    return this.colorGroups.get(key);
  }
  header(step,frame){
    const {type,title,subtitle,source,meaning:note,legend}=this.headerNodes;
    const t=themeFor(step.options.palette,step.options.dark,step.options.colors);
    for(const [key,value]of Object.entries({'--wp-paper':t.bg,'--wp-ink':t.fg,'--wp-muted':t.secondary,'--wp-line':t.line}))if(this.root.style.getPropertyValue(key)!==value)this.root.style.setProperty(key,value);
    updateText(type,stepName(step));
    updateText(title,step.doc.title);
    updateText(subtitle,step.doc.subtitle||'');
    updateText(source,step.doc.source.name);
    const meaning=frameMeaning(stepView(step),frame);updateText(note,meaning);if(note.hidden!==!meaning)note.hidden=!meaning;
    // This compact legend represents at most 12 scalar values. Reject other
    // shapes before their scientific adapters validate/clone entire datasets.
    const candidate=step.doc.data.length<=12&&!isSeriesView(stepView(step))?morphDocument(step):null,doc=candidate&&morphReady(step)?candidate:null;if(legend.hidden!==!doc)legend.hidden=!doc;
    applyFrameBrand(this.root,step.options);applyChartBrand(this.scene?.svg,step.options);
    const colors=doc?this.colorMap(step):null;
    const markup=doc?doc.data.map((r,i)=>`<span><i style="background:${resolveBoundColor(step.options,recordId(r),t.colors[(colors.get(recordId(r))??i)%t.colors.length])}"></i><span title="${esc(r.label)}">${esc(r.label)}</span><b>${format(r.value)}</b></span>`).join(''):'';
    if(this.legendMarkup!==markup){legend.innerHTML=markup;this.legendMarkup=markup;}
  }
  draw(step,{progress=1}={}){
    this.timelineRenderer?.destroy();this.timelineRenderer=null;this.timelineAt=null;
    this.scene?.destroy();this.header(step);this.scene=createStepScene(this.graphic,step,{progress,interactive:false,axisLabels:true,domain:stepDomain(step,this.steps),colorIndices:this.colorMap(step)});applyChartBrand(this.scene.svg,step.options);this.graphic.style.transform='';this.root.style.opacity='';this.step=step;this.renderedStep=step;
  }
  stop(){this.token++;this.win.cancelAnimationFrame(this.frame);this.frame=null;this.busy=false;this.scene?.cancel?.();}
  seek(frame){
    this.stop();
    if(!this.timelineRenderer){this.scene?.destroy();this.timelineRenderer=new WorkFrameRenderer(this.graphic,this.steps);}
    this.timelineAt=frame;
    const {visible,p}=framePresentation(frame,{reducedMotion:this.media?.matches});
    this.header(visible,{progress:frame.retarget&&p===0?.001:p,mode:frame.plan?.mode,fromView:frame.from?stepView(frame.from):undefined});
    const state=this.timelineRenderer.render(frame,{reducedMotion:this.media?.matches});
    this.scene=this.timelineRenderer.scene;this.step=frame.step;this.renderedStep=frame.step;
    this.root.style.opacity=String(state.opacity);
    this.graphic.style.transform=`translateX(${state.translate*100}%) scale(${state.scale})`;
    this.root.dataset.transitionMode=frame.plan?.mode||'entrance';this.root.dataset.transitionEffect=frame.plan?.effect||'entrance';
    this.root.dataset.timelineProgress=String(frame.progress);
  }
  go(step,{animate=true,replay=false}={}){
    // Transfer the current scene to the free navigation animation.
    this.timelineRenderer=null;this.timelineAt=null;
    const from=this.renderedStep,plan=transitionPlan(from,replay||from.id===step.id?{...step,transition:'entrance'}:step,{steps:this.steps});this.stop();this.step=step;
    this.root.dataset.transitionMode=plan.mode;this.root.dataset.transitionEffect=plan.effect;
    if(!animate||this.media?.matches){this.draw(step);this.onComplete(step.id);return plan;}
    this.busy=true;this.onPhase(plan);const token=this.token;
    if(plan.mode==='morph'&&this.scene instanceof MorphChart&&viewFamily(this.scene.view)===viewFamily(stepView(step))){
      this.root.style.opacity='';this.graphic.style.transform='';
      this.scene.options.onChange=({animating})=>{if(!animating&&token===this.token){this.busy=false;this.header(step);this.onComplete(step.id);}};
      this.scene.setDocument(stepMorphDocument(step),stepView(step),{...step.options,effect:plan.effect,recipe:plan.recipe,duration:plan.duration,domain:stepDomain(step,this.steps),colorIndices:this.colorMap(step)});this.header(step,{progress:.5,mode:plan.mode,fromView:stepView(from)});this.renderedStep=step;
    }else{
      let start,swapped=false;
      const tick=now=>{
        if(token!==this.token)return;start??=now;const p=Math.min(1,(now-start)/plan.duration),split=.28;
        const outgoing=Math.min(1,p/split),incoming=Math.max(0,(p-split)/(1-split)),ease=x=>1-(1-x)**3;
        if(p>=split&&!swapped){this.draw(step,{progress:0});swapped=true;}
        if(!swapped){
          this.root.style.opacity=String(1-ease(outgoing));
          this.graphic.style.transform=plan.effect==='slide'?`translateX(${-outgoing*7}%)`:plan.effect==='gather'?`scale(${1-ease(outgoing)*.75})`:'';
        }else{
          // The chart's own deterministic tracks run here, including bars growing
          // from their baseline, lines drawing, and sectors sweeping into place.
          this.scene.render(incoming);
          this.root.style.opacity=String(Math.min(1,incoming*5));
          this.graphic.style.transform=plan.effect==='slide'?`translateX(${(1-ease(incoming))*9}%)`:plan.effect==='gather'?`scale(${.86+ease(incoming)*.14})`:'';
        }
        if(p<1)this.frame=this.win.requestAnimationFrame(tick);
        else{this.scene.render(1);this.graphic.style.transform='';this.root.style.opacity='';this.busy=false;this.frame=null;this.onComplete(step.id);}
      };
      this.frame=this.win.requestAnimationFrame(tick);
    }
    return plan;
  }
  destroy(){this.stop();this.resize.disconnect();this.media?.removeEventListener('change',this.reduce);this.timelineRenderer?.destroy();this.scene?.destroy();this.host.replaceChildren();}
}

export function mountWorkPlayer(host,value,{onStep=()=>{},onFrame=()=>{},showSteps=true,playbackRate=1,editableTiming=false,onTimingChange=()=>{}}={}){
  let timeline=workTimeline(value);const work=timeline.work;
  let current=work.steps.find(s=>s.id===work.activeStep)||work.steps[0],time=0,running=false,automatic=false,raf=null,lastTick=null,disposed=false,manualFrame=null,pairTimer=null,displayFrame=null,playMarkup=null;
  const rates=[.5,1,2,3];let rate=rates.includes(playbackRate)?playbackRate:1;
  const win=host.ownerDocument.defaultView,events=new win.AbortController(),media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
  host.innerHTML=uiMarkup`<section class="wp-player"><div data-wp-stage></div>${showSteps?uiText('<div class="wp-step-strip" role="group" aria-label="点击预览步骤"></div>'):''}<footer class="wp-controls"><div class="wp-clock"><button data-wp-play aria-label="自动播放全部步骤"></button><time data-wp-time></time><div class="wp-scrubber"><div class="wp-segments" aria-hidden="true">${timeline.segments.map(s=>`<i style="flex:${s.end-s.start}"><b style="width:${s.duration/(s.end-s.start)*100}%"></b></i>`).join('')}</div><input type="range" data-wp-seek min="0" max="${timeline.duration}" step="10" value="0" aria-label="整段作品时间轴"></div><time data-wp-duration>${timelineTime(timeline.duration)}</time><button data-wp-restart title="从头播放所有步骤与过渡" aria-label="从头播放所有步骤与过渡"><span aria-hidden="true">↺</span><span>播放全部</span></button></div><div class="wp-clock-caption"><span data-wp-position></span><span data-wp-status role="status"></span><span class="wp-clock-hint">拖动查看 · 从此处播放</span></div></footer></section>`;
  const $=s=>host.querySelector(s),stage=new WorkStage($('[data-wp-stage]'),current,{steps:work.steps});
  const viewport=mountPlayerViewport($('.wp-player'));
  const speed=win.document.createElement('select');speed.dataset.wpRate='';speed.className='wp-rate';speed.setAttribute('aria-label',isEnglish()?'Motion speed':'演变速度');speed.title=isEnglish()?'Preview animation speed; static holds keep their duration. Export uses authored timing.':'预览动画倍率；静态停留保持设定时长。导出使用作品原定动画时长。';
  speed.innerHTML=rates.map(r=>`<option value="${r}">${r}×</option>`).join('');speed.value=String(rate);$('.wp-clock').insertBefore(speed,$('[data-wp-restart]'));
  let holdDrag=null;
  const holdText=(zh,en)=>isEnglish()?en:zh;
  if(editableTiming){
    const row=win.document.createElement('div');row.className='wp-hold-track';
    row.innerHTML=work.steps.map((step,i)=>`<div data-wp-hold-segment="${step.id}"><span data-wp-hold-region><button type="button" data-wp-hold="${step.id}" role="slider" aria-label="${holdText('第 '+(i+1)+' 步静态停留','Step '+(i+1)+' static hold')}" aria-valuemin="0.5" aria-valuemax="12"><span aria-hidden="true">Ⅱ</span><small></small></button></span></div>`).join('');
    $('.wp-scrubber').append(row);refreshHolds();
    $('.wp-clock-hint').textContent=holdText('拖动圆点定位 · 拖动分段右端调整停留','Seek with the dot · Drag a segment edge to resize its hold');
    row.addEventListener('pointerdown',e=>{
      const button=e.target.closest('[data-wp-hold]');if(!button||e.button!==0)return;
      e.preventDefault();stop();manualFrame=null;const step=work.steps.find(s=>s.id===button.dataset.wpHold);
      holdDrag={id:step.id,initial:step.hold,x:e.clientX,msPerPixel:timeline.duration/Math.max(1,$('.wp-hold-track').getBoundingClientRect().width),pointer:e.pointerId,button};button.setPointerCapture(e.pointerId);button.focus();button.dataset.dragging='true';
    },{signal:events.signal});
    row.addEventListener('pointermove',e=>{if(holdDrag?.pointer===e.pointerId)changeHold(holdDrag.id,holdDrag.initial+(e.clientX-holdDrag.x)*holdDrag.msPerPixel);},{signal:events.signal});
    const endHold=(e,cancel=false)=>{if(holdDrag?.pointer!==e.pointerId)return;const drag=holdDrag;holdDrag=null;delete drag.button.dataset.dragging;if(cancel)changeHold(drag.id,drag.initial);else if(work.steps.find(s=>s.id===drag.id).hold!==drag.initial)onTimingChange(structuredClone(work));if(drag.button.hasPointerCapture(e.pointerId))drag.button.releasePointerCapture(e.pointerId);};
    row.addEventListener('pointerup',e=>endHold(e),{signal:events.signal});row.addEventListener('pointercancel',e=>endHold(e,true),{signal:events.signal});row.addEventListener('lostpointercapture',e=>endHold(e,true),{signal:events.signal});
    row.addEventListener('keydown',e=>{
      const button=e.target.closest('[data-wp-hold]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();const step=work.steps.find(s=>s.id===button.dataset.wpHold),amount=e.shiftKey?1000:100;
      changeHold(step.id,e.key==='Home'?500:e.key==='End'?12000:step.hold+(e.key==='ArrowLeft'?-amount:amount));onTimingChange(structuredClone(work));
    },{signal:events.signal});
  }
  function refreshHolds(){
    timeline.segments.forEach(segment=>{
      const element=host.querySelector(`[data-wp-hold-segment="${segment.step.id}"]`);if(!element)return;
      element.style.flex=String(segment.end-segment.start);const region=element.querySelector('[data-wp-hold-region]'),button=element.querySelector('button'),seconds=(segment.step.hold/1000).toFixed(1);
      region.style.width=`${segment.step.hold/(segment.end-segment.start)*100}%`;region.querySelector('small').textContent=holdText(`停留 ${seconds} 秒`,`Hold ${seconds} s`);button.setAttribute('aria-valuenow',seconds);button.setAttribute('aria-valuetext',`${seconds} ${holdText('秒','seconds')}`);
    });
  }
  function changeHold(id,milliseconds){
    const step=work.steps.find(s=>s.id===id);if(!step)return;stop();manualFrame=null;
    const before=timelineFrame(timeline,time),offset=time-before.start;step.hold=holdDuration(milliseconds);timeline=workTimeline(work);
    $('[data-wp-seek]').max=String(timeline.duration);$('[data-wp-duration]').textContent=timelineTime(timeline.duration);
    $('.wp-segments').innerHTML=timeline.segments.map(s=>`<i style="flex:${s.end-s.start}"><b style="width:${s.duration/(s.end-s.start)*100}%"></b></i>`).join('');
    refreshHolds();const after=timeline.segments[before.index];drawAt(Math.min(after.end-1,after.start+offset));
  }
  function stop(){running=false;automatic=false;win.cancelAnimationFrame(raf);win.clearTimeout(pairTimer);raf=null;lastTick=null;status();}
  function status(){
    if(disposed)return;
    const nextPlayMarkup=`<span class="wp-play-symbol">${running?'Ⅱ':'▷'}</span><span>${running?uiText('暂停'):uiText('播放')}</span>`;
    if(playMarkup!==nextPlayMarkup){$('[data-wp-play]').innerHTML=nextPlayMarkup;playMarkup=nextPlayMarkup;}
    $('[data-wp-play]').setAttribute('aria-pressed',String(running));$('[data-wp-play]').setAttribute('aria-label',running?uiText('暂停播放'):uiText('从当前位置播放全部步骤'));$('[data-wp-play]').disabled=!!media?.matches;$('[data-wp-restart]').disabled=!!media?.matches;
    updateText($('[data-wp-position]'),`${String(work.steps.findIndex(s=>s.id===current.id)+1).padStart(2,'0')} / ${String(work.steps.length).padStart(2,'0')}`);
    const f=displayFrame||timelineFrame(timeline,time),phase=f.progress===1?uiText('停留'):f.from?(f.plan.mode==='morph'?uiText('连续形变'):uiText('图表入场')):uiText('图表入场');
    updateText($('[data-wp-status]'),media?.matches?uiText('已开启减少动态效果'):`${stepName(current)} · ${phase}`);
    updateText($('[data-wp-time]'),timelineTime(time));$('[data-wp-seek]').value=String(time);
    $('[data-wp-seek]').setAttribute('aria-valuetext',uiMessage`${timelineTime(time)}，第 ${work.steps.findIndex(s=>s.id===current.id)+1} 步，${stepName(current)}`);
    host.querySelectorAll('[data-wp-step]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wpStep===current.id)));
  }
  function drawAt(ms){
    time=Math.min(timeline.duration,Math.max(0,ms));
    let frame=timelineFrame(timeline,time);
    if(manualFrame&&time<=manualFrame.settled)frame={...manualFrame,time,progress:Math.min(1,Math.max(0,(time-manualFrame.start)/manualFrame.duration))};
    const changed=current.id!==frame.step.id;current=work.steps.find(s=>s.id===frame.step.id);
    if(changed){work.activeStep=current.id;onStep(current.id);}
    displayFrame=frame;stage.seek(frame);status();
    onFrame({time,duration:timeline.duration,fromId:frame.from?.id||null,toId:frame.step.id,progress:frame.progress,index:frame.index,phase:frame.progress===1?'hold':frame.from?'transition':'entrance',mode:frame.plan?.mode||'entrance',running,rate});
    return frame;
  }
  function tick(now){
    if(!running||disposed)return;
    lastTick??=now;const delta=now-lastTick;lastTick=now;
    const custom=manualFrame&&time<manualFrame.settled;
    const limit=custom?manualFrame.settled:automatic?timeline.duration:timeline.segments[work.steps.findIndex(s=>s.id===current.id)].settled;
    const speed=custom?manualFrame.duration/manualFrame.clockDuration:1;
    drawAt(Math.min(limit,custom?time+delta*speed*rate:advanceTimeline(timeline,time,delta,rate)));
    if(time>=limit){manualFrame=null;if(!automatic||time>=timeline.duration){stop();return;}}
    raf=win.requestAnimationFrame(tick);
  }
  function run(all){if(media?.matches||disposed)return;automatic=all;running=true;lastTick=null;status();raf=win.requestAnimationFrame(tick);}
  function seek(ms){stop();manualFrame=null;drawAt(ms);}
  function play(){if(!workReport(work).valid||media?.matches)return;stop();if(time>=timeline.duration){manualFrame=null;drawAt(0);}run(true);}
  function setPlaybackRate(value){if(!rates.includes(Number(value)))return;rate=Number(value);speed.value=String(rate);lastTick=null;}
  function inspectBetween(fromId,toId,fraction){
    const from=work.steps.find(s=>s.id===fromId),target=work.steps.find(s=>s.id===toId);
    if(!from||!target||from===target||!Number.isFinite(fraction))return;
    stop();const segment=timeline.segments.find(s=>s.step.id===toId),plan=transitionPlan(from,target,{steps:work.steps});
    // A pair has its own source even when it runs backwards or skips steps.
    // Keep that frame while inspecting, instead of seeking the adjacent route.
    manualFrame={...segment,from,plan,retarget:false,clockDuration:plan.duration,phase:'transition'};
    drawAt(segment.start+segment.duration*Math.max(0,Math.min(1,fraction)));
  }
  function select(id,manual=true,{animate=true}={}){
    const target=work.steps.find(s=>s.id===id);if(!target)return;
    const displayed=stage.timelineAt,retarget=displayed?.plan?.mode==='morph'&&displayed.progress>0&&displayed.progress<1;
    const from=current;stop();manualFrame=null;
    const segment=timeline.segments.find(s=>s.step.id===id);
    if(!animate||media?.matches){drawAt(segment.settled);return;}
    const plan=from.id===target.id?null:transitionPlan(from,target,{steps:work.steps});
    manualFrame={...segment,clockDuration:plan?.duration??segment.duration,from:plan?from:null,plan,retarget,phase:plan?'transition':'entrance'};
    drawAt(segment.start);run(!manual);
    const strip=$('.wp-step-strip'),button=host.querySelector(`[data-wp-step="${id}"]`);
    if(strip&&button){const x=button.offsetLeft-strip.offsetLeft;if(x<strip.scrollLeft)strip.scrollLeft=x;else if(x+button.offsetWidth>strip.scrollLeft+strip.clientWidth)strip.scrollLeft=x+button.offsetWidth-strip.clientWidth;}
  }
  if(showSteps)$('.wp-step-strip').innerHTML=work.steps.map((s,i)=>`<button data-wp-step="${s.id}" aria-pressed="${s.id===current.id}"><small>${String(i+1).padStart(2,'0')}</small>${stepIcon(s)}<span>${esc(stepName(s))}</span></button>`).join('');
  host.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.dataset.wpStep)select(button.dataset.wpStep);
    else if(button.hasAttribute('data-wp-play')){if(running)stop();else play();}
    else if(button.hasAttribute('data-wp-restart')){seek(0);play();}
  },{signal:events.signal});
  $('[data-wp-seek]').addEventListener('input',e=>seek(Number(e.target.value)),{signal:events.signal});
  speed.addEventListener('change',e=>setPlaybackRate(e.target.value),{signal:events.signal});
  win.document.addEventListener('visibilitychange',()=>{if(win.document.hidden)stop();},{signal:events.signal});
  const reduce=()=>{if(media.matches){stop();drawAt(time);}status();};media?.addEventListener('change',reduce);
  select(current.id);
  return {select,seek,play,stop,isPlaying:()=>running,inspectBetween,getViewport:()=>viewport.capture(),restoreViewport:value=>viewport.restore(value),setZoom:value=>viewport.setZoom(value),fit:()=>viewport.fit(),setPlaybackRate,getPlaybackRate:()=>rate,getTime:()=>time,getWork:()=>structuredClone(work),get duration(){return timeline.duration;},previewBetween(fromId,toId){if(!work.steps.some(s=>s.id===fromId)||!work.steps.some(s=>s.id===toId))return;select(fromId,true,{animate:false});pairTimer=win.setTimeout(()=>select(toId),220);},previewPair(id){const i=work.steps.findIndex(s=>s.id===id);if(i<1)return;select(work.steps[i-1].id,true,{animate:false});pairTimer=win.setTimeout(()=>select(id),220);},destroy(){stop();disposed=true;events.abort();media?.removeEventListener('change',reduce);viewport.destroy();stage.destroy();host.replaceChildren();}};
}
