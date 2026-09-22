import {multivariateSelectedPair} from './multivariate-rules.js';

// Editor-only navigation. Persistent changes go through the workspace model;
// focus and sample inspection never become part of the delivered artwork.
export function mountMultivariateInteraction(host,{getDoc,view,onFocus,onReturn,onSample,onError=()=>{}}){
  const events=new host.ownerDocument.defaultView.AbortController(),signal=events.signal;
  const isMatrix=()=>view!=='multivariate-focus';
  const facets=()=>[...host.querySelectorAll('[data-multivariate-facet]')];
  const samples=()=>[...host.querySelectorAll('[data-sample-id][data-record-ids]')].filter(n=>n.getAttribute('aria-hidden')!=='true');
  const pairOf=node=>[node.dataset.variableX,node.dataset.variableY];
  const same=(a,b)=>a?.[0]===b?.[0]&&a?.[1]===b?.[1];
  let remembered=null,rememberedSample=null,pointer=null;
  host.addEventListener('pointerdown',e=>{pointer=e.target.closest('.dw-chart')?{x:e.clientX,y:e.clientY,time:Date.now()}:null;},{capture:true,signal});
  host.addEventListener('touchstart',e=>{const touch=e.touches[0];if(touch)pointer=e.target.closest('.dw-chart')?{x:touch.clientX,y:touch.clientY,time:Date.now()}:null;},{capture:true,passive:true,signal});
  function refresh(){
    if(getDoc()?.template!=='splom')return;
    const pair=multivariateSelectedPair(getDoc());
    facets().forEach(n=>n.setAttribute('tabindex',same(pairOf(n),remembered||pair)?'0':'-1'));
    const points=samples(),tabStop=points.find(n=>n.dataset.sampleId===rememberedSample)||points[0];points.forEach(n=>{n.setAttribute('tabindex',!isMatrix()&&n===tabStop?'0':'-1');n.setAttribute('role','button');});
  }
  function activate(node){
    if(isMatrix())onFocus(pairOf(node));else{rememberedSample=node.dataset.sampleId;refresh();onSample(node);}
  }
  function click(e){
    if(getDoc()?.template!=='splom')return;
    let target=e.target.closest('[data-multivariate-facet],[data-sample-id][data-record-ids]');
    if(!target)return;
    e.preventDefault();e.stopImmediatePropagation();
    // Enlarged targets may overlap: resolve to the nearest visible center,
    // instead of whichever transparent circle happens to paint last.
    if(!isMatrix()&&(e.detail>0||pointer&&Date.now()-pointer.time<1000)){
      const origin=pointer&&Date.now()-pointer.time<1000?pointer:{x:e.clientX,y:e.clientY};
      const svg=target.ownerSVGElement,point=new DOMPoint(origin.x,origin.y).matrixTransform(svg.getScreenCTM().inverse());
      target=samples().reduce((best,n)=>{const hit=n.querySelector('[data-sample-hit]');if(!hit)return best;const d=Math.hypot(point.x-Number(hit.getAttribute('cx')),point.y-Number(hit.getAttribute('cy')));return !best||d<best.d?{n,d}:best;},null)?.n||target;
    }
    pointer=null;try{activate(target);}catch(error){onError(error.message);} // The workspace reports validation errors.
  }
  function key(e){
    if(getDoc()?.template!=='splom'||e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return;
    const target=e.target.closest('[data-multivariate-facet],[data-sample-id][data-record-ids]');
    if(e.key==='Escape'&&host.querySelector('.dw-variable-details[open]')&&e.target.closest('.dw-variable-tools'))return;
    if(e.key==='Escape'&&!isMatrix()&&e.target.closest('.dw-preview')&&!e.target.closest('input,select,.dw-inline-editor')){e.preventDefault();e.stopImmediatePropagation();onReturn();return;}
    if(!target)return;
    if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();activate(target);return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
    e.preventDefault();e.stopImmediatePropagation();
    const nodes=isMatrix()?facets():samples(),index=nodes.indexOf(target),delta=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;
    let next=e.key==='Home'?nodes[0]:e.key==='End'?nodes.at(-1):nodes[(index+delta+nodes.length)%nodes.length];
    if(isMatrix()&&e.key.startsWith('Arrow')){
      const pair=pairOf(target),horizontal=['ArrowLeft','ArrowRight'].includes(e.key),axis=horizontal?0:1,variables=getDoc().entities.items.map(v=>v.id),position=variables.indexOf(pair[axis]);
      for(let i=1;i<variables.length;i++){const candidate=[...pair];candidate[axis]=variables[(position+delta*i+variables.length)%variables.length];const found=nodes.find(n=>same(pairOf(n),candidate));if(found){next=found;break;}}
    }
    if(next){nodes.forEach(n=>n.setAttribute('tabindex',n===next?'0':'-1'));if(isMatrix())remembered=pairOf(next);else rememberedSample=next.dataset.sampleId;next.focus({preventScroll:true});}
  }
  host.addEventListener('click',click,{capture:true,signal});host.addEventListener('keydown',key,{capture:true,signal});
  return {refresh,focusPair(pair){const node=facets().find(n=>same(pairOf(n),pair));if(node){remembered=pair;refresh();node.focus({preventScroll:true});}},destroy(){events.abort();}};
}
