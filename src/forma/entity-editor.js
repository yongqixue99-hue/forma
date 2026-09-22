import {uiText,uiMarkup,uiMessage} from './locale.js';
import {createElement,Check,MoreHorizontal,Plus,Undo2} from 'lucide';
import {editorDialog} from './editor-assistance.js';
import {entitySpec,editEntitySnapshot} from './entity-identity.js';
import {findTemplate} from './catalog.js';
import {escapeHtml as esc} from './data.js';
import './entity-editor.css';

const icon=Icon=>createElement(Icon,{width:14,height:14,'aria-hidden':true,'stroke-width':1.5}).outerHTML;
export function openEntityEditor({getModel,onChange}){
  const spec=entitySpec(getModel().meta),ui=editorDialog('entity-editor',uiMessage`管理${spec.name}`,uiText('当前步骤')),{dialog,$}=ui;
  dialog.setAttribute('aria-modal','false');let pending=null,message='';
  function render(){
    if(!dialog.isConnected)return;
    const model=getModel(),items=model.meta.entities.items,snapshot=model.snapshot;
    dialog.innerHTML=uiMarkup`${ui.header}<div class="ee-body"><p>改名会更新本步骤中的所有对应记录，并保留变形与配色的对应。其他步骤保持独立，需要更新时再使用「同步数据」。</p><div class="ee-list">${items.map((entity,index)=>{
      const count=snapshot.rowMeta.filter(r=>r[spec.ref]===entity.id).length;
      return uiMarkup`<div class="ee-item" data-entity-id="${esc(entity.id)}"><div class="ee-item-main"><label class="ee-order"><span class="sr-only">${esc(entity.name)}的显示顺序</span><select data-entity-order aria-label="${esc(entity.name)}的显示顺序">${items.map((_,i)=>`<option value="${i}" ${i===index?'selected':''}>${String(i+1).padStart(2,'0')}</option>`).join('')}</select></label><label class="ee-name"><span class="sr-only">${esc(entity.name)}的新名称</span><input data-entity-name value="${esc(entity.name)}" maxlength="80" aria-label="${esc(entity.name)}的新名称"></label><button class="text-button" data-entity-action="rename" aria-label="应用${esc(entity.name)}的新名称">${icon(Check)}改名</button><details class="ee-more"><summary aria-label="${esc(entity.name)}的更多操作">${icon(MoreHorizontal)}</summary><div><button data-entity-action="replace">作为新的${spec.name}</button><button data-entity-action="delete">删除${spec.name}及其 ${count} 行</button><label>合并到<select data-entity-target aria-label="${esc(entity.name)}合并到">${items.filter(e=>e.id!==entity.id).map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('')}</select></label><button data-entity-action="merge" ${items.length<2?'disabled':''}>检查合并</button></div></details></div><span class="ee-count">${count} 条记录${spec.kind==='variable'?uiText(' · 顺序决定矩阵排列'):''}</span></div>`;
    }).join('')}</div><div class="ee-new"><label class="sr-only" for="ee-new-name">新${spec.name}名称</label><input id="ee-new-name" maxlength="80" placeholder="新${spec.name}名称"><button class="button small" data-entity-action="create">${icon(Plus)}新建${spec.name}</button></div><p class="ee-caption">新建会沿用${spec.kind==='series'?uiText('时期'):spec.kind==='parent'?uiText('子项名称'):uiText('样本')}${spec.kind==='model'?uiText('和真实标签'):''}，${spec.kind==='model'?uiText('预测得分'):uiText('观测值')}留空，等待填写。</p>${pending?uiMarkup`<div class="ee-confirm"><strong>${esc(pending.title)}</strong><p>${esc(pending.description)}</p><div><button class="button small" data-entity-action="cancel">取消</button><button class="button dark small" data-entity-action="confirm">确认${pending.action==='delete'?uiText('删除'):pending.action==='replace'?uiText('新身份'):uiText('合并')}</button></div></div>`:''}<p class="ee-status" role="status" aria-live="polite">${esc(message)}</p></div><footer class="ee-footer"><button class="text-button" data-entity-action="undo" ${model.canUndo?'':'disabled'}>${icon(Undo2)}撤销上次编辑</button><button class="button small" data-dialog-close>返回数据表</button></footer>`;
  }
  function commit(action,options){getModel().editEntity(action,options);pending=null;onChange();message=action==='create'?uiMessage`已新建${spec.name}，请在数据表填写空白数值。`:uiText('已更新当前步骤，可撤销。');render();}
  function positionMenu(details){
    const body=$('.ee-body'),menu=details.querySelector('div');if(!body||!menu)return;
    const bounds=body.getBoundingClientRect(),trigger=details.querySelector('summary').getBoundingClientRect(),height=menu.getBoundingClientRect().height;
    details.dataset.side=trigger.bottom+height>bounds.bottom-8&&trigger.top-bounds.top>=height?'above':'below';
  }
  dialog.addEventListener('toggle',event=>{
    const details=event.target;if(!details.matches('.ee-more')||!details.open)return;
    dialog.querySelectorAll('.ee-more[open]').forEach(other=>{if(other!==details)other.open=false;});positionMenu(details);
  },true);
  dialog.addEventListener('scroll',()=>dialog.querySelectorAll('.ee-more[open]').forEach(positionMenu),true);
  dialog.addEventListener('click',event=>{
    const button=event.target.closest('[data-entity-action]');if(!button)return;
    const action=button.dataset.entityAction,item=button.closest('[data-entity-id]'),id=item?.dataset.entityId,model=getModel();
    try{
      if(action==='rename')commit(action,{id,name:item.querySelector('[data-entity-name]').value});
      else if(action==='create')commit(action,{name:$('#ee-new-name').value});
      else if(action==='undo'){model.undo();pending=null;onChange();message=uiText('已撤销上次编辑。');render();}
      else if(action==='cancel'){pending=null;message='';render();}
      else if(action==='confirm'){
        if(pending.fingerprint!==JSON.stringify(model.snapshot))throw new Error(uiText('确认期间数据已变化，请重新检查操作范围。'));
        commit(pending.action,pending.options);
      }else{
        const entity=model.meta.entities.items.find(e=>e.id===id),count=model.snapshot.rowMeta.filter(r=>r[spec.ref]===id).length,options={id,...(action==='merge'?{targetId:item.querySelector('[data-entity-target]').value}:{})};
        // This preview validates collisions without mutating the actual model.
        editEntitySnapshot(model.snapshot,findTemplate(model.meta.template).fields,action,options);
        pending={action,options,fingerprint:JSON.stringify(model.snapshot),title:action==='replace'?uiMessage`将「${entity.name}」作为新的${spec.name}`:action==='delete'?uiMessage`删除「${entity.name}」及 ${count} 条记录`:uiMessage`合并「${entity.name}」的 ${count} 条记录`,description:action==='replace'?uiText('名称和数值保留，身份重新建立。它与旧步骤中的对象不再被视为同一个。'):action==='delete'?uiText('只修改当前步骤。删除的原始记录可通过撤销恢复；其他步骤保持不变。'):uiText('将记录转到所选对象。重复样本不会自动合并、平均或删行。')};message='';render();
      }
    }catch(error){message=error.message;pending=null;render();}
  });
  dialog.addEventListener('change',event=>{if(!event.target.matches('[data-entity-order]'))return;try{commit('move',{id:event.target.closest('[data-entity-id]').dataset.entityId,index:Number(event.target.value)});}catch(error){message=error.message;render();}});
  dialog.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('[data-entity-name]')){event.preventDefault();event.target.closest('[data-entity-id]').querySelector('[data-entity-action=rename]').click();}});
  render();dialog.show();return {...ui,refresh(){if(!dialog.contains(document.activeElement))render();}};
}
