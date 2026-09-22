import {scopedWorkBrief} from './agent-brief.js';
import {locale,isEnglish} from './locale.js';
import {loadWorkRuntime} from './work-runtime.js';
import {encodingMeaning} from './data-semantics.js';
import {cleanWork,workReport,stepReport,morphReady,morphDocument,stepView,transitionPlan,stepDomain,workViews} from './work-model.js';
import {stepName,createStepScene} from './work-scene.js';
import {findTemplate} from './catalog.js';
import {morphViews} from './morph.js';
import {themeFor,configuredColors} from './palettes.js';
import {escapeHtml as esc} from './data.js';
import {download,drawSVGToCanvas,createExportScene,outputDimensions} from './export.js';

const filename=work=>`FORMA-${work.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').slice(0,40)}`;
const ready=value=>{const work=cleanWork(value),report=workReport(work);if(!report.valid)throw new Error(report.message);return work;};
export function workAgentBrief(value){return scopedWorkBrief(ready(value),isEnglish());}
export function workHTML(value,source){
  const work=ready(value),payload=JSON.stringify(work).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return `<!doctype html><html lang="${locale()}"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(work.name)} · FORMA</title><body><main id="forma-work-player"></main><script id="forma-work" type="application/json">${payload}</script><script>globalThis.__FORMA_LOCALE__=${JSON.stringify(locale())};\n${source.replace(/<\/script/gi,'<\\/script')}</script><script>FormaWorkPlayer.mount(document.getElementById('forma-work-player'),JSON.parse(document.getElementById('forma-work').textContent));</script></body></html>`;
}
export async function downloadWorkHTML(value){const work=ready(value),source=await loadWorkRuntime(work);download(new Blob([workHTML(work,source)],{type:'text/html;charset=utf-8'}),filename(work)+'.html');}
export function downloadWorkFile(value){const work=ready(value);download(new Blob([JSON.stringify(work,null,2)],{type:'application/json'}),filename(work)+'.forma-work.json');}
export function stepSVG(step,steps=[step],settings={}){
  const options={...step.options,...settings,annotationStatic:true,progress:settings.progress??1,metadata:step,chartLabel:stepName(step),meaning:encodingMeaning(stepView(step))};
  // The chosen work encoding can support more records than its native
  // template. Validate against that renderer, retaining all data constraints.
  const scene=createExportScene(step.doc,options,(host,doc,dimensions)=>createStepScene(host,{...step,options},{...dimensions,showLegend:true,domain:stepDomain(step,steps),axisLabels:true}),()=>stepReport(step));
  try{return scene.frame(options.progress);}finally{scene.destroy();}
}
export async function downloadStep(step,format='svg',steps=[step],settings={}){
  const svg=stepSVG(step,steps,settings),base=`FORMA-${step.doc.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').slice(0,40)}`;
  if(format==='svg'){download(new Blob([svg],{type:'image/svg+xml'}),base+'.svg');return;}
  const canvas=document.createElement('canvas');Object.assign(canvas,outputDimensions(settings.ratio||step.options.ratio,settings.longEdge||2400));
  try{await drawSVGToCanvas(svg,canvas);const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG 导出失败')),'image/png'));download(blob,base+'.png');}finally{canvas.width=canvas.height=0;}
}
