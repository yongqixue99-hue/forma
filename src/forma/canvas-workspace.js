import {createElement,Plus,X,Copy,Save,Download,FolderOpen,Play,Pause,RotateCcw,ArrowLeft,ArrowRight,GripVertical,Trash2,Grid2x2,Undo2,Redo2,Search,ChevronDown,Maximize2,Settings2} from 'lucide';
import {catalog,families,getExample,findTemplate} from './catalog.js';
import {filterCatalog} from './library-filter.js';
import {escapeHtml as esc} from './data.js';
import {ChartScene} from './charts.js';
import {palettes} from './palettes.js';
import {morphViews} from './morph.js';
import {copyEditorText} from './editor-assistance.js';
import {openTableEditor} from './table-editor.js';
import {download} from './export.js';
import {canvasAgentBrief,downloadCanvasHTML} from './canvas-export.js';
import {CanvasSurface,canvasVisualCSS} from './canvas-renderer.js';
import {CANVAS_LIMITS,newCanvas,newScene,uid,cleanCanvas,readCanvasFile,readCanvasCollection,writeCanvasCollection,addSources,arrangePanels,duplicateScene,appendMorphScene,morphCapable,defaultMorphView,fitPanel,pruneAssets,canvasSize,canvasDuration,sceneSchedule,canvasEffects,canvasRatios} from './canvas-model.js';
import './canvas-workspace.css';

const icon=(node,size=16)=>createElement(node,{width:size,height:size,'stroke-width':1.5,'aria-hidden':'true'}).outerHTML;
const clone=v=>structuredClone(v);
const ordered=[...catalog].sort((a,b)=>Number(!!b.basic)-Number(!!a.basic)||(b.edition||1)-(a.edition||1)||Number(a.no)-Number(b.no));

export function mountCanvasWorkspace(host,{getSources=()=>({}),palette='ink',toast=()=>{},storage=localStorage}={}){
  const loaded=readCanvasCollection(storage);let projects=loaded.projects,project=projects.find(p=>p.id===loaded.activeId)||projects[0];
  if(!project){project=newCanvas();projects=[project];}
  let sceneId=project.scenes[0].id,panelId=null,sourceTab='editor',query='',family='all',sourcePage=0,sourceMode='together',pending=new Set(),sourceRows=[],sourcePreviews=[],thumbs=[],surface=null,managerPreviews=[],managerOpen=false,removedProject=null,importer=null,alive=true,raf=0,last=0,time=0,playing=false,previewing=false,saveTimer=0,drag=null,dragPage=null,moveFrame=0,ignoreClick=false,nameTimer=0,pageProperties=false,mobileSourcesOpen=false;
  const history=new Map(),$=q=>host.querySelector(q),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const scene=()=>project.scenes.find(s=>s.id===sceneId)||project.scenes[0];
  const panel=()=>scene().panels.find(p=>p.id===panelId);
  const asset=()=>project.assets.find(a=>a.id===panel()?.assetId);
  const historyFor=()=>{if(!history.has(project.id))history.set(project.id,{undo:[],redo:[]});return history.get(project.id);};
  const destroyPreviews=list=>{list.forEach(s=>s.destroy());list.length=0;};
  function commitNames(){
    clearTimeout(nameTimer);const name=$('#fc-name')?.value.trim(),pageName=$('#fc-page-name')?.value.trim();
    if(!name||!pageName||name===project.name&&pageName===scene().name)return;
    const next=clone(project);next.name=name;next.scenes.find(s=>s.id===sceneId).name=pageName;record(next);renderBoard();renderTimeline();
  }
  function flush(){commitNames();clearTimeout(saveTimer);try{writeCanvasCollection(projects,project.id,storage);if($('#fc-save-state'))$('#fc-save-state').textContent=project.savedAt&&project.savedAt>=project.updated?'已保存 · 此浏览器':'草稿已自动保存';return true;}catch{if($('#fc-save-state'))$('#fc-save-state').textContent='未能保存，请下载画布文件备份';return false;}}
  function persist(){clearTimeout(saveTimer);$('#fc-save-state').textContent='正在保存…';saveTimer=setTimeout(flush,250);}
  function record(next,before=clone(project)){
    const clean=cleanCanvas(pruneAssets(next)),h=historyFor();h.undo.push(before);if(h.undo.length>30)h.undo.shift();h.redo=[];clean.updated=Date.now();projects[projects.findIndex(p=>p.id===project.id)]=clean;project=clean;persist();
  }
  function change(fn,{selectScene,selectPanel}={}){
    pause();previewing=false;const next=clone(project);fn(next);record(next);if(selectScene)sceneId=selectScene;if(selectPanel!==undefined)panelId=selectPanel;
    if(!project.scenes.some(s=>s.id===sceneId))sceneId=project.scenes[0].id;if(!scene().panels.some(p=>p.id===panelId))panelId=scene().panels[0]?.id||null;renderContent();
  }
  function shell(){
    destroyPreviews(sourcePreviews);destroyPreviews(thumbs);destroyPreviews(managerPreviews);surface?.destroy();
    host.innerHTML=`<style>${canvasVisualCSS}</style><section class="fc-workspace"><header class="fc-header"><div class="fc-title"><h1>自由画布</h1><input id="fc-name" aria-label="画布名称" maxlength="80" value="${esc(project.name)}"><span id="fc-save-state">${loaded.warning||(project.savedAt&&project.savedAt>=project.updated?'已保存 · 此浏览器':'草稿保存在此浏览器')}</span></div><div class="fc-header-actions"><button class="button small" data-fc="projects">${icon(FolderOpen,14)}我的画布</button><button class="text-button" data-fc="new">${icon(Plus,14)}新建</button><button class="button small" data-fc="copy">${icon(Copy,14)}复制提示词</button><details class="fc-export-menu"><summary class="button small">${icon(Download,14)}导出${icon(ChevronDown,12)}</summary><div><button data-fc="html">可播放的 HTML</button><button data-fc="file">画布文件 · 备份</button><button data-fc="import-file">打开画布文件</button></div></details><button class="button dark small" data-fc="save">${icon(Save,14)}保存画布</button></div></header>
      <div class="fc-body"><aside class="fc-sources" aria-label="画布图表素材"><header><h2>添加图表</h2><span id="fc-source-total"></span><button class="text-button fc-mobile-source-toggle" data-fc="toggle-sources" aria-expanded="${mobileSourcesOpen}">${mobileSourcesOpen?'收起素材':'展开素材'}</button></header><nav class="fc-source-tabs" aria-label="素材来源">${[['editor','已编辑'],['saved','已保存'],['selection','已选'],['library','图库']].map(([id,label])=>`<button data-source-tab="${id}" aria-pressed="${sourceTab===id}">${label}</button>`).join('')}</nav><label class="fc-search">${icon(Search,14)}<input id="fc-search" aria-label="搜索画布素材" placeholder="搜索图型或标题" value="${esc(query)}"></label><select id="fc-family" aria-label="素材图型分类">${families.map(f=>`<option value="${f.id}" ${f.id===family?'selected':''}>${f.name}</option>`).join('')}</select><div class="fc-source-list"></div><div class="fc-source-pagination"><span></span><button class="icon-button" data-fc="source-prev" aria-label="上一页素材">${icon(ArrowLeft,13)}</button><button class="icon-button" data-fc="source-next" aria-label="下一页素材">${icon(ArrowRight,13)}</button></div><footer><select id="fc-add-mode" aria-label="图表组合方式"><option value="together" ${sourceMode==='together'?'selected':''}>拼在当前页</option><option value="pages" ${sourceMode==='pages'?'selected':''}>每张单独成页</option></select><button class="button dark" data-fc="add-sources" disabled>加入画布</button></footer></aside>
      <section class="fc-center"><div class="fc-page-toolbar"><div><span id="fc-page-number" class="mono"></span><input id="fc-page-name" aria-label="当前页面名称" maxlength="80"></div><div><select id="fc-ratio" aria-label="画布比例">${canvasRatios.map(([id,label])=>`<option value="${id}" ${id===project.ratio?'selected':''}>${label}</option>`).join('')}</select><label class="fc-ground"><input id="fc-dark" type="checkbox" ${project.dark?'checked':''}>炭黑</label></div></div><div class="fc-stage-well"><div class="fc-stage-fit"><div class="fc-stage" id="fc-stage"><div id="fc-paint"></div><div id="fc-overlay"></div></div></div><button class="button small fc-return" data-fc="edit" hidden>返回编辑</button></div><div class="fc-player-bar"><button class="icon-button" data-fc="play" aria-label="播放画布">${icon(Play)}</button><button class="icon-button" data-fc="restart" aria-label="从头播放">${icon(RotateCcw,14)}</button><input id="fc-time" type="range" min="0" step="0.01" aria-label="画布播放进度" value="0"><output id="fc-time-label" aria-live="off"></output><label><input id="fc-loop" type="checkbox" ${project.loop?'checked':''}>循环</label></div></section>
      <aside class="fc-inspector" aria-label="页面与图表设置"></aside></div>
      <section class="fc-storyboard" aria-label="画布页面顺序"><div class="fc-storyboard-heading"><span>页面 <small>拖动排序</small></span><div><button class="icon-button" data-fc="undo" aria-label="撤销画布修改">${icon(Undo2,15)}</button><button class="icon-button" data-fc="redo" aria-label="重做画布修改">${icon(Redo2,15)}</button><button class="text-button" data-fc="page-new">${icon(Plus,14)}添加页面</button></div></div><div class="fc-filmstrip"></div></section><div id="fc-feedback" role="status" aria-live="polite"></div><section class="fc-projects" aria-label="我的画布" hidden></section><input type="file" id="fc-file-input" accept=".json,application/json" hidden></section>`;
    renderSources();renderContent();if(managerOpen)renderManager();
  }
  function sources(){
    const buckets=getSources();return sourceTab==='library'?ordered.map(t=>({key:`library:${t.id}`,doc:getExample(t.id),options:{palette,dark:!!t.dark},label:t.name})):buckets[sourceTab]||[];
  }
  function renderSources(){
    destroyPreviews(sourcePreviews);const available=sources(),ids=new Set(filterCatalog(ordered,{family,category:'all',query:''}).map(t=>t.id)),q=query.toLowerCase().trim();sourceRows=available.filter(s=>ids.has(s.doc.template)&&(!q||`${findTemplate(s.doc.template).name} ${s.doc.title} ${s.doc.template}`.toLowerCase().includes(q)));
    sourcePage=Math.max(0,Math.min(sourcePage,Math.ceil(sourceRows.length/8)-1));const rows=sourceRows.slice(sourcePage*8,(sourcePage+1)*8);
    $('#fc-source-total').textContent=`${sourceRows.length} 张`;
    host.querySelectorAll('[data-source-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sourceTab===sourceTab)));
    $('.fc-source-list').innerHTML=rows.length?rows.map((s,i)=>`<button class="fc-source-card" data-source-key="${esc(s.key)}" aria-label="选择素材：${esc(s.doc.title)} · ${esc(findTemplate(s.doc.template).name)}" aria-pressed="${pending.has(s.key)}" ${s.disabled?'disabled':''}><span class="fc-source-preview" data-source-preview="${i}" aria-hidden="true"></span><span class="fc-source-label"><strong>${esc(findTemplate(s.doc.template).name)}</strong><span>${esc(s.doc.title)}</span>${s.disabled?'<small>请先修正未完成的数据</small>':''}</span><span class="fc-source-check">${pending.has(s.key)?'✓':'+'}</span></button>`).join(''):`<div class="fc-source-empty"><p>${query?'没有匹配的图表':sourceTab==='editor'?'编辑区还没有图表':sourceTab==='saved'?'还没有保存的图表':sourceTab==='selection'?'图库清单暂时为空':'没有匹配的图型'}</p><button class="text-button" data-fc="browse-library">从图库挑选 ${icon(ArrowRight,12)}</button></div>`;
    rows.forEach((s,i)=>sourcePreviews.push(new ChartScene($(`[data-source-preview="${i}"]`),s.doc,{...s.options,width:250,height:160,progress:1,compact:true,interactive:false})));
    $('.fc-source-pagination>span').textContent=sourceRows.length?`${sourcePage*8+1}–${Math.min(sourceRows.length,(sourcePage+1)*8)} / ${sourceRows.length}`:'0 / 0';$('[data-fc=source-prev]').disabled=!sourcePage;$('[data-fc=source-next]').disabled=(sourcePage+1)*8>=sourceRows.length;syncPending();
  }
  function syncPending(){
    host.querySelectorAll('[data-source-key]').forEach(b=>{const selected=pending.has(b.dataset.sourceKey);b.setAttribute('aria-pressed',String(selected));b.querySelector('.fc-source-check').textContent=selected?'✓':'+';});
    $('[data-fc=add-sources]').disabled=!pending.size;$('[data-fc=add-sources]').textContent=pending.size?`加入 ${pending.size} 张图`:'加入画布';
  }
  function renderBoard(){
    if(!previewing)time=sceneSchedule(project)[project.scenes.indexOf(scene())].holdStart;
    surface?.destroy();surface=new CanvasSurface($('#fc-paint'),project);surface.frame(0,{sceneIndex:project.scenes.indexOf(scene())});
    const overlay=$('#fc-overlay');overlay.innerHTML=scene().panels.map(p=>`<div class="fc-panel-handle ${p.id===panelId?'selected':''}" data-panel="${p.id}" role="button" tabindex="0" aria-label="移动图表：${esc(project.assets.find(a=>a.id===p.assetId).doc.title)}" aria-pressed="${p.id===panelId}" style="left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%"><span class="fc-handle-label">${icon(GripVertical,13)}拖动位置</span><button data-resize="${p.id}" aria-label="调整图表大小" title="拖动调整大小">${icon(Maximize2,14)}</button></div>`).join('');
    if(!scene().panels.length)overlay.innerHTML='<div class="fc-empty-board"><span>这一页，从你的数据开始</span><p>从左侧挑选图表，拼在一起，或分别成页。</p><button class="button small" data-fc="browse-library">浏览全部图型</button></div>';
    overlay.hidden=previewing;$('#fc-page-name').value=scene().name;$('#fc-page-number').textContent=`${String(project.scenes.indexOf(scene())+1).padStart(2,'0')} / ${project.scenes.length}`;
    resizeStage();syncPlayback();
  }
  function resizeStage(){if(!alive||!$('.fc-stage-well'))return;const size=canvasSize(project.ratio),well=$('.fc-stage-well'),w=Math.max(140,Math.min(well.clientWidth-36,(Math.max(260,well.clientHeight)-30)*size.width/size.height)),stage=$('#fc-stage'),fit=$('.fc-stage-fit');fit.style.width=w+'px';fit.style.height=w*size.height/size.width+'px';stage.style.width=size.width+'px';stage.style.height=size.height+'px';stage.style.transform=`scale(${w/size.width})`;stage.style.setProperty('--fc-handle-scale',String(size.width/w));}
  function renderTimeline(){
    destroyPreviews(thumbs);$('.fc-filmstrip').innerHTML=project.scenes.map((s,i)=>`<div class="fc-page-card ${s.id===sceneId?'active':''}" data-scene-card="${s.id}" draggable="true"><button data-scene-select="${s.id}" aria-label="第 ${i+1} 页：${esc(s.name)}" aria-current="${s.id===sceneId}"><span class="fc-page-thumb" aria-hidden="true"><span data-scene-thumb="${i}"></span></span><span class="fc-page-caption"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(s.name)}</span><small>${s.hold}s</small></span></button>${i?`<span class="fc-cut-label">${esc(canvasEffects.find(([id])=>id===s.transition)[1])}</span>`:''}</div>`).join('');
    const size=canvasSize(project.ratio);project.scenes.forEach((s,i)=>{const container=$(`[data-scene-thumb="${i}"]`);container.style.width=size.width+'px';container.style.height=size.height+'px';container.style.transform=`scale(${Math.min(156/size.width,86/size.height)}) translate(-50%,-50%)`;const thumb=new CanvasSurface(container,project);thumb.frame(0,{sceneIndex:i});thumbs.push(thumb);});
  }
  function renderInspector(){
    const s=scene(),p=panel(),a=asset(),index=project.scenes.indexOf(s),candidate=a&&morphCapable(a.doc),buckets=getSources(),original=a&&Object.values(buckets).flat().find(v=>v.key===a.sourceKey&&!v.disabled);
    $('.fc-inspector').innerHTML=`<div class="fc-section-title"><h2>页面设置</h2><span>${icon(Settings2,14)}</span></div><div class="fc-page-actions"><button class="button small" data-fc="duplicate-page">${icon(Copy,13)}复制页面</button><button class="icon-button" data-fc="remove-page" aria-label="删除当前页面" ${project.scenes.length===1?'disabled':''}>${icon(Trash2,14)}</button><button class="icon-button" data-fc="page-left" aria-label="当前页面前移" ${index===0?'disabled':''}>${icon(ArrowLeft,13)}</button><button class="icon-button" data-fc="page-right" aria-label="当前页面后移" ${index===project.scenes.length-1?'disabled':''}>${icon(ArrowRight,13)}</button></div><details class="fc-page-properties" ${!p||pageProperties?'open':''}><summary>页面布局与转场</summary><label class="fc-field">自动排版<select id="fc-layout"><option value="free">自由位置</option><option value="auto">均衡排列</option><option value="lead">主图与侧图</option><option value="stack">上下排列</option></select></label><div class="fc-field-pair"><label class="fc-field">停留 / 秒<input id="fc-hold" type="number" min="1" max="20" step="0.5" value="${s.hold}"></label><label class="fc-field">转场 / 秒<input id="fc-seconds" type="number" min="0.3" max="3" step="0.1" value="${s.seconds}" ${index===0?'disabled':''}></label></div><label class="fc-field">进入本页<select id="fc-effect" ${index===0?'disabled':''}>${canvasEffects.map(([id,label])=>`<option value="${id}" ${id===s.transition?'selected':''}>${label}</option>`).join('')}</select></label><p class="fc-note">${index===0?'第一页从图表自身的入场动画开始。':s.transition==='smart'?'同一图表衔接位置与形状，其余图表柔和叠化。':'转场连接页面，原始数据保持不变。'}</p></details>
      <div class="fc-section-title"><h2>本页图表</h2><span>${s.panels.length} / 4</span></div><div class="fc-layers">${s.panels.map((item,i)=>`<button data-layer="${item.id}" aria-pressed="${item.id===panelId}"><span>${String(i+1).padStart(2,'0')}</span>${esc(findTemplate(project.assets.find(a=>a.id===item.assetId).doc.template).name)}</button>`).join('')||'<p class="fc-note">加入图表后可拖动、缩放并设置转场。</p>'}</div>
      ${a?`<div class="fc-panel-settings"><header><h3>${esc(findTemplate(a.doc.template).name)}</h3><button class="icon-button" data-fc="remove-panel" aria-label="移除所选图表">${icon(X,14)}</button></header><div class="fc-field-pair">${[['x','横向位置'],['y','纵向位置'],['w','宽度'],['h','高度']].map(([key,label])=>`<label class="fc-field">${label} / %<input data-panel-field="${key}" aria-label="图表${label}" type="number" step="0.5" value="${p[key]}"></label>`).join('')}</div><div class="fc-layer-actions"><button class="text-button" data-fc="front">置于顶层</button><button class="text-button" data-fc="back">置于底层</button></div><label class="fc-field">图表配色<select id="fc-panel-palette">${a.options.colors?'<option value="custom" selected disabled>沿用自定义色板</option>':''}${Object.entries(palettes).map(([id,pal])=>`<option value="${id}" ${!a.options.colors&&a.options.palette===id?'selected':''}>${pal.name}</option>`).join('')}</select></label><div class="fc-data-actions"><button class="button small" data-fc="data">${icon(Grid2x2,13)}编辑图表数据</button>${original?'<button class="text-button" data-fc="refresh-source">从来源更新</button>':''}</div><p class="fc-note">此处编辑画布中的副本。复制页面会共用这份素材。</p>${candidate?`<div class="fc-morph-builder"><label class="fc-field">用同一数据变成<select id="fc-next-view">${morphViews.map(v=>`<option value="${v.id}" ${v.id==='donut'?'selected':''}>${v.name}</option>`).join('')}</select></label><button class="button small" data-fc="morph-next">${icon(Plus,13)}接成变形下一页</button>${p.view!=='native'?'<button class="text-button" data-fc="native-view">本页恢复原图型</button>':''}</div>`:''}</div>`:'<p class="fc-note">点选画布上的图表，调整位置和数据。</p>'}`;
  }
  function renderContent(){$('.fc-workspace').classList.toggle('has-panels',!!project.assets.length);$('.fc-sources').classList.toggle('is-expanded',mobileSourcesOpen);$('#fc-name').value=project.name;$('#fc-ratio').value=project.ratio;$('#fc-dark').checked=project.dark;$('#fc-loop').checked=project.loop;renderBoard();renderInspector();renderTimeline();const h=historyFor();$('[data-fc=undo]').disabled=!h.undo.length;$('[data-fc=redo]').disabled=!h.redo.length;for(const name of ['copy','html','play','restart'])$(`[data-fc=${name}]`).disabled=!project.assets.length;if(managerOpen)renderManager();}
  function show(message){$('#fc-feedback').textContent=message;toast(message);}
  function pause(){playing=false;cancelAnimationFrame(raf);syncPlayback();}
  function syncPlayback(){if(!$('#fc-time'))return;const total=canvasDuration(project);time=Math.min(time,total);$('#fc-time').max=total;$('#fc-time').value=String(time);$('#fc-time-label').textContent=`${time.toFixed(1)} / ${total.toFixed(1)} s`;$('[data-fc=play]').innerHTML=icon(playing?Pause:Play);$('[data-fc=play]').setAttribute('aria-label',playing?'暂停画布':'播放画布');$('[data-fc=edit]').hidden=!previewing;}
  function paintTime(){const frame=surface.frame(time,{staticFrame:reduced.matches});host.querySelectorAll('[data-scene-select]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.sceneSelect===project.scenes[frame.index].id)));syncPlayback();}
  function tick(now){if(!alive||!playing)return;if(!document.hidden){time=Math.min(canvasDuration(project),time+Math.min(.12,(now-last)/1000));if(time>=canvasDuration(project)){if(project.loop)time=0;else playing=false;}paintTime();}last=now;if(playing)raf=requestAnimationFrame(tick);}
  function start(restart=false){if(!project.assets.length)return;if(!previewing){time=sceneSchedule(project)[project.scenes.indexOf(scene())].start;surface.reset(project);}if(restart||time>=canvasDuration(project))time=0;previewing=true;$('#fc-overlay').hidden=true;playing=true;last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);paintTime();}
  function selectScene(id){pause();previewing=false;sceneId=id;panelId=scene().panels[0]?.id||null;time=sceneSchedule(project)[project.scenes.indexOf(scene())].holdStart;renderContent();}
  function selectPanel(id){panelId=id;renderInspector();host.querySelectorAll('[data-panel]').forEach(el=>{el.classList.toggle('selected',el.dataset.panel===id);el.setAttribute('aria-pressed',String(el.dataset.panel===id));});}
  function renderManager(){
    destroyPreviews(managerPreviews);const el=$('.fc-projects');el.hidden=!managerOpen;if(!managerOpen)return;
    el.innerHTML=`<header><h2>我的画布 <span>${projects.length}</span></h2><button class="icon-button" data-fc="close-projects" aria-label="关闭我的画布">${icon(X,17)}</button></header><div class="fc-project-list">${projects.map((p,i)=>`<article><button data-open-project="${p.id}" aria-label="打开画布：${esc(p.name)}"><span class="fc-project-thumb" aria-hidden="true"><span data-project-thumb="${i}"></span></span><span><strong>${esc(p.name)}</strong><small>${p.scenes.length} 页 · ${canvasDuration(p).toFixed(1)} 秒${p.savedAt&&p.savedAt>=p.updated?' · 已保存':' · 草稿'}</small></span></button><button class="icon-button" data-remove-project="${p.id}" aria-label="移除画布：${esc(p.name)}">${icon(X,13)}</button></article>`).join('')}</div><footer><span>保存于此浏览器，可导出画布文件备份。</span>${removedProject?'<button class="text-button" data-fc="restore-project">撤销移除</button>':''}</footer>`;
    projects.forEach((p,i)=>{const c=$(`[data-project-thumb="${i}"]`),size=canvasSize(p.ratio);c.style.width=size.width+'px';c.style.height=size.height+'px';c.style.transform=`scale(${Math.min(94/size.width,60/size.height)}) translate(-50%,-50%)`;const preview=new CanvasSurface(c,p);preview.frame(0,{sceneIndex:0});managerPreviews.push(preview);});
  }
  function openProject(id){flush();pause();previewing=false;project=projects.find(p=>p.id===id);sceneId=project.scenes[0].id;panelId=null;time=0;pending.clear();managerOpen=false;shell();persist();}
  function saveNow(){project.savedAt=project.updated=Date.now();if(flush()){show('画布已保存，下次可从「我的画布」继续。');if(managerOpen)renderManager();}}
  function updateAsset(id,doc,options){
    let reset=false;change(next=>{const target=next.assets.find(a=>a.id===id);target.doc=clone(doc);if(options)target.options=clone(options);if(!morphCapable(doc))for(const s of next.scenes)for(const p of s.panels)if(p.assetId===id&&p.view!=='native'){p.view='native';s.transition='fade';reset=true;}});if(reset)show('数据已更新；不再满足连续变形条件的页面已改为原图型与叠化。');
  }
  async function click(e){
    if(e.target.closest('.workflow-dialog'))return;
    const source=e.target.closest('[data-source-key]'),tab=e.target.closest('[data-source-tab]'),pageButton=e.target.closest('[data-scene-select]'),layer=e.target.closest('[data-layer]'),selected=e.target.closest('[data-panel]'),button=e.target.closest('[data-fc]'),open=e.target.closest('[data-open-project]'),remove=e.target.closest('[data-remove-project]');
    try{
      commitNames();
      if(e.target.closest('.fc-page-properties>summary')){pageProperties=!e.target.closest('details').open;return;}
      if(source){const key=source.dataset.sourceKey;pending.has(key)?pending.delete(key):pending.add(key);syncPending();return;}
      if(tab){sourceTab=tab.dataset.sourceTab;sourcePage=0;pending.clear();renderSources();return;}
      if(pageButton){selectScene(pageButton.dataset.sceneSelect);return;}
      if(layer){selectPanel(layer.dataset.layer);return;}
      if(selected&&!ignoreClick){selectPanel(selected.dataset.panel);return;}
      if(open){openProject(open.dataset.openProject);return;}
      if(remove){const id=remove.dataset.removeProject;removedProject=clone(projects.find(p=>p.id===id));projects=projects.filter(p=>p.id!==id);if(!projects.length)projects=[newCanvas()];if(project.id===id){project=projects[0];sceneId=project.scenes[0].id;panelId=null;time=0;previewing=false;pause();renderContent();}flush();renderManager();return;}
      if(!button)return;const action=button.dataset.fc;if(button.closest('.fc-export-menu'))button.closest('details').open=false;
      if(action==='add-sources'){
        const all=Object.values(getSources()).flat().concat(ordered.map(t=>({key:`library:${t.id}`,doc:getExample(t.id),options:{palette,dark:!!t.dark}}))),chosen=[...pending].map(key=>all.find(s=>s.key===key)).filter(Boolean);let target;
        change(next=>{target=addSources(next,sceneId,chosen,sourceMode);});pending.clear();sceneId=sourceMode==='pages'?target:sceneId;panelId=scene().panels.at(-1)?.id;renderContent();syncPending();show(`已加入 ${chosen.length} 张图，原图数据保持独立。`);
      }else if(action==='toggle-sources'){mobileSourcesOpen=!mobileSourcesOpen;$('.fc-sources').classList.toggle('is-expanded',mobileSourcesOpen);button.setAttribute('aria-expanded',String(mobileSourcesOpen));button.textContent=mobileSourcesOpen?'收起素材':'展开素材';}
      else if(action==='browse-library'){mobileSourcesOpen=true;$('.fc-sources').classList.add('is-expanded');$('.fc-mobile-source-toggle').setAttribute('aria-expanded','true');$('.fc-mobile-source-toggle').textContent='收起素材';pending.clear();sourceTab='library';family='all';query='';sourcePage=0;$('#fc-search').value='';$('#fc-family').value='all';renderSources();$('.fc-sources').scrollIntoView?.({block:'nearest'});}
      else if(action==='source-prev'||action==='source-next'){sourcePage+=action==='source-next'?1:-1;renderSources();$('.fc-source-list').scrollTop=0;}
      else if(action==='page-new'){if(project.scenes.length>=12)throw new Error('一张画布最多保留 12 页。');const next=newScene(`第 ${project.scenes.length+1} 页`);change(p=>p.scenes.push(next),{selectScene:next.id,selectPanel:null});}
      else if(action==='duplicate-page'){let next;change(p=>{next=duplicateScene(p,sceneId);});selectScene(next.id);}
      else if(action==='remove-page'){if(project.scenes.length===1)return;change(p=>p.scenes.splice(p.scenes.findIndex(s=>s.id===sceneId),1));}
      else if(action==='page-left'||action==='page-right'){const at=project.scenes.indexOf(scene()),to=at+(action==='page-left'?-1:1);if(to>=0&&to<project.scenes.length)change(p=>{const [moved]=p.scenes.splice(at,1);p.scenes.splice(to,0,moved);});}
      else if(action==='remove-panel'){change(p=>{const s=p.scenes.find(s=>s.id===sceneId);s.panels=s.panels.filter(v=>v.id!==panelId);});}
      else if(action==='front'||action==='back'){change(p=>{const s=p.scenes.find(s=>s.id===sceneId),[item]=s.panels.splice(s.panels.findIndex(v=>v.id===panelId),1);action==='front'?s.panels.push(item):s.panels.unshift(item);});}
      else if(action==='morph-next'){const view=$('#fc-next-view').value;let next;change(p=>{next=appendMorphScene(p,sceneId,panelId,view);});selectScene(next.id);show('已连接同一份数据，可以播放查看连续变形。');}
      else if(action==='native-view')change(p=>p.scenes.find(s=>s.id===sceneId).panels.find(v=>v.id===panelId).view='native');
      else if(action==='data'){const selectedAsset=asset(),id=selectedAsset.id;importer?.close();importer=openTableEditor(selectedAsset.doc,{onApply(doc){if(alive&&project.assets.some(a=>a.id===id))updateAsset(id,doc);}});}
      else if(action==='refresh-source'){const current=asset(),source=Object.values(getSources()).flat().find(s=>s.key===current.sourceKey&&!s.disabled);if(!source)throw new Error('原图数据暂不可用。');updateAsset(current.id,source.doc,source.options);show('已从来源更新画布素材。');}
      else if(action==='play')playing?pause():start();else if(action==='restart')start(true);else if(action==='edit'){previewing=false;pause();renderBoard();}
      else if(action==='undo'||action==='redo'){const h=historyFor(),list=h[action];if(!list.length)return;h[action==='undo'?'redo':'undo'].push(clone(project));project=list.pop();projects[projects.findIndex(p=>p.id===project.id)]=project;if(!project.scenes.some(s=>s.id===sceneId))sceneId=project.scenes[0].id;pause();previewing=false;project.updated=Date.now();persist();renderContent();}
      else if(action==='save')saveNow();else if(action==='projects'){managerOpen=!managerOpen;renderManager();}else if(action==='close-projects'){managerOpen=false;renderManager();}
      else if(action==='new'){if(projects.length>=12)throw new Error('最多保留 12 张画布，可在「我的画布」移除不常用的画布。');flush();const p=newCanvas();projects.unshift(p);openProject(p.id);}
      else if(action==='restore-project'&&removedProject){if(projects.length>=12)throw new Error('请先腾出一个画布位置。');projects.unshift(removedProject);removedProject=null;flush();renderManager();}
      else if(action==='copy'){await copyEditorText(canvasAgentBrief(project),$('#fc-feedback'),$('.fc-workspace'));}
      else if(action==='file')download(new Blob([JSON.stringify(cleanCanvas(project),null,2)],{type:'application/json'}),`FORMA-${project.name.replace(/[<>:"/\\|?*]/g,'').slice(0,40)}.canvas.json`);
      else if(action==='html'){button.disabled=true;try{await downloadCanvasHTML(clone(project));show('已导出完整 HTML，包含图表、数据、布局和转场播放器。');}finally{if(button.isConnected)button.disabled=false;}}
      else if(action==='import-file')$('#fc-file-input').click();
    }catch(error){show(error.message);}
  }
  function input(e){if(['fc-name','fc-page-name'].includes(e.target.id)){clearTimeout(nameTimer);nameTimer=setTimeout(commitNames,350);}else if(e.target.id==='fc-search'){query=e.target.value;sourcePage=0;renderSources();}else if(e.target.id==='fc-time'){pause();previewing=true;$('#fc-overlay').hidden=true;time=Number(e.target.value);paintTime();}}
  async function changed(e){
    if(e.target.closest('.workflow-dialog'))return;const target=e.target,id=target.id;
    try{
      if(id==='fc-family'){family=target.value;sourcePage=0;renderSources();}
      else if(id==='fc-add-mode')sourceMode=target.value;
      else if(id==='fc-name'||id==='fc-page-name'){if(!target.value.trim()){target.value=id==='fc-name'?project.name:scene().name;show('名称不能为空，已保留原名称。');}else commitNames();}
      else if(id==='fc-ratio')change(p=>p.ratio=target.value);
      else if(id==='fc-dark')change(p=>p.dark=target.checked);
      else if(id==='fc-loop')change(p=>p.loop=target.checked);
      else if(id==='fc-layout'&&target.value!=='free')change(p=>arrangePanels(p.scenes.find(s=>s.id===sceneId),target.value));
      else if(['fc-hold','fc-seconds','fc-effect'].includes(id))change(p=>p.scenes.find(s=>s.id===sceneId)[{'fc-hold':'hold','fc-seconds':'seconds','fc-effect':'transition'}[id]]=id==='fc-effect'?target.value:Number(target.value));
      else if(target.dataset.panelField)change(p=>{const s=p.scenes.find(s=>s.id===sceneId),i=s.panels.findIndex(p=>p.id===panelId);s.panels[i]=fitPanel({...s.panels[i],[target.dataset.panelField]:Number(target.value)});});
      else if(id==='fc-panel-palette')change(p=>{const a=p.assets.find(a=>a.id===asset().id);a.options.palette=target.value;delete a.options.colors;});
      else if(id==='fc-file-input'){const file=target.files?.[0];if(!file)return;if(file.size>CANVAS_LIMITS.bytes)throw new Error('画布文件请控制在 6 MB 以内。');if(projects.length>=12)throw new Error('请先腾出一个画布位置。');const p=readCanvasFile(await file.text());if(!alive)return;p.id=uid();p.savedAt=null;projects.unshift(p);openProject(p.id);show('画布已打开，作为独立副本保留。');}
    }catch(error){show(error.message);if(id==='fc-name')target.value=project.name;else if(id==='fc-page-name')target.value=scene().name;else renderInspector();}finally{if(id==='fc-file-input')target.value='';}
  }
  const finishField=e=>{if(e.target.matches('[data-panel-field],#fc-hold,#fc-seconds')&&e.target.value!==e.target.getAttribute('value'))changed(e);};
  function pointerDown(e){
    if(previewing||e.button!==0)return;const handle=e.target.closest('[data-panel]');if(!handle)return;e.preventDefault();handle.focus({preventScroll:true});selectPanel(handle.dataset.panel);
    const box=$('#fc-overlay').getBoundingClientRect();drag={pointer:e.pointerId,before:clone(project),panel:clone(panel()),x:e.clientX,y:e.clientY,w:box.width,h:box.height,resize:!!e.target.closest('[data-resize]'),moved:false};host.setPointerCapture?.(e.pointerId);
  }
  function pointerMove(e){if(!drag||e.pointerId!==drag.pointer)return;const dx=(e.clientX-drag.x)/drag.w*100,dy=(e.clientY-drag.y)/drag.h*100;if(Math.abs(dx)+Math.abs(dy)<.2)return;drag.moved=true;const s=scene(),at=s.panels.findIndex(p=>p.id===drag.panel.id);s.panels[at]=fitPanel({...drag.panel,...(drag.resize?{w:drag.panel.w+dx,h:drag.panel.h+dy}:{x:drag.panel.x+dx,y:drag.panel.y+dy})});
    cancelAnimationFrame(moveFrame);moveFrame=requestAnimationFrame(()=>{const p=panel();if(!p)return;for(const el of host.querySelectorAll(`[data-panel="${p.id}"],[data-canvas-panel="${p.id}"]`)){el.style.left=p.x+'%';el.style.top=p.y+'%';el.style.width=p.w+'%';el.style.height=p.h+'%';}});
  }
  function pointerEnd(e){if(!drag||e.pointerId!==drag.pointer)return;const previous=drag;drag=null;cancelAnimationFrame(moveFrame);host.releasePointerCapture?.(e.pointerId);if(previous.moved){ignoreClick=true;setTimeout(()=>ignoreClick=false,0);record(clone(project),previous.before);renderContent();}}
  function key(e){
    if(e.target.closest('input,textarea,select,.workflow-dialog,.assist-manual-copy'))return;
    if(e.key==='Escape'){if(managerOpen){managerOpen=false;renderManager();}else if(previewing){pause();previewing=false;renderBoard();}return;}
    const element=e.target.closest('[data-panel]');if(element&&e.key.startsWith('Arrow')){e.preventDefault();const id=element.dataset.panel,amount=e.shiftKey?5:1;change(p=>{const s=p.scenes.find(s=>s.id===sceneId),i=s.panels.findIndex(v=>v.id===id),v=s.panels[i];s.panels[i]=fitPanel({...v,x:v.x+(e.key==='ArrowLeft'?-amount:e.key==='ArrowRight'?amount:0),y:v.y+(e.key==='ArrowUp'?-amount:e.key==='ArrowDown'?amount:0)});});$(`[data-panel="${id}"]`)?.focus();}
  }
  const dragStart=e=>{const card=e.target.closest('[data-scene-card]');if(!card)return;dragPage=card.dataset.sceneCard;e.dataTransfer?.setData('text/plain',dragPage);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';};
  const dragOver=e=>{if(dragPage&&e.target.closest('[data-scene-card]'))e.preventDefault();};
  const drop=e=>{const target=e.target.closest('[data-scene-card]');if(!target||!dragPage)return;e.preventDefault();const from=project.scenes.findIndex(s=>s.id===dragPage),to=project.scenes.findIndex(s=>s.id===target.dataset.sceneCard);dragPage=null;if(from>=0&&to>=0&&from!==to)change(p=>{const [s]=p.scenes.splice(from,1);p.scenes.splice(to,0,s);});};
  const dragEnd=()=>{dragPage=null;};
  const visibility=()=>{if(document.hidden)pause();};
  const reduce=()=>{pause();if(previewing)paintTime();};
  host.addEventListener('click',click);host.addEventListener('input',input);host.addEventListener('change',changed);host.addEventListener('focusout',finishField);host.addEventListener('pointerdown',pointerDown);host.addEventListener('pointermove',pointerMove);host.addEventListener('pointerup',pointerEnd);host.addEventListener('pointercancel',pointerEnd);host.addEventListener('keydown',key);host.addEventListener('dragstart',dragStart);host.addEventListener('dragover',dragOver);host.addEventListener('drop',drop);host.addEventListener('dragend',dragEnd);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',flush);reduced.addEventListener('change',reduce);
  shell();const resize=new ResizeObserver(resizeStage);resize.observe(host);if(loaded.warning)show(loaded.warning);
  return {destroy(){flush();alive=false;playing=false;cancelAnimationFrame(raf);cancelAnimationFrame(moveFrame);clearTimeout(saveTimer);clearTimeout(nameTimer);resize.disconnect();importer?.close();surface?.destroy();destroyPreviews(sourcePreviews);destroyPreviews(thumbs);destroyPreviews(managerPreviews);host.removeEventListener('click',click);host.removeEventListener('input',input);host.removeEventListener('change',changed);host.removeEventListener('focusout',finishField);host.removeEventListener('pointerdown',pointerDown);host.removeEventListener('pointermove',pointerMove);host.removeEventListener('pointerup',pointerEnd);host.removeEventListener('pointercancel',pointerEnd);host.removeEventListener('keydown',key);host.removeEventListener('dragstart',dragStart);host.removeEventListener('dragover',dragOver);host.removeEventListener('drop',drop);host.removeEventListener('dragend',dragEnd);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',flush);reduced.removeEventListener('change',reduce);}};
}
