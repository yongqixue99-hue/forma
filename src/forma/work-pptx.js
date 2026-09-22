import {cleanWork,workReport} from './work-model.js';
import {stepSVG} from './work-export.js';
import {outputDimensions,drawSVGToCanvas,staticSVG} from './export.js';
import {encodeWorkMP4} from './work-video.js';
import {encodeMP4} from './video-export.js';
import {validateDocument} from './data.js';
import {themeFor} from './palettes.js';
import {isEnglish} from './locale.js';
const text=(zh,en)=>isEnglish()?en:zh;
const abort=signal=>{if(signal?.aborted)throw new DOMException('Export cancelled','AbortError');};
export const pptxSize=ratio=>{const d=outputDimensions(ratio,1920);return {width:13.333333,height:13.333333*d.height/d.width};};
const dataURL=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
const notes=doc=>[doc.title,doc.subtitle||'',doc.unit,doc.source.name].filter(Boolean).join('\n');
async function presentation(title,mode,ratio,signal){
 if(!['static','motion'].includes(mode))throw Error('Unknown presentation mode');
 if(!['wide','landscape','square','portrait','story'].includes(ratio))throw Error('Unknown presentation ratio');
 abort(signal);const {default:PptxGenJS}=await import('pptxgenjs');abort(signal);
 const pptx=new PptxGenJS(),size=pptxSize(ratio);pptx.defineLayout({name:'FORMA',...size});pptx.layout='FORMA';pptx.author='FORMA';pptx.subject=title;pptx.title=title;pptx.company='FORMA';pptx.lang=isEnglish()?'en-US':'zh-CN';
 const canvas=document.createElement('canvas');Object.assign(canvas,outputDimensions(ratio,1920));
 return {
  async picture(svg){abort(signal);await drawSVGToCanvas(svg,canvas);abort(signal);return canvas.toDataURL('image/png');},
  still(image,doc,options,index=0){const slide=pptx.addSlide();slide.background={color:themeFor(options.palette,options.dark,options.colors).bg.slice(1)};slide.addImage({data:image,x:0,y:0,w:size.width,h:size.height,altText:doc.title,objectName:`FORMA step ${index+1}`});slide.addNotes(`${notes(doc)}\n${text('图表为高清图片。修改数据请使用 FORMA 作品文件。','Chart is a high-resolution image. Edit data in the FORMA project file.')}`);},
  async motion(blob,cover,description){abort(signal);const video=await dataURL(blob);abort(signal);const slide=pptx.addSlide();slide.addMedia({type:'video',data:video,extn:'mp4',cover,x:0,y:0,w:size.width,h:size.height,objectName:'FORMA full animation'});slide.addNotes(description);},
  async finish(){abort(signal);const result=await pptx.write({outputType:'blob',compression:true});abort(signal);return result;},
  dispose(){canvas.width=canvas.height=0;}
 };
}
export async function encodeWorkPPTX(value,{mode='static',ratio=value.steps[0]?.options.ratio||'landscape'}={}, {signal,onProgress=()=>{}}={}){
 const work=cleanWork(value),report=workReport(work);if(!report.valid)throw Error(report.message);
 onProgress(0);const deck=await presentation(work.name,mode,ratio,signal);
 const picture=step=>deck.picture(stepSVG(step,work.steps,{ratio,longEdge:1920}));
 try{
  if(mode==='static'){
   for(const [i,step]of work.steps.entries()){deck.still(await picture(step),step.doc,step.options,i);onProgress((i+1)/(work.steps.length+1));}
  }else{
   const cover=await picture(work.steps[0]),blob=await encodeWorkMP4(work,{ratio,longEdge:1920,fps:24},{signal,onProgress:p=>onProgress(p.progress*.9)});
   await deck.motion(blob,cover,work.steps.map((s,i)=>`${i+1}. ${notes(s.doc)}`).join('\n\n'));
  }
  onProgress(.96);const result=await deck.finish();onProgress(1);return result;
 }finally{deck.dispose();}
}

// Single charts use their native renderer and timing, including templates outside the morph system.
export async function encodeChartPPTX(value,options={}, {mode='static',signal,onProgress=()=>{}}={}){
 const doc=structuredClone(value),report=validateDocument(doc);if(!report.valid)throw Error(report.errors[0]);
 const settings={...structuredClone(options),ratio:options.ratio||'landscape',longEdge:1920,progress:1,transparent:false};
 onProgress(0);const deck=await presentation(doc.title,mode,settings.ratio,signal);
 try{
  const cover=await deck.picture(staticSVG(doc,settings));onProgress(.1);
  if(mode==='static')deck.still(cover,doc,settings);
  else{const blob=await encodeMP4(doc,settings,{signal,onProgress:p=>onProgress(.1+p.progress*.8)});await deck.motion(blob,cover,notes(doc));}
  onProgress(.96);const result=await deck.finish();onProgress(1);return result;
 }finally{deck.dispose();}
}
