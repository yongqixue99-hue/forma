import {uiText,uiMarkup,uiMessage} from './locale.js';
import {withRecordIds,newRecordId} from './data-identity.js';
import {bindEntitySnapshot} from './entity-identity.js';
import {fieldLabel, dataContract,withDataUnit} from './data-contract.js';
import { createElement, X, Plus, Trash2, Undo2, Redo2, Upload, ClipboardPaste, ArrowLeft, ArrowRight, Check } from 'lucide';
import { findTemplate } from './catalog.js';
import { escapeHtml as esc, validateDocument } from './data.js';
import { TABLE_LIMIT, importedTableDocument, parseTable, splitTable, suggestMapping, mapTable, documentCells, cellsToDocument, pasteCells, tableHistory } from './table-data.js';

const icon = i => createElement(i,{width:16,height:16,'stroke-width':1.5,'aria-hidden':true}).outerHTML;
export function openTableEditor(original, { onApply, startWithPaste = false } = {}) {
  let doc = withRecordIds(original), cells = documentCells(doc), history = tableHistory({doc,cells}), page = 0, errors = [], report = null, dirty = false, mode = startWithPaste ? 'paste' : 'grid', matrix = null, hasHeader = true, table = null, mapping = [], pasteText = '';
  const fields = findTemplate(doc.template).fields, pageSize = 30;
  let metaOpen = false,idColumn=-1,composing=false;
  const dialog = document.createElement('dialog'); dialog.className = 'workflow-dialog table-workflow'; dialog.setAttribute('aria-labelledby','table-title');
  (document.querySelector('#studio[open]') || document.body).append(dialog);
  const $ = q => dialog.querySelector(q);
  const label = f => dataContract(doc).fields.find(x=>x.key===f[0]).header;
  function close() { const toast=dialog.querySelector('#toast');if(toast)dialog.parentElement.append(toast);dialog.close(); dialog.remove(); }
  function requestClose() { if (!dirty && !pasteText) return close(); $('#table-message').innerHTML = uiText('有尚未应用的修改。<button class="text-button" data-table="discard">放弃修改</button>'); }
  function commit(next,metadata=doc) {
    // Drafts may be incomplete. Keep their raw cells and persistent identities;
    // only the Apply action validates the resulting document for publication.
    const draft={meta:metadata,cells:next,rowMeta:next.map((_,i)=>structuredClone(metadata.data[i]||{_id:newRecordId()}))};
    bindEntitySnapshot(draft,fields);
    const nextDoc=cellsToDocument(metadata,next,draft.rowMeta).doc;
    history.set({doc:nextDoc,cells:next});({doc,cells}=history.value);dirty=true;errors=[];report=null;
  }
  function restore(action){({doc,cells}=history[action]());errors=[];report=null;}
  function message(text) { $('#table-message').textContent = text; }
  function metadata() {
    return uiMarkup`<div class="table-meta"><label class="field">标题<input data-meta="title" maxlength="80" value="${esc(doc.title)}"></label><label class="field">单位<input data-meta="unit" maxlength="20" value="${esc(doc.unit)}"></label><label class="field">数据来源<input data-meta="source" maxlength="80" placeholder="例如：2026 年销售台账" value="${esc(doc.source.type==='demo' ? '' : doc.source.name)}"></label><label class="field table-subtitle">副标题<input data-meta="subtitle" maxlength="160" value="${esc(doc.subtitle)}" placeholder="时间范围、统计口径等，可留空"></label></div>`;
  }
  function render() {
    dialog.innerHTML = uiMarkup`<header class="workflow-header"><div><span class="workflow-kicker">FORMA / DATA</span><h2 id="table-title">导入表格 <small>${esc(findTemplate(doc.template).name)}</small></h2></div><button class="icon-button" data-table="close" aria-label="关闭数据表">${icon(X)}</button></header><p class="table-import-context">数据只用于当前图表。可粘贴 Excel / WPS 的单元格区域，或选择 CSV / TSV 文件，再核对字段与预览。</p><details class="table-import-meta" ${metaOpen?'open':''}><summary>标题、单位与来源</summary>${metadata()}</details><div class="table-toolbar"><div class="segmented"><button data-table="grid" class="${mode==='grid'?'selected':''}">数据表</button><button data-table="paste" class="${mode==='paste'?'selected':''}">${icon(ClipboardPaste)}粘贴表格</button></div><button class="button small" data-table="file">${icon(Upload)}选择 CSV / TSV 文件</button><input type="file" id="table-file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" hidden><span class="table-toolbar-spacer"></span><button class="icon-button" data-table="undo" aria-label="撤销表格修改" ${history.canUndo?'':'disabled'}>${icon(Undo2)}</button><button class="icon-button" data-table="redo" aria-label="重做表格修改" ${history.canRedo?'':'disabled'}>${icon(Redo2)}</button></div><div class="table-body">${mode==='paste'?pasteHTML():gridHTML()}</div><footer class="workflow-footer"><div id="table-message" role="status" aria-live="polite">${report?esc(report):uiText('核对后只更新当前图表，可在编辑区撤销。')}</div><button class="button dark" data-table="apply">${icon(Check)}应用到图表</button></footer>`;
  }
  function gridHTML() {
    page = Math.min(page, Math.max(0, Math.ceil(cells.length/pageSize)-1));
    return uiMarkup`<div class="grid-instruction"><span>${cells.length} 行 · ${fields.length} 列 · 可直接修改或粘贴单元格</span><button class="text-button" data-table="add" ${cells.length>=TABLE_LIMIT?'disabled':''}>${icon(Plus)}添加行</button></div><div class="editable-grid" tabindex="0" aria-label="可编辑数据表"><table><thead><tr><th class="row-number">#</th>${fields.map(f=>`<th scope="col" title="${esc(f[2])}">${esc(label(f))}<small>${esc(f[0])}${f[1].includes('null')?uiText(' · 可空'):''}</small></th>`).join('')}<th><span class="sr-only">行操作</span></th></tr></thead><tbody>${cells.slice(page*pageSize,(page+1)*pageSize).map((row,i)=>{const r=page*pageSize+i;return uiMarkup`<tr><th scope="row" class="row-number">${r+1}</th>${fields.map((f,c)=>{const invalid=errors.find(e=>e.row===r&&e.col===c);return uiMarkup`<td><input data-row="${r}" data-col="${c}" aria-label="第 ${r+1} 行 ${esc(label(f))}" ${invalid?`aria-invalid="true" title="${esc(invalid.message)}"`:''} value="${esc(row[c])}" spellcheck="false" ${f[1].includes('number')?'inputmode="decimal"':''}></td>`;}).join('')}<td><button class="icon-button" data-table="delete" data-row="${r}" aria-label="删除第 ${r+1} 行">${icon(Trash2)}</button></td></tr>`;}).join('')}</tbody></table></div><div class="table-pagination"><span>${cells.length?`${page*pageSize+1}–${Math.min(cells.length,(page+1)*pageSize)} / ${cells.length}`:uiText('没有记录，请添加行或粘贴表格')}</span><button class="icon-button" data-table="prev" aria-label="上一页数据" ${page?'':'disabled'}>${icon(ArrowLeft)}</button><button class="icon-button" data-table="next" aria-label="下一页数据" ${(page+1)*pageSize<cells.length?'':'disabled'}>${icon(ArrowRight)}</button></div>${errors.length?`<div class="table-errors" role="alert">${errors.slice(0,5).map(e=>`<button data-table="error" data-row="${e.row}" data-col="${e.col}">${esc(e.message)}</button>`).join('')}${errors.length>5?uiMarkup`<span>共 ${errors.length} 个单元格需要修正</span>`:''}</div>`:''}<p class="helper table-boundary">${esc(findTemplate(doc.template).limit)}。空白不会被补成 0。</p>`;
  }
  function pasteHTML() {
    return uiMarkup`<div class="paste-pane"><label for="table-paste" class="paste-label">粘贴表格内容（保留原来的行与列）</label><textarea id="table-paste" spellcheck="false" placeholder="月份&#9;销售额&#10;1 月&#9;128&#10;2 月&#9;156">${esc(pasteText)}</textarea><div class="paste-options"><label><input id="table-header" type="checkbox" ${hasHeader?'checked':''}>首行是列名</label><button class="button small" data-table="recognize">下一步：对应字段</button></div>${table?uiMarkup`<div class="mapping-heading">${table.rows.length} 行数据 · 选择每列的用途</div><div class="column-mapping">${fields.map((f,i)=>uiMarkup`<label class="field">${esc(fieldLabel(f,doc.template))}<select data-mapping="${i}"><option value="-1">请选择对应列</option>${table.headers.map((h,c)=>`<option value="${c}" ${mapping[i]===c?'selected':''}>${c+1}. ${esc(h)} · ${esc(table.rows[0]?.[c]?.slice(0,25))}</option>`).join('')}</select></label>`).join('')}</div><label class="field table-id-mapping">记录 ID（可选，用于跨步骤识别同一对象）<select id="table-id-column"><option value="-1">自动生成稳定 ID</option>${table.headers.map((h,c)=>`<option value="${c}" ${idColumn===c?'selected':''}>${esc(h)||uiMessage`第 ${c+1} 列`}</option>`).join('')}</select></label><p class="helper">原表头完整保留。未映射的列随记录保存，不参与当前图型计算；缺失值不会补成 0。</p><button class="button" data-table="import">预览替换</button>`:''}</div>`;
  }
  function recognize() { matrix = parseTable(pasteText); table = splitTable(matrix,hasHeader); mapping = suggestMapping(table.headers,table.rows,fields); render(); }
  function importTable() { if (!table) throw new Error(uiText('请先识别粘贴的列。')); const imported=importedTableDocument(doc,table,mapping,{idColumn});commit(imported.cells,imported.doc); mode='grid';page=0;pasteText='';table=null;render();const report=validateDocument(doc);message(report.dataValid&&!report.layoutValid?report.layoutErrors.join(' '):uiText('已替换数据表，请核对后应用。')); }
  dialog.addEventListener('toggle', e=>{if(e.target.matches('.table-import-meta'))metaOpen=e.target.open;}, true);
  function onInput(e){
    if(composing||e.isComposing)return;
    if(e.target.id==='table-paste'){pasteText=e.target.value;table=null;}
    if(e.target.dataset.meta){const k=e.target.dataset.meta,next=k==='unit'?withDataUnit(doc,e.target.value):structuredClone(doc);if(k==='source')next.source={name:e.target.value,type:'user'};else next[k]=e.target.value;commit(cells,next);$('[data-table="undo"]').disabled=!history.canUndo;$('[data-table="redo"]').disabled=!history.canRedo;}
    if(e.target.matches('[data-row][data-col]')){const next=structuredClone(cells);next[+e.target.dataset.row][+e.target.dataset.col]=e.target.value;commit(next);e.target.removeAttribute('aria-invalid');$('[data-table="undo"]').disabled=!history.canUndo;$('[data-table="redo"]').disabled=!history.canRedo;message(uiText('有修改待应用'));}
  }
  dialog.addEventListener('input',onInput);
  dialog.addEventListener('compositionstart',()=>{composing=true;});
  dialog.addEventListener('compositionend',e=>{composing=false;onInput(e);});
  dialog.addEventListener('change', e=>{
    if(e.target.matches('[data-row][data-col]'))onInput(e);
    if(e.target.id==='table-id-column')idColumn=Number(e.target.value);
    if(e.target.dataset.mapping!==undefined)mapping[+e.target.dataset.mapping]=+e.target.value;
    if(e.target.id==='table-header'){hasHeader=e.target.checked;table=null;try{if(pasteText)recognize();}catch(error){message(error.message);}}
  });
  dialog.addEventListener('paste',e=>{
    const input=e.target.closest('[data-row][data-col]');if(!input)return;
    const text=e.clipboardData?.getData('text/plain');if(!text||(!text.includes('\t')&&!text.includes('\n')))return;
    e.preventDefault();try{commit(pasteCells(cells,parseTable(text,{delimiter:'\t',preserveEmpty:true}),+input.dataset.row,+input.dataset.col,fields.length));render();message(uiText('已粘贴单元格，可撤销。'));}catch(error){message(error.message);}
  });
  dialog.addEventListener('keydown',e=>{
    if(composing||e.isComposing||e.keyCode===229)return;
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!e.target.matches('textarea')){e.preventDefault();e.target.blur();restore(e.shiftKey?'redo':'undo');dirty=true;render();}
    if(e.key==='Enter'&&e.target.matches('[data-row][data-col]')){e.preventDefault();const r=+e.target.dataset.row,c=+e.target.dataset.col;e.target.blur();if(r+1<cells.length){page=Math.floor((r+1)/pageSize);render();$(`[data-row="${r+1}"][data-col="${c}"]`)?.focus();}}
  });
  dialog.addEventListener('click',async e=>{
    e.stopPropagation();const button=e.target.closest('[data-table]');if(!button)return;
    const action=button.dataset.table;
    try{
      if(action==='close')requestClose();
      else if(action==='discard')close();
      else if(action==='grid'||action==='paste'){mode=action;render();}
      else if(action==='recognize')recognize();
      else if(action==='import')importTable();
      else if(action==='file')$('#table-file').click();
      else if(action==='undo'||action==='redo'){restore(action);errors=[];report=null;dirty=true;mode='grid';render();}
      else if(action==='add'){commit([...cells,Array(fields.length).fill('')]);page=Math.floor((cells.length-1)/pageSize);render();$(`[data-row="${cells.length-1}"][data-col="0"]`)?.focus();}
      else if(action==='delete'){commit(cells.filter((_,i)=>i!==+button.dataset.row),{...doc,data:doc.data.filter((_,i)=>i!==+button.dataset.row)});render();}
      else if(action==='prev'||action==='next'){page+=action==='prev'?-1:1;render();}
      else if(action==='error'){page=Math.floor(+button.dataset.row/pageSize);render();$(`[data-row="${button.dataset.row}"][data-col="${button.dataset.col}"]`)?.focus();}
      else if(action==='apply'){
        if(mode==='paste'&&pasteText){message(uiText('请先对应字段并预览替换，再应用到当前图表。'));return;}
        const candidate=cellsToDocument(doc,cells);errors=candidate.errors;
        const changed=JSON.stringify(documentCells(candidate.doc))!==JSON.stringify(documentCells(original));
        if(changed&&candidate.doc.source.type==='demo'){candidate.doc.source={type:'user',name:''};doc.source=candidate.doc.source;}
        const validation=validateDocument(candidate.doc);
        if(errors.length||!validation.dataValid){
          const missingMeta=[['title',candidate.doc.title,uiText('请填写图表标题。')],['unit',candidate.doc.unit,uiText('请填写数据单位。')],['source',candidate.doc.source?.name,uiText('请注明这份数据的来源或采集说明。')]].find(([,value])=>typeof value!=='string'||!value.trim());
          report=errors[0]?.message||missingMeta?.[2]||validation.errors.join(' ');mode='grid';
          if(errors.length)page=Math.floor(errors[0].row/pageSize);if(missingMeta)metaOpen=true;
          render();if(missingMeta&&!errors.length)$(`[data-meta="${missingMeta[0]}"]`).focus();return;
        }
        close();onApply?.(candidate.doc);
      }
    }catch(error){message(error.message);}
  });
  dialog.addEventListener('change',async e=>{
    if(e.target.id!=='table-file')return;const file=e.target.files[0];if(!file)return;
    try{if(!/\.(csv|tsv|txt)$/i.test(file.name))throw new Error(uiText('请选择 CSV / TSV 文件；Excel 文件请先复制单元格区域，或另存为 CSV。'));if(file.size>2000000)throw new Error(uiText('表格请控制在 2 MB 以内。'));pasteText=await file.text();if(!dialog.isConnected)return;mode='paste';recognize();}catch(error){message(error.message);}finally{e.target.value='';}
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
  render();dialog.showModal();
  return {close};
}
