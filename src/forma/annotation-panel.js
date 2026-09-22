import {uiText,uiMarkup,uiMessage} from './locale.js';
import {annotationContext,annotationFieldNames,annotationRowName,annotationStatus,annotationKinds,annotationPlacements,newAnnotation,cleanAnnotations,ANNOTATION_LIMIT} from './annotations.js';
import {escapeHtml as esc} from './data.js';
import {formatNumber} from './number-format.js';
import './annotation-panel.css';

// Drafts belong to a step and annotation ID, so changing tabs or steps does not
// throw away an unfinished explanation. Only Apply changes the saved work.
export function mountAnnotationPanel(host,{getWork,getStep,drafts=new Map(),selectedRecords=()=>[],supportsObjects=()=>true,onApply,onRemove,onHistory,getHistory=()=>({}),onLocate=()=>{},onPreview=()=>{}}){
  const win=host.ownerDocument.defaultView,events=new win.AbortController(),stepId=getStep().id;
  if(!drafts.has(stepId))drafts.set(stepId,{selected:null,forms:new Map()});
  const state=drafts.get(stepId),$=s=>host.querySelector(s);let disposed=false;
  const step=()=>getWork().steps.find(s=>s.id===stepId),total=()=> (step().duration+step().hold)/1000;
  if(state.selected&&!state.forms.has(state.selected)){const saved=step().options.annotations?.find(a=>a.id===state.selected);if(saved)state.forms.set(saved.id,{value:structuredClone(saved),targets:[stepId],dirty:false});}
  const all=()=>{const list=structuredClone(step().options.annotations||[]);for(const [id,f]of state.forms){const index=list.findIndex(a=>a.id===id);if(index<0)list.push(f.value);else list[index]=f.value;}return list;};
  const form=()=>state.forms.get(state.selected);
  function select(id){state.selected=id;const saved=step().options.annotations?.find(a=>a.id===id);if(saved&&!state.forms.has(id))state.forms.set(id,{value:structuredClone(saved),targets:[stepId],dirty:false});render();}
  function message(text){$('[data-an-status]').textContent=text;}
  function options(values,current){return values.map(([id,name])=>`<option value="${esc(id)}" ${id===current?'selected':''}>${esc(name)}</option>`).join('');}
  function targetFields(a){
    const names=annotationFieldNames(step().doc);
    return a.targets.map((t,i)=>{const rows=step().doc.data,found=rows.some(r=>r._id===t.recordId);return uiMarkup`<div class="an-target"><label>${a.kind==='range'?uiMessage`端点 ${i+1}`:uiText('数据对象')}<select data-an-record="${i}" aria-label="${a.kind==='range'?uiMessage`端点 ${i+1}`:uiText('数据对象')}">${found?'':uiMarkup`<option value="${esc(t.recordId)}" selected disabled>原记录已移除 · 请选择</option>`}${options(rows.map(r=>[r._id,annotationRowName(r)]),t.recordId)}</select></label>${names.length>1?uiMarkup`<label>观测<select data-an-field="${i}" aria-label="端点 ${i+1} 的观测">${options(names,t.field)}</select></label>`:''}<button type="button" data-an-locate="${i}" class="an-locate" ${found?'':'disabled'} title="在数据表中定位这条记录">定位 ↗</button></div>`;}).join('');
  }
  function render(){
    if(disposed||!step())return;
    const list=all(),f=form(),a=f?.value,context=annotationContext(step().doc),objects=!!context.family&&supportsObjects(),history=getHistory(),status=a?annotationStatus(step().doc,a):null;
    host.className='we-annotation-panel';
    host.innerHTML=uiMarkup`<div class="an-heading"><div><strong>给数据加上说明</strong><span>${list.length} / ${ANNOTATION_LIMIT}</span></div><div><button data-an-history="undo" aria-label="撤销上次标注操作" ${history.undo?'':'disabled'}>↶</button><button data-an-history="redo" aria-label="重做标注操作" ${history.redo?'':'disabled'}>↷</button></div></div>
      <p class="an-intro">标记会跟随数据对象移动，数值随表格更新。文字说明适用于所有图型；区间只连接所选观测，不表示统计置信区间。</p>
      ${!objects?uiText('<p class="an-hint">当前图型可添加文字说明，对象定位尚未适配。</p>'):''}<div class="an-add"><select data-an-kind aria-label="新增标注类型">${options(annotationKinds.filter(([k])=>objects||k==='note'),objects?'object':'note')}</select><button data-an-add ${list.length>=ANNOTATION_LIMIT?'disabled':''}>＋ 添加标注</button></div>
      ${list.length?uiMarkup`<div class="an-list" aria-label="当前步骤标注">${list.map(item=>{const saved=step().options.annotations?.some(a=>a.id===item.id),s=annotationStatus(step().doc,item),dirty=state.forms.get(item.id)?.dirty;return `<button data-an-select="${esc(item.id)}" aria-pressed="${item.id===state.selected}"><span><i class="an-mark" data-kind="${item.kind}"></i><strong>${esc(item.text||uiText('未填写说明'))}</strong></span><small>${!s.valid?uiText('待定位'):dirty?uiText('未应用'):saved?uiText('已保存'):uiText('草稿')}</small></button>`;}).join('')}</div>`:uiText('<div class="an-empty">先在表格中选中一条记录，再添加对象标记，也可以直接在这里挑选。</div>')}
      ${a?uiMarkup`<form class="an-form" data-an-form><div class="an-form-title"><strong>${esc(annotationKinds.find(([id])=>id===a.kind)?.[1])}</strong><button type="button" data-an-remove title="移除当前步骤的这条标注">移除</button></div>
        <label class="an-text">说明文字<textarea data-an-text maxlength="120" rows="2" placeholder="写下与当前数据有关的观察">${esc(a.text)}</textarea><span>最多 120 字 · 应用后保存到作品</span></label>
        ${a.kind!=='note'?targetFields(a):''}
        ${!status.valid?uiMarkup`<p class="an-warning">${esc(status.reason)}。标注仍保留，请核对后重新指定。</p>`:''}
        ${a.kind!=='note'&&context.family===a.binding?.family&&JSON.stringify(context)!==JSON.stringify(a.binding)?uiText('<label class="an-check an-confirm"><input type="checkbox" data-an-confirm>已核对，使用当前单位和观测含义</label>'):''}
        <div class="an-two"><label>位置<select data-an-placement>${options(annotationPlacements,a.placement)}</select></label><label class="an-check"><input type="checkbox" data-an-value ${a.showValue?'checked':''} ${a.kind==='note'?'disabled':''}>附上原始数值</label></div>
        <div class="an-time-heading"><strong>何时显示</strong><span>当前步骤共 ${formatNumber(total())} 秒</span></div><div class="an-two"><label>开始 / 秒<input data-an-time="start" type="number" min="0" max="${total()}" step="0.1" value="${Number((a.when.start*total()).toFixed(3))}"></label><label>结束 / 秒<input data-an-time="end" type="number" min="0" max="${total()}" step="0.1" value="${Number((a.when.end*total()).toFixed(3))}"></label></div><p class="an-hint">随步骤时长按比例调整。静态图片展示全部标注。</p>
        <details class="an-scope"><summary>同时应用到关联步骤 <span data-an-scope-count></span></summary><p>只更新勾选步骤的这条标注，各步数据、样式与节奏保留。</p><div data-an-scopes></div></details>
        <div class="an-apply"><button type="button" data-an-preview>预览时刻 ↗</button><button type="submit" class="button dark small" data-an-apply>应用标注</button></div></form>`:''}<p class="an-status" data-an-status role="status"></p>`;
    if(a)scopes();
  }
  function read(){
    const f=form();if(!f)return;const a=f.value;
    a.text=$('[data-an-text]').value;if(a.placement!==$('[data-an-placement]').value)delete a.position;a.placement=$('[data-an-placement]').value;a.showValue=$('[data-an-value]').checked;
    a.when={start:$('[data-an-time=start]').value===''?NaN:Number($('[data-an-time=start]').value)/total(),end:$('[data-an-time=end]').value===''?NaN:Number($('[data-an-time=end]').value)/total()};
    for(const node of host.querySelectorAll('[data-an-record]'))a.targets[Number(node.dataset.anRecord)].recordId=node.value;
    for(const node of host.querySelectorAll('[data-an-field]'))a.targets[Number(node.dataset.anField)].field=node.value;
    f.dirty=true;const item=host.querySelector(`[data-an-select="${a.id}"]`);if(item){item.querySelector('strong').textContent=a.text||uiText('未填写说明');item.querySelector('small').textContent=uiText('未应用');}
  }
  function candidate(){const f=form(),a=structuredClone(f.value);if($('[data-an-confirm]')?.checked)a.binding=annotationContext(step().doc);return cleanAnnotations([a])[0];}
  function scopes(){
    const f=form();if(!f)return;let a;try{a=candidate();}catch{a=f.value;}
    const current=step();$('[data-an-scopes]').innerHTML=getWork().steps.map((s,i)=>{
      const status=annotationStatus(s.doc,a),linked=s.id===stepId||(s.dataGroup===current.dataGroup&&s.relation!=='separate'&&current.relation!=='separate'),eligible=linked&&status.valid,disabled=s.id===stepId||!eligible;
      if(!eligible&&s.id!==stepId)f.targets=f.targets.filter(id=>id!==s.id);
      return `<label><input type="checkbox" data-an-scope="${esc(s.id)}" ${f.targets.includes(s.id)?'checked':''} ${disabled?'disabled':''}><span>${String(i+1).padStart(2,'0')} · ${esc(s.doc.title)}${s.id===stepId?uiText('（当前）'):''}<small>${!linked?uiText('独立数据，保持不变'):!status.valid?esc(status.reason):uiText('按记录 ID 对应')}</small></span></label>`;
    }).join('');$('[data-an-scope-count]').textContent=uiMessage`${f.targets.length} 步`;
  }
  host.addEventListener('input',e=>{if(!e.target.closest('[data-an-form]')||e.target.hasAttribute('data-an-scope'))return;read();message('');},{signal:events.signal});
  host.addEventListener('change',e=>{if(e.target.hasAttribute('data-an-scope')){const f=form(),id=e.target.dataset.anScope;f.targets=e.target.checked?[...new Set([...f.targets,id])]:f.targets.filter(x=>x!==id);$('[data-an-scope-count]').textContent=uiMessage`${f.targets.length} 步`;return;}if(e.target.closest('[data-an-form]')){read();scopes();}},{signal:events.signal});
  host.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    try{
      if(b.hasAttribute('data-an-add')){const kind=$('[data-an-kind]').value,ids=selectedRecords(),fields=annotationFieldNames(step().doc),targets=ids.length&&kind!=='note'?[{recordId:ids[0],field:fields[0]?.[0]},...(kind==='range'?[{recordId:ids[1]||ids[0],field:ids[1]?fields[0]?.[0]:fields[1]?.[0]||fields[0]?.[0]}]:[])]:undefined;
        const a=newAnnotation(step().doc,{kind,...(targets&&!(kind==='range'&&ids.length===1&&fields.length<2)?{targets}:{})});state.forms.set(a.id,{value:a,dirty:true,targets:[stepId]});select(a.id);$('[data-an-text]')?.focus();return;}
      if(b.dataset.anSelect){select(b.dataset.anSelect);return;}
      if(b.dataset.anHistory){await onHistory(b.dataset.anHistory);return;}
      if(b.hasAttribute('data-an-locate')){onLocate(form().value.targets[Number(b.dataset.anLocate)].recordId);return;}
      if(b.hasAttribute('data-an-preview')){const a=candidate();if(form().dirty){message(uiText('先应用修改，再预览保存的标注。'));return;}onPreview((a.when.start+a.when.end)/2);return;}
      if(b.hasAttribute('data-an-remove')){const id=state.selected,f=form();state.forms.delete(id);state.selected=null;try{if(step().options.annotations?.some(a=>a.id===id))await onRemove(id);}catch(error){state.forms.set(id,f);state.selected=id;throw error;}if(!disposed)render();}
    }catch(error){if(!disposed)message(error.message);}
  },{signal:events.signal});
  host.addEventListener('submit',async e=>{if(!e.target.hasAttribute('data-an-form'))return;e.preventDefault();read();const f=form();try{const a=candidate();state.forms.delete(a.id);try{await onApply(a,[...f.targets]);}catch(error){state.forms.set(a.id,f);throw error;}if(!disposed){select(a.id);message(uiMessage`已应用到 ${f.targets.length} 步，可撤销这次标注操作。`);}}catch(error){if(!disposed)message(error.message);}},{signal:events.signal});
  render();
  return {select,refresh(){render();},destroy(){disposed=true;events.abort();}};
}
