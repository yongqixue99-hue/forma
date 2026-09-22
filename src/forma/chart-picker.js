import {uiText,uiMarkup,uiMessage} from './locale.js';
import {createElement,Search,Check,Plus,ArrowLeft,ArrowRight} from 'lucide';
import {catalog,families,getExample} from './catalog.js';
import {filterCatalog,facetCounts} from './library-filter.js';
import {escapeHtml as esc} from './data.js';
import {ChartScene} from './charts.js';
import {EDITOR_LIMIT} from './editor-model.js';
import {editorDialog} from './editor-assistance.js';

const icon=(node,size=14)=>createElement(node,{width:size,height:size,'stroke-width':1.5,'aria-hidden':true}).outerHTML;
const ordered=[...catalog].sort((a,b)=>Number(!!b.basic)-Number(!!a.basic)||(b.edition||1)-(a.edition||1)||Number(a.no)-Number(b.no));
export function openChartPicker({records,onAdd,onOpen,palette='ink'}){
  const ui=editorDialog('chart-picker-dialog',uiText('选择图表'),'FORMA / CHART PICKER'),{dialog,$}=ui;
  let filters={family:'all',category:'all',query:''},page=0,scenes=[];
  const pending=new Set(),pageSize=12,existing=new Map(records.map(r=>[r.doc.template,r.key])),remaining=Math.max(0,EDITOR_LIMIT-records.length);
  function destroyPreviews(){scenes.forEach(s=>s.destroy());scenes=[];}
  const baseClose=ui.close;ui.close=()=>{destroyPreviews();baseClose();};dialog.addEventListener('close',destroyPreviews);
  dialog.innerHTML=uiMarkup`${ui.header}<div class="picker-tools"><label class="picker-search">${icon(Search,16)}<input id="picker-search" placeholder="搜索图型、用途或编号" aria-label="筛选待添加图表"></label><div class="picker-purpose" aria-label="常用集合">${[['all',uiText('全部')],['basic',uiText('基础常用')],['research',uiText('科研常用')]].map(([id,label])=>`<button data-pick-purpose="${id}" aria-pressed="${id==='all'}">${label}</button>`).join('')}</div></div><div class="picker-body"><nav class="picker-families" aria-label="选择图表分类">${families.map(f=>`<button data-pick-family="${f.id}" aria-pressed="${f.id==='all'}"><span>${f.name}</span><small data-pick-count="${f.id}"></small></button>`).join('')}</nav><section class="picker-results"><div class="picker-result-heading"><span id="picker-total"></span><span>勾选后一起加入编辑区</span></div><div class="picker-grid"></div></section></div><div class="picker-pagination"><span id="picker-range"></span><button class="icon-button" data-picker="prev" aria-label="上一页图型">${icon(ArrowLeft)}</button><button class="icon-button" data-picker="next" aria-label="下一页图型">${icon(ArrowRight)}</button></div><footer class="workflow-footer"><div><span id="picker-status" role="status">编辑区已有 ${records.length} 张，可再添加 ${remaining} 张</span><button class="text-button" data-picker="clear" hidden>清空选择</button></div><button class="button dark" data-picker="add" disabled>${icon(Plus)}加入并编辑<span id="picker-selected"></span></button></footer>`;
  function sync(){
    const count=pending.size;$('[data-picker="add"]').disabled=!count;$('#picker-selected').textContent=count?uiMessage` · ${count} 张`:'';$('[data-picker="clear"]').hidden=!count;
    $('#picker-status').textContent=count?uiMessage`已选 ${count} 张 · 还可选 ${remaining-count} 张`:uiMessage`编辑区已有 ${records.length} 张，可再添加 ${remaining} 张`;
    dialog.querySelectorAll('[data-pick-id]').forEach(button=>{const checked=pending.has(button.dataset.pickId);button.setAttribute('aria-pressed',String(checked));button.classList.toggle('chosen',checked);button.querySelector('.picker-check').innerHTML=checked?icon(Check,13):'';});
  }
  function renderList(){
    destroyPreviews();const list=filterCatalog(ordered,filters),counts=facetCounts(ordered,filters,'family');page=Math.max(0,Math.min(page,Math.ceil(list.length/pageSize)-1));
    dialog.querySelectorAll('[data-pick-family]').forEach(button=>{const id=button.dataset.pickFamily;button.setAttribute('aria-pressed',String(id===filters.family));button.querySelector('small').textContent=counts[id]||0;});
    dialog.querySelectorAll('[data-pick-purpose]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pickPurpose===filters.category)));
    $('#picker-total').textContent=uiMessage`${list.length} 种图型`;
    $('.picker-grid').innerHTML=list.length?list.slice(page*pageSize,(page+1)*pageSize).map(t=>uiMarkup`<button class="picker-item ${existing.has(t.id)?'already-added':''}" ${existing.has(t.id)?uiMessage`data-pick-open="${esc(existing.get(t.id))}" aria-label="打开已加入的${esc(t.name)}"`:uiMessage`data-pick-id="${t.id}" aria-pressed="${pending.has(t.id)}" aria-label="选择${esc(t.name)}"`}><div class="picker-item-top"><span class="mono">${t.no}</span><span class="${existing.has(t.id)?'picker-added':'picker-check'}">${existing.has(t.id)?uiText('已加入 · 打开'):''}</span></div><div class="picker-mini" data-picker-preview="${t.id}" aria-hidden="true"></div><div class="picker-item-label"><h3>${esc(t.name)}</h3><span>${t.fields.length} 列数据</span></div><p>${esc(t.use)}</p></button>`).join(''):uiText('<div class="picker-empty"><h3>没有匹配的图表</h3><p>换一个关键词或清除当前筛选。</p><button class="button small" data-picker="reset">清除筛选</button></div>');
    $('#picker-range').textContent=list.length?`${page*pageSize+1}–${Math.min(list.length,(page+1)*pageSize)} / ${list.length}`:'0 / 0';$('[data-picker="prev"]').disabled=!page;$('[data-picker="next"]').disabled=(page+1)*pageSize>=list.length;
    dialog.querySelectorAll('[data-picker-preview]').forEach(host=>scenes.push(new ChartScene(host,getExample(host.dataset.pickerPreview),{width:250,height:130,palette,progress:1,compact:true,interactive:false})));
    sync();$('.picker-results').scrollTop=0;
  }
  dialog.addEventListener('input',e=>{if(e.target.id==='picker-search'){filters.query=e.target.value;page=0;renderList();}});
  dialog.addEventListener('click',e=>{
    const select=e.target.closest('[data-pick-id]'),open=e.target.closest('[data-pick-open]'),family=e.target.closest('[data-pick-family]'),purpose=e.target.closest('[data-pick-purpose]'),action=e.target.closest('[data-picker]')?.dataset.picker;
    if(select){const id=select.dataset.pickId;if(pending.has(id))pending.delete(id);else if(pending.size<remaining)pending.add(id);else{$('#picker-status').textContent=uiMessage`最多保留 ${EDITOR_LIMIT} 张，请先移出暂时不用的图表。`;return;}sync();}
    else if(open){ui.close();onOpen(open.dataset.pickOpen);}
    else if(family||purpose){if(family)filters.family=family.dataset.pickFamily;else filters.category=purpose.dataset.pickPurpose;page=0;renderList();}
    else if(action==='clear'){pending.clear();sync();}
    else if(action==='reset'){filters={family:'all',category:'all',query:''};$('#picker-search').value='';page=0;renderList();}
    else if(action==='prev'||action==='next'){page+=action==='next'?1:-1;renderList();}
    else if(action==='add'&&pending.size){const ids=[...pending];ui.close();onAdd(ids);}
  });
  dialog.show();renderList();$('#picker-search').focus();return ui;
}
