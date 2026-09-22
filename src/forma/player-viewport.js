import {uiMarkup,uiText} from './locale.js';

/** A reading aid around the live artboard. It never seeks, redraws or edits the work. */
export function mountPlayerViewport(player){
  const viewport=player.querySelector('[data-wp-stage]'),artboard=viewport.querySelector('.wp-artboard');
  const doc=player.ownerDocument,win=doc.defaultView,events=new win.AbortController();
  const space=doc.createElement('div');space.className='wp-viewport-space';artboard.before(space);space.append(artboard);
  const controls=doc.createElement('div');controls.className='wp-view-tools';
  controls.innerHTML=uiMarkup`<span class="wp-view-hint" data-wp-view-hint hidden>滚动画布查看细节</span><div role="group" aria-label="画布视图"><button data-wp-zoom="detail" aria-pressed="false" title="放大实时画布，作品与导出保持不变"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5M10.5 7v7M7 10.5h7"/></svg><span>放大查看</span></button><div class="wp-zoom-adjust" hidden><button data-wp-zoom="out" aria-label="缩小画布">−</button><output data-wp-zoom-value aria-live="polite">100%</output><button data-wp-zoom="in" aria-label="放大画布">＋</button><button data-wp-zoom="fit">适合窗口</button></div></div>`;
  viewport.before(controls);viewport.classList.add('wp-viewport');
  viewport.setAttribute('role','region');viewport.setAttribute('aria-label',uiText('图表阅读区域'));viewport.tabIndex=-1;
  let zoom=1,width=0,height=0,dead=false;
  const clamp=n=>Math.min(3,Math.max(1,Number(n)||1));
  function layout(){
    if(dead)return;const w=viewport.clientWidth,h=viewport.clientHeight;if(w<=0||h<=0)return;
    width=w;height=h;artboard.style.width=`${w}px`;artboard.style.height=`${h}px`;
    space.style.width=`${w*zoom}px`;space.style.height=`${h*zoom}px`;artboard.style.transform=`scale(${zoom})`;
  }
  function sync(){
    const enlarged=zoom>1;player.dataset.canvasZoom=String(zoom);viewport.tabIndex=enlarged?0:-1;
    controls.querySelector('[data-wp-zoom=detail]').hidden=enlarged;
    controls.querySelector('[data-wp-zoom=detail]').setAttribute('aria-pressed',String(enlarged));
    controls.querySelector('.wp-zoom-adjust').hidden=!enlarged;controls.querySelector('[data-wp-view-hint]').hidden=!enlarged;
    controls.querySelector('[data-wp-zoom-value]').textContent=`${Math.round(zoom*100)}%`;
    controls.querySelector('[data-wp-zoom=out]').disabled=zoom<=1;controls.querySelector('[data-wp-zoom=in]').disabled=zoom>=3;
  }
  function setZoom(value,{center=true}={}){
    const before=zoom,x=(viewport.scrollLeft+width/2)/before,y=(viewport.scrollTop+height/2)/before;
    zoom=clamp(value);layout();sync();
    viewport.scrollLeft=zoom===1?0:center?Math.max(0,x*zoom-width/2):viewport.scrollLeft;
    viewport.scrollTop=zoom===1?0:center?Math.max(0,y*zoom-height/2):viewport.scrollTop;
  }
  function fit({focus=false}={}){setZoom(1);if(focus)controls.querySelector('[data-wp-zoom=detail]').focus({preventScroll:true});}
  controls.addEventListener('click',e=>{const button=e.target.closest('[data-wp-zoom]');if(!button)return;
    if(button.dataset.wpZoom==='detail'){setZoom(2);const graphic=artboard.querySelector('.wp-graphic');if(graphic){const g=graphic.getBoundingClientRect(),a=artboard.getBoundingClientRect();const labels=[...graphic.querySelectorAll('svg text')].filter(node=>{if(!node.textContent.trim())return false;for(let n=node;n&&n!==graphic;n=n.parentElement){const style=win.getComputedStyle(n);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return false;}return true;}).map(node=>node.getBoundingClientRect()).filter(r=>r.width>0);const left=labels.length?Math.min(...labels.map(r=>r.left))-a.left-16:g.left-a.left+g.width/2-width/2;viewport.scrollLeft=Math.max(0,left);viewport.scrollTop=Math.max(0,g.top-a.top+g.height/2-height/2);}controls.querySelector('[data-wp-zoom=fit]').focus({preventScroll:true});}
    else if(button.dataset.wpZoom==='fit')fit({focus:true});else setZoom(zoom+(button.dataset.wpZoom==='in'?.25:-.25));
  },{signal:events.signal});
  player.addEventListener('keydown',e=>{if(e.key==='Escape'&&zoom>1&&!e.defaultPrevented){e.preventDefault();fit({focus:true});}},{signal:events.signal});
  const resize=new win.ResizeObserver(layout);resize.observe(viewport);layout();sync();
  return{setZoom,fit,capture:()=>({zoom,left:viewport.scrollLeft,top:viewport.scrollTop}),restore(s){setZoom(s?.zoom,{center:false});viewport.scrollLeft=s?.left||0;viewport.scrollTop=s?.top||0;},destroy(){dead=true;events.abort();resize.disconnect();artboard.style.removeProperty('width');artboard.style.removeProperty('height');artboard.style.removeProperty('transform');space.replaceWith(artboard);controls.remove();viewport.classList.remove('wp-viewport');viewport.removeAttribute('role');viewport.removeAttribute('aria-label');viewport.removeAttribute('tabindex');delete player.dataset.canvasZoom;}};
}
