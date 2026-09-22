import {captureForm,restoreForm} from './locale-session.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {createElement,Upload,X,Check,Save} from 'lucide';
import {brandFromOptions,cleanBrandProfile,brandTypefaces,brandRatios,LOGO_BYTES} from './brand-style.js';
import {configuredColors,palettes} from './palettes.js';
import {mountColorEditor} from './color-editor.js';
import {escapeHtml as esc} from './data.js';
import './brand-panel.css';
const icon=(name,size=15)=>createElement({Upload,X,Check,Save}[name],{width:size,height:size,'stroke-width':1.5,'aria-hidden':'true'}).outerHTML;

async function readLogo(file,win){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||file.size>LOGO_BYTES)throw new Error(uiText('请选择 256 KiB 以内的 PNG、JPEG 或 WebP 图片。'));
  const data=await new Promise((resolve,reject)=>{const reader=new win.FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error(uiText('未能读取这张图片。')));reader.readAsDataURL(file);});
  const image=new win.Image();image.src=data;await image.decode().catch(()=>{throw new Error(uiText('图片无法解码，请重新选择。'));});
  return {name:file.name.slice(0,100),data,width:image.naturalWidth,height:image.naturalHeight};
}
export function mountBrandPanel(host,{repository,step,steps,onApply,resume}){
  const win=host.ownerDocument.defaultView,events=new win.AbortController();let draft=resume?.draft?structuredClone(resume.draft):brandFromOptions(step.options),saved=[],selected=null,colors,alive=true,logoEpoch=0,reading=false,busy=false;
  const $=s=>host.querySelector(s),message=text=>{if(alive)$('[data-brand-status]').textContent=text;};
  host.classList.add('brand-panel');
  host.innerHTML=uiMarkup`<label class="brand-field">已保存的方案<select data-brand-saved><option value="">当前步骤的样式</option></select></label><div class="brand-sample" aria-label="品牌样式预览"><span>样式预览</span><img data-brand-preview-logo hidden alt=""><strong data-brand-sample-title></strong><div data-brand-sample-colors></div></div><label class="brand-field">方案名称<input data-brand-name maxlength="60" value="${esc(draft.name)}" autocomplete="off"></label><section class="brand-section"><h3>字体组合</h3><div class="brand-typefaces" role="group" aria-label="字体组合">${Object.entries(brandTypefaces).map(([id,font])=>`<button data-brand-type="${id}" aria-pressed="${draft.typography===id}"><span style="font-family:${esc(font.title)}">${font.sample}</span><small>${uiText(font.name)}</small></button>`).join('')}</div></section><section class="brand-section"><div class="brand-section-heading"><h3>配色与画幅</h3><label class="brand-dark"><input type="checkbox" data-brand-dark ${draft.dark?'checked':''}>炭黑背景</label></div><label class="brand-field">官方色板<select data-brand-palette>${Object.entries(palettes).map(([id,p])=>`<option value="${id}" ${draft.palette===id?'selected':''}>${uiText(p.name)}</option>`).join('')}</select></label><details class="brand-colors"><summary>自定义颜色</summary><div data-brand-colors></div></details><label class="brand-field">导出画幅<select data-brand-ratio>${brandRatios.map(([id,name])=>`<option value="${id}" ${draft.ratio===id?'selected':''}>${name}</option>`).join('')}</select></label></section><section class="brand-section"><div class="brand-section-heading"><h3>Logo</h3><button class="text-button" data-brand-remove-logo hidden>移除</button></div><input data-brand-file type="file" accept="image/png,image/jpeg,image/webp" hidden><button class="brand-logo-upload" data-brand-upload>${icon('Upload')}<span data-brand-logo-name>添加 Logo</span></button><p class="brand-note">PNG、JPEG 或 WebP，最多 256 KiB；随作品保存和导出。</p></section><section class="brand-scope" role="group" aria-label="应用范围"><h3>应用范围</h3><div class="brand-scope-options"><label><input name="brand-scope" data-brand-scope type="radio" value="current" ${steps.length===1?'checked':''}>当前步骤</label><label><input name="brand-scope" data-brand-scope type="radio" value="all" ${steps.length>1?'checked':''}>整套作品 · ${steps.length} 步</label></div></section><p class="brand-impact" data-brand-impact></p><div class="brand-library-actions"><button class="text-button" data-brand-save>${icon('Save')}另存方案</button><button class="text-button" data-brand-update hidden>更新方案</button><button class="text-button" data-brand-delete hidden>移除方案</button></div><div class="brand-delete-confirm" hidden><p>从方案列表移除，已应用的作品仍保留自己的样式。</p><button data-brand-confirm-delete>确定移除</button><button data-brand-cancel-delete>取消</button></div><div class="brand-apply-row"><div><strong data-brand-target></strong><span data-brand-status role="status"></span></div><button class="button dark" data-brand-apply>${icon('Check')}应用样式</button></div>`;
  function renderSample(){
    if(!alive)return;const font=brandTypefaces[draft.typography],sample=$('.brand-sample'),image=$('[data-brand-preview-logo]');
    sample.dataset.dark=String(draft.dark);$('[data-brand-sample-title]').textContent=step.doc.title;$('[data-brand-sample-title]').style.fontFamily=font.title;
    $('[data-brand-sample-colors]').innerHTML=configuredColors(draft).map(c=>`<i style="background:${c}"></i>`).join('');
    image.hidden=!draft.logo;if(draft.logo){image.src=draft.logo.data;image.alt=draft.logo.name;}else image.removeAttribute('src');
    $('[data-brand-remove-logo]').hidden=!draft.logo;$('[data-brand-logo-name]').textContent=draft.logo?.name||uiText('添加 Logo');
    host.querySelectorAll('[data-brand-type]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.brandType===draft.typography)));
    const count=$('[data-brand-scope]:checked').value==='all'?steps.length:1;$('[data-brand-target]').textContent=count===1?uiText('应用到当前步骤'):uiMessage`应用到整套作品 · ${count} 步`;$('[data-brand-impact]').textContent=uiMessage`将统一 ${count} 步的配色、字体、Logo 和画幅。数据与播放节奏保留，应用后可整体撤销。`;
    $('[data-brand-apply]').disabled=busy||!draft.name.trim()||reading;
  }
  function mountColors(){colors?.destroy();colors=mountColorEditor($('[data-brand-colors]'),{getOptions:()=>draft,getDoc:()=>step.doc,onChange(options){draft={...draft,...options};if(!options.colors)delete draft.colors;if(!options.colorMode)delete draft.colorMode;renderSample();}});}
  function renderFields(){$('[data-brand-name]').value=draft.name;$('[data-brand-palette]').value=draft.palette;$('[data-brand-ratio]').value=draft.ratio;$('[data-brand-dark]').checked=draft.dark;renderSample();mountColors();}
  async function refreshLibrary(id){
    try{const records=await repository?.brands?.()||[];if(!alive)return;saved=records;selected=saved.find(r=>r.profile.id===id)||null;
      $('[data-brand-saved]').innerHTML=uiText('<option value="">当前步骤的样式</option>')+saved.map(r=>`<option value="${esc(r.profile.id)}">${esc(r.profile.name)}</option>`).join('');$('[data-brand-saved]').value=selected?.profile.id||'';
      $('[data-brand-update]').hidden=!selected;$('[data-brand-delete]').hidden=!selected;
    }catch(e){message(e.message);}
  }
  host.addEventListener('input',e=>{if(e.target.matches('[data-brand-name]')){draft.name=e.target.value;renderSample();}},{signal:events.signal});
  host.addEventListener('change',async e=>{
    const node=e.target;
    if(node.matches('[data-brand-saved]')){logoEpoch++;reading=false;selected=saved.find(r=>r.profile.id===node.value)||null;draft=selected?structuredClone(selected.profile):brandFromOptions(step.options);$('[data-brand-update]').hidden=!selected;$('[data-brand-delete]').hidden=!selected;$('.brand-delete-confirm').hidden=true;message('');renderFields();}
    if(node.matches('[data-brand-palette]')){draft.palette=node.value;delete draft.colors;delete draft.colorMode;mountColors();renderSample();}
    if(node.matches('[data-brand-ratio]')){draft.ratio=node.value;renderSample();}
    if(node.matches('[data-brand-dark]')){draft.dark=node.checked;mountColors();renderSample();}
    if(node.matches('[data-brand-scope]'))renderSample();
    if(node.matches('[data-brand-file]')){const file=node.files[0];node.value='';if(!file)return;const token=++logoEpoch;reading=true;renderSample();message(uiText('正在读取 Logo…'));try{const logo=await readLogo(file,win);if(!alive||logoEpoch!==token)return;draft=cleanBrandProfile({...draft,logo});message(uiText('Logo 已就绪。'));}catch(error){if(alive&&logoEpoch===token)message(error.message);}finally{if(alive&&logoEpoch===token){reading=false;renderSample();}}}
  },{signal:events.signal});
  host.addEventListener('click',async e=>{
    const button=e.target.closest('button');if(!button||busy)return;
    if(button.dataset.brandType){draft.typography=button.dataset.brandType;renderSample();return;}
    if(button.hasAttribute('data-brand-upload')){$('[data-brand-file]').click();return;}
    if(button.hasAttribute('data-brand-remove-logo')){logoEpoch++;reading=false;delete draft.logo;renderSample();return;}
    if(button.hasAttribute('data-brand-delete')){$('.brand-delete-confirm').hidden=false;return;}
    if(button.hasAttribute('data-brand-cancel-delete')){$('.brand-delete-confirm').hidden=true;return;}
    if(!button.matches('[data-brand-save],[data-brand-update],[data-brand-apply],[data-brand-confirm-delete]'))return;
    if(reading){message(uiText('Logo 读取完成后再保存或应用。'));return;}
    busy=true;const locked=[...host.querySelectorAll('input,select,button')].map(node=>[node,node.disabled]);locked.forEach(([node])=>node.disabled=true);renderSample();
    try{
      const profile=cleanBrandProfile(draft);
      if(button.hasAttribute('data-brand-apply')){await onApply(profile,$('[data-brand-scope]:checked').value==='all'?steps.map(s=>s.id):[step.id]);}
      else if(button.hasAttribute('data-brand-confirm-delete')){await repository.removeBrand(selected.profile.id,selected.revision);selected=null;await refreshLibrary();$('.brand-delete-confirm').hidden=true;message(uiText('方案已移除，作品样式保留。'));}
      else {if(!repository?.available)throw new Error(uiText('当前浏览器无法保存品牌方案，仍可应用到作品并导出。'));const updating=button.hasAttribute('data-brand-update'),value=updating?{...profile,id:selected.profile.id}:{...profile,id:`brand:${crypto.randomUUID()}`};const savedRecord=await repository.saveBrand(value,{expectedRevision:updating?selected.revision:0});draft=structuredClone(savedRecord.profile);await refreshLibrary(savedRecord.profile.id);message(uiText('方案已保存，下次可直接选用。'));}
    }catch(error){message(error.message);}finally{busy=false;if(alive){locked.forEach(([node,disabled])=>node.disabled=disabled);renderSample();}}
  },{signal:events.signal});
  renderFields();const ready=refreshLibrary(resume?.selectedId).then(()=>{if(resume&&alive)restoreForm(host,resume.form);});
  return {ready,captureSession(){if(reading||busy)throw Error(uiText('品牌样式正在处理，请完成后再切换语言。'));return {draft:structuredClone(draft),selectedId:selected?.profile.id,form:captureForm(host)};},destroy(){alive=false;logoEpoch++;colors?.destroy();events.abort();}};
}
