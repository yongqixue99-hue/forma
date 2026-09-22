import {uiText,uiMarkup} from './locale.js';
import {escapeHtml as esc} from './data.js';
import {multivariateVariables,multivariateSelectedPair} from './multivariate-rules.js';

/** Labels come from variable entities; edits store persistent IDs. */
export function mountMultivariateControls(host,{getDoc,onPair,onView,view,onError=()=>{}}={}){
  const doc=host.ownerDocument,win=doc.defaultView,events=new win.AbortController();let signature='';
  host.classList.add('dw-variable-tools');
  function refresh(){
    const current=getDoc();host.hidden=current?.template!=='splom';if(host.hidden)return;
    const variables=multivariateVariables(current),pair=multivariateSelectedPair(current),next=JSON.stringify([variables,pair,view]);
    if(next===signature)return;signature=next;
    const active=doc.activeElement,axis=active?.dataset.variableAxis,open=host.querySelector('details')?.open;
    const options=axis=>variables.map(v=>`<option value="${esc(v.id)}" ${pair[axis]===v.id?'selected':''} ${pair[1-axis]===v.id?'disabled':''}>${esc(v.label||v.name)}</option>`).join('');
    const labels=pair.map(id=>variables.find(v=>v.id===id)?.label||''),focused=view==='multivariate-focus';
    const viewButton=onView?uiMarkup`<button type="button" data-variable-view aria-pressed="${focused}">${focused?uiText('返回矩阵'):uiText('聚焦变量对')}</button>`:'';
    host.innerHTML=uiMarkup`<details class="dw-variable-details" ${open?'open':''}><summary aria-label="选择变量对" title="${esc(`X: ${labels[0]} · Y: ${labels[1]}`)}"><span><small>X</small> ${esc(labels[0])}</span><span><small>Y</small> ${esc(labels[1])}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="dw-variable-panel"><div class="dw-variable-selects"><label>X <select data-variable-axis="0" aria-label="横轴变量">${options(0)}</select></label><button type="button" data-variable-swap title="交换横纵轴" aria-label="交换横纵轴"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/></svg></button><label>Y <select data-variable-axis="1" aria-label="纵轴变量">${options(1)}</select></label></div>${focused?'':viewButton}</div></details>${focused?viewButton:''}`;
    if(axis!==undefined)host.querySelector(`[data-variable-axis="${axis}"]`)?.focus({preventScroll:true});
    else if(active?.hasAttribute('data-variable-swap'))host.querySelector('[data-variable-swap]')?.focus({preventScroll:true});
  }
  host.addEventListener('change',e=>{try{if(!e.target.hasAttribute('data-variable-axis'))return;const pair=multivariateSelectedPair(getDoc());pair[Number(e.target.dataset.variableAxis)]=e.target.value;onPair(pair);refresh();}catch(error){onError(error.message);signature='';refresh();}},{signal:events.signal});
  host.addEventListener('click',e=>{try{if(e.target.closest('[data-variable-swap]')){const pair=multivariateSelectedPair(getDoc());onPair([pair[1],pair[0]]);refresh();host.querySelector('[data-variable-swap]')?.focus({preventScroll:true});}else if(e.target.closest('[data-variable-view]'))onView?.(view==='multivariate-focus'?'multivariate-matrix':'multivariate-focus');}catch(error){onError(error.message);refresh();}},{signal:events.signal});
  host.addEventListener('keydown',e=>{if(e.key==='Escape'&&host.querySelector('details').open){e.preventDefault();e.stopPropagation();host.querySelector('details').open=false;host.querySelector('summary').focus();}},{signal:events.signal});
  refresh();return{refresh,destroy(){events.abort();host.replaceChildren();}};
}
