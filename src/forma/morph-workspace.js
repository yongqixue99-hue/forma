import './morph-workspace.css';
import './morph-sequence.css';
import {morphViews,morphEffects,morphExample} from './morph.js';
import {sequencePresets,newSequence,cleanSequence,sequenceSource,readSequences,writeSequences} from './morph-sequence.js';
import {mountSequencePlayer,viewIcon,viewName} from './morph-sequence-player.js';
import {palettes,configuredColors} from './palettes.js';
import {escapeHtml as esc} from './data.js';
import {sequenceAgentBrief,downloadSequenceHTML} from './morph-sequence-export.js';
import {createElement,Copy,Save,Download,FolderOpen,X,ArrowUp,ArrowDown,Check,Plus,Trash2,ChevronDown,PanelRightClose,PanelRightOpen,LayoutTemplate,Table2,GripVertical} from 'lucide';

const symbols={Copy,Save,Download,FolderOpen,X,ArrowUp,ArrowDown,Check,Plus,Trash2,ChevronDown,PanelRightClose,PanelRightOpen,LayoutTemplate,Table2,GripVertical};
const icon=name=>createElement(symbols[name],{width:15,height:15,'stroke-width':1.5,'aria-hidden':'true'}).outerHTML;
const families=[
  {id:'compare',name:'比较与排名',views:['columns','bars','dot','lollipop','squares','bubbles','pareto']},
  {id:'trend',name:'趋势与累计',views:['line','area','waterfall']},
  {id:'share',name:'构成与占比',views:['pie','donut','semidonut','treemap','stacked','waffle']},
  {id:'radial',name:'径向与阶段',views:['rose','radialbars','radar','funnel']}
];
const newViews=new Set(['lollipop','dot','squares','semidonut','radialbars','radar','waterfall','funnel','pareto','waffle']);

export function mountMorphWorkspace(host,{palette='ink',getSources=()=>({}),toast=()=>{},storage=host.ownerDocument.defaultView.localStorage}={}){
  const win=host.ownerDocument.defaultView,stored=readSequences(storage),events=new win.AbortController();
  let projects=stored.projects,project=stored.draft||newSequence('essential',morphExample,{palette}),player,disposed=false,lastRemoved=null,dragIndex=null,activeTool='types',toolsOpen=!win.matchMedia('(max-width:760px)').matches,panelTrigger=null;
  const sources=Object.entries(getSources()).flatMap(([group,items])=>items.map(item=>({...item,group,usable:sequenceSource(item)})));
  host.innerHTML=`<section class="mw-workspace" aria-label="自由组合图型变形">
    <header class="mw-header"><div class="mw-title"><h1>自由画布</h1><div><input data-mw-name aria-label="组合名称" maxlength="80"><span data-mw-save-status role="status"></span></div></div>
      <div class="mw-actions"><button class="text-button" data-mw="saved">${icon('FolderOpen')}我的组合</button><button class="button" data-mw="copy" title="复制提示词与原版动效模板">${icon('Copy')}<span class="mw-action-label">复制提示词</span><span class="mw-short-label">复制说明书</span></button><button class="button" data-mw="export">${icon('Download')}<span class="mw-action-label">导出 HTML</span><span class="mw-short-label">导出</span></button><button class="button dark" data-mw="save">${icon('Save')}保存组合</button></div>
    </header>
    <div class="mw-toolbar"><button class="mw-preset-trigger" data-mw="presets" aria-expanded="false" aria-haspopup="dialog">${icon('LayoutTemplate')}<span>预设</span><strong data-mw-preset-name></strong>${icon('ChevronDown')}</button><span class="mw-toolbar-divider"></span><label class="mw-source-control">${icon('Table2')}<span>数据</span><select aria-label="选择已有图表数据" data-mw-source><option value="current">${esc(project.doc.title)}</option><option value="demo">六类内容 · 示例数据</option>${sources.map((s,i)=>`<option value="${i}" ${s.usable.ok?'':'disabled'}>${esc(s.doc.title)} · ${{editor:'数据编辑',saved:'我的图表',selection:'已选清单'}[s.group]||'图表'}${s.usable.ok?'':'（暂不适用）'}</option>`).join('')}</select></label><a class="mw-edit-data" href="#editor">编辑数据 ↗</a><button class="mw-tools-toggle" data-mw="tools" aria-expanded="${toolsOpen}" aria-controls="mw-toolbox"></button></div>
    <div class="mw-body"><div class="mw-preview"><div data-mw-player></div></div>
      <aside class="mw-tools" id="mw-toolbox" aria-label="组合工具"><div class="mw-tool-tabs" role="tablist" aria-label="组合工具分类">${[['types','图型'],['order','顺序'],['settings','设置']].map(([id,name])=>`<button role="tab" data-mw-tab="${id}" id="mw-tab-${id}" aria-selected="${id===activeTool}" aria-controls="mw-tool-${id}" tabindex="${id===activeTool?0:-1}">${name}${id==='types'?`<span>${morphViews.length}</span>`:''}</button>`).join('')}<button class="mw-tool-close" data-mw="tools-close" aria-label="关闭组合工具">${icon('X')}</button></div>
        <div class="mw-tool-body"><section role="tabpanel" id="mw-tool-types" aria-labelledby="mw-tab-types"><div class="mw-picker-heading"><select data-mw-family aria-label="筛选组合图型"><option value="all">全部图型</option>${families.map(f=>`<option value="${f.id}">${f.name}</option>`).join('')}<option value="new">新增图型 · 10</option></select><span data-mw-count></span></div><div class="mw-view-picker" role="group" aria-label="选择组合图型">${morphViews.map(v=>`<button data-mw-toggle="${v.id}" aria-pressed="false" title="${esc(v.note)}">${viewIcon(v.id)}<span>${viewName(v.id)}</span><i data-mw-picked></i></button>`).join('')}</div></section>
          <section role="tabpanel" id="mw-tool-order" aria-labelledby="mw-tab-order" hidden><div class="mw-order-heading"><strong>播放顺序</strong><span>拖动排列</span></div><div class="mw-order-list"></div><p class="mw-tool-note">至少保留两种图型。自动演示会按这个顺序循环。</p></section>
          <section role="tabpanel" id="mw-tool-settings" aria-labelledby="mw-tab-settings" hidden><div class="mw-settings"><h2>动画节奏</h2><label>变形方式<select data-mw-effect aria-label="形变方式">${morphEffects.map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}</select></label><p class="mw-effect-note" data-mw-effect-note></p><div class="mw-field-pair"><label>变形时长<select data-mw-duration aria-label="变形时长"><option value="1000">1.0 秒</option><option value="1500">1.5 秒</option><option value="2400">2.4 秒</option></select></label><label>停留时长<select data-mw-hold aria-label="停留时长"><option value="1200">1.2 秒</option><option value="2200">2.2 秒</option><option value="4000">4.0 秒</option></select></label></div><h2>画布配色</h2><label><select data-mw-palette aria-label="组合配色">${Object.entries(palettes).map(([key,p])=>`<option value="${key}">${p.name}</option>`).join('')}<option value="custom" hidden>沿用图表自定义配色</option></select></label><div class="mw-palette-sample" data-mw-swatches aria-hidden="true"></div><h2>当前数据</h2><p class="mw-data-title" data-mw-data-title></p><p class="mw-hint">各图型共用这组数据。支持 4–8 个类别和一列正数值；在数据编辑中整理后，可从顶部选用。</p><a class="mw-editor-link" href="#editor">打开数据编辑 <span>↗</span></a></div></section>
        </div>
      </aside>
    </div>
    <aside class="mw-popover" data-mw-panel hidden role="dialog" aria-modal="false" aria-label="画布选项"></aside>
  </section>`;
  const $=s=>host.querySelector(s),panel=$('[data-mw-panel]'),root=$('.mw-workspace');
  function report(message){$('[data-mw-save-status]').textContent=message;}
  function persist(){try{writeSequences(storage,projects,project);report(projects.some(p=>p.id===project.id&&JSON.stringify({...p,updated:0})===JSON.stringify({...project,updated:0}))?'已保存 · 此浏览器':'草稿已保存 · 此浏览器');return true;}catch(error){report('尚未保存');toast(error.message);return false;}}
  function showTools(tab=activeTool,open=true){if(tab!==activeTool)$('.mw-tool-body').scrollTop=0;activeTool=tab;toolsOpen=open;root.dataset.tools=String(open);$('.mw-tools').hidden=!open;const toggle=$('[data-mw=tools]');toggle.setAttribute('aria-expanded',String(open));toggle.innerHTML=`${icon(open?'PanelRightClose':'PanelRightOpen')}<span>${open?'收起工具':'组合工具'}</span>`;host.querySelectorAll('[data-mw-tab]').forEach(b=>{const active=b.dataset.mwTab===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});for(const id of ['types','order','settings'])$(`#mw-tool-${id}`).hidden=id!==tab;}
  function filterTypes(){const value=$('[data-mw-family]').value,ids=value==='all'?null:value==='new'?[...newViews]:families.find(f=>f.id===value)?.views;host.querySelectorAll('[data-mw-toggle]').forEach(b=>{b.hidden=!!ids&&!ids.includes(b.dataset.mwToggle);});}
  function renderOrder(){
    $('.mw-order-list').innerHTML=project.views.map((id,i)=>`<div draggable="true" data-mw-order="${i}"><span class="mw-grip">${icon('GripVertical')}</span><span class="mw-order-number">${String(i+1).padStart(2,'0')}</span>${viewIcon(id)}<strong>${viewName(id)}</strong><div class="mw-order-actions"><button class="icon-button" data-mw-move="${i}:-1" ${i===0?'disabled':''} aria-label="${viewName(id)}向前移">${icon('ArrowUp')}</button><button class="icon-button" data-mw-move="${i}:1" ${i===project.views.length-1?'disabled':''} aria-label="${viewName(id)}向后移">${icon('ArrowDown')}</button><button class="icon-button" data-mw-remove="${id}" ${project.views.length<=2?'disabled':''} aria-label="移除${viewName(id)}">${icon('X')}</button></div></div>`).join('');
  }
  function selectValue(el,value,label){if(![...el.options].some(o=>o.value===String(value)))el.add(new win.Option(label,String(value)));el.value=String(value);}
  function controls(){
    $('[data-mw-name]').value=project.name;$('[data-mw-effect]').value=project.effect;selectValue($('[data-mw-duration]'),project.duration,`${project.duration/1000} 秒`);selectValue($('[data-mw-hold]'),project.hold,`${project.hold/1000} 秒`);
    $('[data-mw-palette] option[value=custom]').hidden=!project.colors;$('[data-mw-palette]').value=project.colors?'custom':project.palette;
    $('[data-mw-count]').textContent=`已选 ${project.views.length}`;
    $('[data-mw-preset-name]').textContent=sequencePresets.find(p=>p.id===project.preset)?.name||'自由组合';
    host.querySelectorAll('[data-mw-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mwPreset===project.preset)));
    host.querySelectorAll('[data-mw-toggle]').forEach(b=>{const selected=project.views.includes(b.dataset.mwToggle);b.setAttribute('aria-pressed',String(selected));b.querySelector('[data-mw-picked]').innerHTML=icon(selected?'Check':'Plus');});
    $('[data-mw-source] option[value=current]').textContent=project.doc.title;$('[data-mw-data-title]').textContent=`${project.doc.data.length} 个类别 · ${project.doc.unit}`;
    $('[data-mw-effect-note]').textContent={smooth:'图形沿路径舒展到下一个形状。',cascade:'各类别依次启动，错开少量时间。',arc:'沿弧线移动，让圆形与直线自然连接。',gather:'先向中心收拢，再展开为目标图型。',turn:'轮廓轻轻旋转，再落回准确的数据位置。'}[project.effect]||'';
    $('[data-mw-swatches]').innerHTML=configuredColors(project).map(c=>`<i style="background:${c}"></i>`).join('');
    renderOrder();filterTypes();
  }
  function update(next,{animate=true}={}){project=cleanSequence(next);controls();player?.setProject(project,{animate});persist();}
  function closePanel({focus=false}={}){panel.hidden=true;panel.replaceChildren();$('[data-mw=presets]').setAttribute('aria-expanded','false');if(focus)panelTrigger?.focus();}
  function panelHeader(title,kind='saved'){panelTrigger=win.document.activeElement;panel.hidden=false;panel.dataset.kind=kind;panel.setAttribute('aria-label',title);panel.innerHTML=`<header><h2>${esc(title)}</h2><button class="icon-button" data-mw="close" aria-label="关闭${esc(title)}">${icon('X')}</button></header><div class="mw-panel-content"></div>`;}
  function presetsPanel(){
    if(!panel.hidden&&panel.dataset.kind==='presets'){closePanel();return;}
    player?.stop();panelHeader('选择形变预设','presets');$('[data-mw=presets]').setAttribute('aria-expanded','true');
    $('.mw-panel-content').innerHTML=`<div class="mw-preset-list">${sequencePresets.map(p=>`<button data-mw-preset="${p.id}" aria-pressed="${project.preset===p.id}"><span class="mw-preset-icons">${p.views.slice(0,3).map(viewIcon).join('<i>→</i>')}</span><strong>${p.name}<small>${p.views.length} 种</small></strong><p>${p.description}</p></button>`).join('')}</div><p class="mw-hint">预设会调整图型和变形方式，继续使用当前数据。</p>`;
  }
  function editSequence(){player?.stop();closePanel();showTools('order');}
  function changeViews(views){if(views.length<2){toast('请至少保留两种图型。');return;}update({...project,preset:'custom',views,currentView:views.includes(project.currentView)?project.currentView:views[0]});}
  function move(from,to){if(to<0||to>=project.views.length||from===to)return;const views=[...project.views];views.splice(to,0,views.splice(from,1)[0]);changeViews(views);}
  function savedPanel(){
    panelHeader('我的变形组合');$('.mw-panel-content').innerHTML=`<div class="mw-saved-list">${projects.length?projects.map(p=>`<article><button data-mw-open="${esc(p.id)}"><span class="mw-saved-icons">${p.views.slice(0,4).map(viewIcon).join('')}</span><strong>${esc(p.name)}</strong><span>${p.views.length} 种图型 · ${esc(p.doc.title)}</span></button><button class="icon-button" data-mw-delete="${esc(p.id)}" aria-label="移除组合 ${esc(p.name)}">${icon('Trash2')}</button></article>`).join(''):'<p class="mw-hint">还没有保存的组合。完成组合后，点击「保存组合」，下次就能从这里继续使用。</p>'}</div><footer><button class="text-button" data-mw="new">${icon('Plus')}新建组合</button>${lastRemoved?'<button class="text-button" data-mw="restore">撤销移除</button>':''}</footer>`;
  }
  async function copy(){
    const text=sequenceAgentBrief(project);try{await win.navigator.clipboard.writeText(text);if(!disposed)toast('已复制提示词与原版动效模板，和 Excel 一起交给 Agent。');}
    catch{if(disposed)return;panelHeader('复制提示词');$('.mw-panel-content').innerHTML='<p class="mw-panel-intro">浏览器没有开放自动复制。下方已选中完整说明书，可以直接复制给 Agent。</p><textarea class="mw-copy-fallback" aria-label="形变制作说明书"></textarea>';$('.mw-copy-fallback').value=text;$('.mw-copy-fallback').focus();$('.mw-copy-fallback').select();}
  }
  controls();showTools(activeTool,toolsOpen);
  player=mountSequencePlayer($('[data-mw-player]'),project,{embedded:true,onEdit:editSequence,onReorder:move,onView(view,animating){project.currentView=view;if(!animating)persist();}});
  report(stored.recoveryRaw?'检测到旧草稿异常，保存时会保留备份。':stored.draft?'已恢复组合草稿':'草稿保存在此浏览器');
  host.addEventListener('input',e=>{if(e.target.matches('[data-mw-name]')){const name=e.target.value.trim();if(name){project.name=name;persist();}else report('请填写组合名称');}},{signal:events.signal});
  host.addEventListener('change',e=>{
    const el=e.target;
    if(el.matches('[data-mw-source]')){
      if(el.value==='current')return;const s=el.value==='demo'?null:sources[Number(el.value)];if(s&&!s.usable.ok)return;
      const doc=s?s.usable.doc:morphExample,options=s?.options||{};
      update({...project,doc,colors:options.colors,palette:options.palette||project.palette,dark:options.dark??false},{animate:false});el.value='current';toast('已使用这组数据的副本，原图表保持独立。');
    }else if(el.matches('[data-mw-effect]'))update({...project,effect:el.value});
    else if(el.matches('[data-mw-duration]'))update({...project,duration:Number(el.value)});
    else if(el.matches('[data-mw-hold]'))update({...project,hold:Number(el.value)});
    else if(el.matches('[data-mw-palette]')&&el.value!=='custom')update({...project,palette:el.value,colors:undefined});
    else if(el.matches('[data-mw-family]'))filterTypes();
  },{signal:events.signal});
  host.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.mwTab)showTools(b.dataset.mwTab);
    else if(b.dataset.mwPreset){const p=sequencePresets.find(p=>p.id===b.dataset.mwPreset);closePanel();update({...project,preset:p.id,name:p.name,views:p.views,currentView:p.views[0],effect:p.effect});}
    else if(b.dataset.mwToggle||b.dataset.mwRemove){const id=b.dataset.mwToggle||b.dataset.mwRemove;changeViews(project.views.includes(id)?project.views.filter(v=>v!==id):[...project.views,id]);}
    else if(b.dataset.mwMove){const [i,delta]=b.dataset.mwMove.split(':').map(Number);move(i,i+delta);host.querySelector(`[data-mw-move="${i+delta}:${delta}"]`)?.focus();}
    else if(b.dataset.mwOpen){const item=projects.find(p=>p.id===b.dataset.mwOpen);if(item){closePanel();update(item,{animate:false});toast('已打开保存的变形组合。');}}
    else if(b.dataset.mwDelete){const next=projects.filter(p=>p.id!==b.dataset.mwDelete),removed=projects.find(p=>p.id===b.dataset.mwDelete);try{writeSequences(storage,next,project);projects=next;lastRemoved=removed;savedPanel();}catch(error){toast(error.message);}}
    else switch(b.dataset.mw){
      case 'close':closePanel({focus:true});break;
      case 'presets':presetsPanel();break;
      case 'tools':showTools(activeTool,!toolsOpen);break;
      case 'tools-close':showTools(activeTool,false);$('[data-mw=tools]').focus();break;
      case 'saved':savedPanel();break;
      case 'new':closePanel();update(newSequence('essential',morphExample,{palette}),{animate:false});showTools('types');break;
      case 'restore':if(lastRemoved){const next=[...projects,lastRemoved];try{writeSequences(storage,next,project);projects=next;lastRemoved=null;savedPanel();}catch(error){toast(error.message);}}break;
      case 'save':{
        if(!$('[data-mw-name]').value.trim()){toast('请先填写组合名称。');$('[data-mw-name]').focus();break;}
        project.name=$('[data-mw-name]').value.trim();project.updated=Date.now();const next=[cleanSequence(project),...projects.filter(p=>p.id!==project.id)];
        try{writeSequences(storage,next,project);projects=next;report('已保存 · 此浏览器');toast('已保存到「我的组合」，下次可以直接调用。');}catch(error){toast(error.message);}break;
      }
      case 'copy':await copy();break;
      case 'export':b.disabled=true;try{await downloadSequenceHTML(project);if(!disposed)toast('已导出含完整形变效果的 HTML。');}catch(error){if(!disposed)toast(error.message);}finally{b.disabled=false;}break;
    }
  },{signal:events.signal});
  host.addEventListener('dragstart',e=>{const row=e.target.closest('[data-mw-order]');if(!row)return;dragIndex=Number(row.dataset.mwOrder);e.dataTransfer?.setData('text/plain',String(dragIndex));},{signal:events.signal});
  host.addEventListener('dragover',e=>{if(dragIndex!==null&&e.target.closest('[data-mw-order]')){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';}},{signal:events.signal});
  host.addEventListener('drop',e=>{const row=e.target.closest('[data-mw-order]');if(row&&dragIndex!==null){e.preventDefault();move(dragIndex,Number(row.dataset.mwOrder));}dragIndex=null;},{signal:events.signal});
  host.addEventListener('dragend',()=>{dragIndex=null;},{signal:events.signal});
  win.document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!e.target.closest('[data-mw=presets],[data-mw=saved]'))closePanel();},{signal:events.signal});
  host.addEventListener('keydown',e=>{const tab=e.target.closest('[data-mw-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const ids=['types','order','settings'],i=ids.indexOf(activeTool),next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;showTools(ids[next]);$(`[data-mw-tab=${ids[next]}]`).focus();},{signal:events.signal});
  win.document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!panel.hidden)closePanel({focus:true});else if(toolsOpen&&win.matchMedia('(max-width:760px)').matches){showTools(activeTool,false);$('[data-mw=tools]').focus();}}},{signal:events.signal});
  return {destroy(){disposed=true;events.abort();player.destroy();host.replaceChildren();}};
}
