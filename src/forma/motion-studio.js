import { MorphChart, morphViews as allMorphViews, morphExample, morphEffects } from './morph.js';
import { palettes, themeFor } from './palettes.js';
import { escapeHtml as esc } from './data.js';
import { download } from './export.js';

const morphViews=allMorphViews.filter(v=>['bars','bubbles','donut','treemap','columns','pie','rose','stacked'].includes(v.id));
const fmt=value=>new Intl.NumberFormat('zh-CN',{maximumSignificantDigits:6,notation:Math.abs(value)>=1e6?'compact':'standard'}).format(value);
const playIcon = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5 3.5 12 8 5 12.5Z" fill="currentColor"/></svg>';
const pauseIcon = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5 4v8M11 4v8" stroke="currentColor" stroke-width="2"/></svg>';
const viewIcons = {
  bars:'<path d="M3 4h16M3 9h11M3 14h7"/>',
  bubbles:'<circle cx="8" cy="9" r="5"/><circle cx="17" cy="6" r="3"/><circle cx="17" cy="14" r="2"/>',
  donut:'<circle cx="11" cy="9" r="7"/><circle cx="11" cy="9" r="3"/><path d="M11 2v4m7 3h-4"/>',
  treemap:'<path d="M2 2h18v14H2Zm10 0v14m0-8h8"/>',
  columns:'<path d="M3 16V8h4v8m3 0V2h4v14m3 0V5h4v11"/>',pie:'<circle cx="11" cy="9" r="7"/><path d="M11 2v7h7m-7 0-5 5"/>',rose:'<path d="m11 9-6-6a8 8 0 0 1 12 0Zm0 0 8 1a8 8 0 0 1-6 7Zm0 0-2 7a7 7 0 0 1-6-5Z"/>',stacked:'<path d="M2 4h18v10H2Zm7 0v10m6-10v10"/>'
};

export function mountMotion(host,{palette='ink',doc=morphExample,view='donut',dark=false,standalone=false,persist=true,player=false,onPalette,effect='smooth',transitionDuration=1500}={}) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let currentDoc=structuredClone(doc), currentView=view, activePalette=palette, isDark=dark;
  let automatic=!reduced.matches, visible=false, timer, destroyed=false, busy=false, duration=[1000,1500,2400].includes(transitionDuration)?transitionDuration:1500, activeEffect=morphEffects.some(e=>e.id===effect)?effect:'smooth', scene;
  host.innerHTML=`<section class="motion-studio ${standalone?'motion-full':''}" aria-label="同一组数据的图型变换">
    <header class="motion-masthead"><span>FORMA <i>Motion studies</i></span><span class="motion-edition">NO. 00 <b>↗</b> EDITION 09</span></header>
    <div class="motion-layout"><aside class="motion-editorial"><p class="motion-kicker">EIGHT VIEWS / FIVE MOTIONS</p><h2>图型变换</h2><p class="motion-intro">比较数量、面积与占比。</p><div class="motion-view-count"><strong>08</strong><span>种数据视图</span></div><div class="motion-key"><span class="motion-key-dot"></span><p>同一对象 · 同一颜色<br><span>数量与来源，始终保留</span></p></div>${standalone||player?'':'<a class="motion-expand" href="#motion">换成我的数据 <span>↗</span></a>'}</aside>
    <figure class="motion-figure"><header class="motion-figure-head"><div><p class="motion-dataset">STUDY / SIX WAYS TO READ</p><h3 data-motion-title></h3></div><div class="motion-total"><strong data-motion-total></strong><span data-motion-unit></span></div></header><div class="motion-chart" aria-live="off"></div><figcaption><span data-motion-note></span><span class="motion-status" data-motion-status role="status">完整数据</span></figcaption><div class="motion-data-strip" aria-label="各类别原始数值"></div></figure></div>
    <footer class="motion-console"><div class="morph-view-switch" role="group" aria-label="切换图型">${morphViews.map((v,i)=>`<button data-morph-view="${v.id}" aria-pressed="${v.id===view}" aria-label="变换为${v.name}"><svg viewBox="0 0 22 18" width="23" height="19" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">${viewIcons[v.id]||''}</svg><span>${esc(v.name)}</span><small>0${i+1}</small></button>`).join('')}</div><div class="motion-playback"><label class="motion-speed"><span>节奏</span><select aria-label="图型变换速度"><option value="1000" ${duration===1000?'selected':''}>轻快</option><option value="1500" ${duration===1500?'selected':''}>舒展</option><option value="2400" ${duration===2400?'selected':''}>从容</option></select></label><button class="motion-auto" aria-pressed="${automatic}">${automatic?pauseIcon:playIcon}<span>${automatic?'停止轮播':'自动轮播'}</span></button></div></footer>
    <div class="motion-effect-row"><span>变换方式</span><div role="group" aria-label="变换方式">${morphEffects.map(e=>`<button data-morph-effect="${e.id}" aria-pressed="${e.id===activeEffect}">${e.name}</button>`).join('')}</div><span class="motion-effect-detail">类别、原值与颜色保持一致</span></div><div class="motion-provenance"><span data-motion-source></span><span>8 种视图 · 同一份数据</span></div>
    ${standalone?`<details class="motion-input"><summary><span>编辑这组数据</span><small>表格填写 / 4–8 个类别</small><span>＋</span></summary><div class="motion-input-body"><div class="motion-form-fields"><label>图表标题<input data-morph-field="title" maxlength="80"></label><label>数据单位<input data-morph-field="unit" maxlength="20"></label><label>数据来源<input data-morph-field="source" maxlength="80"></label><p>一行一个类别，名称不重复，数值填正数。八种视图共用这组数据，填写后点击「校验并更新」。</p></div><div><div class="motion-table-heading"><span>类别与数值</span><button data-morph-add>＋ 增加行</button></div><div class="motion-table" data-morph-table></div><details class="motion-json-advanced"><summary>编辑 JSON（可选）</summary><label class="motion-json-label" for="morph-data-editor">与上方表格对应的原始记录</label><textarea id="morph-data-editor" spellcheck="false" aria-label="变换图表数据"></textarea></details><div class="motion-data-actions"><button class="button dark" data-morph-apply>校验并更新</button><button class="text-button" data-morph-restore>恢复示例</button><span data-morph-feedback role="status"></span></div></div></div></details><div class="motion-export-row"><p>把整段图型变换带走，或保留这组数据继续创作。</p><div><button class="button" data-morph-json>导出 JSON <span>↓</span></button><button class="button dark" data-morph-export>导出 HTML 动效 <span>↗</span></button></div></div>`:''}
  </section>`;
  const $=selector=>host.querySelector(selector), root=$('.motion-studio');
  function setGround(){const t=themeFor(activePalette,isDark);root.style.cssText=`--motion-bg:${t.bg};--motion-fg:${t.fg};--motion-muted:${t.secondary};--motion-line:${t.line};--motion-accent:${t.accent};--motion-soft:${t.soft}`;}
  function stopTimer(){clearTimeout(timer);timer=null;}
  function schedule(){stopTimer();if(!destroyed&&automatic&&visible&&!document.hidden&&!document.querySelector('dialog[open]')&&!busy)timer=setTimeout(()=>switchView(morphViews[(morphViews.findIndex(v=>v.id===currentView)+1)%morphViews.length].id),3900);}
  function onChange({view,animating}){currentView=view;busy=animating;if(animating)stopTimer();root.dataset.animating=String(animating);host.querySelectorAll('[data-morph-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.morphView===view)));$('[data-motion-note]').textContent=morphViews.find(v=>v.id===view)?.note||'';$('[data-motion-status]').textContent=animating?'形态转换中':'完整数据';if(!animating)schedule();}
  function switchView(next){stopTimer();scene.setView(next,{animate:!reduced.matches,duration,effect:activeEffect});}
  function renderData(updateEditor=true){
    const total=currentDoc.data.reduce((sum,r)=>sum+r.value,0), t=themeFor(activePalette,isDark);
    $('[data-motion-title]').textContent=currentDoc.title;
    $('[data-motion-total]').textContent=fmt(total);
    $('[data-motion-unit]').textContent=`合计 / ${currentDoc.unit}`;
    $('[data-motion-source]').textContent=`${currentDoc.source.type==='demo'?'演示数据':'数据来源'} · ${currentDoc.source.name}`;
    $('.motion-dataset').textContent=`STUDY / ${String(currentDoc.data.length).padStart(2,'0')} CATEGORIES`;
    $('.motion-data-strip').style.setProperty('--morph-record-columns',currentDoc.data.length<=6?currentDoc.data.length:4);
    // Legend marks mirror the engine's record colors, including after rapid view changes.
    $('.motion-data-strip').innerHTML=currentDoc.data.map((r,i)=>`<div><span><i data-record-swatch="${esc(r.label)}" style="background:${t.colors[i%t.colors.length]}"></i><em>${String(i+1).padStart(2,'0')}</em>${esc(r.label)}</span><strong title="${esc(String(r.value))} ${esc(currentDoc.unit)}">${fmt(r.value)}<small>${(r.value/total*100).toFixed(1)}%</small></strong></div>`).join('');
    if(standalone&&updateEditor){$('[data-morph-field=title]').value=currentDoc.title;$('[data-morph-field=unit]').value=currentDoc.unit;$('[data-morph-field=source]').value=currentDoc.source.name;$('#morph-data-editor').value=JSON.stringify(currentDoc.data,null,2);renderTable(currentDoc.data);}
    syncSwatches();
  }
  function renderTable(rows){
    if(!standalone)return;
    $('[data-morph-table]').innerHTML=`<table aria-label="变换画布数据表"><thead><tr><th>类别名称</th><th>数值</th><th><span class="sr-only">行操作</span></th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td><input data-morph-cell="${i}:label" aria-label="第 ${i+1} 行 类别" value="${esc(r.label??'')}" maxlength="80"></td><td><input data-morph-cell="${i}:value" aria-label="第 ${i+1} 行 数值" inputmode="decimal" value="${esc(r.value??'')}"></td><td><button data-morph-remove="${i}" aria-label="移除类别 ${i+1}" ${rows.length<=4?'disabled':''}>×</button></td></tr>`).join('')}</tbody></table>`;
    $('[data-morph-add]').disabled=rows.length>=8;
  }
  function readTable(){
    return [...host.querySelectorAll('[data-morph-cell$=":label"]')].map((label,i)=>{
      const raw=$(`[data-morph-cell="${i}:value"]`).value.trim();
      return{label:label.value,value:raw!==''&&Number.isFinite(Number(raw))?Number(raw):raw};
    });
  }
  function syncDraft(rows){$('#morph-data-editor').value=JSON.stringify(rows,null,2);$('[data-morph-feedback]').textContent='有未应用的修改，点击「校验并更新」预览。';$('[data-morph-feedback]').dataset.invalid='false';}
  function syncSwatches(){for(const mark of host.querySelectorAll('[data-record-swatch]')){const path=[...host.querySelectorAll('.motion-chart [data-key]')].find(p=>p.getAttribute('data-key')===mark.dataset.recordSwatch);if(path)mark.style.background=path.getAttribute('stroke')||path.getAttribute('fill');}}
  setGround();
  scene=new MorphChart($('.motion-chart'),currentDoc,{palette:activePalette,dark:isDark,view,effect:activeEffect,duration,onChange});
  renderData();onChange({view,animating:false});
  function autoButton(){const b=$('.motion-auto');b.innerHTML=`${automatic?pauseIcon:playIcon}<span>${automatic?'停止轮播':'自动轮播'}</span>`;b.setAttribute('aria-pressed',String(automatic));}
  host.querySelectorAll('[data-morph-view]').forEach(b=>b.onclick=()=>{automatic=false;autoButton();switchView(b.dataset.morphView);});
  host.querySelectorAll('[data-morph-effect]').forEach(b=>b.onclick=()=>{activeEffect=b.dataset.morphEffect;scene.options.effect=activeEffect;host.querySelectorAll('[data-morph-effect]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.morphEffect===activeEffect)));});
  $('.motion-auto').onclick=()=>{automatic=!automatic;autoButton();automatic?schedule():stopTimer();};
  $('.motion-speed select').value=String(duration);$('.motion-speed select').onchange=e=>{duration=+e.target.value;scene.options.duration=duration;};
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?schedule():stopTimer();},{threshold:.15});observer.observe($('.motion-chart'));
  const visibility=()=>document.hidden?stopTimer():schedule();document.addEventListener('visibilitychange',visibility);
  const dialogObserver=new MutationObserver(()=>schedule());dialogObserver.observe(document.querySelector('#studio')||host,{attributes:true,attributeFilter:['open']});
  const reduceChange=()=>{if(reduced.matches){automatic=false;autoButton();stopTimer();scene.setView(currentView,{animate:false});}};reduced.addEventListener('change',reduceChange);
  const resize=new ResizeObserver(()=>scene.resize());resize.observe($('.motion-chart'));
  if(standalone){
    $('[data-morph-table]').addEventListener('input',()=>syncDraft(readTable()));
    $('[data-morph-table]').addEventListener('click',e=>{const button=e.target.closest('[data-morph-remove]');if(!button)return;const rows=readTable();if(rows.length<=4)return;rows.splice(Number(button.dataset.morphRemove),1);syncDraft(rows);renderTable(rows);});
    $('[data-morph-add]').onclick=()=>{const rows=readTable();if(rows.length>=8)return;rows.push({label:'',value:''});syncDraft(rows);renderTable(rows);$(`[data-morph-cell="${rows.length-1}:label"]`).focus();};
    $('#morph-data-editor').addEventListener('input',()=>{
      let mapped=false;
      try{const rows=JSON.parse($('#morph-data-editor').value);if(Array.isArray(rows)&&rows.length>=4&&rows.length<=8&&rows.every(r=>r&&typeof r.label==='string'&&['number','string'].includes(typeof r.value))){renderTable(rows);mapped=true;}}catch{}
      // Keep a partially typed JSON draft from being overwritten by stale grid cells.
      if(!mapped){host.querySelectorAll('[data-morph-cell],[data-morph-remove],[data-morph-add]').forEach(el=>el.disabled=true);}
      $('[data-morph-feedback]').textContent=mapped?'JSON 草稿将在「校验并更新」后应用到图表。':'请先把 JSON 修正为 4–8 行的类别与数值，表格会同步恢复。';
      $('[data-morph-feedback]').dataset.invalid=String(!mapped);
    });
    $('[data-morph-apply]').onclick=()=>{
      const feedback=$('[data-morph-feedback]');
      try{
        const data=JSON.parse($('#morph-data-editor').value), sourceName=$('[data-morph-field=source]').value.trim();
        if(!Array.isArray(data))throw Error('请填写由 label、value 记录组成的 JSON 数组。');
        const changed=JSON.stringify(data)!==JSON.stringify(currentDoc.data);
        if(changed&&currentDoc.source.type==='demo'&&sourceName===currentDoc.source.name)throw Error('请为替换后的数据填写自己的来源。');
        const next={...currentDoc,title:$('[data-morph-field=title]').value.trim(),unit:$('[data-morph-field=unit]').value.trim(),data,source:{...currentDoc.source,name:sourceName,type:changed?'user':currentDoc.source.type}};
        scene.setData(next);currentDoc=next;renderData();
        feedback.textContent='已更新，八种视图共用这组原值。';feedback.dataset.invalid='false';
        if(persist){try{localStorage.setItem('forma.morph.v1',JSON.stringify(next));}catch{feedback.textContent+=' 请导出 JSON 保存。';}}
      }catch(e){feedback.textContent=e instanceof SyntaxError?'JSON 格式有误，请检查引号和逗号。':e.message;feedback.dataset.invalid='true';}
    };
    $('[data-morph-restore]').onclick=()=>{currentDoc=structuredClone(morphExample);scene.setData(currentDoc);renderData();$('[data-morph-feedback]').textContent='已恢复演示数据。';if(persist){try{localStorage.removeItem('forma.morph.v1');}catch{}}};
    $('[data-morph-json]').onclick=()=>download(new Blob([JSON.stringify(currentDoc,null,2)],{type:'application/json'}),'FORMA-morph.json');
    $('[data-morph-export]').onclick=async e=>{
      const b=e.currentTarget;b.disabled=true;
      try{
        const res=await fetch(`${import.meta.env.BASE_URL}forma/morph-player.js`);if(!res.ok)throw Error('动效播放器未就绪，请重新构建。');
        if(destroyed)return;
        const js=(await res.text()).replace(/<\/script/gi,'<\\/script');
        const payload=JSON.stringify({doc:currentDoc,view:currentView,palette:activePalette,dark:isDark,effect:activeEffect,transitionDuration:duration}).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
        const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(currentDoc.title)} · FORMA Motion</title><body><main id="forma-motion"></main><script>${js}</script><script>FormaMotion.mount(document.getElementById('forma-motion'),${payload});</script></body></html>`;
        download(new Blob([html],{type:'text/html;charset=utf-8'}),'FORMA-morph.html');
        if(!destroyed)$('[data-morph-feedback]').textContent='已导出包含数据与变换播放器的 HTML。';
      }catch(error){if(!destroyed)$('[data-morph-feedback]').textContent=error.message;}finally{b.disabled=false;}
    };
  }
  return {edit(){if(!standalone)return;$('.motion-input').open=true;$('.motion-input').scrollIntoView?.({block:'start',behavior:reduced.matches?'instant':'smooth'});$('[data-morph-field=title]').focus({preventScroll:true});},setPalette(next,dark=isDark){activePalette=next;isDark=dark;setGround();scene.setPalette(next,dark);renderData(false);onPalette?.(next);},destroy(){destroyed=true;stopTimer();observer.disconnect();resize.disconnect();dialogObserver.disconnect();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',reduceChange);scene.destroy();host.replaceChildren();}};
}
