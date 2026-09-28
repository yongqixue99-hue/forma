import * as AgentAPI from './agent-api.js';
import {mountTaskPicker} from './task-picker.js';
import {recommendedUseHTML} from './chart-recommendations.js';
import {recordUsage,usageChannel} from './beta-usage.js';
import './beta.css';
import {guidePage,agentWebsiteTutorial} from './guide-page.js';
import {saveLocaleSession,takeLocaleSession,clearLocaleSession} from './locale-session.js';
import {isEnglish,locale,setLocale} from './locale.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {applyChartBrand,applyFrameBrand} from './brand-view.js';
import '@fontsource-variable/manrope';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import './style.css';
import './motion.css';
import './library-layout.css';
import './spatial.css';
import './workflows.css';
import './entry-points.css';
const openExportPanel=async(...args)=>(await import('./export-panel.js')).openExportPanel(...args);
import { spatialViews } from './spatial-charts.js';
import { filterCatalog, facetCounts } from './library-filter.js';
import {libraryCatalog, motionFilters, motionCoverage} from './library-capabilities.js';
import {createLibraryPreviews} from './library-previews.js';
import { mountLibraryTools } from './library-tools.js';
import { captureSurface, animateSurface } from './transitions.js';
import {newWork,cleanWork,stepReport,morphReady} from './work-model.js';
import {withRecordIds} from './data-identity.js';
import {openWorkStore,unavailableWorkStore} from './work-store.js';
import {scenarioPresets,scenarioCategory} from './scenario-presets.js';
import {stepIcon,createStepScene} from './work-player.js';
import { createElement, ArrowUpRight, ArrowRight, ArrowLeft, Search, Play, Pause, RotateCcw, SlidersHorizontal, Plus, X, Check, Heart, Download, Code2, FileJson, Image, FileCode, Copy, Grid2x2, Sun, Moon, ChevronDown, BookOpen, Upload, Trash2, CircleHelp, ExternalLink, Save, CheckCircle2, ClipboardPaste, Mail } from 'lucide';
import { catalog, categories, families, findTemplate, getExample } from './catalog.js';
import { palettes, themeFor, normalizePalette } from './palettes.js';
import {mountColorEditor} from './color-editor.js';
import {agentBrief} from './data-guides.js';
import {downloadAgentTemplate} from './export.js';
import { ChartScene } from './charts.js';
import { escapeHtml as esc, fmt, summary, validateDocument, parseDataText, toCSV } from './data.js';
import { exportDocument } from './export.js';
import * as Forma from './index.js';
import './product-polish.css';
import './interaction-polish.css';
import './locale.css';

const atlasOrder=['sunburst','cohort','ledger','histogram','gantt','ecdf','bullet','funnel'];
const volume4Order=['marimekko','pareto','smallmultiples','violin','correlation','lollipop','slope','range'];
const volume5Order=['groupedbar','ribbon','heatmap','pyramid','rose','icicle','radar','trajectory'];
const volume6Order=['surface3d','scatter3d','contour','ternary','hexbin','circlepack','bars3d','donut','difference','dendrogram','trajectory3d','step'];
const volume8Order=['volcano','regression','errorbar','pca','forest','roc','enrichment','paired','manhattan','upset','blandaltman','precisionrecall','dose','confusion','ma','calibration','residual','scree','learning','metafunnel'];
for(const item of [...categories,...families,...motionFilters]){item.name=uiText(item.name);if(item.description)item.description=uiText(item.description);}
for(const p of Object.values(palettes)){p.name=uiText(p.name);p.description=uiText(p.description);}
const latestEdition=Math.max(...catalog.map(t=>t.edition));
const volume7Order=['streamgraph','bubble3d','raincloud','directedchord','stackedcolumn','network','polarline','parallelsets','horizon','lines3d','pie','edgebundle','voronoi','qqplot','survival','vectorfield','cycleplot','likert','eventline','gauge'];
const orderedCatalog=[...libraryCatalog].sort((a,b)=>b.edition-a.edition||(a.edition===8?volume8Order.indexOf(a.id)-volume8Order.indexOf(b.id):a.edition===7?volume7Order.indexOf(a.id)-volume7Order.indexOf(b.id):a.edition===6?volume6Order.indexOf(a.id)-volume6Order.indexOf(b.id):a.edition===5?volume5Order.indexOf(a.id)-volume5Order.indexOf(b.id):a.edition===4?volume4Order.indexOf(a.id)-volume4Order.indexOf(b.id):a.edition===3?atlasOrder.indexOf(a.id)-atlasOrder.indexOf(b.id):Number(a.no)-Number(b.no)));
const icons={ArrowUpRight,ArrowRight,ArrowLeft,Search,Play,Pause,RotateCcw,SlidersHorizontal,Plus,X,Check,Heart,Download,Code2,FileJson,Image,FileCode,Copy,Grid2x2,Sun,Moon,ChevronDown,BookOpen,Upload,Trash2,CircleHelp,ExternalLink,Save,CheckCircle2,ClipboardPaste,Mail};
const icon=(name,size=16)=>createElement(icons[name],{width:size,height:size,'stroke-width':1.5,'aria-hidden':'true'}).outerHTML;
const $=q=>document.querySelector(q);
function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function writeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast(uiText('浏览器存储空间不足，请导出 JSON 保存作品。'));return false;}}
const state={view:'library',goal:'all',category:'all',family:'all',edition:'all',motion:'all',query:'',palette:normalizePalette(readStore('forma.palette','ink')),playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,favorites:new Set(readStore('forma.favorites',[])),onlyFavorites:false,sidebarCollapsed:readStore('forma.library.collapsed',false)===true};
if(!palettes[state.palette])state.palette='ink';
let taskPicker=null;
let betaController=null,editorController=null,collectionController=null,pendingEditorPaste=false,pendingEditorHelp=false,pendingWork=null;
let previews=null,galleryStart=performance.now(),frozenTime=8,modal=null,modalScene=null,studioColorController=null,lastTime=performance.now(),prevRoute='',gridToken=0,toastTimer, motionController=null, surfaceCancel=null, studioReturnTarget=null;
const logo=`<svg class="forma-mark" viewBox="0 0 28 28" aria-hidden="true"><path d="M3 24V4h4v20M11 24V4h4v20M19 16V4h4v12" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M1 10h24M1 17h16" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;

document.querySelector('#app').innerHTML=uiMarkup`
<a class="skip-link" href="#main">跳到主要内容</a>
<header class="topbar"><a class="brand" href="#library" aria-label="FORMA 数相，返回图表库">${logo}<span>FORMA<span class="brand-cn">数相</span></span></a><nav aria-label="主导航"><a href="#start" data-view="start">开始</a><a href="#library" data-view="library" class="active">图表库<span class="nav-dot"></span></a><a href="#editor" data-view="editor" data-action="editor-view">作品编辑器</a><a href="#motion" data-view="motion">变形预览</a><a href="#saved" data-view="saved">我的作品</a><a href="#guide" data-view="guide">使用指南</a></nav><div class="topbar-utilities"><a class="topbar-feedback" href="#feedback" aria-label="反馈使用问题" title="反馈使用问题">${icon('Mail',18)}</a><div class="language-control" role="group" aria-label="Language / 语言"><button type="button" data-locale="zh-CN" lang="zh-CN" aria-pressed="${!isEnglish()}">中文</button><button type="button" data-locale="en" lang="en" aria-pressed="${isEnglish()}">EN</button></div></div></header>
<main id="main" class="shell" tabindex="-1"></main>
<footer class="site-footer"><a class="brand small-brand" href="#library">${logo}<span>FORMA / 数相</span></a><a class="beta-footer-link" href="#feedback">反馈</a><span class="mono">MADE TO MAKE SENSE. &nbsp; © 2026</span></footer>
<dialog id="studio" aria-labelledby="studio-title"></dialog><div id="toast" role="status" aria-live="polite"></div>`;

document.documentElement.lang=locale();
document.title=isEnglish()?'FORMA — Animated data studio':'FORMA 数相 — 动态图表工作室';
const pageDescription=document.querySelector('meta[name="description"]');if(pageDescription)pageDescription.content=isEnglish()?'Create editable charts and animated data stories. Import spreadsheets, customize your design and export images, interactive HTML or video.':'制作可编辑图表和动态图表作品，导入表格、调整配色，导出图片、互动网页与视频。';
let changingLanguage=false,localeResume=null;
try{localeResume=await takeLocaleSession();}catch(error){toast(uiText('编辑现场暂未恢复，已保留保存的数据。'));}
document.querySelector('.language-control').addEventListener('pointerdown',event=>{if(event.target.closest('button'))event.preventDefault();});
document.querySelector('.language-control').addEventListener('click',async event=>{
  const button=event.target.closest('[data-locale]');if(!button||button.dataset.locale===locale()||changingLanguage)return;
  changingLanguage=true;$('#main').inert=true;document.querySelectorAll('dialog[open]').forEach(d=>d.inert=true);document.querySelectorAll('[data-locale]').forEach(b=>b.disabled=true);
  try{
    // Commit the active input before saving. An invalid table draft is still
    // persisted as a draft; switching languages never repairs or discards it.
    editorController?.prepareLocale?.();document.activeElement?.blur();
    if(editorController&&!await editorController.flush())throw Error(isEnglish()?'Save failed. Download a backup before switching languages.':'保存未完成，请重试或备份后切换语言。');
    await saveLocaleSession({hash:location.hash,scroll:scrollY,filters:{category:state.category,family:state.family,motion:state.motion,query:state.query,onlyFavorites:state.onlyFavorites},editor:editorController?.captureSession()});
    setLocale(button.dataset.locale);const url=new URL(location.href);url.searchParams.delete('lang');history.replaceState(null,'',url);location.reload();
  }catch(error){toast(error.message);changingLanguage=false;$('#main').inert=false;document.querySelectorAll('dialog[open]').forEach(d=>d.inert=false);document.querySelectorAll('[data-locale]').forEach(b=>b.disabled=false);}
});
if(localeResume?.hash===location.hash){Object.assign(state,localeResume.filters);const returnScroll=localeResume.scroll||0;setTimeout(()=>scrollTo(0,returnScroll),700);if(!localeResume.editor){localeResume=null;try{await clearLocaleSession();}catch{}}}

const libraryTools=mountLibraryTools({
  toast,
  onEdit(items){if(items.length>20){toast(uiText('一个作品最多 20 步，请减少本次选择。'));return;}pendingWork=newWork(items,items.length>1?uiText('我的组合'):items[0].doc.title);enterEditor();},
  getContext(el){
    if(el.dataset.scope==='studio'&&modal)return {doc:modal.doc,options:modal.options,savedId:modal.selectionOrigin};
    const item=savedItem(el.dataset.saved),t=findTemplate(el.dataset.id);
    if(!t)throw new Error(uiText('找不到这张图表。'));
    return item?{doc:item.doc,options:item.options,savedId:item.id}:{doc:getExample(t.id),options:{palette:state.palette,dark:!!t.dark,ratio:'wide',duration:8}};
  },
  onOpen(item){
    const savedId=item.key.startsWith('saved:')?item.key.slice(6):undefined;
    openStudio(item.doc.template,savedId,{doc:item.doc,options:item.options});
    history.replaceState(null,'',`#chart/${item.doc.template}`);
  }
});

function toast(message){const el=$('#toast');const top=[...document.querySelectorAll('dialog[open]')].at(-1);(top||document.querySelector('#app')).append(el);el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3400);}
function destroyPreviews(){++gridToken;previews?.destroy();previews=null;}
function setPaletteCSS(){const p=palettes[state.palette];document.documentElement.style.setProperty('--accent',p.accent);document.documentElement.style.setProperty('--accent-light',p.tint);}
function paletteButtons(current,action='palette'){
  return Object.entries(palettes).map(([id,p])=>uiMarkup`<button class="palette-button ${id===current?'selected':''}" data-action="${action}" data-id="${id}" aria-label="${uiText(p.name)}色谱" aria-pressed="${id===current}"><span class="swatches">${p.colors.map(c=>`<i style="background:${c}"></i>`).join('')}</span><span>${uiText(p.name)}</span>${id===current?icon('Check',12):''}</button>`).join('');
}
let workStore,routeEpoch=0;

async function renderView(){
  if(!workStore)return;
  const epoch=++routeEpoch;
  const saved=!editorController||await editorController.flush();
  if(epoch!==routeEpoch)return;
  if(!saved){state.view='editor';history.replaceState(null,'','#editor');toast(uiText('修改尚未保存，请先重试或下载当前备份。'));return;}
  taskPicker?.destroy();taskPicker=null;betaController?.destroy();betaController=null;editorController?.destroy();editorController=null;collectionController?.destroy();collectionController=null;$('#main').classList.toggle('is-editor',state.view==='editor');$('#main').classList.toggle('is-canvas',state.view==='motion');
  $('#main').classList.toggle('is-library',state.view==='library');libraryTools.closeMenus();motionController?.destroy();motionController=null;destroyPreviews();document.querySelectorAll('[data-view]').forEach(a=>{a.classList.toggle('active',a.dataset.view===(state.view==='design'?'guide':state.view));if(a.dataset.view===(state.view==='design'?'guide':state.view))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(state.view==='start'||state.view==='feedback')renderBetaPage(epoch).catch(routeError);else if(state.view==='library')renderLibrary();else if(state.view==='editor')renderDataWorkspace(epoch).catch(routeError);else if(state.view==='motion')renderMotionPage(epoch).catch(routeError);else if(state.view==='saved')renderSaved(epoch).catch(routeError);else if(state.view==='design')renderDesign();else renderGuide();
}
function sidebarHTML(){
  const facet=(items,field)=>items.map(c=>`<button data-action="${field}" data-id="${c.id}" aria-pressed="${state[field]===c.id}" class="${state[field]===c.id?'active':''}" ${c.description?`title="${esc(c.description)}"`:''}><span>${uiText(c.name)}</span><span class="mono" data-${field}-count="${c.id}"></span></button>`).join('');
  return uiMarkup`<details class="library-sidebar" id="library-filters" ${matchMedia('(min-width:901px)').matches&&!state.sidebarCollapsed?'open':''}><summary title="展开或收起分类筛选">${icon('SlidersHorizontal',17)}<span>分类筛选</span><span id="filter-summary"></span>${icon('ChevronDown',13)}</summary><div class="library-sidebar-content">
    <div class="sidebar-section-label">按动效</div><div class="sidebar-motion" role="group" aria-label="动画方式">${facet(motionFilters,'motion')}</div>
    <div class="sidebar-divider"></div><details class="sidebar-purpose" ${state.category!=='all'?'open':''}><summary>按用途${icon('ChevronDown',13)}</summary><div class="sidebar-categories" role="group" aria-label="图表用途">${facet(categories,'category')}</div></details>
    <div class="sidebar-divider"></div><div class="sidebar-heading"><span>按图型</span></div><div class="sidebar-families" role="group" aria-label="图型分类">${facet(families,'family')}</div>
    <div class="sidebar-divider"></div><button class="sidebar-favorites ${state.onlyFavorites?'active':''}" data-action="favorites" aria-pressed="${state.onlyFavorites}" aria-label="只看收藏">${icon('Heart',14)}<span>我的收藏</span><span class="mono">${state.favorites.size}</span></button>
  </div></details>`;
}
function updateLibraryFilters(){
  if(!location.hash||/^#library(?:\/|$)/.test(location.hash))history.replaceState(null,'',state.motion==='all'?'#library':`#library/${state.motion}`);
  for(const field of ['category','family','motion']){
    const counts=facetCounts(libraryCatalog,state,field);
    document.querySelectorAll(`[data-${field}-count]`).forEach(el=>el.textContent=counts[el.getAttribute(`data-${field}-count`)]||0);
    document.querySelectorAll(`[data-action="${field}"]`).forEach(el=>{const pressed=el.dataset.id===state[field];el.classList.toggle('active',pressed);el.setAttribute('aria-pressed',String(pressed));});
  }
  const fav=$('.sidebar-favorites');if(fav){fav.classList.toggle('active',state.onlyFavorites);fav.setAttribute('aria-pressed',String(state.onlyFavorites));fav.querySelector('.mono').textContent=state.favorites.size;}
  const name=categories.find(c=>c.id===state.category)?.name||uiText('全部图表');
  const familyName=families.find(f=>f.id===state.family)?.name||uiText('全部图型');
  const motionName=motionFilters.find(f=>f.id===state.motion)?.name||'';
  $('#library-heading').textContent=state.onlyFavorites?uiText('收藏图表'):state.family!=='all'?familyName:state.category!=='all'?name:state.motion!=='all'?uiMessage`${uiText(motionName)}图表`:uiText('全部图表');
  $('.library-caption').textContent=state.motion==='morph'?uiText('选择兼容图型，沿用同组数据组成连续变形作品。'):state.motion==='entrance'?uiText('保留图表自身入场动画，也可编排进多步作品。'):uiMessage`${motionCoverage.templates} 个图表模板 · ${motionCoverage.morph} 个已接入连续变形`;
  const selected=[state.motion!=='all'?motionName:'',state.family!=='all'?familyName:'',state.category!=='all'?name:'',state.edition!=='all'?uiText('本次新增'):'',state.onlyFavorites?uiText('收藏'):''];
  $('#filter-summary').textContent=selected.filter(Boolean).join(' · ');
  $('#active-filter-note').textContent=[...selected,state.query?uiMessage`搜索「${state.query}」`:''].filter(Boolean).join(' / ')||uiText('全部图型');
  $('#clear-library-filters').hidden=state.goal==='all'&&state.category==='all'&&state.family==='all'&&state.edition==='all'&&state.motion==='all'&&!state.onlyFavorites&&!state.query;
}
function renderLibrary(){
  $('#main').classList.add('is-library');
  $('#main').innerHTML=uiMarkup`<div class="library-layout">${sidebarHTML()}<div class="library-workspace"><header class="library-heading" id="collection"><div><p class="eyebrow">FORMA / CHART LIBRARY</p><h1 id="library-heading">全部图表</h1><p class="library-caption">${catalog.length} 个图表模板 <span>·</span> 支持数据编辑与动态导出</p></div></header><section class="task-picker" data-library-tasks></section><section class="library-toolbar" aria-label="图表筛选"><div class="library-search-row"><label class="search-box">${icon('Search',15)}<input id="chart-search" placeholder="搜索图型、用途或编号" aria-label="搜索图表" value="${esc(state.query)}"><span>/</span></label><span class="library-shortcut"><a href="#motion">变形预览 ${icon('ArrowUpRight',13)}</a></span></div><div class="appearance-row"><div class="palette-picker"><span class="control-label">色谱</span>${paletteButtons(state.palette)}</div><button data-action="gallery-play" class="text-button" id="gallery-play">${icon(state.playing?'Pause':'Play',13)}<span>${state.playing?uiText('静态看图'):uiText('播放动效')}</span></button></div><div class="library-results"><span><span id="result-count" class="mono" role="status" aria-live="polite"></span><span id="active-filter-note"></span></span><button id="clear-library-filters" class="text-button" data-action="reset-filters">${icon('X',11)}清除筛选</button></div></section><section id="chart-grid" class="chart-grid" aria-label="动态图表作品集"></section><div class="collection-end"><span class="mono">FORMA / ${catalog.length} CHART TEMPLATES</span></div></div></div>`;
  taskPicker=mountTaskPicker($('[data-library-tasks]'),{initialGoal:state.goal,onGoal(goal){state.goal=goal;renderGrid();},onUse(doc){pendingWork=newWork([{doc,options:{palette:state.palette}}]);enterEditor();}});
  const filters=$('#library-filters');filters.addEventListener('toggle',()=>{if(matchMedia('(min-width:901px)').matches){state.sidebarCollapsed=!filters.open;writeStore('forma.library.collapsed',state.sidebarCollapsed);}filters.querySelector('summary').title=filters.open?uiText('收起分类筛选'):uiText('展开分类筛选');});
  renderGrid();
}

function savedItem(id){const record=id&&workStore?.peek(id);if(!record||record.work.steps.length!==1)return;return {id,...record.work.steps[0],updated:record.work.updated,revision:record.revision,record};}
const editorKey=(id,savedId)=>savedId?`saved:${savedId}`:`template:${id}`;
function syncEditorEntries(){
  document.querySelectorAll('[data-action="add-editor"]').forEach(button=>{const added=workStore?.has(button.dataset.saved||`record:${editorKey(button.dataset.id)}`);button.classList.toggle('in-editor',!!added);button.innerHTML=`${icon(added?'Check':'Grid2x2',14)}<span>${added?uiText('进入作品编辑器'):uiText('加入编辑器')}</span>`;button.setAttribute('aria-label',added?uiMessage`编辑${findTemplate(button.dataset.id).name}数据`:uiMessage`将${findTemplate(button.dataset.id).name}加入编辑器`);});
}
async function addEditorChart(doc,options={},savedId,{fresh=false}={}){
  const id=fresh?crypto.randomUUID():savedId||`record:${editorKey(doc.template)}`;
  try{const existing=await workStore.get(id),work=existing?.work||{...newWork([{doc,options:{palette:state.palette,...options}}],doc.title.slice(0,80)),id};if(!existing)await workStore.save(work);pendingWork=work;syncEditorEntries();return work;}
  catch(error){toast(error.message);return null;}
}
async function enterEditor(){if(modal&&!await closeStudio())return;if(location.hash==='#editor'){state.view='editor';renderView();}else location.hash='editor';}
async function editCurrentInWorkspace(paste){
  if(!modal)return;if(modal.draftDirty){toast(uiText('请先应用工作台中的数据草稿。'));return;}
  const existing=savedItem(modal.savedId);
  const fresh=!!existing&&(JSON.stringify(existing.doc)!==JSON.stringify(modal.doc)||JSON.stringify(existing.options)!==JSON.stringify(modal.options));
  if(await addEditorChart(modal.doc,modal.options,modal.savedId,{fresh})){pendingEditorPaste=paste;enterEditor();}
}
function workspaceSources(){return [...libraryTools.getSelection().map(r=>({...r,group:uiText('已选清单')})),...(workStore?.summaries?.()||[]).flatMap(w=>w.steps.map(s=>({view:s.view,doc:{template:s.template,title:s.title,data:[]},rows:s.rows,group:w.name,async load(){const record=await workStore.get(w.id),step=record?.work.steps.find(r=>r.id===s.id);if(!step)throw Error(uiText('找不到这张图表。'));if(!stepReport(step).valid)throw Error(stepReport(step).reason||uiText('数据尚未完成，请先回到原作品修正。'));return step;}})))];}
function routeError(error){toast(error.message||uiText('页面组件未能加载，请刷新后重试。'));}
const hasLocalWorks=()=>!!(workStore.current()||workStore.summaries?.().length);
async function renderBetaPage(epoch){
  $('#main').innerHTML=uiText('<p class="route-loading" role="status">正在打开…</p>');
  if(state.view==='feedback'){const {mountBetaFeedback}=await import('./beta-feedback.js');if(epoch!==routeEpoch)return;betaController=mountBetaFeedback($('#main'),{toast});return;}
  const {mountBetaStart}=await import('./beta-start.js');if(epoch!==routeEpoch)return;
  betaController=mountBetaStart($('#main'),{selected:location.hash.split('/')[1],hasWorks:hasLocalWorks(),onUse(work,{importData=false}={}){pendingWork=cleanWork(work);pendingEditorPaste=importData;enterEditor();}});
}
async function renderDataWorkspace(epoch){
  $('#main').innerHTML=uiText('<p class="route-loading" role="status">正在打开作品编辑器…</p>');
  const {mountWorkEditor}=await import('./work-editor.js');if(epoch!==routeEpoch)return;
  const initial=pendingWork;pendingWork=null;
  editorController=mountWorkEditor($('#main'),{initial,palette:state.palette,toast,getSources:workspaceSources,repository:workStore});
  recordUsage('editor');
  if(initial?.steps[0]?.doc.provenance?.origin==='public'){
    const tip=document.createElement('aside');tip.className='beta-editor-tip';tip.innerHTML=uiMarkup`<p>先替换当前步骤的表格，再用「同步数据」更新关联步骤。完成后点击「预览」检查整段，最后保存并导出。</p><button type="button" aria-label="关闭制作提示">×</button>`;tip.querySelector('button').onclick=()=>tip.remove();$('#main .we-header')?.after(tip);
  }
  if(localeResume?.editor&&localeResume.hash==='#editor'){const resume=localeResume.editor;localeResume=null;try{await editorController.restoreSession(resume);await clearLocaleSession();}catch(error){toast(error.message);}}
  if(pendingEditorPaste){pendingEditorPaste=false;editorController.openImport();}
  if(pendingEditorHelp){pendingEditorHelp=false;editorController.openHelp('agent');}
}
async function renderMotionPage(epoch){
  $('#main').innerHTML=uiText('<p class="route-loading" role="status">正在打开变形预览…</p>');
  const {mountMotionGallery}=await import('./motion-gallery.js');if(epoch!==routeEpoch)return;
  motionController=mountMotionGallery($('#main'),{palette:state.palette,onUse(work){pendingWork=cleanWork(work);enterEditor();}});
}
function renderGrid(){
  libraryTools.closeMenus();
  const previous=new Map([...document.querySelectorAll('#chart-grid [data-card]')].map(el=>[el.dataset.card,el.getBoundingClientRect()]));
  destroyPreviews();const token=gridToken;
  const list=filterCatalog(orderedCatalog,state);
  const filtered=state.goal!=='all'||state.category!=='all'||state.family!=='all'||state.edition!=='all'||state.motion!=='all'||state.query.trim()||state.onlyFavorites;
  $('#result-count').textContent=uiMessage`${list.length} 个图表`;
  updateLibraryFilters();
  const grid=$('#chart-grid');grid.classList.toggle('filtered',!!filtered);
  if(!list.length){grid.innerHTML=uiMarkup`<div class="empty-state">${icon('Search',32)}<h2>${state.onlyFavorites&&!state.favorites.size?uiText('还没有收藏的图表'):uiText('没有找到匹配的图表')}</h2><p>当前筛选组合下没有结果，可以清除筛选，重新挑选。</p><button class="button" data-action="reset-filters">查看全部图表 ${icon('ArrowRight',15)}</button></div>`;return;}
  const documents=new Map(list.map(t=>[t.id,getExample(t.id)]));
  grid.innerHTML=list.map(t=>cardHTML(t,documents.get(t.id),!filtered&&t.featured)).join('');syncEditorEntries();
  if(previous.size&&!matchMedia('(prefers-reduced-motion: reduce)').matches){for(const card of grid.children){const before=previous.get(card.dataset.card),after=card.getBoundingClientRect();if(after.bottom<0||after.top>innerHeight)continue;card.animate([{opacity:before?1:0,transform:before?`translate(${before.left-after.left}px,${before.top-after.top}px)`:'translateY(12px)'},{opacity:1,transform:'translate(0,0)'}],{duration:520,easing:'cubic-bezier(.22,1,.36,1)'});}}
  requestAnimationFrame(()=>{if(token!==gridToken||!grid.isConnected)return;for(const t of list){const host=grid.querySelector(`[data-preview="${t.id}"]`);if(!host)continue;addPreview(host,documents.get(t.id),{palette:state.palette,dark:!!t.dark,compact:!(!filtered&&t.featured)});} });
}
function cardHTML(t,doc,featured=false,savedId){
  const theme=themeFor(state.palette,!!t.dark),metric=featured&&t.id!=='sunburst'?summary(doc):null;const title=t.name,canMorph=savedId?morphReady({doc}):t.motion==='morph';
  return uiMarkup`<article class="chart-card ${featured?'featured':''} ${['orbit','fan'].includes(t.id)?'orbit-card':''} ${t.dark?'dark-card':''}" style="--card-bg:${theme.bg};--card-fg:${theme.fg};--card-muted:${theme.secondary};--card-line:${theme.line}" data-card="${t.id}"><header class="card-header"><div><div class="card-eyebrow"><span class="mono">${t.no}</span><span>${esc(t.en)}</span></div><button class="card-title-button" data-action="open" data-id="${t.id}" ${savedId?`data-saved="${savedId}"`:''}><h2>${esc(savedId?doc.title:title)}</h2></button><p class="card-description">${esc(savedId?t.type:`${doc.title} · ${doc.unit}`)}</p></div><div class="card-actions">${libraryTools.buttonsHTML(doc,savedId,'card')}<button class="icon-button favorite-button ${state.favorites.has(t.id)?'hearted':''}" data-action="favorite" data-id="${t.id}" aria-pressed="${state.favorites.has(t.id)}" aria-label="${esc(state.favorites.has(t.id)?uiMessage`取消收藏${t.name}`:uiMessage`收藏${t.name}`)}" title="收藏${t.name}">${icon('Heart',16)}</button></div></header>
  ${featured&&t.id!=='sunburst'?`<div class="featured-metric"><span class="metric-value">${metric.value}<small>${esc(metric.unit)}</small></span><span class="metric-label"><span class="live-dot"></span>${esc(metric.label)}</span><span class="feature-caption">${esc(t.type)}<br><em>FORM / ${t.no}</em></span></div>`:''}
  <div class="chart-preview" data-preview="${savedId||t.id}" data-action="open" data-id="${t.id}" ${savedId?`data-saved="${savedId}"`:''} role="button" tabindex="0" aria-label="打开${esc(t.name)}工作台"></div>
  <footer class="card-footer">${canMorph?uiMarkup`<span class="card-motion-label" title="已接入连续变形，具体组合取决于数据与图型适用性。">${icon('ArrowRight',12)}可连续变形</span>`:''}<div class="card-use-actions"><button class="card-export" data-action="open-export" data-id="${t.id}" ${savedId?`data-saved="${savedId}"`:''} aria-label="导出${esc(t.name)}">${icon('Download',14)}<span>导出</span></button><button class="card-edit" data-action="add-editor" data-id="${t.id}" ${savedId?`data-saved="${savedId}"`:''} aria-label="将${esc(t.name)}加入编辑器">${icon('Grid2x2',14)}<span>加入编辑器</span></button></div></footer></article>`;
}
function addPreview(host,doc,options){
  previews??=createLibraryPreviews({createScene:(target,data,settings)=>new ChartScene(target,data,{...settings,compact:target.clientWidth<550,progress:1}),currentProgress:()=>state.playing?Math.min(1,((performance.now()-galleryStart)/1000%11)/8):1});
  previews.add(host,doc,options);
}


async function renderSaved(epoch=routeEpoch){
  destroyPreviews();const {mountWorkCollection}=await import('./work-collection.js');if(epoch!==routeEpoch||state.view!=='saved')return;
  collectionController?.destroy();collectionController=mountWorkCollection($('#main'),{repository:workStore,toast,async onOpen(id){pendingWork=(await workStore.get(id))?.work;if(pendingWork)enterEditor();}});
}
function renderDesign(){
  $('#main').innerHTML=uiMarkup`<section class="page-intro"><p class="eyebrow">THE FORMA LANGUAGE</p><h1>配色与图形规范</h1><p>中性底色、细密结构、克制的强调色，以及有始有终的动作。</p></section>
  <section class="design-statement"><span class="section-number">01 / COLOR</span><div><h2>官方色谱与自定义配色</h2><p>六套色谱共用纸白与中性炭黑。墨与朱、群青、朱砂适合突出重点，银版用灰阶建立层次，陶墨和雾紫提供柔和的分类配色。编辑时可自定义 1–12 种颜色，按图型映射类别、系列或数值层次。位置、面积与比例不因换色而改变。</p></div></section>
  <section class="palette-specs">${Object.entries(palettes).map(([id,p])=>uiMarkup`<article class="palette-spec" style="background:${p.paper}"><div><h3>${uiText(p.name)}<em>${p.en}</em></h3><p>${uiText(p.description)}</p></div><div class="large-swatches">${p.colors.map(c=>uiMarkup`<button style="background:${c};color:${parseInt(c.slice(1,3),16)>145?'#262626':'#fff'}" data-action="copy-color" data-id="${c}" aria-label="复制颜色 ${c}"><span>${c.toUpperCase()}</span></button>`).join('')}</div><button class="text-button" data-action="use-palette" data-id="${id}">用这套色谱浏览 ${icon('ArrowUpRight',15)}</button></article>`).join('')}</section>
  <section class="design-statement"><span class="section-number">02 / MOTION</span><div><h2>动效与时间轴</h2><p>线条沿时间展开，流带沿去向延伸，比例按数据生长。单张图默认有 8 秒的入场演绎；作品编辑器可以把独立图表编排成连续展示。确认对应关系、单位和统计口径一致的数据，可在所属组的兼容图型之间连续变形，独立内容切换时播放新图自身的生长、描线或展开动画。数值按每一步的真实数据重新计算。按图型推荐过渡，也可以自选效果和速度，完成后停留阅读；静态导出呈现最终完整数据。</p></div></section>
  <div class="motion-score"><span class="mono">0.0s</span><div><i style="flex:1">建立坐标</i><i style="flex:5">数据展开</i><i style="flex:2">停留阅读</i></div><span class="mono">8.0s</span></div>
  <section class="design-statement"><span class="section-number">03 / INTEGRITY</span><div><h2>数据表达规则</h2><div class="integrity-grid"><p><strong>不填造缺失</strong>缺失保持缺失，零值保持零值。折线留断点，日历用纹理区分。</p><p><strong>不夸大比例</strong>柱长以零为基线，气泡按面积缩放，百分比核对总和。</p><p><strong>不藏起口径</strong>标题、单位、来源一起进入导出。原始数据可查看、可编辑、可复核。</p></div></div></section>
  ${referencesHTML()}`;
  const content=$('#main').innerHTML;$('#main').innerHTML=uiMarkup`<div class="guide-layout guide-design-layout"><nav class="guide-nav" aria-label="指南目录"><span>使用指南</span><a class="guide-color-link" href="#guide">${icon('ArrowLeft',13)}返回使用指南</a><a class="guide-color-link" href="#design" aria-current="page">配色与规范</a></nav><div class="guide-design-content">${content}</div></div>`;
}
const references=[
  ['Apache ECharts',uiText('自定义图形与数据过渡'),uiText('学习数据驱动的图元与差异过渡，形态按数据结构选择。'),'https://echarts.apache.org/examples/zh/index.html#chart-type-custom'],
  ['Lieflat Charts',uiText('编辑式数据语言'),uiText('学习图表与标题、留白、单位和旁注的一体化表达。独立编写 FORMA 的视觉样式与代码。'),'https://github.com/larashero3-dotcom/lieflat-charts'],
  ['Observable / D3',uiText('可追踪的动态叙事'),uiText('学习对象在动画中的连续性，以及排名、流向与时间的组织。'),'https://observablehq.com/blog/effective-animation'],
  ['Datawrapper',uiText('清晰的编辑路径'),uiText('参考数据检查、图表调整与导出的任务划分，以及直接编辑单元格的方式。'),'https://www.datawrapper.de/academy/how-to-create-your-first-datawrapper-chart'],
  ['Flourish',uiText('数据与预览的协同'),uiText('参考图表预览、数据字段与上下文帮助的组织。'),'https://helpcenter.flourish.studio/hc/en-us/articles/8761537173263-Creating-a-visualization'],
  ['Nivo',uiText('完整的图形家族'),uiText('学习复杂图型的展示密度与可交互参数的组织。'),'https://nivo.rocks/'],
  ['Unovis',uiText('语义清晰的交互'),uiText('学习关系图、注释、缺失数据与轻量交互的表达。'),'https://unovis.dev/gallery/'],
  ['Video Shotcraft',uiText('对象连续，动作有来由'),uiText('学习共享元素的展开与回位，以及按用途整理、复制配方的交互。'),'https://vincentwei1021.github.io/video-shotcraft/library.html'],
  ['Observable Plot',uiText('等值线与统计图形'),uiText('学习在密度与分布图中保留采样、范围及插值口径。'),'https://observablehq.com/@observablehq/plot-gallery'],
  ['AntV G2',uiText('图元的连续变形'),uiText('学习通过对象身份连接两种布局，保留类别颜色与原值。'),'https://g2.antv.antgroup.com/en/manual/core/animate/morphing'],
  ['ECharts GL',uiText('三维数据图型'),uiText('参考三维散点、柱图与曲面的坐标组织。FORMA 使用正交视角，可旋转并导出矢量。'),'https://github.com/ecomfe/echarts-gl'],
  ['Vega',uiText('可组合的图表语法'),uiText('参考层级布局、面积、坐标与注释的组织方式。'),'https://vega.github.io/vega/examples/'],
  ['3D Force Graph',uiText('空间中的关系图'),uiText('参考空间定位、相机与交互方式，作为后续关系图扩展的研究。'),'https://github.com/vasturiano/3d-force-graph'],
  ['scikit-learn',uiText('模型评估的统计定义'),uiText('参考 ROC、精确率—召回率与概率校准的计算口径，保留同分阈值和空分箱。'),'https://scikit-learn.org/stable/modules/model_evaluation.html'],
  ['Bioconductor / DESeq2',uiText('差异分析与主成分图'),uiText('参考组学结果的坐标、校正 p 值和解释方差表达。图表接收已完成分析的结果。'),'https://bioconductor.org/packages/release/bioc/vignettes/DESeq2/inst/doc/DESeq2.html'],
  ['UpSet',uiText('可核对的集合交集'),uiText('参考交集柱与集合点阵的对齐，每个元素只属于一个排他交集。'),'https://upset.app/'],
  ['Visual Cinnamon',uiText('数据成为作品'),uiText('学习径向布局与密集关系的构图，用细节建立整体的美感。'),'https://www.visualcinnamon.com/portfolio/']
];
function referencesHTML(){return uiMarkup`<section class="references-section"><div class="references-heading"><span class="section-number">REFERENCE NOTES</span><h2>参考图库</h2></div><div class="reference-grid">${references.map(([name,label,desc,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer" class="reference-link"><div><span>${name}</span>${icon('ArrowUpRight',17)}</div><h3>${label}</h3><p>${desc}</p></a>`).join('')}</div></section>`;}
function renderGuide(){
  $('#main').innerHTML=guidePage()+uiMarkup`
  <details class="guide-developer"><summary>开发者调用与模板目录</summary><section class="guide-api"><div><span class="section-number">PROGRAMMATIC API</span><h2>在代码中调用图表</h2><p>本地模块：<code>src/forma/index.js</code><br>模板目录：<a href="/forma/catalog.json" target="_blank">catalog.json ${icon('ExternalLink',12)}</a><br>示例数据：<a href="/forma/examples/tide.json" target="_blank">tide.json ${icon('ExternalLink',12)}</a></p></div><pre><code>${esc(uiMessage`import { createChart, getExample, validateDocument }\n  from './src/forma/index.js';\n\nconst doc = getExample('tide');\nconst report = validateDocument(doc);\nif (!report.valid) throw Error(report.errors.join('\\n'));\n\nconst chart = createChart(container, doc, {\n  palette: 'ink', dark: false\n});\nchart.render(0.6); // 固定时间轴的一帧\n// 调整尺寸后重建；移除时调用 chart.destroy()` )}</code></pre></section>
  <section class="catalog-table"><div><span class="section-number">TEMPLATE DIRECTORY</span><h2>${catalog.length} 个模板编号</h2></div><div class="table-scroll"><table><thead><tr><th>模板 ID</th><th>图型</th><th>适用内容</th><th>数据结构</th><th></th></tr></thead><tbody>${catalog.map(t=>uiMarkup`<tr><td class="mono">${t.id}</td><td>${t.name} / ${t.type}</td><td>${t.use}</td><td><code>${t.fields.map(f=>f[0]).join(', ')}</code></td><td><button class="icon-button" data-action="open" data-id="${t.id}" aria-label="打开${t.name}">${icon('ArrowUpRight',16)}</button></td></tr>`).join('')}</tbody></table></div></section></details>`;
}

function openStudio(id,savedId,snapshotDoc){
  const template=findTemplate(id);if(!template)return;
  libraryTools.closeMenus();surfaceCancel?.();surfaceCancel=null;
  const entering=!$('#studio').open;
  const preview=[...document.querySelectorAll('[data-preview]')].find(el=>el.dataset.preview===(savedId||id));
  const surface=entering&&!snapshotDoc?captureSurface(preview):null;
  studioReturnTarget=preview||null;
  const saved=savedItem(savedId);const doc=withRecordIds(snapshotDoc?.doc||saved?.doc||getExample(id));
  modal={doc,template,savedId:saved?.id,workRecord:saved?.record,selectionOrigin:savedId,options:{palette:state.palette,dark:!!template.dark,ratio:matchMedia('(max-width:760px)').matches?'portrait':'wide',duration:8,...saved?.options,...snapshotDoc?.options},tab:'style',format:'json',p:matchMedia('(prefers-reduced-motion: reduce)').matches?1:0,playing:!surface&&!matchMedia('(prefers-reduced-motion: reduce)').matches,last:performance.now(),draft:JSON.stringify(doc.data,null,2),validation:validateDocument(doc),dirty:false};
  modal.options.palette=normalizePalette(modal.options.palette);
  modalScene?.destroy();modalScene=null;
  const dialog=$('#studio');
  if(dialog.contains($('#toast')))document.querySelector('#app').append($('#toast'));
  dialog.innerHTML=uiMarkup`<header class="studio-header"><button class="text-button back-button" data-action="close" aria-label="返回图表库">${icon('ArrowLeft',17)}<span>图表库</span></button><span class="studio-breadcrumb">/</span><h2 id="studio-title">${esc(template.name)}${template.name===template.en?'':`<span>${esc(template.en)}</span>`}</h2><div class="studio-actions">${libraryTools.buttonsHTML(doc,modal.selectionOrigin,'studio')}<button class="button small" data-action="save" aria-label="保存图表" title="保存图表">${icon('Save',15)}<span>保存图表</span></button><button class="button dark small" data-action="export" aria-label="导出图片或视频" title="导出图片或视频">${icon('Download',15)}导出</button><button class="icon-button studio-close" data-action="close" aria-label="关闭工作台">${icon('X',19)}</button></div></header>
  <div class="studio-workflowbar" aria-label="图表编辑操作"><div class="studio-data-actions"><button class="button small studio-join-editor" data-action="add-current-editor">${icon('Grid2x2',15)}编辑数据</button><button class="button small" data-action="paste-table">${icon('ClipboardPaste',15)}导入表格</button><button class="text-button" data-action="studio-settings">${icon('SlidersHorizontal',15)}样式与动效</button></div><span>填写数据 → 调整样式 → 导出</span></div><div class="studio-body"><section class="studio-left"><div class="stage-topline"><div class="studio-pager"><button class="icon-button" data-action="previous-chart" aria-label="上一张图表">${icon('ArrowLeft',13)}</button><span class="mono">${template.no} / ${catalog.length}</span><button class="icon-button" data-action="next-chart" aria-label="下一张图表">${icon('ArrowRight',13)}</button></div><span id="stage-size">16 : 10</span><span class="data-badge" id="data-badge">${doc.source.type==='demo'?uiText('演示数据'):uiText('我的数据')}</span></div>${template.dimension==='3d'?spatialToolbar():''}<div class="stage" id="stage"><article class="artboard" id="artboard"><header class="artboard-header"><p class="artboard-eyebrow mono">FORMA / ${template.no} · ${esc(template.en.toUpperCase())}</p><h3 id="artboard-title">${esc(doc.title)}</h3><p id="artboard-subtitle">${esc(doc.subtitle)}<span> · 单位：${esc(doc.unit)}</span></p></header><div id="studio-chart" class="studio-chart"></div><footer class="artboard-footer"><span id="artboard-source">${esc(doc.source.name)}</span><span>数相 / FORMA</span></footer></article></div><div class="playback"><button class="play-button" data-action="play" id="studio-play" aria-label="暂停动画">${icon(modal.playing?'Pause':'Play',16)}</button><button class="icon-button" data-action="replay" aria-label="重播动画">${icon('RotateCcw',16)}</button><span id="play-time" class="mono">00.0</span><input id="timeline" type="range" min="0" max="1000" value="0" step="1" aria-label="动画时间轴"><span id="play-duration" class="mono">08.0s</span><span class="playback-tag">${icon('SlidersHorizontal',13)}<span>每一帧，都由数据绘制</span></span></div><div class="stage-note"><span>${icon('CircleHelp',13)}${esc(template.motion)}</span><button class="text-button" data-action="show-table">查看原始数据 ${icon('ArrowUpRight',13)}</button></div></section><aside class="studio-sidebar"><div class="sidebar-tabs" role="tablist" aria-label="工作台设置">${[['style',uiText('样式')],['data',uiText('数据表')],['code',uiText('调用')]].map(([id,label])=>`<button role="tab" data-action="studio-tab" data-id="${id}" aria-selected="${id==='style'}">${label}</button>`).join('')}</div><div id="sidebar-content"></div></aside></div>`;
  dialog.classList.toggle('shared-opening',!!surface);if(!dialog.open)dialog.showModal();document.body.classList.add('dialog-open');renderSidebar();updateArtboard();requestAnimationFrame(()=>{if(!modal||modal.doc!==doc)return;buildStudioChart();updatePlayback();libraryTools.sync();if(surface){const cancel=animateSurface(surface,$('#studio-chart'),{container:dialog,duration:620});const replay=setTimeout(()=>{if(modal?.doc!==doc||!dialog.open||matchMedia('(prefers-reduced-motion: reduce)').matches)return;modal.p=0;modal.playing=true;modal.last=performance.now();modalScene?.render(0);updatePlayback();},640);surfaceCancel=()=>{clearTimeout(replay);cancel();};}});
}
async function switchStudio(direction){
  if(!modal)return;
  if(modal.dirty){if(!await saveDocument()||modal.dirty)return;toast(uiText('当前修改已保存，可以在「我的作品」继续编辑。'));}
  const sequence=orderedCatalog;
  const index=sequence.findIndex(t=>t.id===modal.template.id),next=sequence[(index+direction+sequence.length)%sequence.length];
  const old=$('#artboard'),box=old.getBoundingClientRect(),frame=$('#studio').getBoundingClientRect();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ghost=reduced?null:old.cloneNode(true);
  if(ghost){ghost.querySelectorAll('[id]').forEach(n=>{if(n.namespaceURI!=='http://www.w3.org/2000/svg')n.removeAttribute('id');});ghost.removeAttribute('id');ghost.setAttribute('aria-hidden','true');ghost.classList.add('chart-transition-ghost');ghost.style.cssText=old.style.cssText+`;position:absolute;left:${box.left-frame.left}px;top:${box.top-frame.top}px;width:${box.width}px;height:${box.height}px;margin:0;pointer-events:none;z-index:20;`;}
  openStudio(next.id);history.replaceState(null,'',`#chart/${next.id}`);
  if(ghost){$('#studio').append(ghost);ghost.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:`translateX(${-direction*40}px)`}],{duration:480,easing:'cubic-bezier(.4,0,.2,1)'}).onfinish=()=>ghost.remove();$('#artboard').animate([{opacity:0,transform:`translateX(${direction*44}px)`},{opacity:1,transform:'translateX(0)'}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'});}
}
async function closeStudio(){
  if(!modal)return true;
  if(modal.saving){toast(uiText('正在保存，请稍候再关闭。'));return false;}
  if(modal.dirty&&(!await saveDocument()||modal?.dirty))return false;
  libraryTools.closeMenus();surfaceCancel?.();surfaceCancel=null;
  const surface=captureSurface($('#studio-chart')),target=studioReturnTarget;
  if($('#studio').contains($('#toast')))document.querySelector('#app').append($('#toast'));
  studioColorController?.destroy();studioColorController=null;modalScene?.destroy();modalScene=null;modal=null;$('#studio').close();document.body.classList.remove('dialog-open');
  if(location.hash.startsWith('#chart/'))history.replaceState(null,'',`#${state.view}`);
  if(state.view==='saved')renderSaved();
  if(target?.isConnected)surfaceCancel=animateSurface(surface,target,{container:document.body,direction:'close',duration:500});
  libraryTools.sync();return true;
}
function updateArtboard(){if(!modal)return;libraryTools.refreshCurrent(modal.doc,modal.options,modal.selectionOrigin);const t=themeFor(modal.options.palette,modal.options.dark,modal.options.colors);for(const[k,v]of Object.entries({'--art-bg':t.bg,'--art-fg':t.fg,'--art-secondary':t.secondary,'--art-line':t.line}))$('#artboard').style.setProperty(k,v);$('#artboard').dataset.ratio=modal.options.ratio;$('#stage-size').textContent=modal.options.ratio==='square'?'1 : 1':modal.options.ratio==='portrait'?'3 : 4':'16 : 10';$('#artboard-title').textContent=modal.doc.title;$('#artboard-subtitle').textContent=uiMessage`${modal.doc.subtitle} · 单位：${modal.doc.unit}`;$('#artboard-source').textContent=modal.doc.source.name;$('#data-badge').textContent=modal.doc.source.type==='demo'?uiText('演示数据'):uiText('我的数据');$('#play-duration').textContent=`${String(modal.options.duration.toFixed(1)).padStart(4,'0')}s`;}
function fitArtboard(){if(!modal)return;const stage=$('#stage'),style=getComputedStyle(stage),w=stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),h=stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);const ratio=modal.options.ratio==='square'?1:modal.options.ratio==='portrait'?.75:1.6;const width=Math.min(w,h*ratio);$('#artboard').style.width=width+'px';$('#artboard').style.height=width/ratio+'px';}
function buildStudioChart(){if(!modal)return;const validation=validateDocument(modal.doc);if(!validation.valid){toast(validation.errors[0]);return;}fitArtboard();modalScene?.destroy();const host=$('#studio-chart');if(host.clientWidth===0)return;modalScene=new ChartScene(host,modal.doc,{...modal.options,progress:modal.p,compact:host.clientWidth<550,orbit:modal.template.dimension==='3d',onCameraChange(camera){modal.options.camera3d=camera;modal.dirty=true;libraryTools.refreshCurrent(modal.doc,modal.options,modal.selectionOrigin);syncSpatialView(camera);}});applyFrameBrand($('#artboard'),modal.options,'h3');applyChartBrand(modalScene.svg,modal.options);if(modalScene.spatial)syncSpatialView(modalScene.spatial.getCamera());}
function spatialToolbar(){return uiMarkup`<div class="spatial-toolbar"><span>拖动或方向键旋转</span><div role="group" aria-label="三维视角">${[['iso',uiText('等轴')],['front',uiText('正面')],['top',uiText('俯视')]].map(([id,name])=>`<button data-action="spatial-view" data-id="${id}" aria-pressed="false">${name}</button>`).join('')}</div><span class="spatial-projection">正交投影</span></div>`;}
function syncSpatialView(camera){document.querySelectorAll('[data-action=spatial-view]').forEach(b=>{const v=spatialViews[b.dataset.id];b.setAttribute('aria-pressed',String(Math.abs(v.azimuth-camera.azimuth)<.1&&Math.abs(v.elevation-camera.elevation)<.1));});}
function axisFields(doc){if(!doc.axes)return '';return `<div class="axis-fields">${Object.entries(doc.axes).map(([k,v])=>`<label class="field">${k==='size'?uiText('面积含义与单位'):['a','b','c'].includes(k)?k.toUpperCase()+(doc.template==='parallelsets'?uiText(' 分类名称'):uiText(' 成分名称')):k.toUpperCase()+uiText(' 轴含义与单位')}<input data-axis-field="${k}" maxlength="${doc.template==='trajectory'?60:40}" value="${esc(v)}"></label>`).join('')}</div>`;}
function scienceFields(doc){
  if(doc.template==='comboline')return `<div class="field-row">${doc.seriesLabels.map((v,i)=>`<label class="field">${i?uiText('折线名称'):uiText('柱状名称')}<input data-science-list="seriesLabels" data-index="${i}" maxlength="60" value="${esc(v)}"></label>`).join('')}</div>`;
  if(findTemplate(doc.template)?.edition!==8)return '';
  const numbers={qThreshold:uiText('校正 p 值阈值'),fcThreshold:uiText('|log₂FC| 阈值'),pc1Variance:uiText('PC1 解释方差 / %'),pc2Variance:uiText('PC2 解释方差 / %'),bins:uiText('等宽分箱数'),threshold:uiText('关联 p 值阈值'),referenceEffect:uiText('参考效应')},texts={positiveLabel:uiText('正类 1 的含义'),doseUnit:uiText('剂量单位')};
  return `<div class="axis-fields">${Object.entries(numbers).filter(([k])=>doc[k]!==undefined).map(([k,l])=>`<label class="field">${l}<input type="number" data-science-field="${k}" step="${k==='bins'?'1':'any'}" value="${doc[k]}"></label>`).join('')}${Object.entries(texts).filter(([k])=>doc[k]!==undefined).map(([k,l])=>`<label class="field">${l}<input data-science-field="${k}" maxlength="60" value="${esc(doc[k])}"></label>`).join('')}${['pairLabels','methodLabels'].filter(k=>doc[k]).map(k=>`<div class="field-row">${doc[k].map((v,i)=>`<label class="field">${k==='pairLabels'?(i?uiText('第二次观测'):uiText('第一次观测')):(i?uiText('方法 B'):uiText('方法 A'))}<input data-science-list="${k}" data-index="${i}" maxlength="60" value="${esc(v)}"></label>`).join('')}</div>`).join('')}</div>`;
}
function renderSidebar(){
  if(!modal)return;const m=modal,t=m.template;
  document.querySelectorAll('[data-action="studio-tab"]').forEach(b=>{b.setAttribute('aria-selected',b.dataset.id===m.tab);});
  const el=$('#sidebar-content');studioColorController?.destroy();studioColorController=null;
  if(m.tab==='style')el.innerHTML=uiMarkup`${recommendedUseHTML(t.id)}<section class="setting-section"><div class="setting-heading"><h3>色谱</h3><span>${palettes[m.options.palette].en}</span></div><div class="studio-palettes">${paletteButtons(m.options.palette,'studio-palette')}</div><details class="studio-custom-colors"><summary>自定义配色 · 数量与色值</summary><div id="studio-color-editor"></div></details><div class="setting-heading spaced"><h3>画布</h3></div><div class="segmented"><button data-action="background" data-id="light" class="${!m.options.dark?'selected':''}" aria-pressed="${!m.options.dark}">${icon('Sun',14)}纸白</button><button data-action="background" data-id="dark" class="${m.options.dark?'selected':''}" aria-pressed="${m.options.dark}">${icon('Moon',14)}炭黑</button></div></section>
    <section class="setting-section"><div class="setting-heading"><h3>内容</h3><span>与数据一起导出</span></div><label class="field">标题<input data-field="title" maxlength="80" value="${esc(m.doc.title)}"></label><label class="field">副标题<input data-field="subtitle" maxlength="160" value="${esc(m.doc.subtitle)}"></label>${t.id==='slope'?`<div class="field-row">${m.doc.periodLabels.map((v,i)=>`<label class="field">${i?uiText('期末名称'):uiText('期初名称')}<input data-list-field="periodLabels" data-index="${i}" maxlength="60" value="${esc(v)}"></label>`).join('')}</div>`:''}${t.id==='pyramid'?`<div class="field-row">${m.doc.sideLabels.map((v,i)=>`<label class="field">${i?uiText('右侧组名'):uiText('左侧组名')}<input data-list-field="sideLabels" data-index="${i}" maxlength="40" value="${esc(v)}"></label>`).join('')}</div>`:''}${t.id==='radar'?uiMarkup`<label class="field">统一量程上限<input type="number" data-numeric-field="max" min="0" step="any" value="${m.doc.max}"></label>`:''}${axisFields(m.doc)}${scienceFields(m.doc)}${t.id==='difference'?`<div class="field-row">${m.doc.seriesLabels.map((v,i)=>`<label class="field">${i?uiText('B 序列'):uiText('A 序列')}<input data-list-field="seriesLabels" data-index="${i}" maxlength="20" value="${esc(v)}"></label>`).join('')}</div>`:''}${t.id==='likert'?`<div class="field-row">${m.doc.responses.map((v,i)=>`<label class="field">${[uiText('负向二档'),uiText('负向一档'),uiText('中立'),uiText('正向一档'),uiText('正向二档')][i]}<input data-list-field="responses" data-index="${i}" maxlength="20" value="${esc(v)}"></label>`).join('')}</div>`:''}${t.id==='hexbin'?uiMarkup`<label class="field">分箱大小<input type="number" data-numeric-field="binRadius" min="8" max="24" step="1" value="${m.doc.binRadius}"></label>`:''}${['interval','ribbon','forest'].includes(t.id)?uiMarkup`<label class="field">区间定义<input data-field="intervalLabel" maxlength="80" value="${esc(m.doc.intervalLabel)}"></label>`:''}<div class="field-row"><label class="field">单位<input data-field="unit" maxlength="20" value="${esc(m.doc.unit)}"></label><label class="field">画幅<select id="ratio-select"><option value="wide" ${m.options.ratio==='wide'?'selected':''}>横版 16:10</option><option value="square" ${m.options.ratio==='square'?'selected':''}>方形 1:1</option><option value="portrait" ${m.options.ratio==='portrait'?'selected':''}>竖版 3:4</option></select></label></div></section>
    <section class="setting-section"><div class="setting-heading"><h3>演绎节奏</h3><span>入场 → 展开 → 停留</span></div><div class="duration-options">${[[5,uiText('轻快')],[8,uiText('舒展')],[12,uiText('从容')]].map(([v,l])=>`<button data-action="duration" data-id="${v}" class="${m.options.duration===v?'selected':''}" aria-pressed="${m.options.duration===v}"><span>${l}</span><small>${v}.0 s</small></button>`).join('')}</div></section>
    <section class="template-note"><span class="mono">${t.no} / ${t.id.toUpperCase()}</span><h3>${t.type}</h3><p>${t.description}</p><dl><dt>数据边界</dt><dd>${t.limit}</dd>${t.edition===8?uiMarkup`<dt>统计口径</dt><dd>${esc(m.validation.warnings.join(" "))}</dd>`:""}</dl></section>`;
  else if(m.tab==='data')renderDataPanel();
  else el.innerHTML=uiMarkup`<section class="setting-section"><div class="setting-heading"><h3>模板编号</h3><span>固定调用标识</span></div><div class="template-id"><code>${t.id}</code><button class="icon-button" data-action="copy-id" aria-label="复制模板编号">${icon('Copy',15)}</button></div><p class="helper">复制图表制作说明书，再附上自己的数据，让 Agent 直接生成图表。需要沿用原版效果时，一并下载图表代码。</p><div class="inline-code"><pre><code>${esc(`const chart = createChart(\n  container, document, {\n    palette: '${m.options.palette}',\n    dark: ${m.options.dark}\n  }\n);\nchart.render(1);`)}</code></pre></div><button class="button dark wide" data-action="copy-agent">${icon('Copy',15)}复制制作说明书</button><button class="button wide" data-action="agent-code">${icon('Download',15)}下载原版图表代码</button></section><section class="setting-section"><h3>数据字段</h3><div class="schema-fields">${t.fields.map(([f,ty,desc])=>`<div><code>${f}<small>${ty}</small></code><span>${desc}</span></div>`).join('')}</div></section><section class="template-note"><h3>这张图不适合</h3><p>${t.avoid}</p><p class="helper">保存的 JSON 含标题、单位、来源和原始数据；HTML 导出包含完整播放器。</p></section>`;
  if(m.tab==='style')studioColorController=mountColorEditor($('#studio-color-editor'),{getOptions:()=>m.options,getDoc:()=>m.doc,onChange(options){m.options=options;m.dirty=true;updateArtboard();buildStudioChart();}});
}
function renderDataPanel(){
  const m=modal;$('#sidebar-content').innerHTML=uiMarkup`<section class="setting-section"><div class="setting-heading"><h3>我的数据</h3><span>${m.doc.data.length} 行 · ${m.template.fields.length} 列</span></div><div class="data-primary-actions"><button class="button dark wide" data-action="edit-table">${icon('Grid2x2',15)}编辑数据表</button><button class="button wide" data-action="paste-table">${icon('Upload',15)}粘贴 Excel / WPS 表格</button></div><p class="data-workflow-note">进入数据编辑工作区，在左侧看图、右侧修改单元格。</p><div class="data-table-summary"><table><thead><tr>${m.template.fields.slice(0,3).map(f=>`<th title="${esc(f[2])}">${esc(f[2]?.length<10?f[2]:f[0])}</th>`).join('')}</tr></thead><tbody>${m.doc.data.slice(0,4).map(row=>`<tr>${m.template.fields.slice(0,3).map(([key])=>`<td>${row[key]===null?uiText('缺失'):esc(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="helper">${esc(m.doc.source.name)}</p></section><section class="setting-section data-section"><details class="data-advanced" ${m.draftDirty?'open':''}><summary>高级编辑 · JSON / CSV</summary><div class="data-format-row"><div class="segmented small-segmented"><button data-action="data-format" data-id="json" class="${m.format==='json'?'selected':''}">JSON</button><button data-action="data-format" data-id="csv" class="${m.format==='csv'?'selected':''}">CSV</button></div><button class="text-button" data-action="import-file">${icon('Upload',13)}导入文件</button><input id="file-input" type="file" accept=".json,.csv,application/json,text/csv" hidden></div>${true?uiMarkup`<button class="text-button" data-action="full-data">${icon("Code2",13)}编辑参数与完整 JSON</button>`:""}<label class="sr-only" for="data-editor">图表数据编辑器</label><textarea id="data-editor" class="data-editor" spellcheck="false">${esc(m.draft)}</textarea><label class="field">数据来源<input id="source-name" value="${esc(m.doc.source.name)}" maxlength="80"></label><p class="helper">${m.template.limit}。数据在本地处理。</p><div id="validation-report" aria-live="polite">${validationHTML(m.validation)}</div><button class="button dark wide" data-action="apply-data">${icon('Check',15)}校验并更新图表</button><button class="text-button restore-data" data-action="restore-data">${icon('RotateCcw',13)}恢复演示数据</button></details></section><section class="setting-section"><details class="data-details"><summary>原始记录预览 <span>${m.doc.data.length} 条</span></summary><div class="raw-table">${rawTable(m.doc)}</div>${m.doc.data.length>100?uiText('<p class="helper">表格展示前 100 条，JSON 和导出包含全部记录。</p>'):''}</details></section>`;
}
async function showExport(format='png'){
  if(!modal)return;
  if(modal.draftDirty){toast(uiText('数据草稿尚未应用，请先校验并更新图表。'));return;}
  libraryTools.closeMenus();const current=modal;modal.playing=false;updatePlayback();
  try{await openExportPanel(modal.doc,modal.options,{format,progress:modal.p,onSettings(settings){if(modal===current){modal.options.exportSettings=settings;modal.dirty=true;}}});}catch(error){toast(error.message);}
}

function validationHTML(report){return `<div class="validation ${report.valid?'valid':'invalid'}">${icon(report.valid?'CheckCircle2':'CircleHelp',14)}<div><strong>${report.valid?uiText('结构与数值校验通过'):uiText('需要修正数据')}</strong>${report.errors.map(e=>`<p>${esc(e)}</p>`).join('')}${report.warnings.map(e=>`<p>${esc(e)}</p>`).join('')}</div></div>`;}
function rawTable(doc){const fields=findTemplate(doc.template).fields.map(f=>f[0]);return `<table><thead><tr>${fields.map(f=>`<th>${f}</th>`).join('')}</tr></thead><tbody>${doc.data.slice(0,100).map(row=>`<tr>${fields.map(f=>`<td>${row[f]===null?uiText('<em>缺失</em>'):esc(row[f])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function applyData(){
  try{
    const doc=withRecordIds(parseDataText(modal.draft,modal.doc,modal.format));
    if(doc.template!==modal.template.id)throw new Error(uiText('导入文档的 template 与当前图型不同，请从对应图型的工作台导入。'));
    const source=$('#source-name')?.value.trim();
    // A full document carries its provenance; edited rows get explicit user provenance.
    const isFull=modal.format==='json'&&!Array.isArray(JSON.parse(modal.draft));
    if(!isFull){const changed=JSON.stringify(doc.data)!==JSON.stringify(modal.doc.data);if(changed&&doc.source.type==='demo'&&source===doc.source.name)throw new Error(uiText('替换演示数据后，请填写你这份数据的来源。'));doc.source={...doc.source,name:source||'',type:changed?'user':doc.source.type};}
    const report=validateDocument(doc);modal.validation=report;$('#validation-report').innerHTML=validationHTML(report);if(!report.valid)return;
    modal.doc=doc;modal.draftDirty=false;modal.draft=modal.format==='json'?JSON.stringify(isFull?doc:doc.data,null,2):toCSV(doc);modal.p=state.playing?0:1;modal.playing=state.playing;modal.last=performance.now();modal.dirty=true;updateArtboard();buildStudioChart();renderDataPanel();toast(uiText('数据已更新，标题、单位与来源将一同保留。'));
  }catch(error){modal.validation={valid:false,errors:[error.message.startsWith('Unexpected')?uiText('JSON 格式有误，请检查引号、逗号与括号。'):error.message],warnings:[]};$('#validation-report').innerHTML=validationHTML(modal.validation);}
}
function updatePlayback(){if(!modal)return;$('#studio-play').innerHTML=icon(modal.playing?'Pause':'Play',16);$('#studio-play').setAttribute('aria-label',modal.playing?uiText('暂停动画'):uiText('播放动画'));$('#timeline').value=Math.round(modal.p*1000);$('#play-time').textContent=(modal.p*modal.options.duration).toFixed(1).padStart(4,'0');}
async function saveDocument(){
  const m=modal;if(!m||m.saving)return false;
  if(m.draftDirty){toast(uiText('数据草稿尚未应用，请先校验并更新图表。'));return false;}
  const report=validateDocument(m.doc);if(!report.valid){toast(report.errors[0]);return false;}
  const snapshot={doc:structuredClone(m.doc),options:structuredClone(m.options)},record=m.workRecord;
  const work=record?{...record.work,name:m.doc.title.slice(0,80),updated:Date.now(),steps:[{...record.work.steps[0],...snapshot}]}:newWork([snapshot],m.doc.title.slice(0,80));
  const button=$('#studio [data-action=save]');m.saving=true;if(button){button.disabled=true;button.querySelector('span').textContent=uiText('正在保存…');}
  try{const result=await workStore.save(work,{expectedRevision:record?.revision||0,saved:true,checkpoint:true});m.savedId=result.record.id;m.workRecord=result.record;
    m.dirty=JSON.stringify(snapshot)!==JSON.stringify({doc:m.doc,options:m.options});
    toast(result.conflict?uiText('其他标签的修改已保留，本次保存为冲突副本。'):uiText('已保存到我的作品。'));return true;
  }catch(error){m.dirty=true;toast(error.message);if(modal===m&&button)button.querySelector('span').textContent=uiText('尚未保存 · 重试');return false;}
  finally{m.saving=false;if(modal===m&&button){button.disabled=false;if(!m.dirty)button.querySelector('span').textContent=uiText('已保存');}}
}
async function copy(text){try{await navigator.clipboard.writeText(text);toast(uiText('已复制。'));}catch{toast(uiText('浏览器未允许剪贴板访问，请使用 JSON 导出。'));}}

document.addEventListener('click',async event=>{
  if(event.target.closest('.skip-link')){event.preventDefault();$('#main').focus();$('#main').scrollIntoView({block:'start'});return;}
  const action=event.target.closest('[data-action]');if(!action)return;const a=action.dataset.action,id=action.dataset.id;
  if(['open','open-export'].includes(a)){event.preventDefault();openStudio(id,action.dataset.saved);history.replaceState(null,'',`#chart/${id}`);if(a==='open-export')showExport();}
  else if(a==='new'){const doc=getExample('column');doc.title=uiText('我的图表');doc.subtitle='';if(await addEditorChart(doc,{palette:state.palette,dark:false,ratio:'wide',duration:8},undefined,{fresh:true})){pendingEditorPaste=true;enterEditor();}}
  else if(a==='copy-site-guide'){
    const text=agentWebsiteTutorial(),status=$('[data-guide-copy-status]');
    navigator.clipboard.writeText(text).then(()=>{if(status?.isConnected)status.textContent=isEnglish()?'Guide copied. Paste it into your Agent.':'教程已复制，粘贴给你的 Agent 即可。';}).catch(()=>{const field=$('[data-guide-copy-fallback]');if(!field)return;field.hidden=false;field.value=text;field.focus();field.select();if(status)status.textContent=isEnglish()?'Select and copy the guide below, or download the Markdown file.':'请复制下方教程，或下载 Markdown 文件。';});
  }
  else if(a==='guide-section'){const section=document.getElementById(id);section?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});document.querySelectorAll('[data-action=guide-section]').forEach(b=>b.setAttribute('aria-current',b.dataset.id===id?'location':'false'));section?.focus({preventScroll:true});}
  else if(a==='agent-config'){const {openAgentConfig}=await import('./agent-config-panel.js');openAgentConfig({onOpen:openAgentWork});}
  else if(a==='try-agent'){if(await addEditorChart(getExample('column'))){pendingEditorHelp=true;enterEditor();}}
  else if(a==='add-editor'){const saved=savedItem(action.dataset.saved),key=editorKey(id,action.dataset.saved),added=workStore?.has(action.dataset.saved||`record:${key}`);if(await addEditorChart(saved?.doc||getExample(id),saved?.options||{palette:state.palette,dark:false,ratio:'wide',duration:8},saved?.id)){if(added)enterEditor();else toast(uiText('已加入编辑器，点击顶部「作品编辑器」进入。'));}}
  else if(a==='add-current-editor')editCurrentInWorkspace(false);
  else if(a==='editor-view'){event.preventDefault();enterEditor();}
  else if(a==='open-work'){pendingWork=(await workStore.get(id))?.work;if(pendingWork)enterEditor();}
  else if(a==='open-project')collectionController?.openImport();
  else if(a==='edit-table'||a==='paste-table')editCurrentInWorkspace(a==='paste-table');
  else if(a==='close')closeStudio();
  else if(a==='spatial-view'){modalScene?.spatial?.setCamera(spatialViews[id]);}
  else if(a==='previous-chart'||a==='next-chart')switchStudio(a==='next-chart'?1:-1);
  else if(['family','category','motion'].includes(a)){state[a]=id;if(matchMedia('(max-width:900px)').matches){$('#library-filters').open=false;$('#library-filters summary').focus();}renderGrid();}
  else if(a==='palette'){state.palette=id;writeStore('forma.palette',id);setPaletteCSS();$('.palette-picker').innerHTML=uiMarkup`<span class="control-label">色谱</span>${paletteButtons(id)}`;renderGrid();}
  else if(a==='use-palette'){state.palette=id;writeStore('forma.palette',id);setPaletteCSS();location.hash='library';}
  else if(a==='favorite'){state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);writeStore('forma.favorites',[...state.favorites]);action.classList.toggle('hearted',state.favorites.has(id));action.setAttribute('aria-pressed',state.favorites.has(id));action.setAttribute('aria-label',state.favorites.has(id)?uiMessage`取消收藏${findTemplate(id).name}`:uiMessage`收藏${findTemplate(id).name}`);if(state.onlyFavorites&&state.view==='library')renderGrid();else if(state.view==='library')updateLibraryFilters();}
  else if(a==='favorites'){state.onlyFavorites=!state.onlyFavorites;action.classList.toggle('active',state.onlyFavorites);action.setAttribute('aria-pressed',state.onlyFavorites);renderGrid();}
  else if(a==='reset-filters'){state.goal='all';state.category='all';state.family='all';state.edition='all';state.motion='all';state.query='';state.onlyFavorites=false;renderView();}
  else if(a==='gallery-play'){if(state.playing){frozenTime=8;state.playing=false;previews?.render(1);}else{galleryStart=performance.now();frozenTime=0;state.playing=true;previews?.render(0);}action.innerHTML=`${icon(state.playing?'Pause':'Play',13)}<span>${state.playing?uiText('静态看图'):uiText('播放动效')}</span>`;}
  else if(a==='studio-tab'){modal.tab=id;renderSidebar();}
  else if(a==='studio-settings'){modal.tab='style';renderSidebar();if(matchMedia('(max-width:760px)').matches)$('.studio-sidebar').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  else if(a==='copy-agent'){await navigator.clipboard.writeText(agentBrief(modal.doc,modal.options));toast(uiText('已复制 Agent 制作说明书。'));}
  else if(a==='agent-code'){await downloadAgentTemplate(modal.doc,modal.options);toast(uiText('已生成可离线使用的图表模板。'));}
  else if(a==='studio-palette'){modal.options.palette=id;delete modal.options.colors;modal.dirty=true;renderSidebar();updateArtboard();buildStudioChart();}
  else if(a==='background'){modal.options.dark=id==='dark';modal.dirty=true;renderSidebar();updateArtboard();buildStudioChart();}
  else if(a==='duration'){modal.options.duration=+id;modal.dirty=true;updateArtboard();renderSidebar();}
  else if(a==='play'){if(modal.p>=1)modal.p=0;modal.playing=!modal.playing;modal.last=performance.now();updatePlayback();}
  else if(a==='replay'){modal.p=0;modal.playing=true;modal.last=performance.now();modalScene?.render(0);updatePlayback();}
  else if(a==='save')saveDocument();
  else if(a==='export')showExport(action.dataset.format);
  else if(a==='apply-data')applyData();
  else if(a==='restore-data'){modal.doc=withRecordIds(getExample(modal.template.id));modal.draftDirty=false;modal.dirty=true;modal.draft=modal.format==='json'?JSON.stringify(modal.doc.data,null,2):toCSV(modal.doc);modal.validation=validateDocument(modal.doc);renderDataPanel();updateArtboard();buildStudioChart();toast(uiText('已恢复演示数据。'));}
  else if(a==='data-format'){if(id===modal.format)return;try{const doc=parseDataText(modal.draft,modal.doc,modal.format);if(id==='csv'&&modal.format==='json'&&!Array.isArray(JSON.parse(modal.draft))){const {data:pendingRows,...pendingMeta}=doc,{data:currentRows,...currentMeta}=modal.doc;if(JSON.stringify(pendingMeta)!==JSON.stringify(currentMeta)){toast(uiText('请先校验并应用文档参数，再切换为 CSV。'));return;}}modal.draft=id==='json'?JSON.stringify(doc.data,null,2):toCSV(doc);modal.format=id;renderDataPanel();}catch{toast(uiText('请先修正当前数据格式，再切换编辑方式。'));}}
  else if(a==='import-file')$('#file-input').click();
  else if(a==='show-table'){modal.tab='data';renderSidebar();$('.data-details').open=true;$('.data-details').scrollIntoView({block:'nearest'});}
  else if(a==='copy-id')copy(modal.template.id);
  else if(a==='full-data'){try{const draftDoc=parseDataText(modal.draft,modal.doc,modal.format);modal.format='json';modal.draft=JSON.stringify(draftDoc,null,2);renderDataPanel();}catch{toast(uiText('请先修正当前数据格式，再展开完整文档。'));}}
  else if(a==='copy-doc')copy(JSON.stringify(modal.doc,null,2));
  else if(a==='copy-example')copy(JSON.stringify(getExample('column'),null,2));
  else if(a==='copy-color')copy(id);

});
document.addEventListener('input',event=>{
  if(event.target.id==='chart-search'){state.query=event.target.value;renderGrid();}
  if(!modal)return;
  if(event.target.id==='timeline'){modal.p=+event.target.value/1000;modal.playing=false;modalScene?.render(modal.p);updatePlayback();}
  else if(event.target.id==='data-editor'){modal.draft=event.target.value;modal.draftDirty=true;}
  else if(event.target.dataset.numericField){modal.doc[event.target.dataset.numericField]=Number(event.target.value);modal.dirty=true;updateArtboard();}
  else if(event.target.dataset.axisField){modal.doc.axes[event.target.dataset.axisField]=event.target.value;modal.dirty=true;updateArtboard();}
  else if(event.target.dataset.listField){if(event.target.dataset.listField==='responses')return;modal.doc[event.target.dataset.listField][+event.target.dataset.index]=event.target.value;modal.dirty=true;updateArtboard();}
  else if(event.target.dataset.field){modal.doc[event.target.dataset.field]=event.target.value;modal.dirty=true;updateArtboard();}
});
document.addEventListener('change',async event=>{
  if(!modal)return;
  if(event.target.dataset.scienceField||event.target.dataset.scienceList){
    const input=event.target,k=input.dataset.scienceField||input.dataset.scienceList,candidate=structuredClone(modal.doc);
    if(input.dataset.scienceList)candidate[k][+input.dataset.index]=input.value.trim();
    else candidate[k]=input.type==='number'?(input.value.trim()===''?NaN:Number(input.value)):input.value.trim();
    const report=validateDocument(candidate);
    if(!report.valid){input.value=input.dataset.scienceList?modal.doc[k][+input.dataset.index]:modal.doc[k];toast(report.errors[0]);return;}
    modal.doc=candidate;modal.validation=report;modal.draft=modal.format==='csv'?toCSV(candidate):JSON.stringify(candidate,null,2);modal.dirty=true;updateArtboard();buildStudioChart();return;
  }
  if(event.target.dataset.listField==='responses'){
    const index=+event.target.dataset.index,previous=modal.doc.responses[index],value=event.target.value.trim();
    if(!value||modal.doc.responses.some((r,i)=>i!==index&&r===value)){event.target.value=previous;toast(uiText('五个回答选项需要非空且互不相同。'));return;}
    modal.doc.data.forEach(r=>{if(r.response===previous)r.response=value;});modal.doc.responses[index]=value;modal.draft=modal.format==='csv'?toCSV(modal.doc):JSON.stringify(modal.doc.data,null,2);modal.dirty=true;updateArtboard();
  }
  if(event.target.dataset.field||event.target.dataset.listField||event.target.dataset.numericField||event.target.dataset.axisField){buildStudioChart();}
  if(event.target.id==='ratio-select'){modal.options.ratio=event.target.value;modal.dirty=true;updateArtboard();requestAnimationFrame(buildStudioChart);}
  if(event.target.id==='file-input'){
    const file=event.target.files[0];if(!file)return;if(file.size>2000000){toast(uiText('文件请控制在 2 MB 以内。'));return;}const text=await file.text();modal.format=file.name.toLowerCase().endsWith('.csv')?'csv':'json';modal.draft=text;modal.draftDirty=true;renderDataPanel();$('.data-advanced').open=true;toast(uiText('文件已读入，点击「校验并更新图表」应用。'));
  }
});
document.addEventListener('keydown',event=>{
  if(event.target.closest('.workflow-dialog'))return;
  const editable=event.target.matches('input,textarea,select');
  if(event.key==='/'&&!editable&&!modal){event.preventDefault();$('#chart-search')?.focus();}
  if((event.key==='Enter'||event.key===' ')&&event.target.matches('.chart-preview')){event.preventDefault();openStudio(event.target.dataset.id,event.target.dataset.saved);}
  if(event.key===' '&&modal&&!editable&&!event.target.closest('button,a,[role=menu],[role=menuitem],.forma-selection-dialog')){event.preventDefault();if(modal.p>=1)modal.p=0;modal.playing=!modal.playing;modal.last=performance.now();updatePlayback();}
});
$('#studio').addEventListener('cancel',event=>{event.preventDefault();closeStudio();});
$('#studio').addEventListener('click',event=>{if(event.target===$('#studio'))closeStudio();});
async function route(){let hash=location.hash.slice(1);if(hash.startsWith('library/')){const motion=hash.split('/')[1];state.motion=motionFilters.some(f=>f.id===motion)?motion:'all';state.family='all';state.category='all';state.edition='all';state.query='';state.onlyFavorites=false;hash='library';}if(hash.startsWith('chart/')){const id=hash.split('/')[1];if(modal&&modal.template.id!==id&&!await closeStudio()){history.replaceState(null,'',`#chart/${modal.template.id}`);return;}if(!$('#main').children.length)renderView();if(findTemplate(id))openStudio(id);else{history.replaceState(null,'','#library');renderView();}return;}if(modal&&!await closeStudio()){history.replaceState(null,'',`#chart/${modal.template.id}`);return;}state.view=hash.startsWith('start/')?'start':['start','library','editor','motion','saved','design','guide','feedback'].includes(hash)?hash:hash?'library':hasLocalWorks()?'library':'start';renderView();if(prevRoute!==state.view)window.scrollTo(0,0);prevRoute=state.view;}
window.addEventListener('hashchange',route);
matchMedia('(max-width:900px)').addEventListener('change',e=>{if($('#library-filters'))$('#library-filters').open=!e.matches&&!state.sidebarCollapsed;});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(modal)buildStudioChart();else if(state.view==='library')renderGrid();else if(state.view==='saved')collectionController?.render();},160);});
function tick(now){
  if(!document.hidden){
    if(modal&&modal.playing){modal.p=Math.min(1,modal.p+Math.min(100,now-modal.last)/1000/modal.options.duration);if(modal.p>=1)modal.playing=false;modalScene?.render(modal.p);updatePlayback();}
    else if(!modal&&state.playing){const elapsed=(now-galleryStart)/1000;const progress=Math.min(1,(elapsed%11)/8);previews?.render(progress);}
  }
  if(modal)modal.last=now;lastTime=now;requestAnimationFrame(tick);
}
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches){state.playing=false;previews?.render(1);if(modal){modal.playing=false;modal.p=1;modalScene?.render(1);updatePlayback();}if($('#gallery-play'))$('#gallery-play').innerHTML=uiMarkup`${icon('Play',13)}<span>播放动效</span>`;}});
window.Forma=Forma;
setPaletteCSS();
$('#main').innerHTML=uiText('<p class="route-loading" role="status">正在读取本地作品…</p>');
openWorkStore().catch(error=>unavailableWorkStore(error,localStorage)).then(store=>{
  workStore=store;
  recordUsage('visit',{channel:usageChannel(location.search)});
  store.subscribe(event=>{if(event.type==='saved'||event.type==='removed'){syncEditorEntries();}});
  route();syncEditorEntries();if(!store.available)toast(uiText('作品存储暂不可用，可以继续编辑并下载文件备份。'));
});
requestAnimationFrame(tick);

let agentOpening=false;
async function openAgentWork(input){
 if(agentOpening)throw Error(isEnglish()?'Another work is opening. Wait for it to finish.':'另一个作品正在打开，请稍后再试。');
 const work=AgentAPI.configure(input);agentOpening=true;let fresh;
 try{
  if(!workStore)throw Error(isEnglish()?'The workspace is still loading.':'作品库仍在加载。');
  if(modal&&!await closeStudio())throw Error(isEnglish()?'Finish the current chart edit first.':'请先完成当前图表编辑。');
  if(editorController&&!await editorController.flush())throw Error(isEnglish()?'Save the current work before opening another.':'请先保存当前作品。');
  fresh={...work,id:crypto.randomUUID(),updated:Date.now()};pendingWork=fresh;await enterEditor();
  const deadline=Date.now()+20000;
  while(editorController?.getWork().id!==fresh.id){if(Date.now()>deadline)throw Error(isEnglish()?'The editor did not finish opening. Try again.':'编辑器尚未成功打开，请重试。');await new Promise(resolve=>setTimeout(resolve,30));}
  return {version:1,id:fresh.id,url:location.origin+'/#editor',steps:fresh.steps.length};
 }finally{if(fresh&&pendingWork?.id===fresh.id)pendingWork=null;agentOpening=false;}
}
window.FormaAgent=Object.freeze({...AgentAPI,open:openAgentWork});
