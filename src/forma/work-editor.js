import {reportFingerprint} from './work-repeat.js';
import {openDataImporter} from './data-importer.js';
import {isEnglish as workflowEnglish} from './locale.js';
import {recommendedUseHTML} from './chart-recommendations.js';
import {copyPNGImage} from './clipboard-image.js';
import {recordUsage} from './beta-usage.js';
import {mountAnnotationInteraction} from './annotation-interaction.js';
import {captureForm,restoreForm} from './locale-session.js';
import {locale} from './locale.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {loadWorkRuntime} from './work-runtime.js';
import {createWorkSaveSession} from './work-save-session.js';
import {storageMessage,RECOVERY_LIMIT} from './work-store.js';
import {applyBrandStyle,undoBrandStyle} from './brand-style.js';
import {applyAnnotation,removeAnnotation,undoAnnotation} from './annotations.js';
import {mountAnnotationPanel} from './annotation-panel.js';
import './brand-panel.css';
import {SYNC_HISTORY_LIMIT,cleanSyncHistory} from './sync-history.js';
import {semanticValue,semanticChanges} from './data-semantics.js';
import {previewDataSync,applyDataSync,undoDataSync} from './work-data-sync.js';
import {scientificViews,scientificFamily,scientificDocument,scientificEligibility,isScientificView,scientificGuide} from './scientific-rules.js';
import {createElement,Plus,X,Copy,Save,Download,Play,Table2,ChevronDown,FolderOpen,ArrowLeft,ArrowRight,Trash2,Check,Search,Settings2,PanelRightClose} from 'lucide';
import {catalog,getExample,findTemplate} from './catalog.js';
import {libraryCatalog} from './library-capabilities.js';
import {orderLibraryCatalog} from './library-order.js';
import {filterCatalog} from './library-filter.js';
import {morphViews} from './morph.js';
import {seriesViews,seriesDocument,seriesEligibility,isSeriesView} from './series-rules.js';
import {pairedViews,hierarchyViews,relationalViews,relationalDocument,relationalEligibility,isPairedView,isRelationalView} from './relational-rules.js';
import {morphEligibility} from './morph-rules.js';
import {viewIcon,viewName} from './morph-sequence-player.js';
import {escapeHtml as esc} from './data.js';
import {palettes,themeFor} from './palettes.js';
import {mountDataWorkspace} from './data-workspace.js';
import {mountColorEditor} from './color-editor.js';
import {openDataHelp,copyEditorText} from './editor-assistance.js';
const openExportPanel=async(...args)=>(await import('./export-panel.js')).openExportPanel(...args);
import {outputDimensions,download,svgPNGBlob} from './export.js';
import {workVideoPlan,encodeWorkMP4} from './work-video.js';
import {timelineTime} from './work-timeline.js';
import {createEditorModel} from './editor-model.js';
import {newWork,makeStep,cleanWork,readWorks,writeWorks,listWorks,legacyWorks,morphDocument,morphReady,stepReport,workReport,transitionPlan,replaceStepData,STEP_LIMIT,transitionChoices,stepDomain,stepEligibility,availableTransitions,stepView,recommendedTransitions} from './work-model.js';
import {createStepScene,mountWorkPlayer,stepName,stepIcon} from './work-player.js';
import {workAgentBrief,workHTML,stepSVG,downloadWorkHTML,downloadWorkFile,downloadStep} from './work-export.js';
import './work-ui.css';

const icons={Plus,X,Copy,Save,Download,Play,Table2,ChevronDown,FolderOpen,ArrowLeft,ArrowRight,Trash2,Check,Search,Settings2,PanelRightClose};
const icon=(name,size=15)=>createElement(icons[name],{width:size,height:size,'stroke-width':1.5,'aria-hidden':'true'}).outerHTML;
const clone=v=>structuredClone(v);
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);

export function mountWorkEditor(host,{initial,getSources=()=>[],palette='ink',toast=()=>{},storage=host.ownerDocument.defaultView.localStorage,repository,onPersist=()=>{}}={}){
  const win=host.ownerDocument.defaultView,currentRecord=repository&&(initial?repository.peek(initial.id):repository.current()),stored=repository?{draft:currentRecord?.work,syncHistories:currentRecord?{[currentRecord.id]:currentRecord.syncHistory}:{}}:readWorks(storage),events=new win.AbortController();
  let work=cleanWork(initial||stored.draft||newWork([{doc:getExample('column'),options:{palette}}])),editor,player,colors,thumbnails=[],saveTimer,disposed=false,mode='edit',tool='data',removed=null,pickerMode='add',pickerTab='reuse',panelTrigger,panelSources=[],thumbnailTimer,pairPlayer,pairStepId,videoJob,videoResultURL;
  let syncPreview=null,syncHistory=cleanSyncHistory(stored.syncHistories?.[work.id],work.id);
  let saver,storageIssue=null,unsubStore=()=>{},storagePanelEpoch=0;
  let brandPanel=null,brandTransaction=null,brandEpoch=0,canvasView=null,recommendationPicker=null,recommendationEpoch=0;
  const chartChanges=new Map();
  let annotationPanel=null;const annotationDrafts=new Map(),annotationHistory=new Map();
  let stepsOpen=false;try{stepsOpen=storage.getItem('forma.work.steps.expanded')==='true';}catch{}
  const active=()=>work.steps.find(s=>s.id===work.activeStep)||work.steps[0],modelCache=new Map();
  const $=s=>host.querySelector(s);
  host.innerHTML=uiMarkup`<section class="we-workspace" aria-label="作品编辑器">
    <header class="we-header"><div class="we-identity"><button data-we="works" class="we-folder" aria-label="切换作品" title="切换作品">${icon('FolderOpen',18)}</button><div><input data-we-name aria-label="作品名称" maxlength="80" value="${esc(work.name)}"><span data-we-status role="status">草稿保存在此浏览器</span></div></div>
      <div class="we-mode" role="group" aria-label="编辑与预览"><button data-we="edit" aria-pressed="true">${icon('Table2')}编辑作品</button><button data-we="preview" aria-pressed="false">${icon('Play')}变形预览</button></div>
      <div class="we-actions"><div class="we-copy-split"><button data-we="copy" aria-label="复制提示词" title="复制整套作品的提示词与原版动效模板">${icon('Copy',16)}<span>复制提示词</span></button><button data-we="copy-options" aria-label="作品的其他复制选项" aria-haspopup="menu" aria-expanded="false" aria-controls="we-copy-menu">${icon('ChevronDown',11)}</button><div class="we-copy-menu" id="we-copy-menu" role="menu" aria-label="作品复制选项" hidden><p class="we-copy-scope" data-we-copy-scope></p><button role="menuitem" tabindex="-1" data-we-copy-format="png">复制图片<small>粘贴到 PPT / Word · 2400 px</small></button><button role="menuitem" tabindex="-1" data-we-copy-format="html">复制互动网页代码<small>完整播放器与数据，保留原版动效</small></button><button role="menuitem" tabindex="-1" data-we-copy-format="json">复制作品 JSON<small>全部步骤的数据与设置</small></button><button role="menuitem" tabindex="-1" data-we-copy-format="svg">复制当前步骤 SVG<small>当前图表的静态矢量代码</small></button></div></div><button class="button small" data-we="save">${icon('Save')}保存作品</button><button class="button dark small" data-we="export">${icon('Download')}导出${icon('ChevronDown',11)}</button></div></header>
    <div class="we-context"><div><span class="we-step-number" data-we-number></span><button data-we="type" class="we-type-button"><strong data-we-type></strong>${icon('ChevronDown',12)}</button><button data-we="undo-chart" class="text-button" hidden>撤销更换</button><span class="we-context-divider"></span><button data-we="source" title="为当前步骤选择独立的数据">${icon('Table2',14)}选择数据</button><button data-we="sync-data" title="把当前数据同步到所选关联步骤">${icon('Copy',14)}同步数据</button><button data-we="repeat">${workflowEnglish()?'Next report':'制作下一期'}</button><button data-we="sync-history" class="we-history-trigger" hidden title="查看此作品最近的同步与撤销">同步记录 <span data-we-history-count></span></button></div><div><a href="#motion">查看变形示例 ↗</a><button class="we-collapse" data-we="collapse" aria-label="收起编辑工具" aria-expanded="true" title="收起编辑工具">${icon('PanelRightClose')}</button></div></div>
    <div class="we-edit-host"></div><div class="we-preview-host" hidden></div>
    <footer class="we-timeline"><div class="we-timeline-top"><button class="we-drawer-toggle" data-we="toggle-steps" aria-expanded="false" aria-controls="we-step-drawer"><strong>作品步骤</strong><small data-we-step-count></small>${icon('ChevronDown',13)}</button><button class="we-play-all" data-we="play-all" title="从头播放所有步骤与过渡">${icon('Play',14)}${uiText('播放全部')}</button><div class="we-compact-nav"><button data-we="previous-step" aria-label="切换到上一步">${icon('ArrowLeft',14)}</button><span data-we-current-step></span><button data-we="next-step" aria-label="切换到下一步">${icon('ArrowRight',14)}</button></div><div class="we-step-actions"><button data-we="add" class="text-button">${icon('Plus',14)}添加下一步</button><button data-we="duplicate" title="复制当前步骤和数据">${icon('Copy',14)}</button><button data-we="remove" title="移除当前步骤">${icon('Trash2',14)}</button></div></div><div class="we-step-drawer" id="we-step-drawer"><div class="we-drawer-inner"><div class="we-step-list" role="group" aria-label="作品步骤，点击编辑或预览"></div></div></div><span class="we-notice" data-we-notice role="status"></span><div class="we-sync-feedback" data-we-sync-feedback role="status" hidden></div></footer>
    <aside class="we-popover" data-we-panel hidden role="dialog" aria-modal="false"></aside>
  </section>`;
  const root=$('.we-workspace'),panel=$('[data-we-panel]');
  if(repository){
    const identity=$('.we-identity>div'),row=win.document.createElement('div');row.className='we-save-row';row.append($('[data-we-status]'));row.insertAdjacentHTML('beforeend',uiText('<button data-we="storage" title="版本记录、保存状态与文件备份">版本与备份</button>'));identity.append(row);
    $('.we-header').insertAdjacentHTML('afterend','<div class="we-storage-issue" data-we-storage-issue role="status" hidden></div>');
    initSaver();unsubStore=repository.subscribe(event=>{if(disposed||event.local)return;if(event.type==='unavailable'){issue('error',event.message);return;}if(event.id===work.id&&event.revision!==saver.revision)issue('remote',uiText('这个作品在其他标签页有更新。继续修改会单独保存为副本。'),event.type==='removed'?undefined:work.id);});
  }
  function status(text){if(!disposed&&$('[data-we-status]'))$('[data-we-status]').textContent=text;}
  function issue(kind,message,remoteId){if(disposed)return;storageIssue={kind,message,remoteId};const banner=$('[data-we-storage-issue]');if(!banner)return;banner.hidden=false;banner.dataset.kind=kind;banner.innerHTML=uiMarkup`<p>${esc(message)}</p><div>${kind==='error'?uiText('<button data-we="retry-save">重试保存</button>'):''}${remoteId?uiText('<button data-we="open-remote">查看原作品</button>'):''}<button data-we="backup-current">下载当前备份</button><button data-we="dismiss-storage" aria-label="收起保存提示">${icon('X',14)}</button></div>`;}
  function initSaver(record=repository?.peek(work.id)){
    if(!repository)return;
    saver=createWorkSaveSession(repository,record,{onState(state,error){if(disposed)return;
      if(state==='error'){status(uiText('尚未保存'));issue('error',storageMessage(error));}
      else if(state==='saved'){status(uiText('已保存 · 此浏览器'));if(storageIssue?.kind==='error'){$('[data-we-storage-issue]').hidden=true;storageIssue=null;}}
      else status(uiText('正在保存…'));
    },onCommit(record){onPersist(record.work);},onConflict(result,latest){
      work.id=result.record.id;work.name=latest.name;
      syncHistory=syncHistory.map(t=>({...t,workId:work.id}));if(disposed)return;$('[data-we-name]').value=work.name;
      issue('conflict',uiText('其他标签页已修改原作品。你的修改已保存为冲突副本，两份都已保留。'),result.current?.id);toast(uiText('已保留两份作品，请选择要继续编辑的版本。'));
    }});
  }
  function flush(options){win.clearTimeout(saveTimer);saveTimer=null;if(disposed)return false;if(repository){if(options)saver.stage(work,syncHistory,options);return saver.flush();}try{writeWorks(storage,readWorks(storage).projects,work,{syncHistory});status(uiText('草稿已自动保存 · 此浏览器'));onPersist(work);return true;}catch(error){status(uiText('草稿尚未保存'));toast(error.message);return false;}}
  function persist(){work.updated=Date.now();win.clearTimeout(saveTimer);status(uiText('正在保存…'));if(repository)saver.stage(work,syncHistory);saveTimer=win.setTimeout(flush,200);}
  function backupCurrent(){download(new Blob([JSON.stringify(cleanWork(work),null,2)],{type:'application/json'}),`FORMA-${work.name.replace(/[<>:"/\\|?*]/g,'').slice(0,40)}.forma-work.json`);}
  async function loadStored(record){
    if(!record)return;work=cleanWork(record.work);syncHistory=cleanSyncHistory(record.syncHistory,work.id);modelCache.clear();initSaver(record);
    $('[data-we-name]').value=work.name;$('[data-we-sync-feedback]').hidden=true;$('[data-we-storage-issue]')?.setAttribute('hidden','');storageIssue=null;
    closePanel();setMode('edit');renderTimeline();persist();
  }
  const storageSize=n=>n>=1048576?`${(n/1048576).toFixed(1)} MB`:`${(n/1024).toFixed(1)} KB`;
  async function openStorage(){
    if(!repository)return;await flush();openPanel(uiText('版本与备份'),'storage');const epoch=++storagePanelEpoch;
    $('.we-panel-content').innerHTML=uiText('<p role="status">正在读取保存记录…</p>');
    try{
      const [usage,archives]=await Promise.all([repository.usage(),repository.archives()]);if(disposed||epoch!==storagePanelEpoch||panel.hidden||panel.dataset.kind!=='storage')return;
      const revisions=repository.revisions(work.id),record=repository.peek(work.id);
      $('.we-panel-content').innerHTML=uiMarkup`<div class="we-storage-summary"><span>当前作品</span><strong>${esc(work.name)}</strong><p>${saver.dirty?uiText('当前还有尚未保存的修改。'):uiMessage`已保存到此浏览器 · ${record?new Date(record.committedAt).toLocaleString(locale()):''}`}</p><button class="button dark" data-we="backup-current">${icon('Download')}下载当前作品</button></div><details class="we-storage-history" open><summary>版本记录 <span>${revisions.length}</span></summary><p>保留最近 ${RECOVERY_LIMIT} 个保存节点，连续输入会合并。恢复前会保留当前版本。</p>${revisions.length?revisions.map(r=>uiMarkup`<div class="we-storage-revision"><div><strong>${esc(r.name)}</strong><span>${new Date(r.at).toLocaleString(locale())} · ${r.steps} 步 / ${r.rows} 条记录</span></div><button data-we-revision="${esc(r.id)}" class="button small">恢复</button></div>`).join(''):uiText('<p class="we-storage-empty">开始修改后，之前的版本会出现在这里。</p>')}</details><details class="we-storage-details"><summary>浏览器空间与备份</summary><dl><div><dt>作品内容</dt><dd>${usage.works} 个${usage.trashed?uiMessage` · 回收站 ${usage.trashed} 个`:""} · ${storageSize(usage.contentBytes)}</dd></div><div><dt>版本与同步记录</dt><dd>${storageSize(usage.historyBytes)}</dd></div>${usage.backupBytes?uiMarkup`<div><dt>旧版迁移备份</dt><dd>${storageSize(usage.backupBytes)}</dd></div>`:''}</dl><p>备份包包含作品、回收站及本地版本记录。分卷校验后合为一个 ZIP，恢复时选择这个文件即可。</p><div class="we-storage-buttons"><button class="button" data-we="backup-all">备份全部作品</button><button class="button" data-we="request-persistence">${usage.persistent?uiText('已申请持久存储'):uiText('申请持久存储')}</button></div>${usage.estimate?.quota?uiMarkup`<small>此站点约使用 ${storageSize(usage.estimate.usage||0)} / ${storageSize(usage.estimate.quota)}；浏览器估算，包含其他本地资源。</small>`:''}<p data-we-persistence-result>${usage.persistent?uiText('持久存储已启用，手动清理网站数据仍会删除作品。'):uiText('浏览器可能回收未持久保存的数据，请保留文件备份。')}</p></details>${archives.length?uiMarkup`<details class="we-storage-details"><summary>旧作品迁移记录 <span>${archives.length}</span></summary><p>旧版原始文件完整保留，恢复时不会覆盖现有作品。</p>${archives.map((a,i)=>uiMarkup`<div class="we-storage-archive"><span>${a.at?new Date(a.at).toLocaleString(locale()):uiText('原始备份')}${a.warnings?.length?uiMessage` · ${a.warnings.length} 项待核对`:''}</span>${a.warnings?.length?`<p>${a.warnings.map(esc).join('；')}</p>`:''}<button class="text-button" data-we-archive="${i}">下载原始文件 ↗</button></div>`).join('')}</details>`:''}`;
      panel._archives=archives;
    }catch(error){if(!disposed&&panel.dataset.kind==='storage')$('.we-panel-content').innerHTML=uiMarkup`<p>${esc(storageMessage(error))}</p><button class="button dark" data-we="backup-current">下载当前作品备份</button>`;}
  }
  function check(){
    const report=workReport(work);for(const action of ['save','copy','copy-options','export','preview','play-all']){const button=$(`[data-we="${action}"]`);button.disabled=!report.valid||button.getAttribute('aria-busy')==='true';}
    const activeInvalid=!stepReport(active()).valid;
    $('[data-we-notice]').textContent=!report.valid&&!activeInvalid?report.message:'';
    $('[data-we=sync-history]').hidden=!syncHistory.length;$('[data-we-history-count]').textContent=String(syncHistory.length);
    $('[data-we=sync-data]').disabled=!stepReport(active()).valid||work.steps.length<2;
    $('[data-we=remove]').disabled=work.steps.length===1;$('[data-we=duplicate]').disabled=work.steps.length>=STEP_LIMIT;$('[data-we=add]').disabled=work.steps.length>=STEP_LIMIT;
    $('[data-we-number]').textContent=`${String(work.steps.indexOf(active())+1).padStart(2,'0')} / ${String(work.steps.length).padStart(2,'0')}`;
    $('[data-we=copy]').title=uiMessage`一键复制整套 ${work.steps.length} 步的提示词，包含数据与变形规则`;
    $('[data-we-copy-scope]').textContent=uiMessage`整套作品 · ${work.steps.length} 步`;
    $('[data-we-type]').textContent=stepName(active());$('[data-we-step-count]').textContent=uiMessage`${work.steps.length} 步`;
    $('[data-we=undo-chart]').hidden=!chartChangeStack().length;
    $('[data-we-current-step]').textContent=`${work.steps.indexOf(active())+1} / ${work.steps.length} · ${stepName(active())}`;
    $('[data-we=previous-step]').disabled=work.steps.indexOf(active())===0;
    $('[data-we=next-step]').disabled=work.steps.indexOf(active())===work.steps.length-1;
    root.dataset.stepsOpen=String(stepsOpen);$('[data-we=toggle-steps]').setAttribute('aria-expanded',String(stepsOpen));
    $('.we-step-drawer').setAttribute('aria-hidden',String(!stepsOpen));$('.we-drawer-inner').inert=!stepsOpen;
  }
  function closePanel({focus=false}={}){brandEpoch++;brandPanel?.destroy();brandPanel=null;if(videoResultURL)URL.revokeObjectURL(videoResultURL);videoResultURL=null;videoJob?.abort();videoJob=null;pairPlayer?.destroy();pairPlayer=null;pairStepId=null;panel.hidden=true;panel.replaceChildren();if(focus)panelTrigger?.focus();}
  function openPanel(title,kind='menu'){
    closePanel();player?.stop();panelTrigger=win.document.activeElement;panel.hidden=false;panel.dataset.kind=kind;panel.setAttribute('aria-label',title);
    panel.innerHTML=uiMarkup`<header><h2>${esc(title)}</h2><button class="icon-button" data-we="close" aria-label="关闭${esc(title)}">${icon('X')}</button></header><div class="we-panel-content"></div>`;
  }
  function updateSyncSelection(){
    const count=panel.querySelectorAll('[data-we-sync-target]:checked').length,button=panel.querySelector('[data-we=apply-sync]');if(!button)return;
    button.disabled=!count;button.innerHTML=uiMessage`${icon('Check',14)}同步到 ${count} 步`;
  }
  function openDataSync(){
    const preview=previewDataSync(work,active().id);openPanel(uiText('同步当前数据'),'sync-data');syncPreview=preview;
    const available=preview.targets.filter(t=>t.eligible).length;
    $('.we-panel-content').innerHTML=uiMarkup`<div class="we-sync-source"><small>当前数据 · ${preview.sourceRows} 行</small><strong>${esc(active().doc.title)}</strong></div><p class="we-sync-explanation">勾选要更新的关联步骤，数据、单位、来源和观测定义一起同步。请逐项核对变化；各步标题、配色和播放节奏保留。</p><div class="we-sync-toolbar"><span>${available} 步可同步</span><div><button data-we="sync-select-all" ${available?'':'disabled'}>全选可同步</button><button data-we="sync-data">重新核对</button></div></div><div class="we-sync-targets">${preview.targets.map(t=>{const step=work.steps.find(s=>s.id===t.id);return `<label class="we-sync-target ${t.eligible?'':'unavailable'}"><input type="checkbox" data-we-sync-target="${t.id}" ${t.eligible?'':'disabled'}><span class="we-sync-index">${String(t.index+1).padStart(2,'0')}</span><span><strong>${esc(stepName(step))}</strong><span>${esc(step.doc.title)}</span><small>${t.eligible?uiMessage`${t.beforeRows} → ${t.afterRows} 行 · ${t.changed} 格变化${t.metadataChanged?uiText(' · 单位或来源更新'):''}`:esc(t.reason)}</small>${t.eligible&&t.semanticChanges?.length?`<span class="we-sync-meaning">${t.semanticChanges.map(change=>`<span><b>${esc(change.label)}</b> ${esc(semanticValue(change.before))} → ${esc(semanticValue(change.after))}</span>`).join('')}</span>`:''}${t.eligible&&t.annotationWarnings?.length?uiMarkup`<small class="we-sync-meaning">同步后 ${t.annotationWarnings.length} 条标注需重新定位：${t.annotationWarnings.map(a=>esc(a.reason)).join('；')}</small>`:''}${t.eligible&&t.titleReview?uiText('<small>本步标题与副标题保留，请确认仍描述同步后的数据。</small>'):''}</span></label>`;}).join('')}</div>${!available?uiText('<p class="we-sync-empty">关联数据已一致，或暂时没有适用步骤。添加下一步时选择「沿用当前数据」，即可建立同组图表。</p>'):''}<div class="we-sync-footer"><span>应用后可撤销本次同步</span><button class="button dark small" data-we="apply-sync" disabled>${icon('Check',14)}同步到 0 步</button></div>`;
  }
  function applySync(){
    const ids=[...panel.querySelectorAll('[data-we-sync-target]:checked')].map(el=>el.dataset.weSyncTarget),result=applyDataSync(work,syncPreview,ids);
    work=result.work;syncHistory=[result.transaction,...syncHistory].slice(0,SYNC_HISTORY_LIMIT);ids.forEach(id=>modelCache.delete(id));setMode('edit');renderTimeline();persist();
    const feedback=$('[data-we-sync-feedback]');feedback.hidden=false;feedback.innerHTML=uiMarkup`${icon('Check',14)}<span>已更新 ${ids.length} 个关联步骤</span><button data-we="undo-sync">撤销同步</button><button data-we="dismiss-sync" aria-label="关闭同步提示">${icon('X',13)}</button>`;
  }
  function undoSync(){
    const transaction=syncHistory[0];work=undoDataSync(work,transaction);transaction.entries.forEach(entry=>modelCache.delete(entry.id));syncHistory=syncHistory.slice(1);closePanel();setMode('edit');renderTimeline();persist();$('[data-we-sync-feedback]').hidden=true;toast(uiText('已撤销本次同步，其他编辑保持不变。'));
  }
  function openSyncHistory(){
    openPanel(uiText('同步记录'),'sync-history');
    $('.we-panel-content').innerHTML=uiMarkup`<p class="we-sync-explanation">保存最近 ${SYNC_HISTORY_LIMIT} 次同步，可从最近一次逐项撤销。记录仅保存在此浏览器，不随分享网页、作品文件或 Agent 说明书导出。</p><div class="we-sync-history-list">${syncHistory.map((transaction,index)=>{
      let reason=index?uiText('请先撤销较新的同步。'):'';
      if(!index)try{undoDataSync(work,transaction);}catch(error){reason=error.message;}
      const date=new Intl.DateTimeFormat(locale(),{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(transaction.createdAt);
      const meanings=new Map();for(const entry of transaction.entries)for(const change of semanticChanges(entry.before.doc,JSON.parse(entry.after)[0])){
        const key=JSON.stringify([change.key,change.before,change.after]),item=meanings.get(key)||{...change,steps:[]};item.steps.push(work.steps.findIndex(s=>s.id===entry.id)+1);meanings.set(key,item);
      }
      return uiMarkup`<article class="we-history-entry"><header><strong>更新 ${transaction.entries.length} 个步骤</strong><time>${esc(date)}</time></header><p>来自 ${esc(transaction.sourceTitle)}</p><details ${index===0?'open':''}><summary>查看影响范围</summary>${transaction.entries.map(entry=>{
        const step=work.steps.find(s=>s.id===entry.id),after=JSON.parse(entry.after)[0];
        return `<div class="we-history-target"><strong>${step?uiMessage`第 ${work.steps.indexOf(step)+1} 步 · ${esc(stepName(step))}`:uiText('已移除的步骤')}</strong><span>${entry.before.doc.data.length===after.data.length?uiMessage`${after.data.length} 行`:uiMessage`${entry.before.doc.data.length} → ${after.data.length} 行`}</span>${after.title!==transaction.sourceTitle?`<small>${esc(after.title)}</small>`:''}</div>`;
      }).join('')}${[...meanings.values()].map(change=>`<p class="we-history-meaning"><strong>${esc(change.label)}</strong>${change.steps.length<transaction.entries.length?` · ${change.steps.map(n=>n?uiMessage`第 ${n} 步`:uiText('已移除的步骤')).join('、')}`:''}<br>${esc(semanticValue(change.before))} → ${esc(semanticValue(change.after))}</p>`).join('')}</details>${reason?`<p class="we-history-reason">${esc(reason)}</p>`:uiText('<p class="we-history-hint">撤销将恢复这些步骤的数据、单位与来源，保留现有样式和节奏。</p>')}<button class="button small" data-we="undo-history" ${reason?'disabled':''}>撤销这次同步</button></article>`;
    }).join('')}</div>`;
  }
  function copyFallback(text,label=uiText('Agent 说明书')){openPanel(uiMessage`复制 ${label}`,'copy');$('.we-panel-content').innerHTML=uiText('<p>完整说明书已选中，可直接复制。</p><textarea aria-label="Agent 制作说明书"></textarea>');const area=panel.querySelector('textarea');area.value=text;area.focus();area.select();}
  async function copyImage(){
    closeCopyMenu();const snapshot=clone(work),step=snapshot.steps.find(s=>s.id===snapshot.activeStep),button=$('[data-we=copy]');
    const promise=copyPNGImage(()=>svgPNGBlob(stepSVG(step,snapshot.steps),{ratio:step.options.ratio,longEdge:2400}));
    button.disabled=true;
    try{await promise;if(!disposed)toast(uiText('图片已复制。前往 PowerPoint、Word 或 Keynote 粘贴即可。'));}
    catch(error){if(!disposed)toast(error.message);}
    finally{if(!disposed)button.disabled=false;}
  }
  async function copyAgent(){closeCopyMenu();const text=workAgentBrief(work);try{await win.navigator.clipboard.writeText(text);if(!disposed)toast(uiMessage`已复制 ${work.steps.length} 步的提示词与原版动效模板。`);}catch{if(!disposed)copyFallback(text);}}
  function closeCopyMenu(focus=false){$('.we-copy-menu').hidden=true;$('[data-we=copy-options]').setAttribute('aria-expanded','false');if(focus)$('[data-we=copy-options]').focus();}
  function copyMenu(){const menu=$('.we-copy-menu'),open=menu.hidden;menu.hidden=!open;$('[data-we=copy-options]').setAttribute('aria-expanded',String(open));if(open)menu.querySelector('button').focus();}
  async function copyAlternative(format){
    if(format==='agent')return copyAgent();
    if(format==='png')return copyImage();
    const snapshot=clone(work),step=snapshot.steps.find(s=>s.id===snapshot.activeStep);closeCopyMenu(true);
    let text,label;
    if(format==='json'){text=JSON.stringify(snapshot,null,2);label=uiText('作品 JSON');}
    else if(format==='svg'){text=stepSVG(step,snapshot.steps);label=uiText('当前步骤 SVG');}
    else{text=workHTML(snapshot,await loadWorkRuntime(snapshot));label=uiText('互动网页代码');}
    try{await win.navigator.clipboard.writeText(text);if(!disposed)toast(uiMessage`${label}已复制。`);}catch{if(!disposed)copyFallback(text,label);}
  }
  function renderTimeline(){
    thumbnails.forEach(s=>s.destroy());thumbnails=[];
    $('.we-step-list').innerHTML=work.steps.map((s,i)=>uiMarkup`${i?uiMarkup`<button class="we-connector" data-we-pair="${s.id}" aria-label="预览第 ${i} 步到第 ${i+1} 步的过渡" title="${esc(transitionPlan(work.steps[i-1],s).name)}">${icon('ArrowRight',16)}<small>过渡</small></button>`:''}<div class="we-step-item ${s.id===work.activeStep?'active':''}" data-we-step-item="${s.id}" draggable="true"><button data-we-step="${s.id}" aria-pressed="${s.id===work.activeStep}" title="${esc(s.doc.title)}"><span class="we-thumb" aria-hidden="true" data-we-thumb="${s.id}"></span><span class="we-step-label"><small>${String(i+1).padStart(2,'0')}</small><strong>${esc(stepName(s))}</strong></span><span class="we-step-data">${esc(s.doc.title)}</span></button><div class="we-step-move"><button data-we-move="${s.id}:-1" ${i===0?'disabled':''} aria-label="第 ${i+1} 步前移">${icon('ArrowLeft',11)}</button><button data-we-move="${s.id}:1" ${i===work.steps.length-1?'disabled':''} aria-label="第 ${i+1} 步后移">${icon('ArrowRight',11)}</button></div></div>`).join('')+uiMarkup`<button class="we-step-add" data-we="add" ${work.steps.length>=STEP_LIMIT?'disabled':''}>${icon('Plus',21)}<span>添加一步</span></button>`;
    if(stepsOpen)for(const s of work.steps){const target=$(`[data-we-thumb="${s.id}"]`);thumbnails.push(createStepScene(target,s,{width:300,height:155,progress:1,compact:true,interactive:false,domain:stepDomain(s,work.steps)}));}
    check();
  }
  function highlight(){host.querySelectorAll('[data-we-step]').forEach(b=>{const yes=b.dataset.weStep===work.activeStep;b.setAttribute('aria-pressed',String(yes));b.closest('.we-step-item').classList.toggle('active',yes);});check();}
  function setTool(next){tool=next;const data=$('.dw-data');if(!data)return;data.dataset.workTool=tool;
    data.querySelectorAll('[data-we-tool]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.weTool===tool)));
  }
  function setCanvasFocus(value){
    root.classList.toggle('we-focus-mode',value);editor?.setCanvasFocus(value);
  }
  function inspectChart(selection){
    if(root.classList.contains('we-focus-mode'))return;
    root.classList.remove('we-tools-hidden');updateToolsToggle();
    setTool(selection.type==='meta'?'style':'data');
    if(selection.type==='meta'){
      const details=$('.we-metadata-fields');if(details)details.open=true;
      host.querySelectorAll('[data-meta-field]').forEach(field=>field.classList.toggle('is-inspected',field.dataset.metaField===selection.key));
      const field=[...host.querySelectorAll('[data-meta-field]')].find(el=>el.dataset.metaField===selection.key);
      const pane=$('.we-style-panel');if(field&&pane&&win.innerWidth>820){const bounds=field.getBoundingClientRect(),view=pane.getBoundingClientRect();if(bounds.top<view.top||bounds.bottom>view.bottom)pane.scrollTop+=bounds.top-view.top-16;}
    }
  }
  function updateToolsToggle(){const hidden=root.classList.contains('we-tools-hidden'),button=$('[data-we=collapse]');button.setAttribute('aria-expanded',String(!hidden));button.setAttribute('aria-label',uiText(hidden?'展开编辑工具':'收起编辑工具'));button.title=button.getAttribute('aria-label');}
  function annotationStack(){if(!annotationHistory.has(work.id))annotationHistory.set(work.id,{undo:[],redo:[]});return annotationHistory.get(work.id);}
  async function commitAnnotation(result,label){
    work=result.work;const history=annotationStack();history.undo.push(result.transaction);history.undo=history.undo.slice(-20);history.redo=[];
    tool='annotations';renderEditor();renderTimeline();persist();await flush({checkpoint:true,label});toast(uiText('标注已应用，可在标注栏目中撤销。'));
  }
  async function restoreAnnotation(direction){
    const history=annotationStack(),stack=history[direction],transaction=stack.at(-1);if(!transaction)return;
    const next=undoAnnotation(work,transaction,{redo:direction==='redo'});work=next;stack.pop();history[direction==='undo'?'redo':'undo'].push(transaction);
    for(const entry of transaction.entries)annotationDrafts.delete(entry.id);
    renderEditor();renderTimeline();persist();await flush({checkpoint:true,label:direction==='undo'?uiText('撤销标注前'):uiText('重做标注前')});toast(uiText('标注操作已更新，数据和其他设置保留。'));
  }
  function renderStyle(){
    const s=active(),target=$('.we-style-panel');
    target.innerHTML=uiMarkup`<h3>图表配色</h3><div class="we-palette-presets">${Object.entries(palettes).map(([id,p])=>`<button data-we-palette="${id}" aria-pressed="${!s.options.colors&&s.options.palette===id}"><span>${p.colors.slice(0,6).map(c=>`<i style="background:${c}"></i>`).join('')}</span>${p.name}</button>`).join('')}</div><div class="we-custom-colors"></div><label class="we-field">画幅<select data-we-setting="ratio">${[['wide',uiText('横版 16:10')],['landscape',uiText('横版 16:9')],['square',uiText('方形 1:1')],['portrait',uiText('竖版 3:4')],['story',uiText('竖版 9:16')]].map(([id,name])=>`<option value="${id}" ${s.options.ratio===id?'selected':''}>${name}</option>`).join('')}</select></label>`;
    target.insertAdjacentHTML('afterbegin',uiMarkup`<details class="we-metadata-fields"><summary>标题与坐标轴</summary><div>${editor.metadataFields()}</div></details>`);
    colors?.destroy();colors=mountColorEditor($('.we-custom-colors'),{getDoc:()=>active().doc,getOptions:()=>active().options,onChange(options){editor.setOptions(options);}});
    target.insertAdjacentHTML('afterbegin',uiMarkup`<div class="we-brand-entry"><button class="text-button" data-we="brand"><span><strong>品牌样式</strong><small>${esc(s.options.brand?.name||uiText('配色、字体、Logo 与画幅'))}</small></span>${icon('ArrowRight',15)}</button>${brandTransaction?.workId===work.id?uiText('<button class="text-button" data-we="undo-brand">撤销上次品牌应用</button>'):''}</div>`);
  }
  async function openBrand(resume){
    openPanel(uiText('品牌样式'),'brand');const epoch=brandEpoch;$('.we-panel-content').innerHTML=uiText('<p role="status">正在读取品牌方案…</p>');
    const {mountBrandPanel}=await import('./brand-panel.js');if(disposed||epoch!==brandEpoch)return;
    brandPanel=mountBrandPanel($('.we-panel-content'),{repository,resume,step:clone(active()),steps:clone(work.steps),async onApply(profile,ids){
      if(!await flush())throw new Error(uiText('当前修改尚未保存，请先重试保存，再应用品牌样式。'));
      if(disposed||epoch!==brandEpoch)return;
      const result=applyBrandStyle(work,profile,ids);work=result.work;brandTransaction=result.transaction;tool='style';setMode('edit');renderTimeline();persist();await flush({checkpoint:true,label:uiText('应用品牌样式前')});toast(uiMessage`已将「${profile.name}」应用到 ${ids.length} 步。`);
    }});await brandPanel.ready;
  }
  function renderTransition(){
    const s=active(),i=work.steps.indexOf(s),plan=i?transitionPlan(work.steps[i-1],s):null;
    $('.we-transition-panel').innerHTML=uiMarkup`<h3>阅读节奏</h3>${i?'':uiMarkup`<label class="we-field">第一步入场<select data-we-setting="duration">${[...new Set([900,1500,2400,4000,s.duration])].sort((a,b)=>a-b).map(n=>uiMarkup`<option value="${n}" ${s.duration===n?'selected':''}>${n/1000} 秒</option>`).join('')}</select></label>`}<label class="we-field">当前画面停留<select data-we-setting="hold">${[...new Set([1200,2200,4000,6000,s.hold])].sort((a,b)=>a-b).map(n=>uiMarkup`<option value="${n}" ${s.hold===n?'selected':''}>${n/1000} 秒</option>`).join('')}</select></label>${i?uiMarkup`<p>${esc(plan.reason)}。点击底部两步之间的箭头，可以试播这一段并调整效果。</p><button class="button" data-we-pair="${s.id}">${icon('Play')}预览与设置过渡</button>`:uiText('<p>这是作品的第一步。添加下一步后，可点击两步之间的箭头设置过渡。</p>')}`;
  }
  function openTransition(id){
    const index=work.steps.findIndex(s=>s.id===id);if(index<1)return;
    const a=work.steps[index-1],b=work.steps[index];
    if(!stepReport(a).valid||!stepReport(b).valid){toast(uiText('请先修正这两步的数据，再预览过渡。'));return;}
    openPanel(uiMessage`步骤 ${String(index).padStart(2,'0')} → ${String(index+1).padStart(2,'0')} · 过渡`,'transition');pairStepId=id;
    const plan=transitionPlan(a,b);
    $('.we-panel-content').innerHTML=uiMarkup`<div class="we-pair-preview"></div><div class="we-pair-description"><strong>${esc(uiText(plan.name))}</strong><span>${esc(plan.reason)}</span><button class="text-button" data-we="replay-pair">${icon('Play',13)}重播这一段</button></div><div class="we-pair-fields"><label class="we-field">数据关系<select data-we-pair-setting="relation">${[['auto',uiText('自动识别来源')],['related',uiText('同一批对象，按记录 ID 对应')],['separate',uiText('独立内容，完整切换')]].map(([id,name])=>`<option value="${id}" ${b.relation===id?'selected':''}>${name}</option>`).join('')}</select></label><label class="we-field">过渡效果<select data-we-pair-setting="transition">${availableTransitions(a,b).map(({id,name,disabled})=>`<option value="${id}" ${b.transition===id?'selected':''} ${disabled?'disabled':''}>${name}${disabled?uiText(' · 需对应数据'):''}</option>`).join('')}</select></label><label class="we-field">数值刻度<select data-we-pair-setting="scale"><option value="shared" ${b.scale!=='step'?'selected':''}>同组数据共用刻度</option><option value="step" ${b.scale==='step'?'selected':''}>当前步骤独立刻度</option></select></label><label class="we-field">过渡时长<select data-we-pair-setting="duration">${[800,1000,1500,2400,3200].map(n=>uiMarkup`<option value="${n}" ${b.duration===n?'selected':''}>${n/1000} 秒</option>`).join('')}</select></label></div><p class="we-pair-footnote">${esc(uiText(plan.description))} 刻度设置适用于柱、条、折线等数值轴图型。</p>`;
    pairPlayer=mountWorkPlayer($('.we-pair-preview'),{...clone(work),steps:[clone(a),clone(b)],activeStep:a.id},{showSteps:false});pairPlayer.previewPair(id);
  }
  function renderEditor({animate=false}={}){
    const inspectionState=editor?.getInspection();
    annotationPanel?.destroy();annotationPanel=null;canvasView=editor?.getViewport()||canvasView;editor?.destroy();colors?.destroy();player?.destroy();player=null;
    const step=active();let lastRenderable=clone(step);const record={key:step.id,doc:clone(step.doc),options:clone(step.options),...(step.draft?{draft:clone(step.draft)}:{})};
    editor=mountDataWorkspace($('.we-edit-host'),{records:[record],activeKey:record.key,toast,onActive(){},onRemove(){},onSave(){},
      onChange(r){if(JSON.stringify(step.doc.data)!==JSON.stringify(r.doc.data))recordUsage('data-edit');step.doc=clone(r.doc);step.draft=clone(r.draft);step.options=clone(r.options);renderLegend();annotationPanel?.refresh();persist();check();win.clearTimeout(thumbnailTimer);thumbnailTimer=win.setTimeout(()=>{if(!disposed)renderTimeline();},400);},
      modelCache,inspectionState,viewportState:canvasView,view:stepView(step),onRecommendCharts:recommendCharts,onMultivariateView(view){editor.commitPending();if(!editor.getReport().valid){toast(uiText('请先修正当前数据，再聚焦变量对。'));return;}applyStep(makeStep({...step,view}),{replace:true});if(view==='multivariate-matrix')editor.focusMultivariatePair(step.doc.selectedPair);else $('[data-variable-view]')?.focus({preventScroll:true});},onInspect:inspectChart,onCanvasFocus(value){setCanvasFocus(value??!root.classList.contains('we-focus-mode'));},animateOnMount:animate,playbackTiming:()=>({duration:step.duration,hold:step.hold}),viewValidation:step.view?doc=>stepEligibility({...step,doc}):undefined,
      createScene(target,doc,options){const next={...step,doc};if(!step.view||stepEligibility(next).valid)lastRenderable=clone(next);if(lastRenderable.view&&!stepEligibility(lastRenderable).valid){target.innerHTML=uiText('<p class="we-render-error">请修正数据，或更换适合当前数据的图型。</p>');return {render(){},destroy(){target.replaceChildren();}};}return createStepScene(target,lastRenderable,{...options,axisLabels:true,domain:stepDomain(lastRenderable,work.steps.map(s=>s.id===step.id?lastRenderable:s))});},
      onHelp(helpMode){if(helpMode==='agent'){copyAgent();return true;}if(!step.view)return false;const recommendationId=step.view===stepView({doc:step.doc})?step.doc.template:catalog.find(t=>stepView({doc:{template:t.id}})===step.view)?.id;const recommendation=recommendedUseHTML(recommendationId);if(isScientificView(step.view)){openPanel(uiMessage`图表指南 · ${stepName(step)}`,'help');$('.we-panel-content').innerHTML=recommendation+scientificGuide(scientificDocument(step),step.view).map((p,i)=>`<p${i===0?' class="we-help-lead"':''}>${esc(p)}</p>`).join('');return true;}if(isRelationalView(step.view)){openPanel(uiMessage`图表指南 · ${stepName(step)}`,'help');$('.we-panel-content').innerHTML=uiMarkup`${recommendation}<p class="we-help-lead">${esc(relationalViews.find(v=>v.id===step.view).note)}</p>${isPairedView(step.view)?uiText('<p>适合干预前后、重复测量及两个时期的业务比较。一行填写同一对象的名称、前值和后值，两个数使用相同单位。名称保持唯一，缺少任一次观测时需要先补齐记录；连线本身不代表因果。</p><p>样本较多时可使用配对散点图和配对变化图，最多 50 对；斜率图、哑铃图与成对柱图适合较少对象。变化量由后值减前值计算，不改动原始两列，也不自动生成统计显著性。</p>'):uiText('<p>适合预算分配、科研工时、学科结构和组织内的类别构成。一行填写父类别、子项和数值，数值为相同单位的正数；不另外填写父级总计，系统由子项求和，避免重复计数。</p><p>同一父类别中的子项名称保持唯一，不同父类别可以有同名子项。支持 2–6 个父类别、每类 2–6 个子项，合计 6–24 项。切换图型时，表格与层级关系保持不变。</p>')}<p>在「沿用当前数据」中任意选择适用图型，可以直接从第一步切到第三步，也可自由调整顺序。若两步使用独立数据，需先确认对象对应、观测名称和单位，才能连续变形。</p>`;return true;}if(isSeriesView(step.view)){openPanel(uiMessage`图表指南 · ${stepName(step)}`,'help');$('.we-panel-content').innerHTML=uiMarkup`${recommendation}<p class="we-help-lead">${esc(seriesViews.find(v=>v.id===step.view).note)}</p><p>填写时期、系列和数值三列。同一系列的单位与名称保持一致；每个时期需要全部系列，每个组合只填写一行。支持 2–36 个时期、2–6 个系列。</p><p>分组柱和多折线允许负数、零值和缺失观测。堆叠图需要完整且可相加的非负数据；百分比图每期总量须大于零，保留输入原值，由图表计算占比。用于折线和面积时，时期应按等间隔的时间顺序排列。</p>`;return true;}openPanel(uiMessage`图表指南 · ${stepName(step)}`,'help');$('.we-panel-content').innerHTML=uiMarkup`${recommendation}<p class="we-help-lead">${esc([...morphViews,...seriesViews].find(v=>v.id===step.view).note)}</p><h3>适用场景</h3><p>${['pie','donut','semidonut','treemap','waffle','stacked'].includes(step.view)?uiText('适合展示可相加的类别构成，比较各部分在整体中的份额。'):uiText('适合比较一组类别的数量。折线和面积图需要类别具有明确顺序；累计类图表需要数值可相加。')}</p><h3>如何填写</h3><p>一行填写一个类别，名称用于显示并保持可区分。记录 ID 由系统保留；当前图型的布局容量会单独提示，超出容量不会删除原始数据。柱、条、折线等支持正负数和零值；柱、条、折线和面积保留缺失观测。饼、环等占比图不接受负数或缺失值，且总量必须大于零。标题、单位与来源说明这一组数据的含义；可以从 Excel 复制两列数据，选中起始单元格直接粘贴。</p><p>当前步骤使用自己的数据副本。连续变形会核对记录 ID、数据家族、单位和观测定义；同名或相同单位本身不代表同一批对象。独立选入的数据默认完整切换，可在两步之间的过渡设置中明确关联。</p>`;return true;}
    });
    const data=$('.dw-data'),meta=data.querySelector('.dw-data-meta'),extra=win.document.createElement('details');extra.className='we-extra-data';extra.innerHTML=uiText('<summary>来源与图表参数</summary>');meta.before(extra);extra.append(meta);data.insertAdjacentHTML('afterbegin',uiMarkup`<div class="we-inspector-tabs" role="tablist" aria-label="当前步骤工具">${[['data',uiText('数据')],['style',uiText('样式')],['transition',uiText('节奏')],['annotations',uiText('标注')]].map(([id,name])=>`<button role="tab" data-we-tool="${id}" aria-selected="${tool===id}">${name}</button>`).join('')}</div>`);
    data.insertAdjacentHTML('beforeend','<section class="we-style-panel"></section><section class="we-transition-panel"></section><section class="we-annotation-panel"></section>');
    const actions=win.document.createElement('div');actions.className='we-inspector-actions';actions.append(data.querySelector('[data-workspace=help]'),data.querySelector('[data-workspace=import]'));data.querySelector('.we-inspector-tabs').append(actions);
    data.querySelector('[data-workspace=help]').setAttribute('aria-label',uiMessage`如何填写${stepName(step)}的数据`);
    $('.dw-artboard>footer').insertAdjacentHTML('beforebegin','<div class="we-edit-legend"></div>');renderLegend();
    renderStyle();renderTransition();setTool(tool);check();updateToolsToggle();editor.setCanvasFocus(root.classList.contains('we-focus-mode'));
    annotationPanel=mountAnnotationPanel($('.we-annotation-panel'),{getWork:()=>work,getStep:active,drafts:annotationDrafts,selectedRecords:()=>editor?.selectedRecords()||[],supportsObjects:()=>editor?.supportsAnnotationObjects(),
      onApply:async(a,ids)=>{if(!stepReport(active()).valid)throw new Error(uiText('请先修正当前表格，再绑定标注。'));await commitAnnotation(applyAnnotation(work,active().id,a,ids),uiText('应用标注前'));},
      onRemove:async id=>commitAnnotation(removeAnnotation(work,active().id,id),uiText('移除标注前')),onHistory:restoreAnnotation,
      getHistory:()=>({undo:annotationStack().undo.length>0,redo:annotationStack().redo.length>0}),
      onLocate:id=>{if(editor.highlightRecord(id))setTool('data');else toast(uiText('原记录已移除，请重新定位。'));},onPreview:fraction=>editor.seek(fraction)});
    if(step.view){const label=$('.dw-artboard>header>.mono');if(label)label.textContent=`FORMA / ${stepName(step)}`;for(const button of host.querySelectorAll('.dw-axis-controls [data-edit-meta^="axes."]'))button.hidden=true;}
  }
  function renderLegend(){const legend=$('.we-edit-legend'),s=active(),doc=morphDocument(s);if(!legend)return;legend.hidden=!doc||doc.data.length>24||isScientificView(stepView(s))||isSeriesView(stepView(s))||isRelationalView(stepView(s))||!$('.dw-chart [data-morph-chart]');if(legend.hidden)return;const colors=themeFor(s.options.palette,s.options.dark,s.options.colors).colors,key=findTemplate(s.doc.template).fields.find(f=>['label','period','date'].includes(f[0]))?.[0];legend.innerHTML=doc.data.map((r,i)=>uiMarkup`<button data-edit-row="${i}" data-edit-field="${key}" title="编辑类别 ${esc(r.label)}"><i style="background:${colors[i%colors.length]}"></i><small>${String(i+1).padStart(2,'0')}</small><span>${esc(r.label)}</span></button>`).join('');}
  function setMode(next){
    if(next==='preview'&&!workReport(work).valid){toast(workReport(work).message);return;}
    closePanel();setCanvasFocus(false);mode=next;root.dataset.mode=mode;$('.we-edit-host').hidden=mode!=='edit';$('.we-preview-host').hidden=mode!=='preview';
    $('[data-we=edit]').setAttribute('aria-pressed',String(mode==='edit'));$('[data-we=preview]').setAttribute('aria-pressed',String(mode==='preview'));
    if(mode==='preview'){annotationPanel?.destroy();annotationPanel=null;editor?.destroy();editor=null;colors?.destroy();colors=null;player?.destroy();player=mountWorkPlayer($('.we-preview-host'),work,{showSteps:false,editableTiming:true,onTimingChange(value){for(const step of work.steps)step.hold=value.steps.find(s=>s.id===step.id)?.hold??step.hold;renderTimeline();persist();},onStep(id){work.activeStep=id;highlight();persist();}});}else renderEditor();
    highlight();
  }
  function chooseStep(id){if(!work.steps.some(s=>s.id===id))return;work.activeStep=id;if(mode==='preview')player.select(id);else renderEditor({animate:true});highlight();persist();}
  function chartChangeStack(id=active().id){return chartChanges.get(JSON.stringify([work.id,id]))||[];}
  function chartContent(step){return canonical([step.view||null,createEditorModel(step.doc,step.draft).snapshot]);}
  function currentDataReport(){const step=active();return modelCache.get(step.id)?.report||createEditorModel(step.doc,step.draft).report;}
  function requireCurrentData(){editor?.commitPending();if(!currentDataReport().dataValid)throw Error(uiText('请先修正表格中未完成的数据，再用当前数据更换图表。'));}
  function applyStep(step,{replace=false,message}={}){
    if(!replace&&work.steps.length>=STEP_LIMIT){toast(uiMessage`一个作品最多 ${STEP_LIMIT} 步。`);return;}
    if(replace){
      const previous=active(),index=work.steps.indexOf(previous),session=modelCache.get(previous.id)?.captureSession(),before=clone(previous);
      step.id=previous.id;step.transition=previous.transition;step.duration=previous.duration;step.hold=previous.hold;if(previous.options.annotations&&!step.options.annotations)step.options.annotations=clone(previous.options.annotations);
      // The model's view validator closes over its step. Rebuild it for the new
      // view while retaining cell history only when the actual document matches.
      const sameDocument=canonical(createEditorModel(previous.doc,previous.draft).snapshot)===canonical(createEditorModel(step.doc,step.draft).snapshot);
      if(session&&sameDocument){step.draft=clone(session.current);modelCache.set(step.id,createEditorModel(step.doc,step.draft,{session,viewValidation:step.view?doc=>stepEligibility({...step,doc}):undefined}));}else modelCache.delete(step.id);
      work.steps[index]=step;
      const key=JSON.stringify([work.id,step.id]),stack=chartChangeStack(step.id);stack.push({before,session,after:chartContent(step)});chartChanges.set(key,stack.slice(-10));
    }else work.steps.splice(work.steps.indexOf(active())+1,0,step);
    work.activeStep=step.id;stepsOpen=true;closePanel();setMode('edit');renderTimeline();persist();
    if(message)toast(message);
  }
  function undoChartChange(){
    editor?.commitPending();const current=active(),stack=chartChangeStack(),transaction=stack.at(-1);if(!transaction)return;
    if(chartContent(current)!==transaction.after)throw Error(uiText('更换后的数据或图型已修改。请先撤销后续的数据编辑，再撤销更换，避免覆盖新内容。'));
    const previous={...clone(transaction.before),options:clone(current.options),transition:current.transition,duration:current.duration,hold:current.hold,scale:current.scale};
    work.steps[work.steps.indexOf(current)]=previous;stack.pop();
    if(transaction.session)modelCache.set(previous.id,createEditorModel(previous.doc,transaction.session.current,{session:transaction.session,viewValidation:previous.view?doc=>stepEligibility({...previous,doc}):undefined}));else modelCache.delete(previous.id);
    closePanel();setMode('edit');renderTimeline();persist();toast(uiText('已撤销更换，恢复原图表与表格编辑记录。'));
  }
  async function recommendCharts({source,header=true,original,options}={}){
    try{
      requireCurrentData();const target=active(),token=canonical([work.id,target.id,target.doc,target.draft]),epoch=++recommendationEpoch;
      const {openTaskPicker}=await import('./task-picker.js');if(disposed||epoch!==recommendationEpoch||active().id!==target.id)return;
      recommendationPicker?.close();recommendationPicker=openTaskPicker({initialSource:source,initialHeader:header,original:original||clone(target.doc),initialMetadata:{title:target.doc.title,subtitle:target.doc.subtitle||'',unit:target.doc.unit,source:target.doc.source.name},options:options||clone(target.options),isCurrent:()=>!disposed&&canonical([work.id,active().id,active().doc,active().draft])===token,onUse(doc,{sameData=false}={}){
        if(disposed||canonical([work.id,active().id,active().doc,active().draft])!==token){toast(uiText('当前数据已变化，请重新打开图表推荐。'));return;}
        requireCurrentData();applyStep(makeStep({doc,options:target.options,...(sameData?{dataGroup:target.dataGroup,relation:target.relation}:{})}),{replace:true,message:uiText('已用你的数据更换图表，可撤销更换。')});
      }});
    }catch(error){toast(error.message);}
  }
  function sources(){return [...work.steps.filter(s=>s.id!==active().id&&stepReport(s).valid).map(s=>({doc:s.doc,options:s.options,view:s.view,dataGroup:s.dataGroup,group:uiText('本作品')})),...getSources().filter(r=>!r.disabled)];}
  function picker(action='add',tab='reuse'){
    pickerMode=action;pickerTab=tab;openPanel(action==='add'?uiText('添加下一步'):action==='type'?uiText('更换图型'):uiText('选择当前步骤的数据'),'picker');
    $('.we-panel-content').innerHTML=`<div class="we-picker-tabs">${[['reuse',uiText('沿用当前数据')],['sources',uiText('已有图表')],['library',uiText('图表库')]].map(([id,name])=>`<button data-we-picker-tab="${id}" aria-pressed="${tab===id}">${name}</button>`).join('')}</div><div class="we-picker-body"></div>`;
    renderPickerTab();
  }
  function renderPickerTab(){
    renderPickerContent();if(pickerTab!=='reuse')return;
    const body=$('.we-picker-body'),recommendations=recommendedTransitions(active());if(!recommendations.length)return;
    const recommended=new Map(recommendations.map(r=>[r.view,r]));
    body.querySelectorAll('[data-we-view],[data-we-series-view],[data-we-relational-view],[data-we-scientific-view]').forEach(button=>{
      const id=button.dataset.weView||button.dataset.weSeriesView||button.dataset.weRelationalView||button.dataset.weScientificView,recommendation=recommended.get(id);if(!recommendation)return;
      button.dataset.recommended='true';button.title=recommendation.note||button.title;
    });
    if(!body.querySelector('.we-recommendation-note'))body.insertAdjacentHTML('beforeend',uiMarkup`<p class="we-recommendation-note"><strong>变化说明</strong>${esc(uiText(recommendations[0].reason))}</p>`);
  }
  function renderPickerContent(){
    panel.querySelectorAll('[data-we-picker-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wePickerTab===pickerTab)));
    const body=$('.we-picker-body');
    if(pickerTab==='reuse'){
      if(!currentDataReport().dataValid){body.innerHTML=uiMarkup`<p class="we-picker-note">当前表格还有未完成的数据。先修正表格，再选择适用图型；原始输入与撤销记录保留。</p><button class="button" data-we="repair-data">返回数据表</button>`;return;}
      const choices=recommendedTransitions(active());
      if(choices.some(r=>/^(matrix-|ordered-estimate-|trajectory-|spatial-)/.test(r.view))){
        body.innerHTML=uiMarkup`<p class="we-picker-note">${esc(active().doc.title)} · ${active().doc.data.length} 条原始记录。选择下一种表达，保留数据与对象对应。</p><div class="we-morph-picker we-recommended-views">${choices.map(r=>uiMarkup`<button data-we-recommended-view="${r.view}" title="${esc(r.note)}"><span class="we-view-icon">${viewIcon(r.view)}</span><span>${esc(r.name)}<small>${esc(r.note)}</small></span></button>`).join('')}</div><p class="we-recommendation-note"><strong>变化说明</strong>${esc(uiText(choices[0].reason))}</p>`;return;
      }
      const scientific=scientificDocument(active());
      if(scientific){const views=scientificViews.filter(v=>scientificFamily(v.id)===scientific.family);body.innerHTML=uiMarkup`<p class="we-picker-note">${esc(active().doc.title)} · ${scientific.data.length} 条原始记录。适用图型可以直接互转，数据逐步独立保存。</p><div class="we-morph-picker">${views.map(v=>{const eligible=scientificEligibility(scientific,v.id);return `<button data-we-scientific-view="${v.id}" aria-pressed="${stepView(active())===v.id}" title="${esc(eligible.valid?v.note:eligible.reason)}" ${eligible.valid?'':'disabled'}><span class="we-view-icon">${viewIcon(v.id)}</span><span>${uiText(v.name)}${eligible.valid?'':`<small class="we-view-reason">${esc(eligible.reason)}</small>`}</span></button>`;}).join('')}</div>`;return;}

      const relation=relationalDocument(active()),multi=seriesDocument(active()),mapped=morphDocument(active());
      if(relation){const views=relation.family==='paired'?pairedViews:hierarchyViews;body.innerHTML=uiMarkup`<p class="we-picker-note">${esc(active().doc.title)} · ${relation.data.length} ${relation.family==='paired'?uiText('个配对对象'):uiText('个层级子项')}。以下适用图型可任意互转，也可跳过中间步骤。</p><div class="we-morph-picker">${views.map(v=>{const eligibility=relationalEligibility(relation,v.id);return `<button data-we-relational-view="${v.id}" aria-pressed="${stepView(active())===v.id}" title="${esc(eligibility.valid?v.note:eligibility.reason)}" ${eligibility.valid?'':'disabled'}><span class="we-view-icon">${viewIcon(v.id)}</span><span>${uiText(v.name)}${eligibility.valid?'':`<small class="we-view-reason">${esc(eligibility.reason)}</small>`}</span></button>`;}).join('')}</div><p class="we-picker-note">${relation.family==='paired'?uiText('每个对象的前后身份保持对应；变化图自动计算后值减前值。'):uiText('父类别由子项汇总；变形期间保留完整层级和原始数值。')}</p>`;return;}
      if(multi){body.innerHTML=uiMarkup`<p class="we-picker-note">${esc(active().doc.title)} · ${new Set(multi.data.map(r=>r.period)).size} 个时期，${new Set(multi.data.map(r=>r.series)).size} 个系列。每个分项保持对应，数据独立保存。</p><div class="we-morph-picker">${seriesViews.map(v=>{const eligibility=seriesEligibility(multi,v.id);return `<button data-we-series-view="${v.id}" ${eligibility.valid?'':`disabled title="${esc(eligibility.reason)}"`}><span class="we-view-icon">${viewIcon(v.id)}</span><span>${uiText(v.name)}${eligibility.valid?'':uiText('<small>数据不适用</small>')}</span></button>`;}).join('')}</div>`;return;}
      const families=[['all',uiText('全部')],['compare',uiText('比较')],['trend',uiText('趋势')],['share',uiText('构成')],['cycle',uiText('周期')]];
      const family=id=>['line','area','step','waterfall'].includes(id)?'trend':['pie','donut','semidonut','treemap','waffle','stacked','bubbles','squares'].includes(id)?'share':['polarline','radialbars','rose','radar'].includes(id)?'cycle':'compare';
      body.innerHTML=mapped?uiMarkup`<p class="we-picker-note">${esc(active().doc.title)} · ${mapped.data.length} 个类别。选好图型后，可单独修改这一步的数据。</p><div class="we-family-filters" role="group" aria-label="按用途筛选形变图型">${families.map(([id,name])=>`<button data-we-family="${id}" aria-pressed="${id==='all'}">${name}</button>`).join('')}</div><div class="we-morph-picker">${morphViews.map(v=>{const eligibility=morphEligibility(mapped,v.id);return `<button data-we-view="${v.id}" data-we-view-family="${family(v.id)}" title="${esc(eligibility.valid?v.note:eligibility.reason)}" ${eligibility.valid?'':'disabled'}><span class="we-view-icon">${viewIcon(v.id)}</span><span>${viewName(v.id)}${!eligibility.valid?`<small class="we-view-reason">${esc(eligibility.reason)}</small>`:''}</span></button>`;}).join('')}</div>`:uiMarkup`<p>当前数据包含多个字段，或超出连续几何变形的范围。可以复制当前图表继续编辑，或从「已有图表」「图表库」选择另一张图；不同结构仍可收拢展开。</p><button class="button" data-we="duplicate">${icon('Copy')}复制当前步骤</button>`;
    }else if(pickerTab==='sources'){
      panelSources=sources();body.innerHTML=panelSources.length?`<div class="we-source-list">${panelSources.map((s,i)=>uiMarkup`<button data-we-source-index="${i}">${stepIcon(s)}<span><strong>${esc(s.doc.title)}</strong><small>${esc(s.group||uiText('已有图表'))} · ${esc(stepName(s))} · ${s.rows??s.doc.data.length} 行</small></span>${icon('Plus',13)}</button>`).join('')}</div>`:uiText('<p>还没有其他已编辑图表。可以从「图表库」选择模板，填入新的数据。</p>');
    }else{
      body.innerHTML=uiMarkup`${pickerMode!=='add'?uiText('<p class="we-picker-note" role="status">图表库使用演示数据。选择模板会替换当前步骤的图表与数据，可通过「撤销更换」恢复原表；保留自己的数据请选「沿用当前数据」或数据表中的图表推荐。</p>'):''}<label class="we-picker-search">${icon('Search')}<input data-we-search placeholder="搜索图型，如柱状、折线、科研" aria-label="搜索可添加图表"></label><div class="we-catalog-tools"><label title="按模板的连续变形能力筛选；各步是否对应，仍由实际数据决定。"><input type="checkbox" data-we-morph-only>只看可连续变形</label><span data-we-catalog-count role="status"></span></div><div class="we-catalog-list">${orderLibraryCatalog(libraryCatalog).map(t=>{const ready=t.motion==='morph';return uiMarkup`<button data-we-template="${t.id}" title="${ready?uiText('此模板可连续形变；实际取决于数据对应、单位和填写范围。'):uiText('此模板保留原生入场动画。')}"><span>${t.no}</span><strong>${esc(t.name)}</strong><small class="we-compat" data-ready="${ready}">${ready?uiText('可连续变形'):uiText('原生入场')} · ${t.fields.length} 列</small>${icon('Plus',12)}</button>`;}).join('')}</div><p class="we-catalog-empty" data-we-catalog-empty hidden>没有匹配的图表，试试其他关键词或取消动效筛选。</p>`;
      filterPickerCatalog();
    }
  }
  function filterPickerCatalog(){
    const input=$('[data-we-search]');if(!input)return;
    const list=filterCatalog(libraryCatalog,{query:input.value,motion:$('[data-we-morph-only]').checked?'morph':'all'}),ids=new Set(list.map(t=>t.id));
    panel.querySelectorAll('[data-we-template]').forEach(button=>button.hidden=!ids.has(button.dataset.weTemplate));
    $('[data-we-catalog-count]').textContent=uiMessage`${list.length} 个图表`;
    $('[data-we-catalog-empty]').hidden=list.length>0;
  }
  async function openWorks(){
    if(repository){if(!await flush())return;await repository.refresh();}else if(!flush())return;openPanel(uiText('切换作品'),'works');const current=repository?(repository.summaries?.()||repository.list()):listWorks(storage),legacy=repository?[]:legacyWorks(storage).filter(p=>!current.some(w=>w.id===p.id));
    panelSources=[...current,...legacy];$('.we-panel-content').innerHTML=uiMarkup`<button class="we-new-work button" data-we="new">${icon('Plus')}新建作品</button><div class="we-source-list">${panelSources.map((p,i)=>uiMarkup`<button data-we-open-work="${i}">${stepIcon(p.first||p.steps[0])}<span><strong>${esc(p.name)}</strong><small>${p.stepCount??p.steps.length} 步 · ${p.id.startsWith('sequence:')?uiText('原有组合'):uiText('作品')}</small></span>${p.id===work.id?icon('Check'):icon('ArrowRight',13)}</button>`).join('')}</div>`;
  }
  async function nextReport(){
    editor?.commitPending();if(!workReport(work).valid){toast(workReport(work).message);return;}
    if(!await flush({checkpoint:true,label:workflowEnglish()?'Before creating next report':'制作下一期前'}))return;
    const base=cleanWork(work),sourceId=active().id,token=reportFingerprint(base);
    openDataImporter(clone(active().doc),{isCurrent:()=>!disposed&&reportFingerprint(work)===token,viewValidation:doc=>{const report=stepReport({...base.steps.find(s=>s.id===sourceId),doc,draft:undefined});return {valid:report.valid,reason:report.errors?.[0]||report.cellErrors?.[0]?.message};},async onApply(doc){
      const {openReportUpdate}=await import('./report-update-panel.js');if(disposed)return;
      openReportUpdate(base,sourceId,doc,{getWork:()=>work,async onApply(next){
        if(!await flush())throw Error(workflowEnglish()?'Save the original work first.':'请先保存原报告。');
        if(repository){await repository.save(next,{saved:true});await loadStored(await repository.get(next.id));}
        else{const state=readWorks(storage);writeWorks(storage,[...state.projects.filter(p=>p.id!==work.id),cleanWork(work),next],next);await loadStored({work:next,syncHistory:[]});}
        annotationDrafts.clear();annotationHistory.clear();brandTransaction=null;removed=null;toast(workflowEnglish()?'New report created. Original retained.':'已创建新报告，原报告保留。');
      }});
    }});
  }
  function exportPanel(){openPanel(uiText('导出作品'),'export');$('.we-panel-content').innerHTML=uiMarkup`<p class="we-export-label">完整作品 · ${work.steps.length} 步</p><button data-we-download="html"><strong>互动网页 HTML</strong><span>保留每步数据、点击切换与自动播放</span>${icon('Download')}</button><button data-we="video"><strong>动画视频 · PowerPoint</strong><span>${timelineTime(workVideoPlan(work).timeline.duration)} · 含入场、形变与每步停留</span>${icon('Download')}</button><button data-we="pptx"><strong>PowerPoint · PPTX</strong><span>${workflowEnglish()?'One slide per step, or a slide with embedded animation':'每步一张幻灯片，或嵌入完整动画'}</span>${icon('Download')}</button><button data-we-download="project"><strong>可编辑作品文件</strong><span>保存全部数据、图型、顺序与设置</span>${icon('Download')}</button><button data-we="copy-image"><strong>复制图片 · PPT / Word</strong><span>粘贴当前步骤的完整静态画面 · 2400 px</span>${icon('Copy')}</button><p class="we-export-label">当前步骤 · ${esc(stepName(active()))}</p><button data-we-download="png"><strong>PNG 图片</strong><span>${outputDimensions(active().options.ratio).width} × ${outputDimensions(active().options.ratio).height} · 适合文档与演示</span>${icon('Download')}</button><button data-we-download="svg"><strong>SVG 矢量图</strong><span>设置画幅、透明背景与输出尺寸</span>${icon('Download')}</button><p class="we-export-scope">HTML、SVG 和作品文件包含完整原始数据及未映射列；不包含本地撤销历史。PNG 与 MP4 只包含可见画面。</p>${!active().view?uiText('<button data-we="advanced-export"><strong>单图视频与更多尺寸</strong><span>打开当前图表的详细导出设置</span>↗</button>'):''}`;}
  function videoPanel(){
    openPanel(uiText('导出整段视频'),'video');
    const plan=workVideoPlan(work);
    $('.we-panel-content').innerHTML=uiMarkup`<p>完整 ${work.steps.length} 步 · ${timelineTime(plan.timeline.duration)}。按作品顺序逐帧生成，保留图表入场与步骤间的形变。</p><p class="we-office-hint">下载 MP4 后，在 PowerPoint 中选择「插入 → 视频 → 此设备」。图片粘贴不会保留动画。</p><div class="we-video-settings"><label class="we-field">视频画幅<select data-we-video="ratio"><option value="landscape">横版 16:9</option><option value="wide">横版 16:10</option><option value="square">方形 1:1</option><option value="portrait">竖版 3:4</option><option value="story">竖版 9:16</option></select></label><label class="we-field">最长边<select data-we-video="longEdge"><option value="1920">1920 px</option><option value="1280">1280 px</option><option value="1080">1080 px</option><option value="720">720 px</option></select></label><label class="we-field">帧率<select data-we-video="fps"><option value="30">30 fps</option><option value="24">24 fps</option><option value="60">60 fps</option></select></label></div><button class="button dark we-video-start" data-we="encode-video">${icon('Download')}生成 MP4</button><div class="we-video-status" role="status" aria-live="polite"><span>整段使用统一画幅，源数据和编辑设置保持不变。</span><progress max="1" value="0" hidden aria-label="视频导出进度"></progress></div><div class="we-video-result" hidden><video controls playsinline aria-label="整段 MP4 预览"></video><a class="button dark" download>下载 MP4</a></div><button class="text-button we-video-cancel" data-we="cancel-video" hidden>取消生成</button>`;
    $('[data-we-video=ratio]').value=plan.ratio;
  }
  function pptxPanel(){
    const t=(zh,en)=>workflowEnglish()?en:zh;
    openPanel('PowerPoint · PPTX','pptx');
    $('.we-panel-content').innerHTML=`<p>${t('静态版保留每步的完整画面；动画版将整段视频嵌入一张幻灯片。','Static slides preserve each complete frame. The animated option embeds the full video in one slide.')}</p><label class="we-field">${t('内容','Content')}<select data-pptx-mode><option value="static">${t('每步一张静态幻灯片','One static slide per step')}</option><option value="motion">${t('完整动画 · 嵌入 MP4','Full animation · Embedded MP4')}</option></select></label><label class="we-field">${t('幻灯片画幅','Slide size')}<select data-pptx-ratio><option value="landscape">16:9</option><option value="wide">16:10</option><option value="square">1:1</option><option value="portrait">3:4</option><option value="story">9:16</option></select></label><p>${t('图表以高清图片或视频放入，字体和标注保持一致。修改数据请保留可编辑作品文件。','Charts are placed as high-resolution images or video to preserve fonts and annotations. Keep the editable project file for data changes.')}</p><button class="button dark" data-we="encode-pptx">${t('下载 PPTX','Download PPTX')}</button><progress data-pptx-progress max="1" value="0" hidden></progress><p data-pptx-status role="status"></p><button class="text-button" data-we="cancel-video" hidden>${t('取消生成','Cancel export')}</button>`;
    $('[data-pptx-ratio]').value=active().options.ratio;
  }
  async function startPPTX(){
    if(videoJob)return;const controller=new AbortController(),snapshot=clone(work);videoJob=controller;
    const settings={mode:$('[data-pptx-mode]').value,ratio:$('[data-pptx-ratio]').value},button=$('[data-we=encode-pptx]'),progress=$('[data-pptx-progress]'),message=$('[data-pptx-status]'),cancel=$('[data-we=cancel-video]');
    button.disabled=true;progress.hidden=false;cancel.hidden=false;panel.querySelectorAll('select').forEach(s=>s.disabled=true);
    try{const {encodeWorkPPTX}=await import('./work-pptx.js');const blob=await encodeWorkPPTX(snapshot,settings,{signal:controller.signal,onProgress(p){if(videoJob!==controller||disposed)return;progress.value=p;message.textContent=`${Math.round(p*100)}%`;}});if(disposed||controller.signal.aborted)return;download(blob,`FORMA-${snapshot.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').slice(0,40)}.pptx`);message.textContent=workflowEnglish()?'PPTX downloaded.':'PPTX 已下载。';}
    catch(e){if(videoJob===controller&&!disposed)message.textContent=e.name==='AbortError'?(workflowEnglish()?'Export cancelled.':'已取消生成。'):e.message;}
    finally{if(videoJob===controller){videoJob=null;button.disabled=false;cancel.hidden=true;panel.querySelectorAll('select').forEach(s=>s.disabled=false);}}
  }
  async function startVideo(){
    if(videoJob)return;
    const controller=new AbortController(),snapshot=clone(work),settings=Object.fromEntries([...panel.querySelectorAll('[data-we-video]')].map(e=>[e.dataset.weVideo,e.value]));
    videoJob=controller;const message=panel.querySelector('.we-video-status>span'),progress=panel.querySelector('progress'),start=panel.querySelector('[data-we=encode-video]'),cancel=panel.querySelector('[data-we=cancel-video]');
    panel.querySelector('.we-video-result').hidden=true;start.disabled=true;cancel.hidden=false;progress.hidden=false;message.textContent=uiText('正在准备视频编码…');
    panel.querySelectorAll('select').forEach(e=>e.disabled=true);
    try{
      const blob=await encodeWorkMP4(snapshot,settings,{signal:controller.signal,onProgress(p){if(videoJob!==controller||disposed)return;progress.value=p.progress;const percentage=Math.floor(p.progress*100);if(message.dataset.percent!==String(percentage)){message.dataset.percent=percentage;message.textContent=p.progress===1?uiText('视频已生成。'):uiMessage`正在生成 ${percentage}% · 第 ${p.step} / ${p.steps} 步`;}}});
      if(controller.signal.aborted||disposed)return;
      if(videoResultURL)URL.revokeObjectURL(videoResultURL);videoResultURL=URL.createObjectURL(blob);
      const result=panel.querySelector('.we-video-result');result.hidden=false;result.querySelector('video').src=videoResultURL;
      const link=result.querySelector('a');link.href=videoResultURL;link.download=`FORMA-${snapshot.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').slice(0,40)}.mp4`;link.textContent=uiMessage`下载 MP4 · ${(blob.size/1024/1024).toFixed(1)} MB`;
      message.textContent=uiText('视频已生成，可先预览再下载。');
      recordUsage('export',{format:'mp4'});toast(uiText('整段 MP4 已生成。'));
    }catch(error){if(videoJob===controller&&!disposed)message.textContent=error.name==='AbortError'?uiText('已取消，可调整设置后重新生成。'):error.message;}
    finally{if(videoJob===controller){videoJob=null;start.disabled=false;cancel.hidden=true;panel.querySelectorAll('select').forEach(e=>e.disabled=false);}}
  }
  host.addEventListener('click',async e=>{
    const annotation=e.target.closest('[data-annotation-id]');if(annotation&&mode==='edit'){setTool('annotations');annotationPanel?.select(annotation.dataset.annotationId);return;}
    const b=e.target.closest('button');if(!b||b.disabled)return;
    try{
      if(b.dataset.weCopyFormat){await copyAlternative(b.dataset.weCopyFormat);return;}
      if(b.dataset.weFamily){panel.querySelectorAll('[data-we-family]').forEach(button=>button.setAttribute('aria-pressed',String(button===b)));panel.querySelectorAll('[data-we-view-family]').forEach(button=>button.hidden=b.dataset.weFamily!=='all'&&button.dataset.weViewFamily!==b.dataset.weFamily);return;}
      if(b.dataset.wePair){openTransition(b.dataset.wePair);return;}
      if(b.dataset.weStep){closePanel();chooseStep(b.dataset.weStep);return;}
      if(b.dataset.weTool){setTool(b.dataset.weTool);return;}
      if(b.dataset.wePalette){const options={...active().options,palette:b.dataset.wePalette};delete options.colors;editor.setOptions(options);renderStyle();return;}
      if(b.dataset.wePickerTab){pickerTab=b.dataset.wePickerTab;renderPickerTab();return;}
      if(b.dataset.weTemplate){applyStep(makeStep({doc:getExample(b.dataset.weTemplate),options:pickerMode==='add'?{palette:active().options.palette}:active().options}),{replace:pickerMode!=='add',...(pickerMode!=='add'?{message:uiText('已使用演示模板替换当前步骤，可通过「撤销更换」恢复自己的数据。')}:{})});return;}
      if(b.dataset.weRecommendedView){requireCurrentData();const current=recommendedTransitions(active()).find(r=>r.view===b.dataset.weRecommendedView);if(!current)return;applyStep(makeStep({doc:active().doc,dataGroup:active().dataGroup,options:active().options,view:current.view}),{replace:pickerMode!=='add'});return;}
      if(b.dataset.weScientificView){requireCurrentData();const doc=scientificDocument(active());if(!scientificEligibility(doc,b.dataset.weScientificView).valid)return;applyStep(makeStep({doc:active().doc,dataGroup:active().dataGroup,options:active().options,view:b.dataset.weScientificView}),{replace:pickerMode!=='add'});return;}
      if(b.dataset.weRelationalView){requireCurrentData();const mapped=relationalDocument(active());if(!mapped||!relationalEligibility(mapped,b.dataset.weRelationalView).valid)return;applyStep(makeStep({doc:active().doc,dataGroup:active().dataGroup,options:active().options,view:b.dataset.weRelationalView}),{replace:pickerMode!=='add'});return;}
      if(b.dataset.weSeriesView){requireCurrentData();const mapped=seriesDocument(active());if(!mapped||!seriesEligibility(mapped,b.dataset.weSeriesView).valid)return;applyStep(makeStep({doc:active().doc,dataGroup:active().dataGroup,options:active().options,view:b.dataset.weSeriesView}),{replace:pickerMode!=='add'});return;}
      if(b.dataset.weView){requireCurrentData();const mapped=morphDocument(active());if(!mapped||!morphEligibility(mapped,b.dataset.weView).valid)return;applyStep(makeStep({doc:active().doc,dataGroup:active().dataGroup,options:active().options,view:b.dataset.weView}),{replace:pickerMode!=='add'});return;}
      if(b.dataset.weSourceIndex!==undefined){const target=active().id,action=pickerMode,source=panelSources[Number(b.dataset.weSourceIndex)];b.disabled=true;let s;try{s=source.load?await source.load():source;}finally{b.disabled=false;}if(disposed||panel.hidden||panel.dataset.kind!=='picker'||active().id!==target||pickerMode!==action)return;const previousName=stepName(active()),step=action==='source'?replaceStepData(active(),s):makeStep(s);applyStep(step,{replace:action!=='add'});if(action==='source'&&stepName(step)!==previousName)toast(uiMessage`数据结构不同，已使用${stepName(step)}。`);return;}
      if(b.dataset.weOpenWork!==undefined){if(repository){if(!await flush())return;}else if(!flush())return;const selected=panelSources[Number(b.dataset.weOpenWork)];if(repository){const record=await repository.get(selected.id);await loadStored(record||{work:selected,syncHistory:[]});return;}$('[data-we-sync-feedback]').hidden=true;work=cleanWork(selected);syncHistory=cleanSyncHistory(readWorks(storage).syncHistories?.[work.id],work.id);$('[data-we-name]').value=work.name;closePanel();setMode('edit');renderTimeline();persist();return;}
      if(b.dataset.weRevision){if(!await flush())return;b.disabled=true;const result=await repository.restore(work.id,b.dataset.weRevision,saver.revision);await loadStored(result.record);toast(uiText('已恢复该版本，恢复前的内容也保留在版本记录中。'));return;}
      if(b.dataset.weArchive!==undefined){const archive=panel._archives[Number(b.dataset.weArchive)];download(new Blob([archive.raw],{type:'application/json'}),uiText('FORMA-旧版原始备份.json'));return;}
      if(b.dataset.weMove){const separator=b.dataset.weMove.lastIndexOf(':'),id=b.dataset.weMove.slice(0,separator),delta=b.dataset.weMove.slice(separator+1),index=work.steps.findIndex(s=>s.id===id);move(index,index+Number(delta));return;}
      if(b.dataset.weDownload){const format=b.dataset.weDownload;b.disabled=true;try{if(format==='html'){await downloadWorkHTML(work);recordUsage('export',{format:'html'});}else if(format==='project'){downloadWorkFile(work);recordUsage('export',{format:'project'});}else {const step=clone(active()),steps=clone(work.steps);closePanel();await openExportPanel(step.doc,step.options,{format,onlyImages:true,renderSVG:settings=>stepSVG(step,steps,settings),validate:()=>stepReport(step)});return;}if(!disposed)toast(uiText('导出完成。'));}finally{b.disabled=false;}return;}
      switch(b.dataset.we){
        case 'brand':await openBrand();break;
        case 'undo-brand':work=undoBrandStyle(work,brandTransaction);brandTransaction=null;tool='style';setMode('edit');renderTimeline();persist();await flush({checkpoint:true,label:uiText('撤销品牌样式前')});toast(uiText('已撤销品牌应用，数据编辑与播放节奏保留。'));break;
        case 'toggle-steps':stepsOpen=!stepsOpen;try{storage.setItem('forma.work.steps.expanded',String(stepsOpen));}catch{}renderTimeline();break;
        case 'previous-step':case 'next-step':{const i=work.steps.indexOf(active())+(b.dataset.we==='next-step'?1:-1);if(work.steps[i])chooseStep(work.steps[i].id);break;}
        case 'replay-pair':pairPlayer?.previewPair(pairStepId);break;
        case 'close':closePanel({focus:true});break;
        case 'play-all':editor?.commitPending();if(!workReport(work).valid){toast(workReport(work).message);break;}setMode('preview');player.seek(0);player.play();break;
        case 'repeat':await nextReport();break;
        case 'pptx':pptxPanel();break;
        case 'encode-pptx':await startPPTX();break;
        case 'edit':case 'preview':setMode(b.dataset.we);break;
        case 'collapse':if($('.dw-layout')?.dataset.tableFocus==='true')editor.invoke('table-focus');root.classList.toggle('we-tools-hidden');updateToolsToggle();break;
        case 'type':picker('type');break;
        case 'undo-chart':undoChartChange();break;
        case 'repair-data':closePanel({focus:true});setTool('data');editor?.invoke('show-issues');editor?.invoke('locate-error');break;
        case 'source':picker('source','sources');break;
        case 'sync-data':openDataSync();break;
        case 'sync-select-all':panel.querySelectorAll('[data-we-sync-target]:not(:disabled)').forEach(el=>el.checked=true);updateSyncSelection();break;
        case 'apply-sync':applySync();break;
        case 'undo-sync':case 'undo-history':undoSync();break;
        case 'sync-history':openSyncHistory();break;
        case 'dismiss-sync':$('[data-we-sync-feedback]').hidden=true;break;
        case 'add':picker('add');break;
        case 'copy':await copyAgent();break;
        case 'copy-image':await copyImage();break;
        case 'copy-options':copyMenu();break;
        case 'video':videoPanel();break;
        case 'encode-video':await startVideo();break;
        case 'cancel-video':videoJob?.abort();break;
        case 'works':await openWorks();break;
        case 'storage':await openStorage();break;
        case 'retry-save':await flush();break;
        case 'backup-current':backupCurrent();break;
        case 'backup-all':{if(!await flush())return;b.disabled=true;const label=b.textContent;b.textContent=uiText('正在打包…');try{const {backupBlob}=await import('./work-backup.js'),result=await backupBlob(await repository.backup());download(result.blob,result.filename);toast(uiMessage`已下载完整备份，包含 ${result.parts} 卷及本地历史。`);}finally{if(b.isConnected){b.disabled=false;b.textContent=label;}}break;}
        case 'request-persistence':{const ok=await repository.requestPersistence();$('[data-we-persistence-result]').textContent=ok?uiText('持久存储已启用，手动清理网站数据仍会删除作品。'):uiText('浏览器暂未批准持久存储，作品仍可保存，请保留文件备份。');break;}
        case 'open-remote':{const id=storageIssue?.remoteId;if(!id||!await flush())return;await loadStored(await repository.get(id));break;}
        case 'dismiss-storage':$('[data-we-storage-issue]').hidden=true;break;
        case 'new':if(repository){if(!await flush())break;}else if(!flush())break;syncHistory=[];$('[data-we-sync-feedback]').hidden=true;work=newWork([{doc:getExample('column'),options:{palette}}]);modelCache.clear();initSaver();$('[data-we-name]').value=work.name;closePanel();setMode('edit');renderTimeline();persist();break;
        case 'duplicate':applyStep(makeStep(active()));break;
        case 'remove':{if(work.steps.length<2)return;const i=work.steps.indexOf(active());removed={step:work.steps[i],index:i};work.steps.splice(i,1);work.activeStep=work.steps[Math.min(i,work.steps.length-1)].id;setMode('edit');renderTimeline();persist();$('[data-we-notice]').innerHTML=uiText('已移除当前步骤。<button data-we="restore">撤销</button>');break;}
        case 'restore':if(removed&&work.steps.length<STEP_LIMIT){work.steps.splice(removed.index,0,removed.step);work.activeStep=removed.step.id;removed=null;setMode('edit');renderTimeline();persist();}break;
        case 'save':{const report=workReport(work);if(!report.valid)throw new Error(report.message);b.setAttribute('aria-busy','true');b.disabled=true;try{if(repository){if(!await flush({saved:true,checkpoint:true,label:uiText('手动保存前')}))break;}else{flush();const saved=readWorks(storage).projects;writeWorks(storage,[cleanWork(work),...saved.filter(p=>p.id!==work.id)],work,{syncHistory});}status(uiText('已保存到我的作品 · 此浏览器'));recordUsage('save');toast(uiText('已保存到「我的作品」。'));}finally{b.removeAttribute('aria-busy');if(!disposed)check();}break;}
        case 'export':exportPanel();break;
        case 'advanced-export':closePanel();await openExportPanel(active().doc,active().options);break;
      }
    }catch(error){toast(error.message);}
  },{signal:events.signal});
  win.document.addEventListener('click',e=>{if(!e.target.closest('.we-copy-split'))closeCopyMenu();},{signal:events.signal});
  host.addEventListener('keydown',e=>{
    const menu=$('.we-copy-menu');
    if(menu.hidden){if(e.key==='ArrowDown'&&e.target.closest('.we-copy-split')){e.preventDefault();e.stopPropagation();copyMenu();}return;}
    const items=[...menu.querySelectorAll('button')],index=items.indexOf(win.document.activeElement);
    if(['ArrowDown','ArrowUp','Home','End','Escape','Tab'].includes(e.key)){
      e.stopImmediatePropagation();if(e.key==='Tab'){closeCopyMenu();return;}e.preventDefault();
      if(e.key==='Escape')closeCopyMenu(true);
      else items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();
    }
  },{signal:events.signal,capture:true});
  host.addEventListener('input',e=>{
    if(e.target.hasAttribute('data-we-name')){const name=e.target.value.trim();if(name){work.name=name;persist();}else status(uiText('请输入作品名称'));}
    if(e.target.hasAttribute('data-we-search'))filterPickerCatalog();
  },{signal:events.signal});
  host.addEventListener('focusout',e=>{if(e.target.hasAttribute('data-we-name')&&!e.target.value.trim()){e.target.value=work.name;status(uiText('已保留原作品名称'));}},{signal:events.signal});
  host.addEventListener('change',e=>{if(e.target.hasAttribute('data-we-sync-target')){updateSyncSelection();return;}if(e.target.hasAttribute('data-we-morph-only')){filterPickerCatalog();return;}const pairKey=e.target.dataset.wePairSetting;if(pairKey&&pairStepId){const s=work.steps.find(s=>s.id===pairStepId);s[pairKey]=pairKey==='duration'?Number(e.target.value):e.target.value;const id=pairStepId;persist();renderTimeline();if(mode==='edit')renderTransition();openTransition(id);return;}const key=e.target.dataset.weSetting;if(!key)return;if(key==='ratio')editor.setOptions({...active().options,ratio:e.target.value});else active()[key]=['duration','hold'].includes(key)?Number(e.target.value):e.target.value;persist();if(key!=='ratio'){renderTransition();annotationPanel?.refresh();editor?.seek(1);}},{signal:events.signal});
  function move(from,to){if(from<0||to<0||to>=work.steps.length||from===to)return;work.steps.splice(to,0,work.steps.splice(from,1)[0]);renderTimeline();if(mode==='preview')setMode('preview');else renderTransition();persist();}
  let dragged=null;
  host.addEventListener('dragstart',e=>{const item=e.target.closest('[data-we-step-item]');if(!item)return;dragged=work.steps.findIndex(s=>s.id===item.dataset.weStepItem);e.dataTransfer?.setData('text/plain',String(dragged));},{signal:events.signal});
  host.addEventListener('dragover',e=>{if(dragged!==null&&e.target.closest('[data-we-step-item]'))e.preventDefault();},{signal:events.signal});
  host.addEventListener('drop',e=>{const target=e.target.closest('[data-we-step-item]');if(target&&dragged!==null){e.preventDefault();move(dragged,work.steps.findIndex(s=>s.id===target.dataset.weStepItem));}dragged=null;},{signal:events.signal});
  host.addEventListener('dragend',()=>dragged=null,{signal:events.signal});
  const annotationInteraction=mountAnnotationInteraction(host,{enabled:()=>mode==='edit',getAnnotation:id=>active().options.annotations?.find(a=>a.id===id),onMove:async a=>{const form=annotationDrafts.get(active().id)?.forms.get(a.id);if(form)form.value.position=structuredClone(a.position);await commitAnnotation(applyAnnotation(work,active().id,a),uiText('调整标注前'));},onError:message=>toast(message)});
  host.addEventListener('keydown',e=>{const annotation=e.target.closest('[data-annotation-id]');if(annotation&&mode==='edit'&&['Enter',' '].includes(e.key)){e.preventDefault();setTool('annotations');annotationPanel?.select(annotation.dataset.annotationId);}},{signal:events.signal});
  win.document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.hidden&&root.classList.contains('we-focus-mode')&&!e.defaultPrevented){setCanvasFocus(false);return;}if(e.key==='Escape'&&!panel.hidden){e.preventDefault();closePanel({focus:true});}},{signal:events.signal});
  win.addEventListener('pagehide',()=>{flush();},{signal:events.signal});
  if(repository){
    win.addEventListener('beforeunload',e=>{if(saver.dirty||saver.error){flush();e.preventDefault();e.returnValue='';}},{signal:events.signal});
    win.document.addEventListener('visibilitychange',()=>{if(win.document.hidden)flush();},{signal:events.signal});
  }
  setMode('edit');renderTimeline();persist();
  if(stored.historyRecoveryRaw)toast(uiText('部分同步记录无法读取，作品仍可编辑；下次保存时将备份原始记录。'));
  return {prepareLocale(){editor?.commitPending();},captureSession(){if(videoJob)throw Error(uiText('视频正在导出，请完成后再切换语言。'));return {work:cleanWork(work),mode,tool,time:player?.getTime(),playerViewport:player?.getViewport(),workspace:editor?.captureSession(),models:[...modelCache].map(([id,m])=>[id,m.captureSession()]),chartChanges:[...chartChanges],annotationDrafts:[...annotationDrafts],annotationHistory:[...annotationHistory],brandTransaction,brandDraft:brandPanel?.captureSession?.(),removed,stepsOpen,toolsHidden:root.classList.contains('we-tools-hidden'),canvasFocus:root.classList.contains('we-focus-mode'),panel:panel.hidden?null:{kind:panel.dataset.kind,pickerMode,pickerTab,pairStepId},form:captureForm(root)};},
    async restoreSession(s){
      if(!s)return;
      const comparable=w=>JSON.stringify({...cleanWork(w),updated:0});
      if(comparable(s.work)!==comparable(work))throw Error(uiText('作品已在其他页面修改，已打开最新数据；旧编辑现场未覆盖它。'));
      chartChanges.clear();for(const [key,transactions] of s.chartChanges||[])chartChanges.set(key,clone(transactions));
      for(const [id,history] of s.models){const step=work.steps.find(s=>s.id===id);if(step)modelCache.set(id,createEditorModel(step.doc,history.current,{session:history,viewValidation:step.view?doc=>stepEligibility({...step,doc}):undefined}));}
      for(const [id,v] of s.annotationDrafts||[])annotationDrafts.set(id,v);for(const [id,v] of s.annotationHistory||[])annotationHistory.set(id,v);
      brandTransaction=s.brandTransaction;removed=s.removed;stepsOpen=s.stepsOpen;tool=s.tool;setMode(s.mode);renderTimeline();root.classList.toggle('we-tools-hidden',s.toolsHidden);
      if(s.mode==='preview'){player.seek(s.time||0);player.restoreViewport(s.playerViewport);}else{await editor.restoreSession(s.workspace);setCanvasFocus(!!s.canvasFocus);}updateToolsToggle();
      const kind=s.panel?.kind;if(kind==='help')editor?.openHelp();else if(kind==='picker')picker(s.panel.pickerMode,s.panel.pickerTab);else if(kind==='transition')openTransition(s.panel.pairStepId);else if(kind==='storage')await openStorage();else if(kind==='brand')await openBrand(s.brandDraft);
      restoreForm(root,s.form);
    },openImport(){setMode('edit');editor.openImport();},openHelp(mode){setMode('edit');editor.openHelp(mode);},getWork:()=>cleanWork(work),flush,hasUnsaved:()=>repository?!!saver.dirty:false,destroy(){annotationInteraction.destroy();flush();brandEpoch++;recommendationEpoch++;recommendationPicker?.close();brandPanel?.destroy();annotationPanel?.destroy();disposed=true;unsubStore();videoJob?.abort();events.abort();win.clearTimeout(thumbnailTimer);editor?.destroy();player?.destroy();pairPlayer?.destroy();colors?.destroy();thumbnails.forEach(s=>s.destroy());}};
}
