import {uiText,uiMarkup,uiMessage} from './locale.js';
import {applyChartBrand,applyFrameBrand} from './brand-view.js';
import {exportFonts} from './export-fonts.js';
import { spatialViews } from './spatial-charts.js';
import { ChartScene } from './charts.js';
import { themeFor } from './palettes.js';
import { escapeHtml } from './data.js';
import { findTemplate } from './catalog.js';

export function mount(host,{doc,options={}}){
  const document=host.ownerDocument,win=document.defaultView;
  const t=themeFor(options.palette,options.dark,options.colors),template=findTemplate(doc.template);const media=win.matchMedia('(prefers-reduced-motion: reduce)');let reduced=media.matches,playing=!reduced,p=reduced?1:0,last=win.performance.now(),raf=null,destroyed=false;const seconds=options.duration||8;
  document.body.style.cssText=`margin:0;background:${t.isDark?'#151515':'#e9e7e2'};color:${t.fg};font:14px/1.5 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;`;
  host.style.cssText='max-width:1120px;margin:40px auto;padding:0 20px';
  const style=document.createElement('style');style.textContent='*{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible{outline:2px solid #77716a;outline-offset:4px}.fp-head{padding:32px 38px 0}.fp-head h1{font-size:26px;font-weight:500;margin:14px 0 6px}.fp-head p{font-size:12px;opacity:.7}.fp-chart{height:480px;padding:12px 20px}.fp-footer{margin:0 38px;padding:18px 0;border-top:1px solid #8883;display:flex;justify-content:space-between;gap:15px;font-size:11px;opacity:.7}.fp-controls{display:flex;align-items:center;gap:18px;margin-top:20px}.fp-controls input{flex:1;accent-color:#77716a}.fp-controls button{border:1px solid #8885;background:transparent;color:inherit;border-radius:4px;padding:8px 16px}.fp-source{overflow-wrap:anywhere}.fp-spatial{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 38px 0;font-size:11px}.fp-spatial button{border:1px solid #8884;background:transparent;color:inherit;padding:6px 12px}.fp-spatial button[aria-pressed=true]{background:#8882}.fp-spatial div{display:flex;gap:4px}@media(max-width:600px){#forma-player{margin:16px auto!important;padding:0 12px!important}.fp-head{padding:24px 20px 0}.fp-head h1{font-size:20px}.fp-chart{height:350px;padding:12px 5px}.fp-footer{margin:0 20px;flex-direction:column;gap:5px}.fp-controls{gap:10px}}';style.textContent+=exportFonts+' .fp-chart{height:auto!important;flex:1;min-height:220px}.fp-frame{display:flex;flex-direction:column;min-height:380px}';document.head.append(style);
  host.innerHTML=uiMarkup`<article class="fp-frame" style="aspect-ratio:${({wide:1.6,landscape:16/9,square:1,portrait:.75,story:9/16})[options.ratio]||1.6};background:${t.bg};border:1px solid ${t.line};border-radius:5px"><header class="fp-head"><span style="font-size:10px;letter-spacing:2px;opacity:.65">FORMA / ${template.no} · ${escapeHtml(template.en.toUpperCase())}</span><h1>${escapeHtml(doc.title)}</h1><p>${escapeHtml(doc.subtitle)} · 单位：${escapeHtml(doc.unit)}</p></header>${template.dimension==='3d'?uiText('<div class="fp-spatial"><span>拖动或方向键旋转</span><div role="group" aria-label="三维视角"><button data-view="iso">等轴</button><button data-view="front">正面</button><button data-view="top">俯视</button></div></div>'):''}<div class="fp-chart"></div><div class="fp-footer"><span class="fp-source">${doc.source.type==='demo'?uiText('演示数据'):uiText('数据来源')} · ${escapeHtml(doc.source.name)}</span><span>数相 / FORMA</span></div></article><div class="fp-controls"><button class="fp-play">${playing?uiText('暂停'):uiText('播放')}</button><button class="fp-reset">重播</button><input aria-label="动画进度" type="range" min="0" max="1000" value="${p*1000}"><output>0.0 / ${seconds}s</output></div>`;
  const chartHost=host.querySelector('.fp-chart');if(['portrait','story'].includes(options.ratio))host.style.maxWidth=options.ratio==='story'?'620px':'760px';const sceneOptions={...options,orbit:template.dimension==='3d',onCameraChange(camera){sceneOptions.camera3d=camera;syncCamera(camera);}};function syncCamera(camera){host.querySelectorAll('[data-view]').forEach(b=>{const v=spatialViews[b.dataset.view];b.setAttribute('aria-pressed',String(Math.abs(v.azimuth-camera.azimuth)<.1&&Math.abs(v.elevation-camera.elevation)<.1));});}function createScene(){const scene=new ChartScene(chartHost,doc,{...sceneOptions,compact:chartHost.clientWidth<550,progress:p});applyChartBrand(scene.svg,options);return scene;}let scene=createScene();applyFrameBrand(host.querySelector('.fp-frame'),options,'h1');if(scene.spatial)syncCamera(scene.spatial.getCamera());host.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>scene.spatial.setCamera(spatialViews[b.dataset.view]));
  const btn=host.querySelector('.fp-play'),range=host.querySelector('input'),output=host.querySelector('output');
  function show(){scene.render(p);range.value=Math.round(p*1000);output.textContent=`${(p*seconds).toFixed(1)} / ${seconds}s`;btn.textContent=reduced?uiText('已减少动态'):playing?uiText('暂停'):uiText('播放');btn.disabled=reduced;host.querySelector('.fp-reset').disabled=reduced;}
  function cancelClock(){if(raf!==null)win.cancelAnimationFrame(raf);raf=null;}
  function schedule(){if(!destroyed&&playing&&!reduced&&!document.hidden&&raf===null)raf=win.requestAnimationFrame(tick);}
  function tick(now){
    raf=null;if(destroyed||!playing||reduced||document.hidden)return;
    p=Math.min(1,p+Math.max(0,now-last)/1000/seconds);last=now;if(p>=1)playing=false;
    show();schedule();
  }
  function play(){if(destroyed||reduced)return;if(p>=1)p=0;playing=true;last=win.performance.now();show();schedule();}
  function pause(){if(destroyed)return;playing=false;cancelClock();show();}
  function seek(value){if(destroyed||!Number.isFinite(value))return;playing=false;cancelClock();p=reduced?1:Math.max(0,Math.min(1,value));show();}
  btn.onclick=()=>playing?pause():play();host.querySelector('.fp-reset').onclick=()=>{if(reduced||destroyed)return;p=0;play();};range.oninput=()=>seek(+range.value/1000);
  const reduce=()=>{reduced=media.matches;if(reduced){playing=false;p=1;cancelClock();}show();};media.addEventListener('change',reduce);
  // Hidden tabs retain their position and play intent without running an idle clock.
  const visibility=()=>{if(document.hidden)cancelClock();else{last=win.performance.now();schedule();}};document.addEventListener('visibilitychange',visibility);
  schedule();show();
  const resize=new win.ResizeObserver(()=>{if(destroyed)return;scene.destroy();scene=createScene();if(scene.spatial)syncCamera(scene.spatial.getCamera());});resize.observe(chartHost);
  return {play,pause,seek,destroy(){if(destroyed)return;destroyed=true;playing=false;cancelClock();media.removeEventListener('change',reduce);document.removeEventListener('visibilitychange',visibility);resize.disconnect();scene.destroy();host.replaceChildren();style.remove();}};
}
