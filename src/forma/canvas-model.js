import {validateDocument} from './data.js';
import {cleanOptions} from './project-file.js';
import {validateMorphDocument,morphViews} from './morph.js';

export const CANVAS_KEY='forma.canvases.v1';
export const CANVAS_LIMITS={projects:12,scenes:12,panels:4,bytes:6000000};
export const canvasEffects=[['smart','智能衔接'],['fade','柔和叠化'],['slide','水平推移'],['rise','向上揭示'],['zoom','聚焦缩放'],['wipe','幕布展开']];
export const canvasRatios=[['wide','横版 16:10'],['landscape','横版 16:9'],['square','方形 1:1'],['portrait','竖版 3:4']];
export const uid=()=>crypto.randomUUID();
const clone=value=>structuredClone(value);
export const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
export const ease=value=>{const p=clamp(value);return p<.5?4*p*p*p:1-(-2*p+2)**3/2;};
export function canvasSize(ratio='wide'){return {width:1200,height:{wide:750,landscape:675,square:1200,portrait:1600}[ratio]||750};}
export function newScene(name='新页面'){return {id:uid(),name:name.slice(0,80),hold:4,transition:'smart',seconds:1,panels:[]};}
export function newCanvas(name='未命名画布') {return {format:'forma-canvas',version:1,id:uid(),name,ratio:'wide',dark:false,loop:false,assets:[],scenes:[newScene('第一页')],updated:Date.now(),savedAt:null};}
export function morphCapable(doc){
  if(!['column','bar','pie','donut','mosaic','rose','lollipop'].includes(doc?.template))return false;
  // The legacy four-panel canvas retains its original all-view contract.
  try{validateMorphDocument(doc);return doc.data.length>=4&&doc.data.length<=8&&doc.data.every(r=>r.value>0);}catch{return false;}
}
export function defaultMorphView(doc){return {column:'columns',bar:'bars',pie:'pie',donut:'donut',mosaic:'treemap',rose:'rose',lollipop:'bars'}[doc.template]||'bars';}
export function fitPanel(panel){
  const w=clamp(Number(panel.w)||50,22,100),h=clamp(Number(panel.h)||50,26,100);
  return {...panel,x:Math.round(clamp(Number(panel.x)||0,0,100-w)*10)/10,y:Math.round(clamp(Number(panel.y)||0,0,100-h)*10)/10,w:Math.round(w*10)/10,h:Math.round(h*10)/10};
}
export function arrangePanels(scene,layout='auto'){
  const n=scene.panels.length;if(!n)return scene;
  const boxes=n===1?[[0,0,100,100]]:n===2?(layout==='stack'?[[0,0,100,48],[0,52,100,48]]:layout==='lead'?[[0,0,63,100],[67,0,33,100]]:[[0,0,48,100],[52,0,48,100]]):n===3?[[0,0,60,100],[64,0,36,48],[64,52,36,48]]:[[0,0,48,48],[52,0,48,48],[0,52,48,48],[52,52,48,48]];
  scene.panels.forEach((p,i)=>Object.assign(p,Object.fromEntries(['x','y','w','h'].map((k,c)=>[k,boxes[i][c]]))));return scene;
}
export function addSources(project,sceneId,sources,mode='together'){
  if(!sources.length)return;
  const scene=project.scenes.find(s=>s.id===sceneId);if(!scene)throw new Error('找不到当前页面。');
  if(mode==='together'&&scene.panels.length+sources.length>CANVAS_LIMITS.panels)throw new Error('一页最多放 4 张图，可以选择「分别成页」。');
  const reuseEmpty=mode==='pages'&&!scene.panels.length;
  if(mode==='pages'&&project.scenes.length+sources.length-(reuseEmpty?1:0)>CANVAS_LIMITS.scenes)throw new Error('一张画布最多保留 12 页。');
  for(const source of sources){const report=validateDocument(source.doc);if(source.disabled||!report.valid)throw new Error(source.reason||report.errors[0]||'请先完成这张图的数据。');}
  let lastScene=scene;
  sources.forEach((source,index)=>{
    let asset=project.assets.find(a=>a.sourceKey===source.key&&JSON.stringify(a.doc)===JSON.stringify(source.doc)&&JSON.stringify(a.options)===JSON.stringify(cleanOptions(source.options)));
    if(!asset){asset={id:uid(),sourceKey:String(source.key||''),doc:clone(source.doc),options:cleanOptions(source.options)};project.assets.push(asset);}
    const panel={id:uid(),assetId:asset.id,x:0,y:0,w:100,h:100,view:'native'};
    let target=scene;
    if(mode==='pages'){
      if(index===0&&reuseEmpty)target=scene;
      else {target=newScene(source.doc.title);const at=project.scenes.indexOf(lastScene)+1;project.scenes.splice(at,0,target);}
      target.name=source.doc.title.slice(0,80);lastScene=target;
    }
    target.panels.push(panel);arrangePanels(target);
  });
  return lastScene.id;
}
export function duplicateScene(project,id){
  if(project.scenes.length>=CANVAS_LIMITS.scenes)throw new Error('一张画布最多保留 12 页。');
  const i=project.scenes.findIndex(s=>s.id===id);if(i<0)throw new Error('找不到页面。');
  const next={...clone(project.scenes[i]),id:uid(),name:project.scenes[i].name.slice(0,75)+' · 副本'};project.scenes.splice(i+1,0,next);return next;
}
export function appendMorphScene(project,sceneId,panelId,view){
  const scene=project.scenes.find(s=>s.id===sceneId),panel=scene?.panels.find(p=>p.id===panelId),asset=project.assets.find(a=>a.id===panel?.assetId);
  if(!asset||!morphCapable(asset.doc)||!morphViews.some(v=>v.id===view))throw new Error('连续变形适用于 4–8 个类别、数值为正的数量或占比图。');
  if(project.scenes.length>=CANVAS_LIMITS.scenes)throw new Error('一张画布最多保留 12 页。');
  if(panel.view==='native')panel.view=defaultMorphView(asset.doc);
  const next=duplicateScene(project,sceneId);next.name=`${asset.doc.title.slice(0,60)} · ${morphViews.find(v=>v.id===view).name}`;next.transition='smart';next.panels.find(p=>p.id===panelId).view=view;return next;
}
export function pruneAssets(project){const ids=new Set(project.scenes.flatMap(s=>s.panels.map(p=>p.assetId)));project.assets=project.assets.filter(a=>ids.has(a.id));return project;}
export function sceneSchedule(project){let start=0;return project.scenes.map((scene,index)=>{const transition=index===0?1:scene.seconds,segment={index,start,transition,holdStart:start+transition,end:start+transition+scene.hold};start=segment.end;return segment;});}
export function canvasDuration(project){return sceneSchedule(project).at(-1)?.end||0;}
export function canvasFrame(project,time){
  const schedule=sceneSchedule(project),end=schedule.at(-1).end,t=clamp(Number(time)||0,0,end),segment=schedule.find(s=>t<s.end)||schedule.at(-1);
  const amount=clamp((t-segment.start)/segment.transition),transition=t<segment.holdStart;
  return {index:segment.index,from:transition&&segment.index>0?segment.index-1:null,amount,entry:segment.index===0?amount:1,time:t};
}
const text=(value,max=80)=>typeof value==='string'&&!!value.trim()&&value.length<=max;
const idOK=value=>text(value,160)&&/^[\w:-]+$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
export function validateCanvas(value){
  if(!value||value.format!=='forma-canvas'||value.version!==1)throw new Error('请选择 FORMA 画布文件。');
  if(!idOK(value.id)||!text(value.name))throw new Error('画布需要 1–80 字的名称。');
  if(!canvasRatios.some(([id])=>id===value.ratio))throw new Error('不支持这个画布比例。');
  if(!Array.isArray(value.scenes)||!value.scenes.length||value.scenes.length>12||!Array.isArray(value.assets)||value.assets.length>48)throw new Error('画布支持 1–12 页，每页最多 4 张图。');
  const assets=new Map();for(const a of value.assets){
    if(!a||!idOK(a.id)||assets.has(a.id))throw new Error('图表素材编号重复或无效。');
    const report=validateDocument(a.doc);if(!report.valid)throw new Error(`画布中的图表数据有误：${report.errors[0]}`);assets.set(a.id,a);
  }
  const scenes=new Set();for(const s of value.scenes){
    if(!idOK(s.id)||scenes.has(s.id)||!text(s.name))throw new Error('页面名称或编号无效。');scenes.add(s.id);
    if(!Number.isFinite(s.hold)||s.hold<1||s.hold>20||!Number.isFinite(s.seconds)||s.seconds<.3||s.seconds>3||!canvasEffects.some(([e])=>e===s.transition))throw new Error('停留时间为 1–20 秒，转场为 0.3–3 秒。');
    if(!Array.isArray(s.panels)||s.panels.length>4)throw new Error('一页最多 4 张图。');
    const ids=new Set();for(const p of s.panels){
      if(!idOK(p.id)||ids.has(p.id)||!assets.has(p.assetId))throw new Error('页面中的图表关联无效。');ids.add(p.id);
      if(!['x','y','w','h'].every(k=>Number.isFinite(p[k]))||p.x<0||p.y<0||p.w<22||p.h<26||p.x+p.w>100.01||p.y+p.h>100.01)throw new Error('图表位置或大小超出画布。');
      if(p.view!=='native'&&(!morphViews.some(v=>v.id===p.view)||!morphCapable(assets.get(p.assetId).doc)))throw new Error('这个图表不支持所选的连续变形。');
    }
  }
  return true;
}
export function cleanCanvas(value){
  validateCanvas(value);
  return {format:'forma-canvas',version:1,id:value.id,name:value.name,ratio:value.ratio,dark:value.dark===true,loop:value.loop===true,updated:Number.isFinite(value.updated)?value.updated:Date.now(),savedAt:Number.isFinite(value.savedAt)?value.savedAt:null,
    assets:value.assets.map(a=>({id:a.id,sourceKey:typeof a.sourceKey==='string'?a.sourceKey.slice(0,200):'',doc:clone(a.doc),options:cleanOptions(a.options)})),
    scenes:value.scenes.map(s=>({id:s.id,name:s.name,hold:s.hold,transition:s.transition,seconds:s.seconds,panels:s.panels.map(p=>({id:p.id,assetId:p.assetId,x:p.x,y:p.y,w:p.w,h:p.h,view:p.view}))}))};
}
export function readCanvasFile(text){if(text.length>CANVAS_LIMITS.bytes)throw new Error('画布文件请控制在 6 MB 以内。');let value;try{value=JSON.parse(text);}catch{throw new Error('画布文件不是有效的 JSON。');}return cleanCanvas(value);}
export function readCanvasCollection(storage=localStorage){
  let raw;try{raw=storage.getItem(CANVAS_KEY);if(!raw)return {projects:[],activeId:null};const value=JSON.parse(raw);
    if(value?.version!==1||!Array.isArray(value.projects))throw new Error();const projects=[];
    for(const p of value.projects.slice(0,12)){try{const clean=cleanCanvas(p);if(!projects.some(v=>v.id===clean.id))projects.push(clean);}catch{}}
    const incomplete=projects.length!==value.projects.length;
    return {projects,activeId:value.activeId,recoveryRaw:incomplete?raw:null,warning:incomplete?'部分画布无法读取。原记录会单独备份后再保存本次修改。':''};
  }catch{return {projects:[],activeId:null,recoveryRaw:raw,warning:'本地画布暂时无法读取。原记录会单独备份后再保存本次修改。'};}
}
export function writeCanvasCollection(projects,activeId,storage=localStorage){
  if(projects.length>12)throw new Error('最多保留 12 张画布，请先备份不常用的画布。');
  if(new Set(projects.map(p=>p.id)).size!==projects.length)throw new Error('画布编号重复。');
  const value=JSON.stringify({version:1,activeId,projects:projects.map(cleanCanvas)}),existing=readCanvasCollection(storage);
  if(existing.recoveryRaw)storage.setItem(`${CANVAS_KEY}.recovery.${Date.now()}`,existing.recoveryRaw);
  storage.setItem(CANVAS_KEY,value);
}
