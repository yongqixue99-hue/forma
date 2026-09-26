import {wrapChartText} from './text-wrap.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {brandLogoSVG} from './brand-view.js';
import {assertAnnotationLayout} from './annotation-view.js';
import {brandFonts} from './brand-style.js';
import {exportFonts} from './export-fonts.js';
import {frameMeaning} from './data-semantics.js';
import {workTimeline,timelineFrame} from './work-timeline.js';
import {WorkFrameRenderer} from './work-frame.js';
import {stepName} from './work-scene.js';
import {workReport,stepView} from './work-model.js';
import {themeFor} from './palettes.js';
import {escapeHtml as esc} from './data.js';
import {outputDimensions,drawSVGToCanvas,exportLayout} from './export.js';

const abort=signal=>{if(signal?.aborted)throw new DOMException(uiText('已取消导出'),'AbortError');};
const wrap=(text,max)=>wrapChartText(text,max,{latin:.58,wide:.58});

export function workVideoPlan(value,settings={}){
  const timeline=workTimeline(value),report=workReport(timeline.work);
  if(!report.valid)throw new Error(report.message);
  const fps=Number(settings.fps??30),longEdge=Number(settings.longEdge??1920),ratio=settings.ratio??(timeline.work.steps[0].options.brand?timeline.work.steps[0].options.ratio:'landscape');
  if(![24,30,60].includes(fps))throw new Error(uiText('帧率请选择 24、30 或 60。'));
  if(![720,1080,1280,1920].includes(longEdge))throw new Error(uiText('视频最长边请选择 720–1920 px。'));
  if(!['wide','landscape','square','portrait','story'].includes(ratio))throw new Error(uiText('请选择支持的视频画幅。'));
  const frames=Math.ceil(timeline.duration/1000*fps);
  return {timeline,ratio,fps,frames,duration:frames/fps,...outputDimensions(ratio,longEdge),time:frame=>Math.min(timeline.duration,Math.max(0,frame)/fps*1000)};
}

// A detached SVG renderer uses the same transition frames as the draggable
// player. No screen capture, live timing, missing frames or external fonts.
export function createWorkExportRenderer(value,{ratio}={}){
  const timeline=workTimeline(value),{work}=timeline,host=document.createElement('div');
  ratio??=work.steps[0].options.brand?work.steps[0].options.ratio:'landscape';
  const {width,height}=exportLayout(ratio),titleWidth=Math.min(35,(width-110)/30),subtitleWidth=Math.min(76,(width-110)/14),sourceWidth=Math.min(75,(width-110)/12);
  const titleRows=Math.max(...work.steps.map(s=>wrap(s.doc.title,titleWidth).length));
  const subtitleRows=Math.max(...work.steps.map((s,i)=>wrap([s.doc.subtitle,uiMessage`单位：${s.doc.unit}`,frameMeaning(stepView(s),{progress:.5,mode:'morph',fromView:i?stepView(work.steps[i-1]):undefined})].filter(Boolean).join(' · '),subtitleWidth).length));
  const sourceRows=Math.max(...work.steps.map(s=>wrap(s.doc.source.name,sourceWidth).length)),footerHeight=90+(sourceRows-1)*17;
  const subtitleY=94+(titleRows-1)*40+30,chartY=subtitleY+subtitleRows*21+10,chartWidth=width-100,chartHeight=height-chartY-footerHeight;
  if(chartHeight<160)throw new Error(uiText('此画幅放不下完整标题与来源，请选择更高的画幅或精简说明。原始数据未修改。'));
  const renderer=new WorkFrameRenderer(host,work.steps,{width:chartWidth,height:chartHeight,showLegend:true,compact:false});
  return {width,height,timeline,renderer,destroy:()=>renderer.destroy(),frame(milliseconds){
    const f=timelineFrame(timeline,milliseconds),state=renderer.render(f),step=state.step,t=themeFor(step.options.palette,step.options.dark,step.options.colors);
    assertAnnotationLayout(renderer.scene);
    const fonts=brandFonts(step.options);
    const chart=new XMLSerializer().serializeToString(renderer.scene.svg).replace('<svg ',`<svg x="50" y="${chartY}" `).replace('width="100%"',`width="${chartWidth}"`).replace('height="100%"',`height="${chartHeight}"`);
    const cx=width/2,cy=chartY+chartHeight/2,transform=`translate(${state.translate*chartWidth} 0) translate(${cx} ${cy}) scale(${state.scale}) translate(${-cx} ${-cy})`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>${esc(exportFonts)}</style><rect width="${width}" height="${height}" fill="#eeece7"/><g opacity="${state.opacity}"><rect width="${width}" height="${height}" fill="${t.bg}"/><g font-family="${esc(fonts?.body||'PingFang SC,Microsoft YaHei,sans-serif')}">${brandLogoSVG(step.options,width-151,22)}<text x="55" y="43" font-size="12" fill="${t.secondary}">${esc(stepName(step))} / FORMA</text>${wrap(step.doc.title,titleWidth).map((line,i)=>`<text font-family="${esc(fonts?.title||'PingFang SC,Microsoft YaHei,sans-serif')}" x="55" y="${94+i*40}" font-size="30" fill="${t.fg}">${esc(line)}</text>`).join('')}${wrap([step.doc.subtitle,uiMessage`单位：${step.doc.unit}`,frameMeaning(stepView(step),{progress:state.progress,mode:state.plan?.mode,fromView:f.from?stepView(f.from):undefined})].filter(Boolean).join(' · '),subtitleWidth).map((line,i)=>`<text x="55" y="${subtitleY+i*21}" font-size="14" fill="${t.secondary}">${esc(line)}</text>`).join('')}<g transform="${transform}">${chart}</g><path d="M55 ${height-footerHeight+32}H${width-55}" stroke="${t.line}"/>${wrap(step.doc.source.name,sourceWidth).map((line,i)=>`<text x="55" y="${height-footerHeight+61+i*17}" font-size="12" fill="${t.secondary}">${esc(line)}</text>`).join('')}<text x="${width-55}" y="${height-29}" text-anchor="end" font-size="12" fill="${t.secondary}">${f.index+1} / ${work.steps.length}</text></g></g></svg>`;
  }};
}

export async function encodeWorkMP4(value,settings={}, {signal,onProgress=()=>{}}={}){
  // Snapshot before the first await; editing the work during export is safe.
  const plan=workVideoPlan(value,settings);abort(signal);
  const {Output,Mp4OutputFormat,BufferTarget,CanvasSource,Quality,canEncodeVideo}=await import('mediabunny');
  abort(signal);
  const supported=!!globalThis.VideoEncoder&&await canEncodeVideo('avc',{width:plan.width,height:plan.height});
  abort(signal);
  if(!supported)throw new Error(uiText('当前浏览器不支持此尺寸的 MP4 编码。可降低尺寸重试，或在新版 Chrome / Edge 中打开网站；互动网页 HTML 也会保留完整动画。'));
  const canvas=document.createElement('canvas');canvas.width=plan.width;canvas.height=plan.height;
  const renderer=createWorkExportRenderer(plan.timeline.work,plan),output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target:new BufferTarget()});
  const source=new CanvasSource(canvas,{codec:'avc',quality:new Quality({bitrate:Math.round(Math.min(16000000,Math.max(3500000,plan.width*plan.height*plan.fps*.14)))}),keyFrameInterval:2});
  output.addVideoTrack(source,{frameRate:plan.fps});let done=false,previousFrame=null;
  try{
    await output.start();
    for(let i=0;i<plan.frames;i++){
      abort(signal);const time=plan.time(i),frame=timelineFrame(plan.timeline,time),key=frame.phase==='hold'&&!frame.step.options.annotations?.length?`hold:${frame.index}`:`${time}`;
      if(key!==previousFrame){await drawSVGToCanvas(renderer.frame(time),canvas);previousFrame=key;}
      abort(signal);await source.add(i/plan.fps,1/plan.fps);
      onProgress({frame:i+1,total:plan.frames,step:frame.index+1,steps:plan.timeline.work.steps.length,progress:(i+1)/plan.frames*.98});
      if(i%6===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    abort(signal);await output.finalize();abort(signal);done=true;
    const blob=new Blob([output.target.buffer],{type:'video/mp4'});onProgress({frame:plan.frames,total:plan.frames,progress:1});return blob;
  }finally{
    if(!done)await output.cancel().catch(()=>{});
    source.close();renderer.destroy();canvas.width=canvas.height=0;
  }
}
