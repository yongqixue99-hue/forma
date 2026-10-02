import {workbookNotes,requiresFormulaReview} from './workbook-notes.js';
import {captureForm,restoreForm} from './locale-session.js';
import {uiText,uiMarkup,uiMessage,isEnglish} from './locale.js';
import {createElement,Upload,ClipboardPaste,ArrowLeft,ArrowRight,Check} from 'lucide';
import {editorDialog} from './editor-assistance.js';
import {findTemplate} from './catalog.js';
import {dataContract,withDataUnit} from './data-contract.js';
import {escapeHtml as esc,validateDocument} from './data.js';
import {parseTable,splitTable,suggestMapping,mapTable,importedTableDocument,cellsToDocument} from './table-data.js';
import {withRecordIds} from './data-identity.js';
import {textSource,sourceFromDocument,replaceSourceCells,overwriteSource,transformSource,columnLetter,pasteSource} from './source-table.js';
import {openWorkbook} from './workbook-session.js';
import './data-importer.css';

const icon=i=>createElement(i,{width:15,height:15,'aria-hidden':true,'stroke-width':1.5}).outerHTML;
export function openDataImporter(original,{onApply,isCurrent=()=>true,snapshot,anchor={row:0,col:0},current=false,viewValidation,readWorkbook=openWorkbook,resume,initialSource,initialHeader=true,initialMetadata}={}){
  const ui=editorDialog('data-importer',current?uiText('原表与字段对应'):uiText('导入自己的数据'),uiText('当前步骤')),{dialog,$}=ui,fields=findTemplate(original.template).fields;
  dialog.setAttribute('aria-modal','false');let stage='source',source=current?sourceFromDocument(original,snapshot):initialSource?structuredClone(initialSource):null,baseline=source?structuredClone(source):null,header=current?true:initialHeader,mapping=current?source.mapping||[]:[],idColumn=-1,page=0,text='',session=null,fileName=current?'':source?.origin?.file||'',sheet='',range='',busy=false,problem='',candidate=null,cellErrors=[],target=current?'edit':'replace',transformation='none',measures=[],formulaAck=false,closed=false,requestSerial=0,selectedFile=null;
  const metadata={title:original.title,subtitle:current?original.subtitle||'':'',unit:original.unit,source:current?original.source.name:fileName.slice(0,80),...initialMetadata};
  let automaticSource=!current&&!Object.hasOwn(initialMetadata||{},'source')&&fileName?metadata.source:null;
  const layoutWarnings=()=>{const v=viewValidation?.(candidate);return v&&!v.valid?[v.reason]:validateDocument(candidate).layoutErrors;};
  const close=()=>{closed=true;session?.close();ui.close();};
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  dialog.addEventListener('cancel',close);
  dialog.addEventListener('close',()=>{closed=true;session?.close();});
  dialog.addEventListener('click',e=>{if(e.target.closest('[data-dialog-close]'))close();});
  const issueText=()=>source?.origin?.kind==='xlsx'?workbookNotes(source.origin).join(' '):source?.notes?.join(' ')||'';
  function message(value){problem=value;if($('#di-status'))$('#di-status').textContent=value;}
  function sourceTable(){const table=splitTable(source.matrix,header);return {...table,locations:source.locations.slice(header?1:0),headerRefs:header?source.locations[0]:[],origin:source.origin};}
  function reset(next){source=next;baseline=structuredClone(next);mapping=[];idColumn=-1;page=0;formulaAck=false;transformation='none';measures=[];candidate=null;cellErrors=[];stage='source';problem='';}
  function gridHTML(data,locations,{editable=false,preview=false}={}){
    const headers=preview?dataContract(candidate).fields.map(f=>f.header):header?data[0]:data[0].map((_,c)=>uiMessage`第 ${c+1} 列`),rows=preview?data:data.slice(header?1:0),offset=preview?0:header?1:0;
    page=Math.min(page,Math.max(0,Math.ceil(rows.length/20)-1));
    const cellHTML=(value,r,c)=>{const ref=locations?.[r]?.[c]||`${columnLetter(c)}${r+1}`,issue=!preview&&(source.issues?.find(e=>e.row===r&&e.col===c)||cellErrors.find(e=>e.sourceRow===r&&e.sourceCol===c));return editable?uiMarkup`<textarea rows="1" data-source-cell="${r}:${c}" aria-label="原表 ${esc(ref)}" ${issue?'aria-invalid="true"':''} title="${esc(issue?issue.message:ref)}">${esc(value)}</textarea>`:`<span title="${esc(ref)}">${esc(value)}</span>`;};
    return uiMarkup`<div class="di-grid-heading"><strong>${preview?uiText('应用后的图表字段'):uiText('原始数据')}</strong><span>${rows.length} 行 · ${headers.length} 列${!preview&&source?.origin?.sheet?' · '+esc(source.origin.sheet+'!'+source.origin.range):''}</span></div><div class="di-grid"><table aria-label="${preview?uiText('导入结果预览'):uiText('原表单元格')}"><thead><tr><th>#</th>${headers.map((h,c)=>`<th>${editable&&header?cellHTML(h,0,c):esc(h)||uiText('（空表头）')}<small>${preview?esc(fields[c][0]):esc(locations?.[0]?.[c]||columnLetter(c))}</small></th>`).join('')}</tr></thead><tbody>${rows.slice(page*20,(page+1)*20).map((row,i)=>{const r=page*20+i,ri=r+offset;return `<tr><th>${r+1}</th>${row.map((value,c)=>`<td>${cellHTML(value,ri,c)}</td>`).join('')}</tr>`;}).join('')}</tbody></table></div><div class="di-pagination"><span>第 ${page+1} / ${Math.max(1,Math.ceil(rows.length/20))} 页</span><button class="icon-button" data-di="prev" aria-label="上一页原表" ${page?'':'disabled'}>${icon(ArrowLeft)}</button><button class="icon-button" data-di="next" aria-label="下一页原表" ${(page+1)*20>=rows.length?'disabled':''}>${icon(ArrowRight)}</button></div>`;
  }
  function sourceHTML(){
    return `${!current?uiMarkup`<div class="di-source-actions"><button class="button" data-di="file" ${busy?'disabled':''}>${icon(Upload)}选择 Excel / CSV</button><button class="text-button" data-di="paste">${icon(ClipboardPaste)}粘贴表格</button><span>${esc(fileName||uiText('数据在此浏览器处理'))}</span><input type="file" accept=".xlsx,.csv,.tsv,.txt" id="di-file" hidden></div>${session?uiMarkup`<div class="di-file-range"><label class="field">工作表<select id="di-sheet" ${busy?'disabled':''}>${session.sheets.map(s=>`<option ${s.name===sheet?'selected':''} value="${esc(s.name)}">${esc(s.name)}${s.hidden?uiText('（隐藏）'):''}</option>`).join('')}</select></label><label class="field">单元格范围<input id="di-range" ${busy?'disabled':''} value="${esc(range)}" placeholder="A1:D30"></label><button class="button small" data-di="range" ${busy?'disabled':''}>读取选区</button></div>`:''}${!source&&!session?uiMarkup`<label class="di-paste-label" for="di-paste">从 Excel / WPS 复制单元格区域</label><textarea id="di-paste" placeholder="月份&#9;销售额&#9;备注&#10;1月&#9;128&#9;已核对&#10;2月&#9;156&#9;已核对">${esc(text)}</textarea><div class="di-paste-options"><label><input id="di-header" type="checkbox" ${header?'checked':''}>首行是表头</label><span>${isEnglish()?'Uncheck to include the first row as data.':'取消后，第一行也会作为数据导入。'}</span></div><button class="button small" data-di="read-paste" ${busy?'disabled':''}>读取粘贴内容</button>`:''}`:''}
    ${source?uiMarkup`<div class="di-source-tools"><label><input id="di-header" type="checkbox" ${header?'checked':''} ${current?'disabled':''}>首行是表头</label>${!current?uiMarkup`<label>数据排列<select id="di-transform"><option value="none">保持原样</option><option value="transpose" ${transformation==='transpose'?'selected':''}>行列转置</option><option value="long" ${transformation==='long'?'selected':''}>宽表转长表</option>${original.template==='confusion'?uiMarkup`<option value="matrix" ${transformation==='matrix'?'selected':''}>混淆矩阵展开</option>`:''}</select></label><button class="text-button" data-di="transform">预览转换</button><button class="text-button" data-di="reset">恢复读取结果</button>`:''}</div>${transformation==='long'?uiMarkup`<fieldset class="di-measures"><legend>展开哪些数值列（其余列逐行保留）</legend>${source.matrix[0].map((h,c)=>`<label><input type="checkbox" data-measure="${c}" ${measures.includes(c)?'checked':''}>${esc(h)||columnLetter(c)}</label>`).join('')}</fieldset>`:''}${issueText()?`<p class="di-note">${esc(issueText())}</p>`:''}${source.issues?.length?uiMarkup`<p class="di-error">${source.issues.length} 个原单元格需要修正。点击位置填写真实结果。</p><div class="di-errors">${source.issues.slice(0,8).map(i=>`<button data-di="locate" data-row="${i.row}" data-col="${i.col}">${esc(source.locations[i.row]?.[i.col])} · ${esc(i.message)}</button>`).join('')}</div>`:''}${gridHTML(source.matrix,source.locations,{editable:true})}`:''}`;
  }
  function mappingHTML(){
    const t=sourceTable(),contract=dataContract(original);return uiMarkup`<p class="di-note">${target==='overwrite'?uiMessage`从当前选区 ${columnLetter(anchor.col)}${anchor.row+1} 开始，按原表列顺序覆盖。其余记录保留。若混合了多个来源，请在下方填写完整来源说明。`:uiText('保留原表头和未使用的列，明确每个图表字段来自哪一列。')}${current?uiText(' 修改只影响当前步骤。'):''}</p>${!current?uiMarkup`<label class="field di-target">应用方式<select id="di-target"><option value="replace" ${target==='replace'?'selected':''}>替换当前数据 · ${original.data.length} 行 → ${t.rows.length} 行</option><option value="overwrite" ${target==='overwrite'?'selected':''}>覆盖选区 · 从 ${columnLetter(anchor.col)}${anchor.row+1} 开始</option></select></label>`:''}${target!=='overwrite'?`<div class="di-mapping">${contract.fields.map((f,i)=>uiMarkup`<label><strong>${esc(f.header)}<small>${esc(f.key)} · ${esc(f.type)}</small></strong><span>←</span><select data-di-mapping="${i}" aria-label="${esc(f.key)} 对应原列"><option value="-1">请选择对应列</option>${t.headers.map((h,c)=>`<option value="${c}" ${mapping[i]===c?'selected':''}>${esc(source.locations[header?0:1]?.[c]||columnLetter(c))} · ${esc(h)||uiText('空表头')} · ${esc(t.rows[0]?.[c]?.slice(0,28))}</option>`).join('')}</select></label>`).join('')}</div>${!current?uiMarkup`<details class="di-id"><summary>记录身份（可选）</summary><label class="field">ID 来源<select id="di-id"><option value="-1">生成新记录 ID</option>${t.headers.map((h,c)=>`<option value="${c}" ${idColumn===c?'selected':''}>${esc(h)||columnLetter(c)}</option>`).join('')}</select></label><p>仅在该列确实是稳定且唯一的记录编号时选用，不能用行号推测跨步骤关系。</p></details>`:''}`:uiMarkup`<p>本次 ${t.rows.length} × ${t.headers.length} 个单元格，目标为 ${fields.slice(anchor.col,anchor.col+t.headers.length).map(f=>esc(f[0])).join('、')}。若列序不同，请选择替换当前数据并对应字段。</p>`}<div class="di-metadata"><label class="field">图表标题<input data-di-meta="title" maxlength="80" value="${esc(metadata.title)}"></label><label class="field">单位<input data-di-meta="unit" maxlength="20" value="${esc(metadata.unit)}"></label><label class="field">数据来源<input data-di-meta="source" maxlength="80" value="${esc(metadata.source)}" placeholder="文件名称、实验记录或采集说明"></label><label class="field di-subtitle">副标题（可选）<input data-di-meta="subtitle" maxlength="180" value="${esc(metadata.subtitle)}" placeholder="时间范围、样本量或观测口径"></label></div>${requiresFormulaReview(source)?uiMarkup`<label class="di-ack"><input type="checkbox" id="di-formula-ack" ${formulaAck?'checked':''}>已核对文件中的公式结果；这里不会重新计算</label>`:''}`;
  }
  function render(){if(closed)return;
    dialog.innerHTML=uiMarkup`${ui.header}<nav class="di-stages" aria-label="数据导入步骤">${[['source',uiText('选择数据')],['mapping',uiText('对应字段')],['preview',uiText('核对应用')]].map(([id,name],i)=>`<button data-di="${id}" aria-current="${stage===id?'step':'false'}" ${id!=='source'&&!source||id==='preview'&&!candidate?'disabled':''}><span>${i+1}</span>${name}</button>`).join('')}</nav><div class="di-body" aria-busy="${busy}">${busy?uiText('<p role="status">正在读取工作簿…</p>'):''}${stage==='source'?sourceHTML():stage==='mapping'?mappingHTML():uiMarkup`<div class="di-result"><strong>${target==='overwrite'?uiText('覆盖选区'):current?uiText('更新原表'):uiText('替换当前数据')}</strong><span>${original.data.length} 行 → ${candidate.data.length} 行 · 其他步骤不变 · 可整体撤销</span></div><p class="di-note">${esc(candidate.source.name)} · ${esc(candidate.unit)}${source.origin.transforms?.length?uiText(' · 已显式转换数据排列'):''}</p>${gridHTML(candidate.data.map(r=>fields.map(([key])=>r[key]===null?'':String(r[key]))),null,{preview:true})}${layoutWarnings().length?uiMarkup`<p class="di-note">数据合法，但当前布局需调整：${esc(layoutWarnings().join(' '))}。应用后保留完整数据。</p>`:''}`}${cellErrors.length?`<div class="di-errors">${cellErrors.slice(0,8).map(e=>`<button data-di="locate" data-row="${e.sourceRow}" data-col="${e.sourceCol}">${esc(e.location)} · ${esc(e.message)}</button>`).join('')}</div>`:''}</div><footer class="workflow-footer"><span id="di-status" role="status" aria-live="polite">${esc(problem||uiText('仅在应用后修改当前步骤。关闭此窗口可放弃本次操作。'))}</span><div>${stage!=='source'?uiText('<button class="text-button" data-di="back">返回</button>'):''}<button class="button dark" data-di="${stage==='preview'?'apply':stage==='mapping'?'prepare':'mapping'}" ${busy||!source?'disabled':''}>${stage==='preview'?icon(Check)+uiText('应用到当前步骤'):stage==='mapping'?uiText('预览结果'):uiText('对应字段 ')+icon(ArrowRight)}</button></div></footer>`;
  }
  async function selectRange(){const serial=requestSerial;busy=true;source=null;candidate=null;render();try{const next=await session.select(sheet,range);if(closed||serial!==requestSerial)return;reset({...next,origin:{...next.origin,kind:'xlsx',file:fileName}});}finally{if(serial===requestSerial){busy=false;render();}}}
  async function loadFile(file){selectedFile=file;const serial=++requestSerial;session?.close();session=null;reset(null);target='replace';fileName=file.name;metadata.source=file.name.slice(0,80);automaticSource=metadata.source;busy=true;render();try{
    if(/\.xlsx$/i.test(file.name)){const next=await readWorkbook(file);if(closed||serial!==requestSerial){next.close();return;}session=next;const first=next.sheets.find(s=>!s.hidden)||next.sheets[0];if(!first)throw new Error(uiText('工作簿中没有工作表。'));sheet=first.name;range=first.range;busy=false;await selectRange();}
    else{if(!/\.(csv|tsv|txt)$/i.test(file.name)||file.size>2000000)throw new Error(uiText('请选择 .xlsx 或 2 MB 以内的 CSV / TSV / TXT 文件。'));const raw=await file.text();if(closed||serial!==requestSerial)return;reset(textSource(parseTable(raw,{...(/\.tsv$/i.test(file.name)?{delimiter:'\t'}:{})}),{kind:'text-file',file:file.name}));}
  }catch(error){message(error.message);}finally{if(!closed&&serial===requestSerial){busy=false;render();}}}
  function prepare(){
    if(source.issues?.length)throw new Error(uiText('请先修正原表中的公式或错误单元格。'));
    if(requiresFormulaReview(source)&&!formulaAck)throw new Error(uiText('请先确认文件中的公式结果已经核对。'));
    if(formulaAck)source.origin.formulaResultsConfirmed=true;
    const t=sourceTable();let result;
    if(target==='overwrite')result=overwriteSource(original,source,header,anchor,snapshot);
    else if(current){mapTable(t,mapping,fields);result=replaceSourceCells(original,source,mapping,snapshot);}
    else{const imported=importedTableDocument(original,t,mapping,{idColumn});result=cellsToDocument(imported.doc,imported.cells,imported.doc.data);}
    cellErrors=result.errors.map(e=>{const sourceRow=e.row+(header?1:0)-(target==='overwrite'?anchor.row:0),sourceCol=target==='overwrite'?e.col-anchor.col:mapping[e.col];return {...e,sourceRow,sourceCol,location:source.locations[sourceRow]?.[sourceCol]||uiMessage`图表第 ${e.row+1} 行 ${fields[e.col]?.[0]||''}`};});
    candidate=withRecordIds(withDataUnit(result.doc,metadata.unit));candidate.title=metadata.title;candidate.subtitle=metadata.subtitle;candidate.source={type:'user',name:metadata.source,...((current||target==='overwrite')&&metadata.source===original.source.name&&original.source.url?{url:original.source.url}:{})};candidate.provenance=current||target==='overwrite'?{...(original.provenance||{}),...(original.source.type==='demo'?{origin:'demo',partialEdit:true}:{})}:{origin:'import'};
    const validation=validateDocument(candidate);if(cellErrors.length||!validation.dataValid){candidate=null;throw new Error(cellErrors[0]?.message||validation.errors.join(' '));}
    stage='preview';page=0;problem='';render();
  }
  dialog.addEventListener('input',e=>{
    if(e.target.id==='di-paste')text=e.target.value;
    if(e.target.dataset.diMeta){metadata[e.target.dataset.diMeta]=e.target.value;if(e.target.dataset.diMeta==='source')automaticSource=null;}
    if(e.target.id==='di-range')range=e.target.value;
    if(e.target.dataset.sourceCell){const [r,c]=e.target.dataset.sourceCell.split(':').map(Number);source.matrix[r][c]=e.target.value;source.issues=(source.issues||[]).filter(i=>i.row!==r||i.col!==c);e.target.removeAttribute('aria-invalid');candidate=null;cellErrors=[];}
  });
  dialog.addEventListener('paste',e=>{
    const cell=e.target.closest('[data-source-cell]');if(!cell)return;
    const value=e.clipboardData?.getData('text/plain');if(!value||!/[\t\n\r]/.test(value))return;
    e.preventDefault();try{const [r,c]=cell.dataset.sourceCell.split(':').map(Number);source=pasteSource(source,parseTable(value,{delimiter:'\t'}),r,c,{fixedRows:current});candidate=null;cellErrors=[];render();$(`[data-source-cell="${r}:${c}"]`)?.focus();}catch(error){message(error.message);}
  });
  dialog.addEventListener('change',e=>{
    if(e.target.id==='di-file'){const file=e.target.files[0];if(file)void loadFile(file);}
    if(e.target.id==='di-sheet'){sheet=e.target.value;range=session.sheets.find(s=>s.name===sheet).range;source=null;candidate=null;render();}
    if(e.target.id==='di-header'){header=e.target.checked;mapping=[];candidate=null;page=0;render();}
    if(e.target.id==='di-target'){target=e.target.value;metadata.source=target==='overwrite'?original.source.name:fileName;automaticSource=target==='overwrite'?null:metadata.source||null;metadata.subtitle=target==='overwrite'?original.subtitle||'':'';candidate=null;render();}
    if(e.target.dataset.diMapping!==undefined){mapping[Number(e.target.dataset.diMapping)]=Number(e.target.value);candidate=null;}
    if(e.target.id==='di-id')idColumn=Number(e.target.value);
    if(e.target.id==='di-formula-ack')formulaAck=e.target.checked;
    if(e.target.id==='di-transform'){transformation=e.target.value;render();}
    if(e.target.dataset.measure!==undefined){const c=Number(e.target.dataset.measure);measures=e.target.checked?[...measures,c]:measures.filter(i=>i!==c);}
  });
  dialog.addEventListener('click',async e=>{const button=e.target.closest('[data-di]');if(!button)return;const action=button.dataset.di;try{
    problem='';if(action==='file')$('#di-file').click();
    else if(action==='paste'){requestSerial++;busy=false;session?.close();session=null;selectedFile=null;source=null;fileName='';candidate=null;text='';if(automaticSource!==null&&metadata.source===automaticSource)metadata.source='';automaticSource=null;render();}
    else if(action==='read-paste'){reset(textSource(parseTable(text,{delimiter:'\t'})));render();}
    else if(action==='range')await selectRange();
    else if(action==='source'||action==='back'){stage=action==='back'&&stage==='preview'?'mapping':'source';cellErrors=[];page=0;render();}
    else if(action==='mapping'){if(!source)throw new Error(uiText('请先读取数据。'));if(!mapping.length){const t=sourceTable();mapping=suggestMapping(t.headers,t.rows,fields);}stage='mapping';page=0;render();}
    else if(action==='transform'){if(transformation==='none')return;if(!header&&transformation!=='transpose')throw new Error(uiText('宽表与矩阵展开需要首行表头，请先勾选。'));source=transformSource(source,transformation,measures);mapping=[];candidate=null;transformation='none';page=0;render();}
    else if(action==='reset'){source=structuredClone(baseline);mapping=current?source.mapping||[]:[];candidate=null;page=0;render();}
    else if(action==='prepare'||action==='preview')prepare();
    else if(action==='prev'||action==='next'){page+=action==='next'?1:-1;render();}
    else if(action==='locate'){stage='source';page=Math.max(0,Math.floor((Number(button.dataset.row)-(header?1:0))/20));render();$(`[data-source-cell="${button.dataset.row}:${button.dataset.col}"]`)?.focus();}
    else if(action==='apply'){if(!candidate)return;if(!isCurrent())throw new Error(uiText('背后的数据已变化。请关闭并重新打开导入，避免覆盖较新的修改。'));const doc=candidate;close();onApply?.(doc);}
  }catch(error){message(error.message);if(cellErrors.length)render();}});
  async function restore(saved){
    if(!saved)return;
    ({stage,source,baseline,header,mapping,idColumn,page,text,fileName,sheet,range,candidate,cellErrors,target,transformation,measures,formulaAck}=structuredClone(saved));
    Object.assign(metadata,saved.metadata);automaticSource=Object.hasOwn(saved,'automaticSource')?saved.automaticSource:fileName&&metadata.source===fileName?fileName:null;selectedFile=saved.file?.bytes?new File([saved.file.bytes],saved.file.name,{type:saved.file.type,lastModified:saved.file.lastModified}):saved.file;problem='';render();restoreForm(dialog,saved.form);
    if(selectedFile&&/\.xlsx$/i.test(selectedFile.name)){
      const serial=++requestSerial;busy=true;render();
      try{const next=await readWorkbook(selectedFile);if(closed||serial!==requestSerial){next.close();return;}session=next;}
      catch(e){if(!closed&&serial===requestSerial)message(e.message);}
      finally{if(!closed&&serial===requestSerial){busy=false;render();restoreForm(dialog,saved.form);}}
    }
  }
  render();dialog.show();const ready=restore(resume);
  return {dialog,close,loadFile,ready,captureSession(){if(closed)return null;if(busy)throw Error(uiText('表格正在读取，请完成后再切换语言。'));return structuredClone({current,stage,source,baseline,header,mapping,idColumn,page,text,fileName,sheet,range,candidate,cellErrors,target,transformation,measures,formulaAck,metadata,automaticSource,file:selectedFile,form:captureForm(dialog)});}};
}
