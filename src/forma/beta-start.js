import {uiText as t,uiMarkup,locale} from './locale.js';
import {escapeHtml as esc} from './data.js';
import {publicCases} from './public-cases.js';
import {presetWork} from './work-model.js';
import {mountWorkPlayer} from './work-player.js';
import {homeArt} from './home-art.js';
import './work-ui.css';
import './beta.css';

export const betaCaseIds=['public-revenue','public-growth','public-penguins','public-process'];
export function mountBetaStart(host,{onUse,selected='public-revenue',hasWorks=false}={}){
  const win=host.ownerDocument.defaultView,events=new win.AbortController();
  let player,work,disposed=false,previewVisible=false,started=false,resumeOnReturn=false,active=betaCaseIds.includes(selected)?selected:betaCaseIds[0];
  host.innerHTML=uiMarkup`<section class="beta-start">
    <header class="beta-hero"><div class="beta-hero-copy"><p class="eyebrow">FORMA — ANIMATED DATA STUDIO</p><h1>让数据，<br><em>动起来。</em></h1><p class="beta-lede">把表格做成动态图表，用在你的下一次展示。</p><div class="beta-actions"><a class="button dark" href="#library" data-beta-browse>开始浏览图表库 ↗</a><button class="text-button" data-beta-preview>看它如何变化 ↓</button></div><p class="beta-caption">免费使用 · 无需注册</p></div><figure class="beta-hero-art">${homeArt()}<figcaption>Apple FY2025 · <span>同一组数据，三种表达。</span></figcaption></figure><button class="beta-scroll" data-beta-preview aria-label="向下查看预览案例"><span>向下探索</span><span aria-hidden="true">↓</span></button>${hasWorks?uiMarkup`<a href="#editor" class="beta-continue">继续上次的作品 ↗</a>`:''}</header>
    <section class="beta-showcase" id="home-preview" tabindex="-1" aria-labelledby="beta-cases-title"><div class="beta-showcase-toolbar"><div class="beta-case-list" role="group" aria-labelledby="beta-cases-title"><h2 id="beta-cases-title">预览案例</h2>${betaCaseIds.slice(0,3).map((id,i)=>{const item=publicCases.find(p=>p.id===id);return uiMarkup`<button class="beta-case" data-beta-case="${id}" aria-pressed="${active===id}" title="${esc(item.name)}"><span class="mono">0${i+1}</span><span>${t(['收入结构','经济增长','企鹅分布'][i])}</span></button>`;}).join('')}</div><div class="beta-preview-actions"><a class="text-button beta-library-link" href="#library">浏览全部图表 ↗</a><button class="button small" data-beta-use>编辑这个案例 ↗</button></div></div>
    <div class="beta-demo"><div data-beta-player></div></div>
    <div class="beta-showcase-foot"><details class="beta-data-note"><summary>数据与下载</summary><div class="beta-data-content"><h2 data-beta-source-title></h2><p data-beta-source-note></p><div class="beta-actions"><a class="text-button" data-beta-source target="_blank" rel="noopener noreferrer">查看原始来源 ↗</a><a class="text-button" data-beta-data download>下载案例表格 ↓</a><a class="text-button" data-beta-work download>下载可编辑案例 ↓</a><a class="text-button" data-beta-video download>下载英文演示视频 ↓</a><button class="text-button" data-beta-case="public-process">过程监控示例 ↗</button></div></div></details><a class="text-button" href="#guide">使用指南 ↗</a></div></section></section>`;
  const $=s=>host.querySelector(s);
  function show(id){
    if(disposed||!betaCaseIds.includes(id))return;active=id;const item=publicCases.find(p=>p.id===id);
    player?.destroy();work=presetWork(id,'ink');player=mountWorkPlayer($('[data-beta-player]'),work,{showSteps:false});player.seek(0);started=previewVisible;resumeOnReturn=false;if(previewVisible)player.play();
    $('[data-beta-source-title]').textContent=item.name;$('[data-beta-source-note]').textContent=item.dataNote;
    $('[data-beta-source]').href=item.sourceUrl;$('[data-beta-data]').href=item.dataUrl;
    $('[data-beta-work]').href=`/forma/beta/${locale()}/${id}.json`;$('[data-beta-video]').href=`/forma/beta/en/${id}.mp4`;
    host.querySelectorAll('[data-beta-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.betaCase===id)));
  }
  host.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-beta-preview')){$('.beta-showcase').scrollIntoView({block:'start',behavior:win.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('.beta-showcase').focus({preventScroll:true});}
    if(button.dataset.betaCase){show(button.dataset.betaCase);win.history.replaceState(null,'',`#start/${active}`);}
    if(button.hasAttribute('data-beta-use'))onUse(structuredClone(work));
  },{signal:events.signal});
  const header=win.document.querySelector('.topbar');
  const sizeHeader=()=>$('.beta-start').style.setProperty('--home-header',`${Math.max(0,$('.beta-start').getBoundingClientRect().top+win.scrollY)}px`);
  sizeHeader();const headerSize=new win.ResizeObserver(sizeHeader);if(header)headerSize.observe(header);
  show(active);
  const observer=new win.IntersectionObserver(entries=>{for(const entry of entries){
    const visible=entry.isIntersecting&&entry.intersectionRatio>=.3;
    if(visible===previewVisible)continue;previewVisible=visible;
    if(visible){if(!started){player.seek(0);player.play();started=true;}else if(resumeOnReturn)player.play();resumeOnReturn=false;}
    else{resumeOnReturn=player.isPlaying();player.stop();}
  }},{threshold:.3});
  observer.observe($('[data-beta-player]'));
  return {destroy(){disposed=true;observer.disconnect();headerSize.disconnect();player?.destroy();events.abort();}};
}
