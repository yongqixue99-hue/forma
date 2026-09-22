import {editorDialog} from './editor-assistance.js';
import {isEnglish} from './locale.js';
import {escapeHtml as esc} from './data.js';
import {validate} from './agent-api.js';
import {downloadWorkFile} from './work-export.js';
import './agent-config.css';
const text=(zh,en)=>isEnglish()?en:zh;
export function openAgentConfig({onOpen}={}){
 const ui=editorDialog('agent-config',text('打开 Agent 配置','Open Agent configuration'),'FORMA / AGENT'),{dialog,$}=ui;let report=null,revision=0;
 dialog.innerHTML=ui.header+`<div class="agent-config-body"><label>${text('粘贴配置或作品 JSON','Paste configuration or project JSON')}<textarea data-agent-json spellcheck="false" rows="10"></textarea></label><label class="button small">${text('选择 JSON 文件','Choose JSON file')}<input type="file" data-agent-file accept=".json" hidden></label><a class="text-button" href="/forma/agent-api.md" target="_blank">${text('接口文档','API reference')} ↗</a><div data-agent-result role="status"></div></div><footer class="workflow-footer"><button class="button" data-agent-validate>${text('检查配置','Validate')}</button><button class="button" data-agent-download disabled>${text('下载作品文件','Download project')}</button><button class="button dark" data-agent-open disabled>${text('在编辑器中打开','Open in Editor')}</button></footer>`;
 function reset(){revision++;report=null;$('[data-agent-result]').replaceChildren();$('[data-agent-open]').disabled=$('[data-agent-download]').disabled=true;}
 $('[data-agent-json]').addEventListener('input',reset);
 $('[data-agent-file]').onchange=async e=>{const file=e.target.files[0];if(!file)return;reset();const at=revision;try{if(file.size>8000000)throw Error(text('配置文件最多 8 MB。','Configuration files support up to 8 MB.'));const raw=await file.text();if(at!==revision||!dialog.isConnected)return;$('[data-agent-json]').value=raw;}catch(e){$('[data-agent-result]').textContent=e.message;}};
 $('[data-agent-validate]').onclick=()=>{try{report=validate(JSON.parse($('[data-agent-json]').value));$('[data-agent-result]').innerHTML=report.valid?`<strong>${esc(report.work.name)}</strong><ol>${report.work.steps.map(s=>`<li>${esc(s.doc.title)} · ${s.doc.data.length} ${text('行','rows')} · ${esc(s.view||s.doc.template)}</li>`).join('')}</ol>${report.warnings.map(w=>`<p>${esc(w.message)}</p>`).join('')}`:`<ul>${report.errors.map(e=>`<li><code>${esc(e.path)}</code> ${esc(e.message)}</li>`).join('')}</ul>`;$('[data-agent-open]').disabled=$('[data-agent-download]').disabled=!report.valid;}catch(e){report=null;$('[data-agent-result]').textContent=e.message;}};
 $('[data-agent-download]').onclick=()=>{if(report?.valid)downloadWorkFile(report.work);};
 $('[data-agent-open]').onclick=async()=>{if(!report?.valid)return;try{const b=$('[data-agent-open]');b.disabled=true;await onOpen(report.work);ui.close();}catch(e){$('[data-agent-result]').textContent=e.message;$('[data-agent-open]').disabled=false;}};
 dialog.showModal();return ui;
}
