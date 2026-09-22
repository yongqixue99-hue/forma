import {recordUsage} from './beta-usage.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import { createElement, X, Download, Image as ImageIcon, Film, FileCode, FileJson, Presentation, Check } from 'lucide';
import { escapeHtml as esc, validateDocument } from './data.js';
import { staticSVG, svgPNGBlob, download, safeName, standaloneHTML, outputDimensions } from './export.js';
import { makeProject } from './project-file.js';
import { videoPlan, videoSupport, encodeMP4 } from './video-export.js';

const icon = i => createElement(i,{width:17,height:17,'stroke-width':1.5,'aria-hidden':true}).outerHTML;
const formats = [['png',uiText('PNG 图片'),ImageIcon],['svg',uiText('SVG 矢量'),ImageIcon],['pptx','PowerPoint · PPTX',Presentation],['mp4',uiText('MP4 视频'),Film],['html',uiText('HTML 动效'),FileCode],['project',uiText('作品文件'),FileJson]];
export function openExportPanel(document, options = {}, { progress=1, format='png', onSettings, renderSVG, onlyImages=false, validate=validateDocument } = {}) {
  const doc=structuredClone(document), originalOptions=structuredClone(options);
  const validation=validate(doc);if(!validation.valid)throw new Error(validation.errors[0]);
  let settings={ratio:options.ratio||'wide',longEdge:2400,duration:options.duration||8,hold:1,fps:30,transparent:false,chartOnly:false,frame:'end',pptxMode:'static',...options.exportSettings,format};
  if(format==='mp4'&&settings.longEdge>1920)settings.longEdge=1920;
  if(['png','svg'].includes(format)&&settings.longEdge===1280)settings.longEdge=1920;
  let previewURL=null,resultURL=null,resultBlob=null,controller=null,busy=false,support=null,closed=false,probe=0;
  const dialog=globalThis.document.createElement('dialog');dialog.className='workflow-dialog export-workflow';dialog.setAttribute('aria-labelledby','export-title');
  (globalThis.document.querySelector('#studio[open]')||globalThis.document.body).append(dialog);
  const $=q=>dialog.querySelector(q);
  const draw=renderSVG||((settings)=>staticSVG(doc,settings));
  const availableFormats=onlyImages?formats.filter(f=>['png','svg'].includes(f[0])):formats;
  const video=()=>settings.format==='mp4', image=()=>['png','svg'].includes(settings.format), pptx=()=>settings.format==='pptx';
  const motion=()=>video()||(pptx()&&settings.pptxMode==='motion'),visual=()=>video()||image()||pptx();
  function effective(){return {...originalOptions,...settings,...(pptx()?{longEdge:1920}:{}),progress:!onlyImages&&image()&&settings.frame==='current'?progress:1,transparent:image()&&settings.transparent};}
  function disposeResult(){if(resultURL)URL.revokeObjectURL(resultURL);resultURL=null;resultBlob=null;}
  function close(){closed=true;controller?.abort();if(previewURL)URL.revokeObjectURL(previewURL);disposeResult();const toast=dialog.querySelector('#toast');if(toast)dialog.parentElement.append(toast);dialog.close();dialog.remove();}
  function render(){
    const dims=outputDimensions(settings.ratio,pptx()?1920:settings.longEdge);
    dialog.innerHTML=uiMarkup`<header class="workflow-header"><div><span class="workflow-kicker">FORMA / EXPORT</span><h2 id="export-title">导出图表</h2></div><button class="icon-button" data-output="close" aria-label="关闭导出面板">${icon(X)}</button></header><div class="export-body"><section class="output-preview"><div class="output-preview-label"><span>${esc(doc.title)}</span><span id="output-size">${visual()?`${dims.width} × ${dims.height}`:uiText('完整作品')}</span></div><div class="output-preview-stage" id="output-preview-stage"></div><div class="output-caption">${pptx()?uiText(settings.pptxMode==='motion'?'一张幻灯片，内嵌完整动画':'一张幻灯片，保留完整静态画面'):video()?uiText('视频包含单图动画与末尾停留，无播放器按钮'):image()?`${settings.chartOnly?uiText('仅图表'):uiText('标题、图表与来源')} · ${settings.frame==='current'?uiText('工作台当前帧'):uiText('完整结束帧')}`:settings.format==='project'?uiText('保留数据、标题、来源、样式与动画设置'):uiText('包含数据和可重播的图表播放器')}</div></section><section class="output-controls"><fieldset id="output-fields" ${busy?'disabled':''}><label class="field">文件格式<select id="output-format">${availableFormats.map(([id,label])=>`<option value="${id}" ${id===settings.format?'selected':''}>${label}</option>`).join('')}</select></label>${pptx()?uiMarkup`<label class="field">幻灯片内容<select data-output-setting="pptxMode"><option value="static" ${settings.pptxMode==='static'?'selected':''}>静态图表</option><option value="motion" ${settings.pptxMode==='motion'?'selected':''}>内嵌动画</option></select></label>`:''}${visual()?uiMarkup`<label class="field">画幅<select data-output-setting="ratio">${[['wide',uiText('横版 16:10')],['landscape',uiText('演示 / 视频 16:9')],['square',uiText('方形 1:1')],['portrait',uiText('图文竖版 3:4')],['story',uiText('短视频竖版 9:16')]].map(([id,label])=>`<option value="${id}" ${settings.ratio===id?'selected':''}>${label}</option>`).join('')}</select></label>${pptx()?'':uiMarkup`<label class="field">输出尺寸<select data-output-setting="longEdge">${(video()?[1280,1920]:[1080,1920,2400]).map(n=>uiMarkup`<option value="${n}" ${settings.longEdge===n?'selected':''}>最长边 ${n} px</option>`).join('')}</select></label>`}<label class="output-check"><input type="checkbox" data-output-setting="chartOnly" ${settings.chartOnly?'checked':''}>仅图表，隐藏标题与来源</label>`:''}${image()?uiMarkup`<label class="output-check"><input type="checkbox" data-output-setting="transparent" ${settings.transparent?'checked':''}>透明背景</label>${onlyImages?'':uiMarkup`<label class="field">静态帧<select data-output-setting="frame"><option value="end" ${settings.frame==='end'?'selected':''}>完整结束帧</option><option value="current" ${settings.frame==='current'?'selected':''}>当前帧 · ${(progress*(originalOptions.duration||8)).toFixed(1)} 秒</option></select></label>`}`:''}${motion()?uiMarkup`<div class="output-field-row"><label class="field">总时长 / 秒<input data-output-setting="duration" type="number" min="2" max="20" step="1" value="${settings.duration}"></label><label class="field">末尾停留 / 秒<input data-output-setting="hold" type="number" min="0" max="5" step="0.5" value="${settings.hold}"></label></div><label class="field">帧率<select data-output-setting="fps">${[24,30,60].map(n=>`<option value="${n}" ${settings.fps===n?'selected':''}>${n} fps</option>`).join('')}</select></label><p class="helper" id="video-support">正在检查 MP4 支持…</p>`:''}${settings.format==='project'?uiText('<p class="output-explanation">下载 .forma.json 作品文件。下次在「我的作品」中选择「打开作品文件」，即可继续编辑。也可以在其他设备的 FORMA 网站打开。</p>'):''}${settings.format==='html'?uiText('<p class="output-explanation">下载独立网页，保留当前工作台的画幅和播放速度。打开后可播放、暂停与拖动时间轴。</p>'):''}</fieldset><div class="output-progress" ${busy?'':'hidden'}><progress max="1" value="0" aria-label="视频导出进度"></progress><span id="output-progress-text">准备画面…</span></div><p class="output-explanation">${pptx()?uiText('PPTX 内嵌当前画面，打开演示文稿即可使用；数据修改请回到 FORMA。'):image()&&settings.format==='svg'?uiText('SVG 包含完整当前数据及未映射原列；透明背景保留标签和图内填色。'):settings.format==='html'||settings.format==='project'?uiText('文件包含当前原始数据及未映射原列，不包含本地撤销历史。分享前请核对数据内容。'):uiText('PNG 和 MP4 只包含可见画面。中文使用当前设备字体，矢量文件在其他设备可能有所差异。')}</p><div id="output-message" role="status" aria-live="polite"></div><button class="button dark wide" id="output-start" data-output="start" ${busy?'disabled':''}>${icon(video()?Film:Download)}${video()?uiText('生成 MP4'):settings.format==='project'?uiText('下载作品文件'):uiMessage`导出 ${settings.format.toUpperCase()}`}</button><button class="text-button" data-output="cancel" ${busy?'':'hidden'}>取消导出</button><a class="button dark wide" id="output-download" hidden>下载文件</a></section></div><footer class="workflow-footer"><span>数据在浏览器中处理与导出</span><span>${video()?'H.264 / MP4':settings.format==='project'?'FORMA PROJECT / V1':settings.format.toUpperCase()}</span></footer>`;
    updatePreview();if(motion())checkSupport();
  }
  function updatePreview(){
    if(previewURL)URL.revokeObjectURL(previewURL);
    const svg=draw(visual()?effective():originalOptions);
    previewURL=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    const img=globalThis.document.createElement('img');img.src=previewURL;img.alt=uiText('导出画面预览');$('#output-preview-stage').replaceChildren(img);
  }
  async function checkSupport(){
    const current=++probe;support=null;
    try{support=await videoSupport(effective());if(closed||current!==probe||!motion())return;
      $('#video-support').textContent=support?uiText('MP4 编码可用 · 按固定帧生成画面'):uiText('此浏览器暂不支持 MP4；可在新版 Chrome / Edge 打开，或选 HTML 动效。');
      $('#output-start').disabled=!support||busy;
    }catch(error){if(!closed&&current===probe&&motion()){$('#video-support').textContent=error.message;$('#output-start').disabled=true;}}
  }
  function persist(){onSettings?.(structuredClone(settings));}
  dialog.addEventListener('input',e=>{
    if(e.target.type!=='number'||!e.target.dataset.outputSetting)return;
    settings[e.target.dataset.outputSetting]=e.target.value.trim()===''?NaN:Number(e.target.value);
    disposeResult();$('#output-download').hidden=true;$('#output-message').textContent='';
    if(motion())checkSupport();
  });
  dialog.addEventListener('change',e=>{
    try{
      if(e.target.id==='output-format'){
        settings.format=e.target.value;if(video()&&settings.longEdge>1920)settings.longEdge=1920;if(image()&&settings.longEdge===1280)settings.longEdge=1920;
      }else if(e.target.dataset.outputSetting){const key=e.target.dataset.outputSetting;settings[key]=e.target.type==='checkbox'?e.target.checked:['longEdge','duration','hold','fps'].includes(key)?Number(e.target.value):e.target.value;}
      else return;
      disposeResult();persist();render();
    }catch(error){$('#output-message').textContent=error.message;}
  });
  dialog.addEventListener('click',async e=>{
    e.stopPropagation();const action=e.target.closest('[data-output]')?.dataset.output;
    if(action==='close')return close();if(action==='cancel'){controller?.abort();$('#output-message').textContent=uiText('正在取消…');return;}
    if(action!=='start'||busy)return;
    controller=new AbortController();busy=true;disposeResult();$('#output-download').hidden=true;updatePreview();$('#output-fields').disabled=true;$('#output-start').disabled=true;$('[data-output="cancel"]').hidden=false;$('#output-message').textContent='';persist();
    try{
      let blob,extension=settings.format;
      if(pptx()){
        $('.output-progress').hidden=false;
        const {encodeChartPPTX}=await import('./work-pptx.js');
        blob=await encodeChartPPTX(doc,effective(),{mode:settings.pptxMode,signal:controller.signal,onProgress:p=>{if(closed)return;$('progress').value=p;$('#output-progress-text').textContent=`${Math.round(p*100)}%`;}});
      }else if(video()){
        videoPlan(effective());$('.output-progress').hidden=false;
        blob=await encodeMP4(doc,effective(),{signal:controller.signal,onProgress:({frame,total,progress:p})=>{if(closed)return;$('progress').value=p;$('#output-progress-text').textContent=uiMessage`${Math.round(p*100)}% · ${frame} / ${total} 帧`;}});
      }else if(settings.format==='png')blob=await svgPNGBlob(draw(effective()),effective());
      else if(settings.format==='svg'){
        const svg=draw(effective());
        blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
      }else if(settings.format==='project'){blob=new Blob([JSON.stringify(makeProject(doc,{...originalOptions,exportSettings:settings}),null,2)],{type:'application/json'});extension='forma.json';}
      else if(settings.format==='html'){
        const response=await fetch(`${import.meta.env.BASE_URL}forma/player.js`,{signal:controller.signal});if(!response.ok)throw new Error(uiText('动效播放器加载失败，请重试。'));
        blob=new Blob([standaloneHTML(doc,originalOptions,await response.text())],{type:'text/html;charset=utf-8'});
      }
      if(closed||controller.signal.aborted)throw new DOMException(uiText('已取消'),'AbortError');
      recordUsage('export',{format:settings.format});resultBlob=blob;resultURL=URL.createObjectURL(blob);
      const link=$('#output-download');link.href=resultURL;link.download=`${safeName(doc)}.${extension}`;link.hidden=false;link.textContent=uiMessage`下载 ${settings.format==='project'?uiText('作品文件'):settings.format.toUpperCase()} · ${(blob.size/1024/1024).toFixed(2)} MB`;
      $('#output-message').textContent=video()?uiText('视频已生成，可预览后下载。'):uiText('文件已生成，可下载使用。');
      if(video()){const player=globalThis.document.createElement('video');player.src=resultURL;player.controls=true;player.playsInline=true;player.setAttribute('aria-label',uiText('导出的 MP4 视频预览'));$('#output-preview-stage').replaceChildren(player);}
      else download(blob,link.download);
      $('#output-start').textContent=uiText('重新生成');
    }catch(error){if(error.name!=='AbortError')recordUsage('export-error',{format:settings.format});if(!closed)$('#output-message').textContent=error.name==='AbortError'?uiText('已取消导出，可调整设置后重试。'):error.message;}
    finally{busy=false;controller=null;if(!closed){$('#output-fields').disabled=false;$('#output-start').disabled=motion()&&support===false;$('[data-output="cancel"]').hidden=true;$('.output-progress').hidden=true;}}
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});render();dialog.showModal();
  return {close};
}
