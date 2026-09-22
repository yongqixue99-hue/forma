import {exportFonts} from './export-fonts.js';
import {mountWorkPlayer} from './work-player.js';
import css from './work-ui.css?inline';
export function mount(host,work){
  const style=host.ownerDocument.createElement('style');style.textContent=`*{box-sizing:border-box}:root{--sans:Manrope,"PingFang SC","Microsoft YaHei",sans-serif;--mono:"DM Mono",ui-monospace,monospace}body{margin:0;background:#ebe8e1;font-family:Manrope,"PingFang SC","Microsoft YaHei",sans-serif}main{height:calc(100dvh - 48px);min-height:590px;max-width:1280px;margin:24px auto;padding:0 24px}button{font:inherit;cursor:pointer}button:focus-visible{outline:2px solid #c45e43;outline-offset:2px}@media(max-width:760px){main{height:730px;min-height:0;margin:12px auto;padding:0 12px}}`+css+exportFonts;
  host.ownerDocument.head.append(style);
  const branded=work.steps.some(s=>s.options.brand);
  function fitRatio(id){
    if(!branded)return;const step=work.steps.find(s=>s.id===id)||work.steps[0];
    const ratio=({wide:1.6,landscape:16/9,square:1,portrait:.75,story:9/16})[step.options.ratio]||1.6;
    const stage=host.querySelector('[data-wp-stage]');stage.style.aspectRatio=String(ratio);stage.style.flex='none';stage.style.height='auto';
  }
  if(branded){host.dataset.brandExport='';style.textContent+='main[data-brand-export]{height:auto;min-height:0;max-width:1100px}main[data-brand-export] .wp-player{height:auto}main[data-brand-export] .wp-artboard{height:100%}';}
  const player=mountWorkPlayer(host,work,{onStep:fitRatio});fitRatio(work.activeStep);
  return {...player,destroy(){player.destroy();host.removeAttribute('data-brand-export');style.remove();}};
}
