import {uiText,uiMarkup,uiMessage} from './locale.js';
import { createExportScene, drawSVGToCanvas, outputDimensions } from './export.js';

export function videoPlan(settings = {}) {
  const duration = Number(settings.duration ?? 8), hold = Number(settings.hold ?? 1), fps = Number(settings.fps ?? 30);
  if (![24,30,60].includes(fps)) throw new Error(uiText('帧率请选择 24、30 或 60。'));
  if (!Number.isFinite(duration) || duration < 2 || duration > 20) throw new Error(uiText('总时长应在 2–20 秒之间。'));
  if (!Number.isFinite(hold) || hold < 0 || hold > 5 || hold >= duration) throw new Error(uiText('末尾停留应在 0–5 秒之间，且小于总时长。'));
  const frames = Math.round(duration * fps), holdFrames = Math.round(hold * fps), animatedFrames = frames - holdFrames;
  const dimensions = outputDimensions(settings.ratio ?? 'landscape',settings.longEdge ?? 1920);
  if (Math.max(dimensions.width,dimensions.height)>1920) throw new Error(uiText('视频最长边最多 1920 px。'));
  return { ...dimensions, fps, frames, duration:frames/fps, hold:holdFrames/fps, animatedFrames,
    progress:frame => Math.min(1,Math.max(0,frame)/Math.max(1,animatedFrames-1)) };
}
const abort = signal => { if(signal?.aborted) throw new DOMException(uiText('已取消导出'),'AbortError'); };
async function loadEncoder(){
  try{return await import('mediabunny');}
  catch{throw new Error(uiText('视频组件未能加载，请保存作品并刷新页面后重试。'));}
}
export async function videoSupport(settings) {
  const plan=videoPlan(settings);
  if(!globalThis.VideoEncoder) return false;
  const {canEncodeVideo}=await loadEncoder();
  return canEncodeVideo('avc',{width:plan.width,height:plan.height});
}

export async function encodeMP4(doc, options = {}, { signal, onProgress = () => {} } = {}) {
  const plan=videoPlan(options);abort(signal);
  // Match whole-work export: later edits must not change the frames being encoded.
  doc=structuredClone(doc);
  // Export controls and the interactive 3D callback are not rendering data.
  const renderOptions={...options};
  for(const key of ['signal','onProgress','onCameraChange'])delete renderOptions[key];
  options=structuredClone(renderOptions);
  const {Output,Mp4OutputFormat,BufferTarget,CanvasSource,Quality,canEncodeVideo}=await loadEncoder();
  abort(signal);
  const supported=!!globalThis.VideoEncoder&&await canEncodeVideo('avc',{width:plan.width,height:plan.height});
  abort(signal);
  if(!supported)throw new Error(uiText('当前浏览器不支持此尺寸的 MP4 编码。请在新版 Chrome / Edge 中打开网站，或导出 HTML 动效。'));
  const canvas=document.createElement('canvas');canvas.width=plan.width;canvas.height=plan.height;
  const renderer=createExportScene(doc,{...options,transparent:false});
  const output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target:new BufferTarget()});
  const source=new CanvasSource(canvas,{codec:'avc',quality:new Quality({bitrate:Math.round(Math.min(16000000,Math.max(4500000,plan.width*plan.height*plan.fps*.14)))}),keyFrameInterval:2});
  output.addVideoTrack(source,{frameRate:plan.fps});
  let done=false;
  try{
    await output.start();let lastProgress=-1;
    for(let frame=0;frame<plan.frames;frame++){
      abort(signal);const progress=plan.progress(frame);
      if(progress!==lastProgress){await drawSVGToCanvas(renderer.frame(progress),canvas);lastProgress=progress;}
      abort(signal);await source.add(frame/plan.fps,1/plan.fps);
      onProgress({frame:frame+1,total:plan.frames,progress:(frame+1)/plan.frames*.98});
      // Give controls and the cancel button a turn without tying frame timestamps to real time.
      if(frame%6===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    abort(signal);await output.finalize();abort(signal);done=true;
    const blob=new Blob([output.target.buffer],{type:'video/mp4'});onProgress({frame:plan.frames,total:plan.frames,progress:1});return blob;
  }finally{
    if(!done)await output.cancel().catch(()=>{});
    source.close();renderer.destroy();canvas.width=canvas.height=0;
  }
}
