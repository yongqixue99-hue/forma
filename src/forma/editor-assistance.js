import {recommendedUseHTML} from './chart-recommendations.js';
import {captureForm,restoreForm} from './locale-session.js';
import {isEnglish,uiText,uiMarkup,uiMessage} from './locale.js';
import {createElement,X,Copy,ClipboardPaste,ArrowRight,Check,FileJson,Upload,Minus,Maximize2,CircleHelp} from 'lucide';
import {findTemplate} from './catalog.js';
import {escapeHtml as esc} from './data.js';
import {getDataGuide,agentBrief,parseAgentResult} from './data-guides.js';
import {ChartScene} from './charts.js';
import {downloadAgentTemplate} from './export.js';
import './editor-dialogs.css';
import './help-window.css';

const icon=(node,size=16)=>createElement(node,{width:size,height:size,'stroke-width':1.5,'aria-hidden':true}).outerHTML;
const sampleValue=v=>v===null?uiText('留空（缺失）'):String(v);
export function editorDialog(className,title,kicker,{container}={}){
  const opener=document.activeElement,dialog=document.createElement('dialog');dialog.className=`workflow-dialog ${className}`;dialog.setAttribute('aria-label',title);
  (container||document.body).append(dialog);let closed=false;
  const close=()=>{if(closed)return;closed=true;const toast=dialog.querySelector('#toast');if(toast)document.body.append(toast);dialog.close();dialog.remove();if(opener?.isConnected)opener.focus();};
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
  dialog.addEventListener('click',e=>{e.stopPropagation();if(e.target.closest('[data-dialog-close]'))close();});
  const header=uiMarkup`<header class="workflow-header"><div><span class="workflow-kicker">${esc(kicker)}</span><h2>${esc(title)}</h2></div><button class="icon-button" data-dialog-close aria-label="关闭${esc(title)}">${icon(X)}</button></header>`;
  return{dialog,close,header,$:q=>dialog.querySelector(q)};
}

export async function copyEditorText(text,status,container){
  try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(text);if(status?.isConnected)status.textContent=uiText('已复制，可直接粘贴使用。');return true;}
  catch{if(status?.isConnected)status.textContent=uiText('未能自动复制，请在下方全选文字后复制。');if(container?.isConnected){container.querySelector('.assist-manual-copy')?.remove();const area=document.createElement('textarea');area.className='assist-manual-copy';area.readOnly=true;area.setAttribute('aria-label',uiText('手动复制内容'));area.value=text;container.append(area);area.focus();area.select();}return false;}
}

export function openDataHelp(doc,{mode='fill',options={},getContext}={}){
  const g=getDataGuide(doc.template),ui=editorDialog('data-help-dialog assist-window',uiMessage`图表指南 · ${g.name}`,'FORMA / CHART GUIDE'),{dialog,$}=ui;
  let minimized=false,drag=null;
  dialog.setAttribute('aria-modal','false');
  const context=()=>getContext?.()||{doc,options};
  const brief=()=>{const current=context();return agentBrief(current.doc,current.options);};
  const previewBrief=()=>{try{return brief();}catch(error){return error.message;}};
  const sampleTable=`<div class="help-sample-scroll"><table><thead><tr>${g.fields.map(f=>`<th>${esc(f.label)}<small>${esc(f.key)}</small></th>`).join('')}</tr></thead><tbody>${g.sampleRows.map(row=>`<tr>${g.fields.map(f=>`<td>${esc(sampleValue(row[f.key]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const sentence=text=>(/[。！？.!?]$/.test(text)?text:`${text}${isEnglish()?'.':'。'}`)+(isEnglish()?' ':'');
  function fillHTML(){return uiMarkup`${recommendedUseHTML(doc.template)}<div class="help-introduction"><p>${esc(sentence(g.introduction))}适合用于${esc(sentence(g.use))}</p><p class="help-caption">请避免${esc(sentence(g.avoid))}动画按「${esc(g.motion.replaceAll(' / ',' → '))}」呈现。</p></div><section class="help-fields"><h3>数据怎么填</h3><p class="help-row-meaning">${esc(g.rowMeaning)}可以直接编辑右侧单元格，也可以粘贴已有表格，再对应下方字段。</p><div class="help-field-table"><table><thead><tr><th>数据列</th><th>填写方式</th><th>示例</th></tr></thead><tbody>${g.fields.map(f=>`<tr><th scope="row">${esc(f.label)}<code>${esc(f.key)}</code></th><td>${f.description!==f.label?esc(f.description)+' · ':''}${esc(f.format)}</td><td class="mono">${esc(sampleValue(f.sample))}</td></tr>`).join('')}</tbody></table></div><p class="help-constraints">${esc(sentence(g.limit))}${g.notes.map(n=>esc(sentence(n))).join('')}请保留实际单位与来源，缺失值不要补成 0；必填字段缺少真实数据时，请先补齐。</p></section><details class="help-detail"><summary>查看完整排表示例${g.parameters.length?uiText('与图型参数'):''}</summary><p class="help-caption">以下为演示数据的前 ${g.sampleRows.length} 行，完整示例 ${g.sampleSize} 行。使用时请替换为自己的记录。</p>${sampleTable}${g.parameters.length?uiMarkup`<div class="help-meta"><h3>图型参数</h3><dl>${g.parameters.map(p=>`<dt>${esc(p.label)}<code>${esc(p.key)}</code></dt><dd>${esc(typeof p.value==='object'?JSON.stringify(p.value):p.value)}</dd>`).join('')}</dl><p class="help-caption">在数据表下方的「图表设置」调整可编辑参数；这里只展示模板的初始值。</p></div>`:''}</details>`;}
  function agentHTML(){return uiMarkup`<section class="help-agent-intro"><h3>让你的 Agent 直接制作这张图</h3><p>复制「${esc(g.name)}」的制作说明书，连同自己的数据发给 Agent，告诉它图表的标题、单位和用途。说明书已经包含数据字段、计算规则、当前配色和动效要求，Agent 可以据此交付可打开的图表与完整代码。</p><p>提示词已经附上原版动效模板，和自己的 Excel 一起发给 Agent 即可。Agent 会沿用 FORMA 播放器并替换数据，生成可打开的成品。</p><div class="agent-copy-actions"><button class="button dark" data-help="copy-brief">${icon(Copy,15)}复制提示词</button><button class="button" data-help="download-code">${icon(FileJson,15)}下载原版图表代码</button></div></section><section class="help-agent-request"><h3>附上数据时，可以这样说</h3><blockquote>请按这份说明书，用我提供的数据制作图表。标题是「…」，单位是「…」，用于「文章 / 汇报 / 动态演示」。请交付可打开的 HTML 和完整代码，保留播放与静态展示方式；缺少必要信息时先问我。</blockquote><p class="help-caption">生成结果直接在你的 Agent 环境中使用。说明书会带上这张图的当前数据与设置，请按需分享。</p></section><details class="agent-manual-preview help-detail"><summary>查看将复制的制作说明书</summary><pre>${esc(previewBrief())}</pre></details>`;}
  function render(){
    dialog.classList.toggle('is-minimized',minimized);
    dialog.innerHTML=uiMarkup`<header class="assist-window-header" title="拖动标题栏移动窗口"><div>${icon(CircleHelp,17)}<span>图表指南</span><h2>${esc(g.name)}</h2></div><div><button class="icon-button" data-help="minimize" aria-label="${minimized?uiText('展开帮助窗口'):uiText('收起帮助窗口')}" aria-expanded="${!minimized}">${icon(minimized?Maximize2:Minus,16)}</button><button class="icon-button" data-dialog-close aria-label="关闭图表指南">${icon(X,17)}</button></div></header><div class="assist-window-content" ${minimized?'hidden':''}><nav class="assist-tabs" role="tablist" aria-label="图表帮助"><button id="help-tab-fill" role="tab" aria-controls="help-panel" tabindex="${mode==='fill'?0:-1}" data-help="fill" aria-selected="${mode==='fill'}">图表说明</button><button id="help-tab-agent" role="tab" aria-controls="help-panel" tabindex="${mode==='agent'?0:-1}" data-help="agent" aria-selected="${mode==='agent'}">用 Agent 制作</button></nav><div class="assist-body" id="help-panel" role="tabpanel" aria-labelledby="help-tab-${mode}" tabindex="0">${mode==='fill'?fillHTML():agentHTML()}</div><footer class="workflow-footer"><span id="help-status" role="status"><span class="assist-desktop-hint">可拖动标题栏移动窗口，</span>背景仍可编辑。</span><button class="text-button" data-dialog-close>完成 ${icon(Check,14)}</button></footer></div>`;
  }
  function setMode(next){mode=next==='agent'?'agent':'fill';minimized=false;render();keepInView();$(`[data-help="${mode}"]`).focus();}
  dialog.addEventListener('click',async e=>{
    if(e.target.closest('.recommendation-alternatives a')){ui.close();return;}
    const action=e.target.closest('[data-help]')?.dataset.help;
    if(action==='fill'||action==='agent')setMode(action);
    else if(action==='minimize'){minimized=!minimized;render();$('[data-help="minimize"]').focus();keepInView();}
    else if(action==='copy-brief'){const button=e.target.closest('button');button.disabled=true;try{const text=brief();const preview=$('.agent-manual-preview pre');if(preview)preview.textContent=text;await copyEditorText(text,$('#help-status'),$('.assist-body'));}catch(error){if(dialog.isConnected)$('#help-status').textContent=error.message;}finally{if(button.isConnected)button.disabled=false;}}
    else if(action==='download-code'){const button=e.target.closest('button');button.disabled=true;try{const current=context();await downloadAgentTemplate(current.doc,current.options);if(dialog.isConnected)$('#help-status').textContent=uiText('已生成 HTML 模板，可连同说明书交给 Agent。');}catch(error){if(dialog.isConnected)$('#help-status').textContent=error.message;}finally{if(button.isConnected)button.disabled=false;}}
  });
  dialog.addEventListener('keydown',e=>{
    if(e.target.getAttribute('role')!=='tab'||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();setMode(e.key==='Home'?'fill':e.key==='End'?'agent':mode==='fill'?'agent':'fill');
  });
  function keepInView(){
    if(!dialog.style.left)return;
    const r=dialog.getBoundingClientRect();
    dialog.style.left=`${Math.max(8,Math.min(r.left,window.innerWidth-r.width-8))}px`;
    dialog.style.top=`${Math.max(8,Math.min(r.top,window.innerHeight-r.height-8))}px`;
  }
  dialog.addEventListener('pointerdown',e=>{
    if(e.button!==0||!e.target.closest('.assist-window-header')||e.target.closest('button')||window.innerWidth<600)return;
    const r=dialog.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};
    dialog.style.inset='auto';dialog.style.left=`${r.left}px`;dialog.style.top=`${r.top}px`;
    dialog.setPointerCapture?.(e.pointerId);dialog.classList.add('is-moving');e.preventDefault();
  });
  dialog.addEventListener('pointermove',e=>{
    if(!drag)return;
    dialog.style.left=`${Math.max(8,Math.min(drag.left+e.clientX-drag.x,window.innerWidth-dialog.offsetWidth-8))}px`;
    dialog.style.top=`${Math.max(8,Math.min(drag.top+e.clientY-drag.y,window.innerHeight-dialog.offsetHeight-8))}px`;
  });
  const endDrag=()=>{drag=null;dialog.classList.remove('is-moving');};
  dialog.addEventListener('pointerup',endDrag);dialog.addEventListener('pointercancel',endDrag);
  window.addEventListener('resize',keepInView);dialog.addEventListener('close',()=>window.removeEventListener('resize',keepInView),{once:true});
  dialog.addEventListener('toggle',e=>{if(e.target.matches('.agent-manual-preview')&&e.target.open)e.target.querySelector('pre').textContent=previewBrief();},true);
  render();dialog.show();$(`[data-help="${mode}"]`).focus();return {...ui,setMode,captureSession(){return dialog.open?{mode,minimized,form:captureForm(dialog),left:dialog.style.left,top:dialog.style.top}:null;},restoreSession(s){mode=s.mode;minimized=s.minimized;render();if(s.left){dialog.style.inset='auto';dialog.style.left=s.left;dialog.style.top=s.top;keepInView();}restoreForm(dialog,s.form);}};
}

export function openAgentImport(original,{onApply,options={}}={}){
  const t=findTemplate(original.template),ui=editorDialog('agent-import-dialog',uiMessage`导入 Agent 结果 · ${t.name}`,'FORMA / JSON IMPORT'),{dialog,$}=ui;
  let candidate=null,scene=null,closed=false,inputRevision=0;
  const destroyPreview=()=>{scene?.destroy();scene=null;};
  const baseClose=ui.close;ui.close=()=>{closed=true;destroyPreview();baseClose();};
  dialog.addEventListener('close',()=>{closed=true;destroyPreview();});
  dialog.innerHTML=uiMarkup`${ui.header}<div class="agent-import-body"><section class="agent-json-input"><label for="agent-result">粘贴 Agent 返回的完整 JSON</label><textarea id="agent-result" spellcheck="false" placeholder='{"version":1,"template":"${esc(original.template)}",…}'></textarea><div class="agent-json-tools"><button class="button small" data-agent="file">${icon(Upload,14)}选择 JSON 文件</button><button class="button dark small" data-agent="check">${icon(Check,14)}校验并预览</button><input id="agent-json-file" type="file" accept=".json,application/json" hidden></div><p>支持完整图表 JSON、作品文件或单个 JSON 代码块。当前图型：<strong>${esc(t.name)}</strong>。</p><div id="agent-errors" role="status" aria-live="polite"></div></section><section class="agent-result-preview" aria-label="待导入结果预览"><div class="agent-result-count"><span>当前 ${original.data.length} 行</span>${icon(ArrowRight,13)}<span id="agent-new-count">等待校验</span></div><div id="agent-preview"><div class="agent-preview-empty">${icon(FileJson,28)}<h3>先校验，再看结果</h3><p>此处显示待导入的图表。<br>应用前，当前图表保持原样。</p></div></div></section></div><footer class="workflow-footer"><span id="agent-import-status" role="status">替换当前图表的数据与文档参数，应用后可撤销。</span><button class="button dark" data-agent="apply" disabled>${icon(Check,14)}应用到当前图表</button></footer>`;
  function invalidate(){candidate=null;destroyPreview();$('[data-agent="apply"]').disabled=true;$('#agent-new-count').textContent=uiText('等待校验');$('#agent-preview').innerHTML=uiText('<div class="agent-preview-empty"><h3>等待校验</h3><p>点击「校验并预览」检查这份 JSON。</p></div>');$('#agent-errors').textContent='';$('#agent-errors').className='';}
  function check(){
    invalidate();try{candidate=parseAgentResult($('#agent-result').value,original.template);$('#agent-preview').innerHTML='<h3 id="agent-preview-title"></h3><div id="agent-preview-chart"></div><p id="agent-preview-source"></p>';
      $('#agent-preview-title').textContent=candidate.title;$('#agent-preview-source').textContent=uiMessage`来源：${candidate.source.name}`;
      scene=new ChartScene($('#agent-preview-chart'),candidate,{...options,progress:1,compact:true,interactive:false});$('#agent-new-count').textContent=uiMessage`待导入 ${candidate.data.length} 行`;$('#agent-errors').className='agent-check-valid';$('#agent-errors').textContent=uiText('格式与数据校验通过。请核对图表和来源后应用。');$('[data-agent="apply"]').disabled=false;
    }catch(error){candidate=null;$('#agent-errors').className='agent-check-error';$('#agent-errors').textContent=error.message;}}
  dialog.addEventListener('input',e=>{if(e.target.id==='agent-result'){inputRevision++;invalidate();}});
  dialog.addEventListener('change',async e=>{
    if(e.target.id!=='agent-json-file')return;const file=e.target.files[0];if(!file)return;
    const revision=++inputRevision;invalidate();$('#agent-errors').textContent=uiText('正在读取 JSON 文件…');
    try{
      if(file.size>2000000)throw new Error(uiText('JSON 请控制在 2 MB 以内。'));
      const text=await file.text();if(closed||!dialog.isConnected||revision!==inputRevision)return;
      $('#agent-result').value=text;check();
    }catch(error){if(!closed&&dialog.isConnected&&revision===inputRevision){$('#agent-errors').className='agent-check-error';$('#agent-errors').textContent=error.message;}}
    finally{e.target.value='';}
  });
  dialog.addEventListener('click',e=>{
    const action=e.target.closest('[data-agent]')?.dataset.agent;
    if(action==='file')$('#agent-json-file').click();else if(action==='check'){inputRevision++;check();}
    else if(action==='apply'&&candidate){const doc=structuredClone(candidate);ui.close();onApply?.(doc);}
  });
  dialog.showModal();$('#agent-result').focus();return ui;
}
