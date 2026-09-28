import {mountCountryPicker} from './country-picker.js';
import {parameterLabel} from './data-guides.js';
import {resolveCountry,countryName} from './country-input.js';
import {captureForm,restoreForm} from './locale-session.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {applyChartBrand,applyFrameBrand} from './brand-view.js';
import {renderAnnotations,annotationAnchor} from './annotation-view.js';
import {annotationContext,annotationFieldNames} from './annotations.js';
import {dataContract,dataOrigin,fieldLabel as fieldName,fieldType} from './data-contract.js';
import {createElement,Grid2x2,Plus,Trash2,Undo2,Redo2,ClipboardPaste,Download,Save,ArrowLeft,ArrowRight,X,Play,Pause,Check,SlidersHorizontal,Pencil,CircleHelp,Copy,Palette,MoreHorizontal,Maximize2,Minimize2,Minus,Focus,ChevronDown,TriangleAlert} from 'lucide';
import {findTemplate} from './catalog.js';
import {openChartPicker} from './chart-picker.js';
import {openDataHelp,copyEditorText} from './editor-assistance.js';
import {escapeHtml as esc} from './data.js';
import {ChartScene} from './charts.js';
import {mountColorEditor} from './color-editor.js';
import {openChartInlineEditor} from './inline-edit.js';
import {validateDocument} from './data.js';
import {palettes,themeFor} from './palettes.js';
import {openDataImporter} from './data-importer.js';
import {openExportPanel} from './export-panel.js';
import {parseTable,readCell,cellsToDocument,TABLE_LIMIT} from './table-data.js';
import {createEditorModel,directEditTemplates,EDITOR_LIMIT} from './editor-model.js';
import {cellRange,rangeMatrix,toClipboardTSV} from './sheet-range.js';
import {mountWorkspaceLayout} from './workspace-layout.js';
import {mountMultivariateInteraction} from './multivariate-interaction.js';
import {withMultivariatePair} from './multivariate-rules.js';
import {mountMultivariateControls} from './multivariate-controls.js';
import {mountCanvasViewport} from './canvas-viewport.js';
import {mountRecordLinks} from './record-links.js';
import {entitySpec} from './entity-identity.js';
import {openEntityEditor} from './entity-editor.js';
import './data-workspace.css';

const icon=(node,size=16)=>createElement(node,{width:size,height:size,'stroke-width':1.5,'aria-hidden':'true'}).outerHTML;
const letters=i=>String.fromCharCode(65+i);
const metaName={title:uiText('图表标题'),subtitle:uiText('副标题'),unit:uiText('数据单位'),'source.name':uiText('数据来源'),'axes.x':uiText('X 轴名称'),'axes.y':uiText('Y 轴名称'),'axes.z':uiText('Z 轴名称'),qThreshold:uiText('校正 p 值阈值'),fcThreshold:uiText('倍数变化阈值'),pc1Variance:uiText('PC1 解释方差 / %'),pc2Variance:uiText('PC2 解释方差 / %'),bins:uiText('分箱数'),threshold:uiText('显著性阈值'),referenceEffect:uiText('参考效应'),doseUnit:uiText('剂量单位'),positiveLabel:uiText('正类含义'),max:uiText('量程上限'),binRadius:uiText('分箱大小'),intervalLabel:uiText('区间定义')};

export function mountDataWorkspace(host,{records,activeKey,onChange:onRecordChange,onActive,onRemove,onSave,onAddTemplates,defaultPalette='ink',toast,createScene,onHelp,modelCache,viewValidation,animateOnMount=false,playbackTiming,onInspect,onCanvasFocus,viewportState,onMultivariateView,view,inspectionState}){
  let multivariateInteraction=null,variableControls=null,recordLinks=null,entityEditor=null,composing=false,tableFocus=false;
  let active=records.find(r=>r.key===activeKey)||records[0],models=modelCache||new Map(),scene=null,observer=null,frame=0,renderTimer=0,alive=true,page=0,selected={row:0,col:0},playing=false,p=animateOnMount?0:1,last=0,importer=null,inlineEditor=null,assistance=null,picker=null,colorController=null,colorsOpen=false,layoutController=null,removedEntry=null,selectionEnd=null,selectionKind='cell',rangeFocus=false,dragAnchor=null,pageSize=40,errorCursor=0,errorSignature='',issuesOpen=false,viewportController=null;
  const $=s=>host.querySelector(s);
  const range=()=>cellRange(selected,selectionEnd||selected);
  const multiple=()=>!!selectionEnd&&(selectionEnd.row!==selected.row||selectionEnd.col!==selected.col);
  const resetRange=()=>{selectionEnd=null;selectionKind='cell';};
  const model=()=>{if(!models.has(active.key))models.set(active.key,createEditorModel(active.doc,active.draft,{viewValidation}));return models.get(active.key);};
  const timing=()=>typeof playbackTiming==='function'?playbackTiming():playbackTiming;
  const seconds=()=>timing()?(timing().duration+timing().hold)/1000:active.options.duration||8;
  const geometryProgress=()=>timing()?Math.min(1,p*(timing().duration+timing().hold)/timing().duration):p;
  function renderFrame(){scene?.render(geometryProgress());if(timing())renderAnnotations(scene,{doc:model().doc,options:active.options},{fraction:p,interactive:true});}
  const fields=()=>findTemplate(active.doc.template).fields;
  const countryPicker=mountCountryPicker(host,{cell(target){
    if(!active||active.doc.template!=='choropleth')return null;
    const coordinate=target.dataset.dwCell?.split(':').map(Number)||(target.id==='dw-cell-value'&&!multiple()?[selected.row,selected.col]:null);
    return coordinate&&fields()[coordinate[1]]?.[0]==='code'?{row:coordinate[0],col:coordinate[1]}:null;
  },onChoose({row,col},country){
    const values=model().cells[row];values[col]=country.code;
    const labelColumn=fields().findIndex(f=>f[0]==='label');
    if(labelColumn>=0&&(!values[labelColumn]||resolveCountry(values[labelColumn])))values[labelColumn]=countryName(country);
    model().setRow(row,values);changed({grid:true});focusCell(row,col);countryPicker.close();
  }});
  function persist(){const m=model();active.doc=m.doc;active.draft=m.snapshot;onRecordChange(active);}
  function render(){
    countryPicker.close();
    multivariateInteraction?.destroy();multivariateInteraction=null;variableControls?.destroy();variableControls=null;
    entityEditor?.close();entityEditor=null;
    stop();resetRange();closePopover();layoutController?.destroy();viewportController?.destroy();colorController?.destroy();colorController=null;scene?.destroy();scene=null;observer?.disconnect();importer?.close();importer=null;assistance?.close();assistance=null;picker?.close();picker=null;
    const restoreButton=removedEntry?uiMarkup`<button class="text-button dw-restore" data-workspace="restore">${icon(Undo2,13)}撤销移出</button>`:'';
    if(!active){host.innerHTML=uiMarkup`<section class="dw-empty"><span class="eyebrow">FORMA / DATA EDITOR</span>${icon(Grid2x2,34)}<h1>数据编辑</h1><p>选择图表后，在左侧预览、右侧填写数据。你也可以一次加入多张图表，分别编辑。</p><button data-workspace="pick" class="button dark">选择图表 ${icon(ArrowRight)}</button>${restoreButton}</section>`;return;}
    const m=model(),doc=m.meta,t=findTemplate(active.doc.template);
    host.innerHTML=uiMarkup`<header class="dw-header"><div><h1>数据编辑</h1><span id="dw-save-status">草稿保存在此浏览器</span>${restoreButton}</div><div><button class="text-button dw-back" data-workspace="pick">${icon(Plus,14)}添加图表</button><button class="button small" data-workspace="save">${icon(Save,14)}保存图表</button><button class="button dark small" data-workspace="export">${icon(Download,14)}导出</button></div></header>
    <nav class="dw-tabs" aria-label="编辑中的图表">${records.map(r=>uiMarkup`<div class="dw-tab ${r.key===active.key?'active':''}"><button data-workspace="switch" data-key="${esc(r.key)}" aria-current="${r.key===active.key?'page':'false'}">${icon(Grid2x2,13)}${esc(findTemplate(r.doc.template).name)}</button><button data-workspace="remove" data-key="${esc(r.key)}" aria-label="移出编辑：${esc(findTemplate(r.doc.template).name)}">${icon(X,12)}</button></div>`).join('')}</nav>
    <div class="dw-layout" data-table-focus="${tableFocus}"><section class="dw-preview" aria-label="图表预览与编辑"><div class="dw-preview-tools"><span>图表预览 <i>LIVE</i><button class="dw-jump-data" data-workspace="jump-data">编辑数据 ↓</button></span><div><label class="sr-only" for="dw-palette">预览配色</label><select id="dw-palette">${Object.entries(palettes).map(([id,v])=>`<option value="${id}" ${active.options.palette===id?'selected':''}>${esc(v.name)}</option>`).join('')}</select><button class="dw-colors-toggle" data-workspace="colors" aria-expanded="${colorsOpen}" aria-label="自定义配色">${icon(Palette,13)}自定义</button><label class="sr-only" for="dw-ratio">导出画幅</label><select id="dw-ratio" title="设置导出画幅；编辑预览随窗口自适应">${[['wide',uiText('横版 16:10')],['landscape',uiText('横版 16:9')],['square',uiText('方形 1:1')],['portrait',uiText('竖版 3:4')],['story',uiText('竖版 9:16')]].map(([id,label])=>`<option value="${id}" ${active.options.ratio===id?'selected':''}>${label}</option>`).join('')}</select></div></div>
    <div data-dw-variable-controls></div><div id="dw-color-editor" ${colorsOpen?'':'hidden'}></div><div class="dw-artboard-wrap"><article class="dw-artboard" data-ratio="${active.options.ratio||'wide'}"><header><span class="mono">FORMA / ${t.no} · ${esc(t.en)}</span><button data-edit-meta="title" aria-label="编辑图表标题"><h2 id="dw-chart-title">${esc(doc.title)}</h2>${icon(Pencil,13)}</button><button class="dw-subtitle" data-edit-meta="subtitle" aria-label="编辑副标题">${esc(doc.subtitle)||uiText('添加副标题')}</button></header><div class="dw-chart" id="dw-chart"></div><footer><span id="dw-source">${esc(doc.source.name)}</span><span>数相 / FORMA</span></footer></article></div>
    <div class="dw-axis-controls">${Object.entries(doc.axes||{}).map(([key,value])=>uiMarkup`<button data-edit-meta="axes.${esc(key)}" aria-label="编辑${esc(metaName['axes.'+key]||key+uiText(' 维度名称'))}"><span>${esc(key.toUpperCase())}${['x','y','z'].includes(key)?uiText(' 轴'):''}</span><b>${esc(value)}</b>${icon(Pencil,12)}</button>`).join('')}<button data-edit-meta="unit" aria-label="编辑数据单位"><span>单位</span><b>${esc(doc.unit)}</b>${icon(Pencil,12)}</button></div>
    <div class="dw-playback"><button class="icon-button" data-workspace="play" aria-label="播放图表动画">${icon(Play)}</button><input id="dw-timeline" type="range" min="0" max="1000" value="1000" aria-label="预览动画进度"><span id="dw-time">${active.options.duration||8}.0 s</span><span class="dw-edit-hint">${directEditTemplates.has(t.id)?uiText('点击图形或标签，编辑对应数据'):uiText('在右侧填写该图型的数据字段')}</span><button class="dw-canvas-issue" data-workspace="show-issues" hidden title="查看数据问题">${icon(TriangleAlert,13)}<span>查看问题</span></button><div class="dw-canvas-controls" role="group" aria-label="画布视图"><button class="icon-button" data-workspace="zoom-out" aria-label="缩小画布">${icon(Minus,14)}</button><button class="dw-zoom-value" data-workspace="fit" title="适合窗口" aria-label="适合窗口">100%</button><button class="icon-button" data-workspace="zoom-in" aria-label="放大画布">${icon(Plus,14)}</button><button class="icon-button" data-workspace="canvas-focus" title="专注画布" aria-label="专注画布" aria-pressed="false">${icon(Focus,15)}</button></div></div><div id="dw-preview-state" hidden></div></section>
    <div class="dw-split" data-dw-split role="separator" aria-label="调整图表与数据表宽度" aria-orientation="vertical" aria-valuemin="35" aria-valuemax="68" aria-valuenow="56" tabindex="0" title="拖动调整宽度，双击恢复默认；方向键微调"></div><section class="dw-data" aria-label="图表数据表"><header class="dw-data-heading"><div><h2>数据表</h2><button class="icon-button dw-data-help" data-workspace="help" aria-label="如何填写${esc(t.name)}的数据" title="图表介绍、适用场景与填写方法">${icon(CircleHelp,17)}</button><span id="dw-count"></span></div><div class="dw-data-actions"><button class="button small" data-workspace="agent">${icon(Copy,14)}Agent 制作</button><button class="button dark small" data-workspace="import" title="导入 Excel 工作簿、CSV 或粘贴表格，先选择范围再对应字段">${icon(ClipboardPaste,14)}导入表格</button></div></header><p class="dw-paste-hint">从 Excel / WPS 复制区域，选中起始格后直接粘贴。含表头或列序不同，请用「导入表格」。</p><div id="dw-data-structure"></div><div class="dw-sheet-toolbar"><button class="text-button" data-workspace="add">${icon(Plus,14)}增加行</button><button class="text-button" data-workspace="copy-range">${icon(Copy,13)}复制选区</button><button class="text-button" data-workspace="source-table">原表 / 字段</button><details class="dw-batch"><summary aria-label="更多表格操作" title="选择、批量处理与 JSON">${icon(MoreHorizontal,17)}</summary><div class="dw-batch-menu"><button data-workspace="select-all">选择整张表</button><button data-workspace="select-page">选择当前页</button><button data-workspace="clear-range">清空选区内容</button><button data-workspace="fill-down">向下填充</button><button data-workspace="delete-rows">删除所选行</button><div class="dw-batch-insert"><label>插入行数<input id="dw-insert-count" type="number" min="1" max="1500" value="10" aria-label="批量插入行数"></label><div><button data-workspace="insert-before">在上方插入</button><button data-workspace="insert-after">在下方插入</button></div></div><button data-workspace="copy-json">${icon(Copy,13)}复制完整 JSON</button></div></details><div class="dw-sheet-view-tools"><button class="text-button dw-focus-table" data-workspace="table-focus" aria-pressed="${tableFocus}" title="展开数据表，保留选区与修改">${icon(tableFocus?Minimize2:Maximize2,14)}<span>${tableFocus?uiText('返回图表'):uiText('展开表格')}</span></button><button class="icon-button" data-workspace="undo" aria-label="撤销编辑">${icon(Undo2)}</button><button class="icon-button" data-workspace="redo" aria-label="重做编辑">${icon(Redo2)}</button></div></div><div class="dw-formula"><span id="dw-cell-ref">A1</span><span class="dw-formula-symbol">内容</span><label class="sr-only" for="dw-cell-value">当前单元格内容</label><input id="dw-cell-value" value="${esc(m.cells[0]?.[0]||'')}" autocomplete="off"></div><div id="dw-grid" class="dw-grid" tabindex="0"></div><div class="dw-pagination"><span id="dw-page-count"></span><span class="dw-key-hint" id="dw-selection-note">拖选区域 · Shift 扩选</span><label class="dw-page-size"><select id="dw-page-size" aria-label="每页行数">${[40,100,250].map(n=>uiMarkup`<option value="${n}" ${pageSize===n?'selected':''}>${n} 行 / 页</option>`).join('')}</select></label><button class="icon-button" data-workspace="previous" aria-label="上一页数据">${icon(ArrowLeft,13)}</button><button class="icon-button" data-workspace="next" aria-label="下一页数据">${icon(ArrowRight,13)}</button></div><div id="dw-validation" role="status" aria-live="polite"></div><div class="dw-data-meta"><label class="field">数据来源<input data-dw-meta="source.name" value="${esc(doc.source.name)}" maxlength="80"></label><details class="dw-parameters"><summary>${icon(SlidersHorizontal,13)}图表设置</summary><p>${esc(t.limit)}</p><div class="dw-parameter-inputs">${parameterHTML(doc)}</div><dl>${fields().map(f=>`<dt>${esc(fieldName(f,model().doc.template))}</dt><dd>${esc(f[2])}</dd>`).join('')}</dl></details></div></section></div>`;
    if(!onCanvasFocus)$('[data-workspace=canvas-focus]').hidden=true;
    multivariateInteraction=mountMultivariateInteraction(host,{getDoc:()=>onMultivariateView?model().doc:null,view,onError:toast,onFocus(pair){if(!model().report.valid){toast(uiText('请先修正当前数据，再聚焦变量对。'));return;}const validated=withMultivariatePair(model().doc,pair);model().setMeta('selectedPair',validated.selectedPair);changed();onMultivariateView?.('multivariate-focus');},onReturn(){onMultivariateView?.('multivariate-matrix');},onSample(mark){recordLinks.choose(mark);mark.focus({preventScroll:true});}});
    variableControls=mountMultivariateControls($('[data-dw-variable-controls]'),{getDoc:()=>model().doc,view,onView:onMultivariateView,onError:toast,onPair(pair){model().setMeta('selectedPair',pair);changed();}});
    colorController=mountColorEditor($('#dw-color-editor'),{getOptions:()=>active.options,getDoc:()=>model().doc,onChange(options){active.options=options;persist();syncPaletteSelect();paint();}});
    layoutController=mountWorkspaceLayout($('.dw-layout'));viewportController=mountCanvasViewport($('.dw-artboard-wrap'),{initial:viewportState,onChange(zoom){const label=$('.dw-zoom-value');if(label)label.textContent=`${Math.round(zoom*100)}%`;$('[data-workspace=zoom-out]').disabled=zoom<=.5;$('[data-workspace=zoom-in]').disabled=zoom>=2;}});syncPaletteSelect();renderGrid();paint();observer=new ResizeObserver(()=>schedulePaint());observer.observe($('#dw-chart'));onActive(active.key);
  }
  function parameterHTML(doc){
    const excluded=new Set(['version','template','data','source','title','subtitle','unit','axes','selectedPair','variableUnits','entities','sampleEntities']);
    return Object.entries(doc).filter(([k])=>!excluded.has(k)).map(([key,value])=>{
      const input=(path,v,label)=>`<label class="field">${esc(label)}<input data-dw-meta="${esc(path)}" ${typeof v==='number'?'type="number" step="any" data-dw-number="true"':'maxlength="80"'} value="${esc(v)}"></label>`;
      if(['number','string'].includes(typeof value))return input(key,value,metaName[key]||parameterLabel(key));
      if(Array.isArray(value)&&value.every(v=>['number','string'].includes(typeof v)))return value.map((v,i)=>input(`${key}.${i}`,v,`${metaName[key]||parameterLabel(key)} ${i+1}`)).join('');
      return '';
    }).join('');
  }
  function renderStructure(){
    const spec=entitySpec(model().meta),current=$('[data-workspace=entities]');
    if(spec&&!current){const button=document.createElement('button');button.className='text-button dw-entity-trigger';button.dataset.workspace='entities';button.textContent=uiMessage`管理${spec.name}`;button.title=uiMessage`整体改名、新建、删除或调整${spec.name}顺序`;$('[data-workspace=copy-range]').after(button);}
    if(!spec)current?.remove();
    const contract=dataContract(model().meta),example=contract.fields,open=$('#dw-data-structure details')?.open;
    $('#dw-data-structure').innerHTML=uiMarkup`<details class="dw-structure" ${open?'open':''}><summary><strong>数据结构与字段对应</strong><span>${esc(contract.family)} · ${esc(dataOrigin(model().meta))}</span></summary><div class="dw-structure-body"><p>每一行是一条${esc(contract.family)}记录。下方表格保留原表头，通过字段对应参与绘图；这里的填写示例仅说明格式。</p><div class="dw-field-map">${example.map(f=>uiMarkup`<div><strong>${esc(f.header)}</strong><span class="dw-field-arrow">↓ ${esc(f.label)} <code>${esc(f.key)}</code></span><small>${esc(f.typeLabel)}</small><span class="dw-field-example">示例：${esc(f.example??uiText('留空'))}</span><span class="dw-field-description">${esc(f.description)}${f.rule?` · ${esc(f.rule.note)}`:''}</span></div>`).join('')}</div></div></details>`;
  }
  function renderGrid(){
    renderStructure();
    const rows=model().cells,cols=fields();page=Math.max(0,Math.min(page,Math.ceil(rows.length/pageSize)-1));
    $('#dw-grid').innerHTML=uiMarkup`<table aria-label="可编辑单元格"><thead><tr><th class="dw-row-number"><button data-workspace="select-all" aria-label="选择整张表" title="选择整张表">${icon(Grid2x2,12)}</button></th>${cols.map((f,i)=>uiMarkup`<th scope="col" title="${esc(f[2])}"><button data-workspace="select-column" data-col="${i}" aria-label="选择整列：${esc(fieldName(f,model().doc.template))}"><span class="dw-col-meta">${letters(i)}<small>${esc(fieldType(f[1]))}</small></span>${esc(dataContract(model().meta).fields[i].header)}<small class="dw-field-key">${esc(f[0])}</small></button></th>`).join('')}<th class="dw-row-delete"><span class="sr-only">行操作</span></th></tr></thead><tbody>${rows.slice(page*pageSize,(page+1)*pageSize).map((row,i)=>{const r=page*pageSize+i;return uiMarkup`<tr data-dw-row="${r}"><th scope="row" class="dw-row-number"><button data-workspace="select-row" data-row="${r}" aria-label="选择第 ${r+1} 行">${r+1}</button></th>${row.map((value,c)=>uiMarkup`<td><input data-dw-cell="${r}:${c}" aria-label="第 ${r+1} 行 ${esc(fieldName(cols[c],model().doc.template))}" value="${esc(value)}" spellcheck="false" ${cols[c][1].includes('number')?'inputmode="decimal"':''}></td>`).join('')}<td class="dw-row-delete"><button class="icon-button" data-workspace="delete" data-row="${r}" aria-label="删除第 ${r+1} 行">${icon(Trash2,13)}</button></td></tr>`;}).join('')}</tbody></table>`;
    $('#dw-count').textContent=uiMessage`${rows.length} 行 · ${cols.length} 列`;
    $('#dw-page-count').textContent=rows.length?`${page*pageSize+1}–${Math.min(rows.length,(page+1)*pageSize)} / ${rows.length}`:uiText('空表 · 请增加行或粘贴数据');
    $('[data-workspace=previous]').disabled=page===0;$('[data-workspace=next]').disabled=(page+1)*pageSize>=rows.length;
    $('[data-workspace=add]').disabled=rows.length>=TABLE_LIMIT;
    selected.row=Math.min(selected.row,Math.max(0,rows.length-1));if(selectionEnd)selectionEnd.row=Math.min(selectionEnd.row,Math.max(0,rows.length-1));syncSelection();status();recordLinks?.refresh();
  }
  function locatedErrors(){return model().report.cellErrors.filter((e,i,all)=>all.findIndex(p=>p.row===e.row&&p.col===e.col)===i);}
  function status(){
    variableControls?.refresh();
    const m=model(),report=m.report;
    const signature=JSON.stringify(report.cellErrors);if(signature!==errorSignature){errorSignature=signature;errorCursor=0;}
    const located=locatedErrors(),currentError=located[errorCursor%Math.max(1,located.length)];
    $('[data-workspace=undo]').disabled=!m.canUndo;$('[data-workspace=redo]').disabled=!m.canRedo;
    $('[data-workspace=copy-json]').disabled=!report.valid;$('[data-workspace=export]').disabled=!report.valid;$('[data-workspace=save]').disabled=!report.valid;
    $('#dw-validation').className=report.valid?'dw-valid':report.dataValid?'dw-layout-warning':'dw-invalid';
    const issues=located.length?located.map(e=>({text:e.message,row:e.row,col:e.col})):report.errors.map(text=>({text}));
    const issuePage=Math.floor(errorCursor/8),issueStart=issuePage*8,shownIssues=issues.slice(issueStart,issueStart+8);
    const prior=$('#dw-validation details');if(prior)issuesOpen=prior.open;
    $('#dw-validation').innerHTML=report.valid?uiMessage`${icon(Check,13)}${esc(dataOrigin(m.meta))} · 已同步到图表`:uiMarkup`<details class="dw-issues" ${issuesOpen?'open':''}><summary>${icon(TriangleAlert,13)}<strong>${located.length?uiMessage`${located.length} 处数据待核对`:uiText('当前图型需要调整')}</strong><span>${report.dataValid?uiText('完整记录已保留'):uiText('预览保留上次有效数据')}</span>${icon(ChevronDown,13)}</summary><div class="dw-issues-body">${shownIssues.map((issue,i)=>`<div><span>${esc(issue.text)}</span>${issue.row===undefined?'':uiMarkup`<button class="text-button" data-workspace="issue-cell" data-error-index="${issueStart+i}" title="定位单元格">${letters(issue.col)}${issue.row+1} ↗</button>`}</div>`).join('')}${issues.length>8?uiMarkup`<nav class="dw-issue-pages" aria-label="数据问题分页"><span>${issueStart+1}–${Math.min(issueStart+8,issues.length)} / ${issues.length}</span><button data-workspace="previous-issues" ${issuePage===0?'disabled':''}>上一组</button><button data-workspace="next-issues" ${issueStart+8>=issues.length?'disabled':''}>下一组</button></nav>`:''}${report.dataValid?uiText('<p>数据格式有效，当前图型无法展示完整数据。请更换适用图型；完整记录已保存在草稿中。</p>'):''}</div></details>${located.length?uiMarkup`<div class="dw-error-actions"><button class="text-button" data-workspace="locate-error">定位单元格</button>${located.length>1?uiText('<button class="text-button" data-workspace="next-error">下一个问题</button>'):''}</div>`:''}`;
    $('#dw-preview-state').textContent='';$('[data-workspace=show-issues]').hidden=report.valid;
    $('#dw-cell-value').disabled=!m.cells.length;
    host.querySelectorAll('[data-dw-cell]').forEach(el=>{const [r,c]=el.dataset.dwCell.split(':').map(Number),error=report.cellErrors.find(e=>e.row===r&&e.col===c);el.setAttribute('aria-invalid',String(!!error));if(error){el.title=error.message;el.setAttribute('aria-describedby','dw-validation');}else{el.removeAttribute('title');el.removeAttribute('aria-describedby');}});
    host.querySelectorAll('[data-dw-meta]').forEach(input=>{if(document.activeElement===input)return;const parts=input.dataset.dwMeta.split('.');const value=parts.reduce((v,k)=>v?.[k],m.meta);if(value!==undefined&&['string','number'].includes(typeof value))input.value=value;});
  }
  function syncSelection(){
    if(!active)return;const bounds=range(),rows=model().cells,cols=fields();
    host.querySelectorAll('[data-dw-row]').forEach(el=>el.classList.toggle('dw-selected-row',+el.dataset.dwRow>=bounds.top&&+el.dataset.dwRow<=bounds.bottom));
    host.querySelectorAll('[data-dw-cell]').forEach(el=>{const [r,c]=el.dataset.dwCell.split(':').map(Number),inside=r>=bounds.top&&r<=bounds.bottom&&c>=bounds.left&&c<=bounds.right;
      el.classList.toggle('dw-selected-cell',!multiple()&&inside);el.classList.toggle('dw-in-range',multiple()&&inside);el.parentElement.dataset.selected=String(inside);
    });
    host.querySelectorAll('[data-edit-row]').forEach(el=>{
      const field=cols.findIndex(f=>f[0]===el.dataset.editField),selectsLabel=cols.slice(bounds.left,bounds.right+1).some(f=>!f[1].includes('number'));
      el.classList.toggle('dw-selected-mark',!el.hasAttribute('data-record-ids')&&el.tagName.toLowerCase()!=='text'&&+el.dataset.editRow>=bounds.top&&+el.dataset.editRow<=bounds.bottom&&(field<0||selectsLabel||field>=bounds.left&&field<=bounds.right));
    });
    $('#dw-cell-ref').textContent=rows.length?(multiple()?`${letters(bounds.left)}${bounds.top+1}:${letters(bounds.right)}${bounds.bottom+1}`:`${letters(selected.col)}${selected.row+1}`):'—';
    if(document.activeElement!==$('#dw-cell-value'))$('#dw-cell-value').value=multiple()?'':rows[selected.row]?.[selected.col]||'';$('#dw-cell-value').placeholder=multiple()?uiText('输入后按 Ctrl / ⌘ + Enter 填充选区'):'';
    $('#dw-selection-note').textContent=multiple()?uiMessage`已选 ${bounds.bottom-bounds.top+1} 行 × ${bounds.right-bounds.left+1} 列`:uiText('拖选区域 · Shift 扩选');
    $('#dw-grid').setAttribute('aria-label',rows.length?uiMessage`数据表选区 ${$('#dw-cell-ref').textContent}`:uiText('空数据表'));
    for(const action of ['copy-range','clear-range','fill-down','delete-rows','select-page'])$(`[data-workspace="${action}"]`).disabled=!rows.length;
    $('[data-workspace="fill-down"]').disabled=!rows.length||bounds.top===bounds.bottom;
    host.querySelectorAll('[data-workspace="select-row"]').forEach(b=>b.setAttribute('aria-pressed',String(selectionKind==='row'&&+b.dataset.row>=bounds.top&&+b.dataset.row<=bounds.bottom)));
    host.querySelectorAll('[data-workspace="select-column"]').forEach(b=>b.setAttribute('aria-pressed',String(selectionKind==='column'&&+b.dataset.col>=bounds.left&&+b.dataset.col<=bounds.right)));
  }
  function schedulePaint(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>{if(alive&&active)paint();},140);}
  function paint(){
    if(!alive||!active||!$('#dw-chart')||inlineEditor?.active||tableFocus||composing)return;
    const m=model(),doc=m.doc,t=themeFor(active.options.palette,active.options.dark,active.options.colors),art=$('.dw-artboard');
    art.style.setProperty('--dw-paper',t.bg);art.style.setProperty('--dw-ink',t.fg);art.style.setProperty('--dw-muted',t.secondary);art.style.setProperty('--dw-line',t.line);art.dataset.ratio=active.options.ratio||'wide';
    const preview=$('.dw-preview');preview.dataset.matrixSize=doc.template==='splom'&&view!=='multivariate-focus'?String(doc.entities?.items.length||3):'';
    $('#dw-chart-title').textContent=doc.title;$('.dw-subtitle').textContent=doc.subtitle||uiText('添加副标题');$('#dw-source').textContent=doc.source.name;
    $('.dw-axis-controls').querySelectorAll('[data-edit-meta]').forEach(b=>{const parts=b.dataset.editMeta.split('.');b.querySelector('b').textContent=parts.length===2?doc[parts[0]]?.[parts[1]]:doc[parts[0]];});
    const focusedMark=document.activeElement?.closest?.('[data-sample-id],[data-multivariate-facet]'),focusKey=focusedMark?.dataset;
    scene?.destroy();const sceneOptions={...active.options,progress:geometryProgress(),...(timing()?{annotationAuto:false}:{}),compact:$('#dw-chart').clientWidth<490,editable:true,multivariateNavigation:!!onMultivariateView,orbit:findTemplate(doc.template).dimension==='3d',onCameraChange(camera){active.options.camera3d=camera;persist();}};
    if(!createScene&&!validateDocument(doc).valid){$('#dw-chart').textContent=validateDocument(doc).errors[0];scene={render(){},destroy(){}};}else scene=createScene?createScene($('#dw-chart'),doc,sceneOptions):new ChartScene($('#dw-chart'),doc,sceneOptions);
    applyFrameBrand(art,active.options,'#dw-chart-title');applyChartBrand(scene.svg,active.options);
    renderFrame();syncSelection();status();recordLinks?.refresh();multivariateInteraction?.refresh();
    if(focusKey){const node=[...host.querySelectorAll('[data-sample-id],[data-multivariate-facet]')].find(n=>n.dataset.sampleId===focusKey.sampleId&&n.dataset.variableX===focusKey.variableX&&n.dataset.variableY===focusKey.variableY);if(node){node.setAttribute('tabindex','0');node.focus({preventScroll:true});}}
  }
  function changed({grid=false}={}){stop();p=1;updateTime();persist();if(grid)renderGrid();else{syncSelection();status();}entityEditor?.refresh();schedulePaint();}
  function updateTime(){if(!$('#dw-timeline'))return;$('#dw-timeline').value=String(Math.round(p*1000));$('#dw-time').textContent=`${(p*seconds()).toFixed(1)} s`;const button=$('[data-workspace=play]');button.innerHTML=icon(playing?Pause:Play);button.setAttribute('aria-label',playing?uiText('暂停图表动画'):uiText('播放图表动画'));}
  function stop(){playing=false;cancelAnimationFrame(frame);}
  function tick(now){if(!alive||!playing)return;p=Math.min(1,p+(now-last)/1000/seconds());last=now;renderFrame();if(p>=1)playing=false;updateTime();if(playing)frame=requestAnimationFrame(tick);}
  function start(){if(!model().report.valid){toast(uiText('先修正数据，再预览动画。'));return;}playing=!playing;if(playing){if(p>=1)p=0;last=performance.now();frame=requestAnimationFrame(tick);}else cancelAnimationFrame(frame);updateTime();}
  function openPicker(){
    if(picker?.dialog.isConnected&&picker.dialog.open){picker.close();picker=null;return;}
    stop();updateTime();closePopover();picker=openChartPicker({records,palette:active?.options.palette||defaultPalette,
      onAdd(ids){const added=onAddTemplates?.(ids,active?.options.palette||defaultPalette)||[];if(added.length){active=added[0];page=0;selected={row:0,col:0};p=1;render();toast(uiMessage`已加入 ${added.length} 张图表。`);}},
      onOpen(key){active=records.find(r=>r.key===key);page=0;selected={row:0,col:0};p=1;render();}
    });
  }
  function openHelp(mode='fill'){
    if(!active)return;stop();updateTime();closePopover();if(assistance?.dialog.isConnected){assistance.setMode(mode);return;}
    if(onHelp?.(mode,model().doc,active.options))return;
    assistance=openDataHelp(model().doc,{mode,options:active.options,getContext(){if(!model().report.valid)throw new Error(uiText('请先修正表格中未完成的内容，再复制说明书或下载当前图表代码。'));return{doc:model().doc,options:active.options};}});
  }
  function syncPaletteSelect(){
    const custom=active.options.colors;
    $('#dw-palette').innerHTML=(custom?uiMarkup`<option value="custom" selected disabled>自定义 · ${custom.length} 色</option>`:'')+Object.entries(palettes).map(([id,p])=>`<option value="${id}" ${!custom&&active.options.palette===id?'selected':''}>${esc(p.name)}</option>`).join('');
  }
  function openImport(current=false,resume){
    stop();updateTime();importer?.close();const key=active.key,m=model(),snapshot=m.snapshot,fingerprint=JSON.stringify(snapshot);
    importer=openDataImporter(m.doc,{current,snapshot,viewValidation,resume,anchor:{row:range().top,col:range().left},isCurrent:()=>alive&&active.key===key&&JSON.stringify(model().snapshot)===fingerprint,onApply(doc){if(!alive||active.key!==key)return;model().replace(doc);resetRange();selected={row:0,col:0};page=0;changed({grid:true});toast(uiText('数据已应用，可整体撤销。'));}});
  }
  function openPopover(target){
    closePopover();stop();clearTimeout(renderTimer);p=1;renderFrame();updateTime();scene?.leave?.();
    const meta=target.dataset.editMeta,row=Number(target.dataset.editRow),field=target.dataset.editField,cols=fields(),m=model();
    let editFields,indices=[];
    if(meta){const parts=meta.split('.'),value=parts.length===2?m.meta[parts[0]][parts[1]]:m.meta[parts[0]];editFields=[{label:metaName[meta]||uiText('维度名称'),value,maxlength:meta==='subtitle'?160:80}];}
    else{indices=field?[cols.findIndex(f=>f[0]===field)]:cols.some(f=>f[0]==='value')?[cols.findIndex(f=>f[0]==='value')]:cols.map((f,i)=>f[1].includes('number')?i:-1).filter(i=>i>=0);if(!indices.length)indices=[0];
      resetRange();selected={row,col:indices[0]};page=Math.floor(row/pageSize);renderGrid();editFields=indices.map(i=>({label:fieldName(cols[i],m.doc.template),value:m.cells[row][i],numeric:cols[i][1].includes('number')}));}
    onInspect?.(meta?{type:'meta',key:meta}:{type:'data',row,field:cols[indices[0]]?.[0]});
    inlineEditor=openChartInlineEditor({target,container:$('.dw-preview'),fields:editFields,onCommit(values){
      const draft=m.snapshot;if(meta){const parts=meta.split('.');if(parts.length===2)draft.meta[parts[0]][parts[1]]=values[0];else draft.meta[meta]=values[0];}else indices.forEach((c,i)=>draft.cells[row][c]=values[i]);
      const converted=cellsToDocument(draft.meta,draft.cells,draft.rowMeta),report=validateDocument(converted.doc);if(converted.errors.length||!report.valid)return converted.errors[0]?.message||report.errors[0];
      if(meta)m.setMeta(meta,values[0]);else {m.setRow(row,draft.cells[row]);indices.forEach((c,i)=>{const input=$(`[data-dw-cell="${row}:${c}"]`);if(input)input.value=values[i];});}changed();
    },onClose(){inlineEditor=null;schedulePaint();}});
  }
  function closePopover(){inlineEditor?.close();inlineEditor=null;}
  function focusCell(row,col){
    if(row<0||row>=model().cells.length||col<0||col>=fields().length)return;
    resetRange();selected={row,col};const nextPage=Math.floor(row/pageSize);if(nextPage!==page){page=nextPage;renderGrid();}else syncSelection();
    const cell=$(`[data-dw-cell="${row}:${col}"]`);cell?.focus();cell?.select();cell?.scrollIntoView?.({block:'nearest',inline:'nearest'});
  }
  function onInput(e){
    if(composing||e.isComposing)return;
    try{
      if(e.target.dataset.dwCell){const [r,c]=e.target.dataset.dwCell.split(':').map(Number);model().setCell(r,c,e.target.value);resetRange();selected={row:r,col:c};changed();}
      else if(e.target.id==='dw-cell-value'){if(multiple())return;model().setCell(selected.row,selected.col,e.target.value);const input=$(`[data-dw-cell="${selected.row}:${selected.col}"]`);if(input)input.value=e.target.value;changed();}
      else if(e.target.dataset.dwMeta){model().setMeta(e.target.dataset.dwMeta,e.target.dataset.dwNumber?readCell(e.target.value,'number'):e.target.value);changed();}
      else if(e.target.id==='dw-timeline'){stop();p=Number(e.target.value)/1000;renderFrame();updateTime();}
    }catch(error){toast(error.message);}
  }
  function onChange(e){
    if(e.target.id==='dw-page-size'){pageSize=Number(e.target.value);page=Math.floor(selected.row/pageSize);renderGrid();return;}
    if(e.target.id==='dw-palette'||e.target.id==='dw-ratio'){active.options[e.target.id==='dw-palette'?'palette':'ratio']=e.target.value;if(e.target.id==='dw-palette'){delete active.options.colors;}if(e.target.id==='dw-ratio')active.options.exportSettings={...active.options.exportSettings,ratio:e.target.value};persist();colorController?.render();paint();}
  }
  function onFocus(e){if(e.target.dataset.dwCell&&!rangeFocus){const [row,col]=e.target.dataset.dwCell.split(':').map(Number);resetRange();selected={row,col};syncSelection();}}
  function keepRangeFocus(){rangeFocus=true;$('#dw-grid').focus({preventScroll:true});rangeFocus=false;}
  function selectRange(anchor,end,kind='cell'){
    selected=anchor;selectionEnd=end;selectionKind=kind;syncSelection();keepRangeFocus();
  }
  function onPointerDown(e){
    const cell=e.target.closest('[data-dw-cell]');if(!cell||e.button!==0||e.pointerType==='touch')return;
    const [row,col]=cell.dataset.dwCell.split(':').map(Number);
    if(e.shiftKey){e.preventDefault();selectRange(selected,{row,col});dragAnchor={...selected};}
    else {resetRange();selected={row,col};syncSelection();dragAnchor={row,col};}
  }
  function highlightRow(row){
    host.querySelectorAll('[data-edit-row]').forEach(el=>el.classList.toggle('dw-hover-mark',row!==null&&Number(el.dataset.editRow)===row));
    host.querySelectorAll('[data-dw-row]').forEach(el=>el.classList.toggle('dw-hover-row',row!==null&&Number(el.dataset.dwRow)===row));
  }
  function onPointerOver(e){
    const mark=e.target.closest('[data-edit-row]:not([data-record-ids])'),tableRow=e.target.closest('[data-dw-row]');
    highlightRow(mark?Number(mark.dataset.editRow):tableRow?Number(tableRow.dataset.dwRow):null);
    if(!dragAnchor)return;const cell=e.target.closest('[data-dw-cell]');if(!cell)return;
    const [row,col]=cell.dataset.dwCell.split(':').map(Number);if(row===dragAnchor.row&&col===dragAnchor.col)return;
    selectRange(dragAnchor,{row,col});$('#dw-grid').classList.add('dw-drag-select');
  }
  function endDrag(){dragAnchor=null;$('#dw-grid')?.classList.remove('dw-drag-select');}
  function onPaste(e){
    if(!active||!e.target.closest('#dw-grid'))return;
    e.preventDefault();
    if(e.clipboardData?.files?.length){toast(uiText('这里粘贴的是单元格内容。文件请点击「导入表格」，选择 Excel、CSV 或 TSV 文件。'));return;}
    const text=e.clipboardData?.getData('text/plain');if(text===undefined)return;
    try{
      const matrix=text.includes('\t')||text.includes('\n')||text.includes('\r')||text.startsWith('"')?parseTable(text,{delimiter:'\t',preserveEmpty:true}):[[text]];
      const bounds=range(),height=matrix.length,width=matrix[0].length;
      if(multiple()&&height===1&&width===1){model().fillRange(bounds,matrix[0][0]);changed({grid:true});keepRangeFocus();}
      else {
        if(multiple()&&(height!==bounds.bottom-bounds.top+1||width!==bounds.right-bounds.left+1))throw new Error(uiMessage`复制区域是 ${height} × ${width}，与选区大小不同。请只选一个起始格，或选择同样大小的区域。`);
        const row=multiple()?bounds.top:selected.row,col=multiple()?bounds.left:selected.col;
        model().paste(matrix,row,col);selected={row,col};selectionEnd={row:row+height-1,col:col+width-1};selectionKind='cell';changed({grid:true});keepRangeFocus();
      }
      toast(uiMessage`已粘贴 ${height} 行 × ${width} 列，可撤销。`);
    }catch(error){toast(error.message);}
  }
  function onCopy(e){
    if(!active||!e.target.closest('#dw-grid'))return;
    const input=e.target.closest('[data-dw-cell]');
    if(input&&!multiple()&&input.selectionStart!==input.selectionEnd)return;
    if(!model().cells.length)return;e.preventDefault();e.clipboardData?.setData('text/plain',toClipboardTSV(rangeMatrix(model().cells,range())));
    if(e.type==='cut'){model().fillRange(range(),'');changed({grid:true});keepRangeFocus();}
  }
  function onKey(e){
    if(!active||composing||e.isComposing||e.keyCode===229||e.target.closest('.workflow-dialog,.assist-manual-copy,.dw-inline-editor'))return;
    const grid=e.target.closest('#dw-grid'),mod=e.metaKey||e.ctrlKey,key=e.key.toLowerCase();
    if(mod&&key==='z'){e.preventDefault();model()[e.shiftKey?'redo':'undo']();changed({grid:true});$('.dw-parameter-inputs').innerHTML=parameterHTML(model().meta);if(multiple())keepRangeFocus();else $(`[data-dw-cell="${selected.row}:${selected.col}"]`)?.focus();return;}
    if(e.isComposing||e.altKey)return;
    if(mod&&e.key==='Enter'&&e.target.id==='dw-cell-value'&&multiple()){e.preventDefault();model().fillRange(range(),e.target.value);changed({grid:true});keepRangeFocus();return;}
    if(grid&&mod&&key==='a'){e.preventDefault();if(model().cells.length)selectRange({row:0,col:0},{row:model().cells.length-1,col:fields().length-1},'all');return;}
    if(grid&&mod&&key==='d'){e.preventDefault();if(multiple()){model().fillRange(range(),'',{down:true});changed({grid:true});keepRangeFocus();}return;}
    if(grid&&e.key==='Escape'){e.preventDefault();focusCell(selected.row,selected.col);return;}
    if((e.key==='Enter'||e.key===' ')&&!e.target.hasAttribute('data-record-ids')&&e.target.matches('[data-edit-row],[data-edit-meta]')&&e.target.tagName.toLowerCase()!=='button'){e.preventDefault();openPopover(e.target);return;}
    if(!grid||mod||e.target.closest('button'))return;
    const total=model().cells.length,cols=fields().length;
    if((e.key==='Delete'||e.key==='Backspace')&&(multiple()||e.target.id==='dw-grid')){e.preventDefault();if(total){model().fillRange(range(),'');changed({grid:true});keepRangeFocus();}return;}
    if(e.shiftKey&&e.key.startsWith('Arrow')&&total){
      e.preventDefault();const end={...(selectionEnd||selected)};
      if(e.key==='ArrowDown')end.row=Math.min(total-1,end.row+1);if(e.key==='ArrowUp')end.row=Math.max(0,end.row-1);
      if(e.key==='ArrowRight')end.col=Math.min(cols-1,end.col+1);if(e.key==='ArrowLeft')end.col=Math.max(0,end.col-1);
      selectionEnd=end;selectionKind='cell';const nextPage=Math.floor(end.row/pageSize);if(nextPage!==page){page=nextPage;renderGrid();}else syncSelection();keepRangeFocus();return;
    }
    const {row,col}=selected;
    if(e.key==='Enter'||e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();focusCell(row+(e.key==='ArrowUp'||(e.key==='Enter'&&e.shiftKey)?-1:1),col);}
    else if(e.key==='Tab'){const next=row*cols+col+(e.shiftKey?-1:1);if(next>=0&&next<total*cols){e.preventDefault();focusCell(Math.floor(next/cols),next%cols);}}
    else if(e.target.id==='dw-grid'&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();focusCell(row,Math.max(0,Math.min(cols-1,col+(e.key==='ArrowLeft'?-1:1))));}
    else if(e.target.id==='dw-grid'&&e.key.length===1&&total){e.preventDefault();const r=row,c=col;focusCell(r,c);model().setCell(r,c,e.key);$(`[data-dw-cell="${r}:${c}"]`).value=e.key;changed();}
  }
  async function onClick(e){
    if(e.target.closest('.workflow-dialog,.dw-inline-editor,.color-editor'))return;
    if(inlineEditor?.active&&!inlineEditor.commit())return;
    if(e.target.closest('[data-record-ids]'))return;
    const edit=e.target.closest('[data-edit-row],[data-edit-meta]');if(edit){openPopover(edit);return;}
    const button=e.target.closest('[data-workspace]');if(!button)return;
    const action=button.dataset.workspace;
    if(button.closest('.dw-batch'))button.closest('.dw-batch').open=false;
    try{
      if(action==='zoom-in'||action==='zoom-out'){viewportController.step(action==='zoom-in'?1:-1);}
      else if(action==='fit'){viewportController.fit();}
      else if(action==='canvas-focus'){onCanvasFocus?.();}
      else if(action==='show-issues'){onCanvasFocus?.(false);onInspect?.({type:'data'});issuesOpen=true;const details=$('#dw-validation details');if(details)details.open=true;}
      else if(action==='table-focus'){tableFocus=!tableFocus;stop();updateTime();$('.dw-layout').dataset.tableFocus=String(tableFocus);button.setAttribute('aria-pressed',String(tableFocus));button.innerHTML=icon(tableFocus?Minimize2:Maximize2,14)+`<span>${tableFocus?uiText('返回图表'):uiText('展开表格')}</span>`;if(!tableFocus)schedulePaint();}
      else if(action==='select-row'){const r=+button.dataset.row;selectRange({row:e.shiftKey?selected.row:r,col:0},{row:r,col:fields().length-1},'row');}
      else if(action==='select-column'){if(model().cells.length)selectRange({row:0,col:e.shiftKey?selected.col:+button.dataset.col},{row:model().cells.length-1,col:+button.dataset.col},'column');}
      else if(action==='select-all'||action==='select-page'){if(model().cells.length)selectRange({row:action==='select-page'?page*pageSize:0,col:0},{row:action==='select-page'?Math.min(model().cells.length-1,(page+1)*pageSize-1):model().cells.length-1,col:fields().length-1},action);}
      else if(action==='copy-range'){const done=await copyEditorText(toClipboardTSV(rangeMatrix(model().cells,range())),$('#dw-validation'),$('.dw-data-meta'));if(done)toast(uiText('已复制选区，可以直接粘贴到 Excel / WPS。'));}
      else if(action==='clear-range'||action==='fill-down'){model().fillRange(range(),'',{down:action==='fill-down'});changed({grid:true});keepRangeFocus();}
      else if(action==='delete-rows'){const bounds=range();model().deleteRows(bounds.top,bounds.bottom);resetRange();selected={row:bounds.top,col:0};changed({grid:true});keepRangeFocus();toast(uiMessage`已删除 ${bounds.bottom-bounds.top+1} 行，可撤销。`);}
      else if(action==='insert-before'||action==='insert-after'){const count=Number($('#dw-insert-count').value),bounds=range(),index=model().cells.length?(action==='insert-before'?bounds.top:bounds.bottom+1):0;model().insertRows(index,count);page=Math.floor(index/pageSize);selected={row:index,col:0};selectionEnd={row:index+count-1,col:fields().length-1};changed({grid:true});keepRangeFocus();}
      else if(action==='pick')openPicker();
      else if(action==='entities'){stop();updateTime();closePopover();assistance?.close();importer?.close();if(entityEditor?.dialog.isConnected){entityEditor.close();entityEditor=null;}else entityEditor=openEntityEditor({getModel:model,onChange(){resetRange();changed({grid:true});}});}
      else if(action==='colors'){colorsOpen=!colorsOpen;$('#dw-color-editor').hidden=!colorsOpen;button.setAttribute('aria-expanded',String(colorsOpen));}
      else if(action==='help'||action==='agent')openHelp(action==='agent'?'agent':'fill');
      else if(action==='copy-json'){if(!model().report.valid)return;const done=await copyEditorText(JSON.stringify(model().doc,null,2),$('#dw-validation'),$('.dw-data-meta'));if(done)toast(uiText('已复制完整图表 JSON。'));}
      else if(action==='switch'){persist();closePopover();active=records.find(r=>r.key===button.dataset.key);page=0;selected={row:0,col:0};p=1;render();}
      else if(action==='remove'){persist();const key=button.dataset.key,index=records.findIndex(r=>r.key===key),removed=records[index];removedEntry={record:removed,index,model:models.get(key)};records.splice(index,1);models.delete(key);onRemove(key,removed);if(active.key===key)active=records[Math.min(index,records.length-1)];page=0;selected={row:0,col:0};render();}
      else if(action==='restore'&&removedEntry){
        if(records.length>=EDITOR_LIMIT){toast(uiText('编辑区已满，请先移出一张图表。'));return;}
        const {record,index,model:previous}=removedEntry;if(records.some(r=>r.key===record.key))record.key=`draft:${crypto.randomUUID()}`;records.splice(index,0,record);if(previous)models.set(record.key,previous);active=record;removedEntry=null;page=0;selected={row:0,col:0};persist();render();toast(uiText('已恢复图表和未完成的数据。'));
      }
      else if(action==='previous-issues'||action==='next-issues'){errorCursor=Math.max(0,errorCursor+(action==='next-issues'?8:-8));issuesOpen=true;status();}
      else if(action==='locate-error'||action==='next-error'||action==='issue-cell'){const errors=locatedErrors();if(action==='issue-cell')errorCursor=Number(button.dataset.errorIndex);onInspect?.({type:'data'});if(action==='next-error')errorCursor=(errorCursor+1)%Math.max(1,errors.length);const error=errors[errorCursor];if(error){status();focusCell(error.row,error.col);}}
      else if(action==='add'){resetRange();model().addRow();selected={row:model().cells.length-1,col:0};page=Math.floor(selected.row/pageSize);changed({grid:true});$(`[data-dw-cell="${selected.row}:0"]`)?.focus();}
      else if(action==='delete'){resetRange();model().deleteRow(+button.dataset.row);closePopover();changed({grid:true});}
      else if(action==='undo'||action==='redo'){model()[action]();closePopover();changed({grid:true});$('.dw-parameter-inputs').innerHTML=parameterHTML(model().meta);}
      else if(action==='previous'||action==='next'){page+=action==='next'?1:-1;renderGrid();}
      else if(action==='jump-data')$('.dw-data').scrollIntoView({block:'start',behavior:'smooth'});
      else if(action==='import')openImport();
      else if(action==='source-table')openImport(true);
      else if(action==='play')start();
      else if(action==='close-popover')closePopover();
      else if(action==='save'){if(!model().report.valid)return;active.savedId=onSave(model().doc,active.options,active.savedId);persist();}
      else if(action==='export'){if(!model().report.valid)return;stop();updateTime();const record=active;openExportPanel(model().doc,active.options,{progress:p,onSettings(settings){record.options.exportSettings=settings;if(alive)onRecordChange(record);}});}
    }catch(error){toast(error.message);}
  }
  const compositionStart=()=>{composing=true;clearTimeout(renderTimer);},compositionEnd=e=>{composing=false;onInput(e);};host.addEventListener('compositionstart',compositionStart);host.addEventListener('compositionend',compositionEnd);
  const clearHover=()=>highlightRow(null);host.addEventListener('pointerleave',clearHover);host.addEventListener('click',onClick);host.addEventListener('input',onInput);host.addEventListener('change',onChange);host.addEventListener('focusin',onFocus);host.addEventListener('paste',onPaste);host.addEventListener('keydown',onKey);host.addEventListener('copy',onCopy);host.addEventListener('cut',onCopy);host.addEventListener('pointerdown',onPointerDown);host.addEventListener('pointerover',onPointerOver);document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);
  recordLinks=mountRecordLinks(host,{getScope:()=>active?.key,getRecordIds:()=>active?model().recordIds():[],getCells:()=>model().cells,getHeaders:()=>dataContract(model().meta).fields.map(f=>f.header),getDoc:()=>model().doc,onInspect(){onCanvasFocus?.(false);onInspect?.({type:'data'});},revealRow(row){resetRange();selected={row,col:Math.max(0,fields().findIndex(f=>f[1].includes('number')))};page=Math.floor(row/pageSize);renderGrid();const grid=$('#dw-grid'),target=$(`[data-dw-row="${row}"]`);if(target){const box=target.getBoundingClientRect(),area=grid.getBoundingClientRect(),header=grid.querySelector('thead').getBoundingClientRect().height;if(box.top<area.top+header||box.bottom>area.bottom)grid.scrollTop+=box.top-area.top-Math.max(header,area.height/3);}},prepare(){closePopover();stop();p=1;renderFrame();updateTime();},
    focusRow(row){onCanvasFocus?.(false);onInspect?.({type:'data'});closePopover();stop();p=1;updateTime();resetRange();selected={row,col:Math.max(0,fields().findIndex(f=>f[1].includes('number')))};page=Math.floor(row/pageSize);renderGrid();focusCell(row,selected.col);},
    async copyText(text){const done=await copyEditorText(text,$('#dw-validation'),$('.dw-data-meta'));if(done)toast(uiText('已复制关联原始行与表头。'));}});
  render();recordLinks.restore(inspectionState);
  if(animateOnMount&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){playing=true;last=performance.now();renderFrame();updateTime();frame=requestAnimationFrame(tick);}else{p=1;renderFrame();updateTime();}
  return {getInspection:()=>recordLinks.capture(),focusMultivariatePair:pair=>multivariateInteraction?.focusPair(pair),commitPending(){if(composing)throw Error(uiText('请先完成当前输入，再切换语言。'));if(inlineEditor?.active&&!inlineEditor.commit())throw Error(uiText('请先修正图上的输入，或按 Esc 取消，再切换语言。'));},captureSession(){if(composing)throw Error(uiText('请先完成当前输入，再切换语言。'));return {page,pageSize,selected,selectionEnd,selectionKind,rangeFocus,tableFocus,p,form:captureForm(host),importer:importer?.captureSession(),help:assistance?.captureSession?.(),viewport:viewportController?.capture(),inspection:recordLinks.capture(),issuesOpen:$('#dw-validation details')?.open??issuesOpen};},
    async restoreSession(s){if(!s)return;stop();({page,pageSize,selected,selectionEnd,selectionKind,rangeFocus,tableFocus}=s);pageSize=[40,100,250].includes(pageSize)?pageSize:40;$('.dw-layout').dataset.tableFocus=String(tableFocus);issuesOpen=!!s.issuesOpen;renderGrid();p=s.p;paint();renderFrame();updateTime();restoreForm(host,s.form);recordLinks.restore(s.inspection);viewportController?.restore(s.viewport);if(s.importer){openImport(s.importer.current,s.importer);await importer.ready;}if(s.help){openHelp(s.help.mode);assistance?.restoreSession?.(s.help);}},
    getViewport:()=>viewportController?.capture(),setCanvasFocus(focused){if(focused&&tableFocus){tableFocus=false;$('.dw-layout').dataset.tableFocus='false';$('[data-workspace=table-focus]').setAttribute('aria-pressed','false');$('[data-workspace=table-focus]').innerHTML=icon(Maximize2,14)+`<span>${uiText('展开表格')}</span>`;schedulePaint();}const button=$('[data-workspace=canvas-focus]');button.setAttribute('aria-pressed',String(focused));button.title=uiText(focused?'退出专注':'专注画布');button.setAttribute('aria-label',button.title);viewportController?.refresh();},metadataFields(){const doc=model().meta;return ['title','subtitle',...Object.keys(doc.axes||{}).map(k=>`axes.${k}`),'unit'].map(key=>{const value=key.split('.').reduce((v,k)=>v?.[k],doc);return `<label class="we-field we-meta-field" data-meta-field="${esc(key)}">${esc(metaName[key]||key)}<input data-dw-meta="${esc(key)}" value="${esc(value??'')}" maxlength="${key==='subtitle'?160:80}"></label>`;}).join('');},openImport,openHelp,invoke(action){$('[data-workspace="'+action+'"]')?.click();},setOptions(options){active.options=options;persist();syncPaletteSelect();paint();},seek(fraction){stop();p=Math.min(1,Math.max(0,fraction));renderFrame();updateTime();},supportsAnnotationObjects(){const doc=model().doc,c=annotationContext(doc),field=annotationFieldNames(doc)[0]?.[0];return !!scene&&!!c.family&&doc.data.some(row=>annotationAnchor(scene,{recordId:row._id,field},c.family));},selectedRecords(){const b=range();return model().doc.data.slice(b.top,b.bottom+1).map(r=>r._id);},highlightRecord(id){const row=model().doc.data.findIndex(r=>r._id===id);if(row<0)return false;selected={row,col:0};resetRange();page=Math.floor(row/pageSize);renderGrid();syncSelection();return true;},getRecord(){return active;},getReport(){return active?model().report:{valid:false};},destroy(){countryPicker.destroy();alive=false;multivariateInteraction?.destroy();variableControls?.destroy();entityEditor?.close();recordLinks?.destroy();closePopover();layoutController?.destroy();viewportController?.destroy();colorController?.destroy();stop();clearTimeout(renderTimer);scene?.destroy();observer?.disconnect();importer?.close();assistance?.close();picker?.close();host.removeEventListener('compositionstart',compositionStart);host.removeEventListener('compositionend',compositionEnd);host.removeEventListener('pointerleave',clearHover);host.removeEventListener('click',onClick);host.removeEventListener('input',onInput);host.removeEventListener('change',onChange);host.removeEventListener('focusin',onFocus);host.removeEventListener('paste',onPaste);host.removeEventListener('keydown',onKey);host.removeEventListener('copy',onCopy);host.removeEventListener('cut',onCopy);host.removeEventListener('pointerdown',onPointerDown);host.removeEventListener('pointerover',onPointerOver);document.removeEventListener('pointerup',endDrag);document.removeEventListener('pointercancel',endDrag);}};
}
