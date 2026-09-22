import {uiText,uiMarkup,uiMessage} from './locale.js';
const KEY='forma.editor.split';
const DEFAULT=56;

/** Editor layout is a browser preference, not part of exported chart data. */
export function mountWorkspaceLayout(layout){
  const separator=layout.querySelector('[data-dw-split]');
  let share=DEFAULT,dragging=false;
  try{const saved=Number(window.localStorage.getItem(KEY));if(saved>=35&&saved<=68)share=saved;}catch{}
  function setShare(value){
    share=Math.max(35,Math.min(68,value));
    layout.style.setProperty('--dw-chart-share',`${share}%`);
    separator.setAttribute('aria-valuenow',String(Math.round(share)));
    separator.setAttribute('aria-valuetext',uiMessage`图表 ${Math.round(share)}%，数据表 ${100-Math.round(share)}%`);
  }
  function save(){try{window.localStorage.setItem(KEY,String(share));}catch{}}
  function move(e){if(!dragging)return;const r=layout.getBoundingClientRect();if(r.width)setShare((e.clientX-r.left)/r.width*100);}
  function end(){if(!dragging)return;dragging=false;layout.classList.remove('is-resizing');save();}
  separator.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;separator.setPointerCapture?.(e.pointerId);layout.classList.add('is-resizing');e.preventDefault();});
  separator.addEventListener('pointermove',move);separator.addEventListener('pointerup',end);separator.addEventListener('pointercancel',end);
  separator.addEventListener('dblclick',()=>{setShare(DEFAULT);save();});
  separator.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();e.stopPropagation();
    setShare(e.key==='Home'?35:e.key==='End'?68:share+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?5:1));save();
  });
  setShare(share);
  return{destroy:end};
}
