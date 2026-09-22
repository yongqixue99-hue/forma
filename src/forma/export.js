import {wrapChartText} from './text-wrap.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {locale} from './locale.js';
import {applyChartBrand,brandLogoSVG} from './brand-view.js';
import {assertAnnotationLayout} from './annotation-view.js';
import {brandFonts} from './brand-style.js';
import { ChartScene } from './charts.js';
import { themeFor } from './palettes.js';
import { escapeHtml, validateDocument } from './data.js';
import { findTemplate } from './catalog.js';
import { makeProject } from './project-file.js';
import {exportFonts} from './export-fonts.js';
import {encodeMP4} from './video-export.js';

export function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export const safeName = doc => `FORMA-${doc.template}-${doc.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').slice(0,36)}`;
function requireValid(doc,validate=validateDocument){const r=validate(doc);if(!r.valid)throw new Error(r.errors.join('\n'));}
const wrapText=wrapChartText;

export function standaloneHTML(doc,options,playerSource){
  requireValid(doc);
  const js=playerSource.replace(/<\/script/gi,'<\\/script');
  const payload=JSON.stringify({doc,options}).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return `<!doctype html><html lang="${locale()}"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escapeHtml(doc.title)} · FORMA</title><body><main id="forma-player"></main><script>globalThis.__FORMA_LOCALE__=${JSON.stringify(locale())};\n${js}</script><script>FormaPlayer.mount(document.getElementById('forma-player'),${payload});</script></body></html>`;
}

export function agentTemplateHTML(doc,options,playerSource){
  requireValid(doc);
  const payload=JSON.stringify({doc,options},null,2).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  const engine=playerSource.replace(/<\/script/gi,'<\\/script');
  return uiMarkup`<!doctype html><html lang="${locale()}"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(doc.title)} · FORMA</title><body><main id="forma-player"></main>
<!-- 编辑区：Agent 在这里替换完整数据与显示设置。下方引擎无需改动。 -->
<script id="forma-document" type="application/json">${payload}</script>
<!-- FORMA 内置渲染器：无需网络或本站链接 -->
<script>globalThis.__FORMA_LOCALE__=${JSON.stringify(locale())};\n${engine}</script>
<script>const payload=JSON.parse(document.getElementById('forma-document').textContent);const view=FormaPlayer.mount(document.getElementById('forma-player'),payload);</script></body></html>`;
}

export async function downloadAgentTemplate(doc,options={}){
  const response=await fetch(`${import.meta.env.BASE_URL}forma/player.js`);
  if(!response.ok)throw new Error(uiText('图表代码暂未就绪，请稍后重试。'));
  download(new Blob([agentTemplateHTML(doc,options,await response.text())],{type:'text/html;charset=utf-8'}),uiMessage`${safeName(doc)}-Agent模板.html`);
}

export function createExportScene(doc,options={},createScene=(host,data,settings)=>new ChartScene(host,data,settings),validate=validateDocument){
  requireValid(doc,validate);
  const {width,height}=exportLayout(options.ratio);
  const t=themeFor(options.palette,options.dark,options.colors);const template=findTemplate(doc.template);
  const titles=wrapText(doc.title,Math.min(35,(width-110)/30)),subtitles=wrapText([doc.subtitle,uiMessage`单位：${doc.unit}`,options.meaning].filter(Boolean).join(' · '),Math.min(76,(width-110)/14));
  const sourceLines=wrapText(`${doc.source.type==='demo'?uiText('演示数据'):uiText('数据来源')} · ${doc.source.name}`,Math.min(88,(width-110)/11));
  const subtitleY=88+(titles.length-1)*42+33,chartY=options.chartOnly?24:subtitleY+(subtitles.length-1)*21+29;
  const host=document.createElement('div');
  const footerHeight=94+(sourceLines.length-1)*17;
  const chartHeight=height-chartY-(options.chartOnly?24:footerHeight);
  if(chartHeight<160)throw new Error(uiText('此画幅放不下完整标题与来源，请选择更高的画幅、仅图表，或精简说明。原始数据未修改。'));
  const scene=createScene(host,doc,{...options,width:width-100,height:chartHeight,compact:false,interactive:false,progress:1});
  // Keep the legacy default SVG intrinsic size for existing clipboard/API consumers.
  // Its internal viewBox can reflow independently for readable portrait type.
  const output=options.longEdge?outputDimensions(options.ratio,options.longEdge):{width:1200,height:({square:1200,portrait:1600,story:2134,landscape:675})[options.ratio]||750};
  return { width,height, destroy:()=>scene.destroy(), frame(progress=1){
  scene.render(progress);assertAnnotationLayout(scene);applyChartBrand(scene.svg,options);const fonts=brandFonts(options);
  const chart=new XMLSerializer().serializeToString(scene.svg).replace('<svg ',`<svg x="50" y="${chartY}" `).replace('width="100%"',`width="${width-100}"`).replace('height="100%"',`height="${chartHeight}"`);
  const svg=uiMarkup`<svg xmlns="http://www.w3.org/2000/svg" width="${output.width}" height="${output.height}" viewBox="0 0 ${width} ${height}" role="img"><title>${escapeHtml(doc.title)}</title><desc>${escapeHtml(JSON.stringify(options.metadata||doc))}</desc><style>${escapeHtml(exportFonts)}</style>${options.transparent?'':`<rect width="${width}" height="${height}" fill="${t.bg}"/>`}<g font-family="${escapeHtml(fonts?.body||'-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,sans-serif')}">${brandLogoSVG(options,width-151,20)}<text x="55" y="40" fill="${t.secondary}" font-size="11" letter-spacing="2">FORMA / ${options.chartLabel?escapeHtml(options.chartLabel):`${template.no} · ${escapeHtml(template.en.toUpperCase())}`}</text>${titles.map((line,i)=>`<text font-family="${escapeHtml(fonts?.title||'-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,sans-serif')}" x="55" y="${88+i*42}" fill="${t.fg}" font-size="30" font-weight="500">${escapeHtml(line)}</text>`).join('')}${subtitles.map((line,i)=>`<text x="55" y="${subtitleY+i*21}" fill="${t.secondary}" font-size="14">${escapeHtml(line)}</text>`).join('')}${chart}<line x1="55" y1="${height-footerHeight+36}" x2="${width-55}" y2="${height-footerHeight+36}" stroke="${t.line}"/>${sourceLines.map((line,i)=>`<text x="55" y="${height-footerHeight+65+i*17}" fill="${t.secondary}" font-size="11">${escapeHtml(line)}</text>`).join('')}<text x="${width-55}" y="${height-29}" fill="${t.secondary}" font-size="12" text-anchor="end">数相 / FORMA</text></g></svg>`;
  if(options.chartOnly){const background=options.transparent?'':`<rect width="${width}" height="${height}" fill="${t.bg}"/>`;return `<svg xmlns="http://www.w3.org/2000/svg" width="${output.width}" height="${output.height}" viewBox="0 0 ${width} ${height}" role="img"><title>${escapeHtml(doc.title)}</title><desc>${escapeHtml(JSON.stringify(options.metadata||doc))}</desc><style>${escapeHtml(exportFonts)}</style>${background}${chart}</svg>`;}
  return svg;
  }};
}
export function staticSVG(doc,options={}){const scene=createExportScene(doc,{...options,annotationStatic:true});try{return scene.frame(options.progress??1);}finally{scene.destroy();}}

// Portrait output needs its own layout density; stretching a 1200px-wide
// desktop composition makes axis text unreadable in a 1080px-tall video.
export function exportLayout(ratio='wide'){
  const sizes={wide:[1200,750],landscape:[1200,675],square:[1200,1200],portrait:[900,1200],story:[720,1280]};
  const [width,height]=sizes[ratio]||sizes.wide;return {width,height};
}

export function outputDimensions(ratio='wide',longEdge=2400){
  const aspect={wide:1.6,square:1,portrait:.75,landscape:16/9,story:9/16}[ratio]||1.6;
  const size=Number(longEdge);if(![720,1080,1280,1920,2400].includes(size))throw new Error(uiText('请选择支持的输出尺寸。'));
  return aspect>=1?{width:size,height:Math.round(size/aspect/2)*2}:{width:Math.round(size*aspect/2)*2,height:size};
}
export async function drawSVGToCanvas(svg,canvas){
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{const img=new Image();img.src=url;await img.decode();const ctx=canvas.getContext('2d');if(!ctx)throw new Error(uiText('浏览器无法创建画布。'));ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}
}
export async function pngBlob(doc,options={}){return svgPNGBlob(staticSVG(doc,options),options);}
export async function svgPNGBlob(svg,options={}){
  const canvas=document.createElement('canvas');Object.assign(canvas,outputDimensions(options.ratio,options.longEdge||2400));
  try{await drawSVGToCanvas(svg,canvas);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error(uiText('PNG 编码失败，请重试。'))),'image/png'));}finally{canvas.width=canvas.height=0;}
}

export async function exportDocument(format,doc,options={}){
  requireValid(doc);const base=safeName(doc);
  if(format==='project'){download(new Blob([JSON.stringify(makeProject(doc,options),null,2)],{type:'application/json'}),base+'.forma.json');return;}
  if(format==='mp4'){download(await encodeMP4(doc,options,{signal:options.signal,onProgress:options.onProgress}),base+'.mp4');return;}
  if(format==='json'){download(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),base+'.json');return;}
  if(format==='svg'){download(new Blob([staticSVG(doc,options)],{type:'image/svg+xml;charset=utf-8'}),base+'.svg');return;}
  if(format==='png'){
    download(await pngBlob(doc,options),base+'.png');return;
  }
  if(format==='html'){
    const response=await fetch(`${import.meta.env.BASE_URL}forma/player.js`);
    if(!response.ok)throw new Error(uiText('动效导出组件尚未就绪，请运行 npm run build:player 后重试。'));
    const html=standaloneHTML(doc,options,await response.text());
    download(new Blob([html],{type:'text/html;charset=utf-8'}),base+'.html');return;
  }
  throw new Error(uiText('不支持的导出格式。'));
}
