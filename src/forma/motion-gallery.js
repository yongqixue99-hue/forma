import {uiText,uiMarkup,uiMessage} from './locale.js';
import {sequencePresets} from './morph-sequence.js';
import {scenarioPresets,scenarioCategory} from './scenario-presets.js';
import {presetWork,transitionPlan} from './work-model.js';
import {mountWorkPlayer,stepIcon,stepName} from './work-player.js';
import {escapeHtml as esc} from './data.js';
import './work-ui.css';
import './motion-gallery.css';

const symbol=(name)=>`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${({search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>',expand:'<path d="m6 9 6 6 6-6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',swap:'<path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4"/>',play:'<path d="m8 4 12 8-12 8Z"/>'})[name]}</svg>`;

export function mountMotionGallery(host,{palette='ink',onUse=()=>{}}={}){
  const effects=[...sequencePresets,{id:'independent',name:uiText('多组数据'),description:uiText('前两步比较渠道收入，最后一步切换到另一项指标。')}];
  const win=host.ownerDocument.defaultView,events=new win.AbortController();
  const choices=group=>group==='effects'?effects:scenarioPresets.filter(p=>(scenarioCategory(p)==='research')===(group==='research'));
  let group='scenarios',selected=choices('scenarios')[0],work=presetWork(selected.id,palette),player,pair=1,pairFrom=0,query='',expanded=false,progress=0;
  const metadata=new Map();
  function presetInfo(p){
    if(!metadata.has(p.id)){
      const steps=p.views?p.views.map(view=>({view})):presetWork(p.id,palette).steps;
      metadata.set(p.id,{steps,names:steps.map(stepName),search:[p.id,p.name,uiText(p.name),p.description,uiText(p.description),p.relation,uiText(p.relation),...steps.map(s=>s.view||s.doc?.template),...steps.map(stepName)].join(' ').toLocaleLowerCase()});
    }
    return metadata.get(p.id);
  }
  const matches=()=>choices(group).filter(p=>query.trim().toLocaleLowerCase().split(/\s+/).every(token=>presetInfo(p).search.includes(token)));
  host.innerHTML=uiMarkup`<section class="mg-gallery mg-scenes mg-refined" aria-label="自由画布变形效果预览"><header class="mg-header"><div><h1>变形预览</h1><p>从一个场景开始，让数据连成一段表达。</p></div><div class="mg-group-tabs" role="group" aria-label="预设分类"><button data-mg-group="scenarios" aria-pressed="true">常规场景 <small>${choices('scenarios').length}</small></button><button data-mg-group="research" aria-pressed="false">科研场景 <small>${choices('research').length}</small></button><button data-mg-group="effects" aria-pressed="false">效果展示 <small>${effects.length}</small></button></div><a href="#editor">返回作品编辑器 ↗</a></header>
    <div class="mg-discovery"><label class="mg-search">${symbol('search')}<input type="search" data-mg-search placeholder="搜索预设或图型" aria-label="搜索预设或图型" autocomplete="off"><button data-mg-clear aria-label="清除预设搜索" hidden>${symbol('close')}</button></label><span class="mg-result-count" data-mg-count role="status"></span><div class="mg-browse-actions"><button data-mg-browse="previous" aria-label="浏览前面的预设" title="浏览前面的预设">${symbol('left')}</button><button data-mg-browse="next" aria-label="浏览后面的预设" title="浏览后面的预设">${symbol('right')}</button><button data-mg-expand aria-expanded="false"><span>展开全部</span>${symbol('expand')}</button></div></div>
    <nav class="mg-presets" aria-label="变形示例"></nav><div class="mg-search-empty" hidden><p>没有找到匹配的预设</p><button data-mg-clear>清除搜索</button></div>
    <div class="mg-body"><div class="mg-player-host"></div><aside class="mg-detail"><span data-mg-relation></span><h2 data-mg-title></h2><p data-mg-description></p>
      <details class="mg-pair-control" open><summary class="mg-pair-heading"><h3>自由试播</h3><button data-mg-replay aria-label="试播所选图型之间的过渡">${symbol('play')}<span>试播</span></button></summary><div class="mg-pair-selectors"><label>从<select data-mg-from aria-label="变形起始图型"></select></label><button data-mg-swap aria-label="交换起点和终点" title="交换起点和终点">${symbol('swap')}</button><label>到<select data-mg-pair aria-label="变形目标图型"></select></label></div><div class="mg-inspection"><label for="mg-pair-progress">过渡进度</label><output data-mg-progress-label for="mg-pair-progress">0%</output><input id="mg-pair-progress" data-mg-progress type="range" min="0" max="100" step="1" value="0" aria-label="过渡进度"></div><p data-mg-recipe></p></details>
      <button class="button dark" data-mg-use>使用此预设 <span>↗</span></button><small>带入编辑器后，每一步都能单独修改。</small>
      <details class="mg-data-note"><summary>使用这组数据</summary><p data-mg-data></p><div class="mg-case-links" hidden><a data-mg-raw download>下载本例数据</a><a data-mg-full download hidden>完整原表（含缺测）</a><a data-mg-source target="_blank" rel="noopener">来源说明 ↗</a></div></details><a class="mg-library-link" href="#library/morph">从图库挑选可变形图表 ↗</a></aside></div></section>`;
  const $=s=>host.querySelector(s),strip=$('.mg-presets');
  function browsing(){
    const overflow=strip.scrollWidth>strip.clientWidth+2&&!expanded;
    $('[data-mg-browse=previous]').hidden=!overflow;$('[data-mg-browse=next]').hidden=!overflow;
    $('[data-mg-browse=previous]').disabled=strip.scrollLeft<=2;$('[data-mg-browse=next]').disabled=strip.scrollLeft+strip.clientWidth>=strip.scrollWidth-2;
  }
  function revealPreset(){
    const active=strip.querySelector('[aria-pressed=true]');if(!active){browsing();return;}
    const activeRect=active.getBoundingClientRect(),stripRect=strip.getBoundingClientRect();
    if(expanded){const top=activeRect.top-stripRect.top+strip.scrollTop;if(top<strip.scrollTop)strip.scrollTop=top;else if(top+active.offsetHeight>strip.scrollTop+strip.clientHeight)strip.scrollTop=top+active.offsetHeight-strip.clientHeight;}
    else{const left=activeRect.left-stripRect.left+strip.scrollLeft;if(left<strip.scrollLeft)strip.scrollLeft=left;else if(left+active.offsetWidth>strip.scrollLeft+strip.clientWidth)strip.scrollLeft=left+active.offsetWidth-strip.clientWidth;}
    browsing();
  }
  function tabs({reveal=true}={}){
    const filtered=matches(),selectedVisible=filtered.some(p=>p.id===selected.id);
    host.querySelectorAll('[data-mg-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mgGroup===group)));
    strip.dataset.expanded=String(expanded);strip.hidden=!filtered.length;
    strip.innerHTML=filtered.map((p,i)=>{const info=presetInfo(p);return `<button data-mg-preset="${p.id}" title="${esc(uiText(p.name)+' · '+info.names.join(' → '))}" aria-pressed="${p.id===selected.id}" tabindex="${p.id===selected.id||!selectedVisible&&i===0?'0':'-1'}"><span class="mg-preset-icons">${info.steps.slice(0,3).map(stepIcon).join('')}</span><strong>${esc(uiText(p.name))}</strong><small class="mg-preset-detail">${esc(info.names.slice(0,3).join(' → '))}</small></button>`;}).join('');
    $('[data-mg-count]').textContent=query.trim()?uiMessage`${filtered.length} 个匹配`:uiMessage`${filtered.length} 个预设`;
    $('.mg-search>button').hidden=!query;$('[data-mg-expand]').hidden=filtered.length<2;
    $('[data-mg-expand]').setAttribute('aria-expanded',String(expanded));$('[data-mg-expand]>span').textContent=uiText(expanded?'收起预设':'展开全部');
    $('.mg-search-empty').hidden=!!filtered.length;
    if(reveal)revealPreset();else{strip.scrollLeft=0;strip.scrollTop=0;browsing();}
  }
  function showProgress(value){progress=Math.max(0,Math.min(1,value));const percent=Math.round(progress*100);$('[data-mg-progress]').value=String(percent);$('[data-mg-progress-label]').textContent=`${percent}%`;}
  function pairNote(inspect=false){const plan=transitionPlan(work.steps[pairFrom],work.steps[pair],{steps:work.steps});$('[data-mg-recipe]').textContent=`${uiText(plan.name)} · ${uiText(plan.description)}`;$('[data-mg-from]').value=String(pairFrom);$('[data-mg-pair]').value=String(pair);showProgress(0);if(inspect)player?.inspectBetween?.(work.steps[pairFrom].id,work.steps[pair].id,0);}
  function previewSelected(){player.previewBetween(work.steps[pairFrom].id,work.steps[pair].id);}
  function render(){
    player?.destroy();tabs();$('[data-mg-title]').textContent=uiText(selected.name);$('[data-mg-description]').textContent=uiText(selected.description);
    $('[data-mg-relation]').textContent=uiText(selected.relation)||uiText('几何效果 · 演示数据');
    $('[data-mg-data]').textContent=uiText(selected.dataNote)||uiText('这组预设用于体验形状变化。用于真实内容时，请核对图型含义：折线需要有序数据，漏斗需要连续阶段，占比图需要可相加的整体。');
    $('.mg-case-links').hidden=!selected.dataUrl;if(selected.dataUrl){$('[data-mg-raw]').href=selected.dataUrl;$('[data-mg-source]').href=selected.sourceUrl;$('[data-mg-full]').hidden=!selected.rawUrl;if(selected.rawUrl)$('[data-mg-full]').href=selected.rawUrl;}
    const options=work.steps.map((s,i)=>`<option value="${i}">${String(i+1).padStart(2,'0')} ${esc(stepName(s))}</option>`).join('');
    $('[data-mg-pair]').innerHTML=options;$('[data-mg-from]').innerHTML=options;
    // Browsing and filtering do not change a work; the explicit chosen pair
    // stays stable while playback/inspection reports its own frame position.
    player=mountWorkPlayer($('.mg-player-host'),work,{editableTiming:true,onTimingChange(value){work=value;},onFrame(frame){if(['transition','hold'].includes(frame.phase)&&frame.fromId===work.steps[pairFrom].id&&frame.toId===work.steps[pair].id)showProgress(frame.progress);}});pairNote();
    $('[data-mg-progress]').disabled=!player.inspectBetween;
  }
  host.addEventListener('click',e=>{
    const g=e.target.closest('[data-mg-group]');if(g&&g.dataset.mgGroup!==group){group=g.dataset.mgGroup;tabs({reveal:false});}
    const p=e.target.closest('[data-mg-preset]');if(p){const next=choices(group).find(item=>item.id===p.dataset.mgPreset);if(next&&next.id!==selected.id){selected=next;pair=1;pairFrom=0;work=presetWork(selected.id,palette);expanded=false;render();strip.querySelector(`[data-mg-preset="${selected.id}"]`)?.focus({preventScroll:true});}}
    if(e.target.closest('[data-mg-clear]')){query='';$('[data-mg-search]').value='';tabs();$('[data-mg-search]').focus();}
    if(e.target.closest('[data-mg-expand]')){expanded=!expanded;tabs();}
    const browse=e.target.closest('[data-mg-browse]');if(browse){const offset=Math.max(150,strip.clientWidth*.8)*(browse.dataset.mgBrowse==='next'?1:-1);if(strip.scrollBy)strip.scrollBy({left:offset,behavior:win.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});else strip.scrollLeft+=offset;}
    if(e.target.closest('[data-mg-swap]')){[pairFrom,pair]=[pair,pairFrom];pairNote(true);}
    if(e.target.closest('[data-mg-replay]')){e.preventDefault();previewSelected();if(mobileLayout?.matches&&!$('.mg-pair-control').open)$('.mg-player-host').scrollIntoView?.({block:'start',behavior:'smooth'});}
    if(e.target.closest('[data-mg-use]'))onUse(work);
  },{signal:events.signal});
  host.addEventListener('input',e=>{if(e.target.hasAttribute('data-mg-search')){query=e.target.value;tabs({reveal:false});}else if(e.target.hasAttribute('data-mg-progress')){showProgress(Number(e.target.value)/100);player.inspectBetween?.(work.steps[pairFrom].id,work.steps[pair].id,progress);}},{signal:events.signal});
  host.addEventListener('change',e=>{if(e.target.hasAttribute('data-mg-pair')){const old=pair;pair=Number(e.target.value);if(pair===pairFrom)pairFrom=old;pairNote(true);}else if(e.target.hasAttribute('data-mg-from')){const old=pairFrom;pairFrom=Number(e.target.value);if(pair===pairFrom)pair=old;pairNote(true);}},{signal:events.signal});
  host.addEventListener('keydown',e=>{
    if(e.target.hasAttribute('data-mg-search')&&e.key==='Escape'){e.preventDefault();query='';e.target.value='';tabs();return;}
    const button=e.target.closest('[data-mg-preset]');if(!button||!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
    e.preventDefault();const buttons=[...strip.querySelectorAll('button')],at=buttons.indexOf(button),columns=expanded?Math.max(1,win.getComputedStyle(strip).gridTemplateColumns.split(' ').length):1,delta=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:e.key==='ArrowDown'?columns:-columns,index=e.key==='Home'?0:e.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,at+delta));
    buttons.forEach((b,i)=>b.tabIndex=i===index?0:-1);buttons[index].focus();
  },{signal:events.signal});
  strip.addEventListener('scroll',browsing,{signal:events.signal,passive:true});
  const resizeObserver=win.ResizeObserver?new win.ResizeObserver(revealPreset):null;resizeObserver?.observe(strip);
  // On a small screen the pair inspector opens beside the canvas in the page
  // flow. It never leaves the controls a screen below the animation they edit.
  const mobileLayout=win.matchMedia?.('(max-width: 820px)');
  function placePair(){const pane=$('.mg-pair-control');if(mobileLayout?.matches){$('.mg-body').insertBefore(pane,$('.mg-player-host'));pane.open=false;}else{$('.mg-detail').insertBefore(pane,$('[data-mg-use]'));pane.open=true;}}
  mobileLayout?.addEventListener?.('change',placePair);
  $('.mg-pair-control').addEventListener('toggle',()=>{if(mobileLayout?.matches&&$('.mg-pair-control').open)$('.mg-pair-control').scrollIntoView?.({block:'start',behavior:win.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});},{signal:events.signal});
  render();placePair();return {destroy(){mobileLayout?.removeEventListener?.('change',placePair);resizeObserver?.disconnect();events.abort();player?.destroy();}};
}
