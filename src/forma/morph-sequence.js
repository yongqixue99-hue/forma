import {morphViews,morphEffects,morphExample,validateMorphDocument} from './morph.js';
import {morphEligibility} from './morph-rules.js';
import {normalizePalette,normalizeColors} from './palettes.js';

export const SEQUENCE_KEY='forma.morph-sequences.v1';
export const sequencePresets=[
  {id:'essential',name:'柱 · 线 · 饼',description:'观察柱体、折线和扇区之间的轮廓变化。',views:['columns','line','pie','donut'],effect:'smooth'},
  {id:'classic',name:'经典形变',description:'旧版八种图型，保留原来的变形方式。',views:['bars','bubbles','donut','treemap','columns','pie','rose','stacked'],effect:'smooth'},
  {id:'flow',name:'线与面',description:'柱体收成折线，展开面积，再重组。',views:['columns','line','area','stacked','treemap'],effect:'cascade'},
  {id:'radial',name:'环绕与聚合',description:'圆形、扇区与矩形之间的几何演绎。',views:['bubbles','pie','donut','rose','treemap'],effect:'arc'},
  {id:'compare',name:'数量与贡献',description:'从逐项比较到累计贡献，追踪每个类别。',views:['dot','lollipop','columns','waterfall','pareto'],effect:'cascade'},
  {id:'geometry',name:'份额与几何',description:'扇形展开成方格，再汇聚成径向轮廓。',views:['semidonut','waffle','squares','radialbars','radar','funnel'],effect:'gather'}
];

export function newSequence(presetId='essential',doc=morphExample,options={}){
  const p=sequencePresets.find(p=>p.id===presetId)||sequencePresets[0];
  return cleanSequence({kind:'forma-morph-sequence',version:1,id:globalThis.crypto.randomUUID(),name:p.name,preset:p.id,
    doc,views:p.views,currentView:p.views[0],effect:p.effect,duration:1500,hold:2200,palette:options.palette||'ink',dark:!!options.dark,colors:options.colors,updated:Date.now()});
}

export function cleanSequence(input){
  if(!input||input.kind!=='forma-morph-sequence'||input.version!==1)throw new Error('这不是有效的图型变形组合。');
  if(typeof input.id!=='string'||!input.id||input.id.length>100)throw new Error('组合标识无效。');
  if(typeof input.name!=='string'||!input.name.trim()||input.name.length>80)throw new Error('请填写 1–80 字的组合名称。');
  validateMorphDocument(input.doc);
  const views=input.views;
  if(!Array.isArray(views)||views.length<2||views.length>morphViews.length||new Set(views).size!==views.length||views.some(id=>!morphViews.some(v=>v.id===id)))throw new Error('请选择至少两种不同的图型。');
  for(const view of views){const valid=morphEligibility(input.doc,view);if(!valid.valid)throw new Error(valid.reason);}
  if(!morphEffects.some(e=>e.id===input.effect))throw new Error('请选择有效的形变方式。');
  if(!Number.isFinite(input.duration)||input.duration<600||input.duration>5000)throw new Error('形变时长需要在 0.6–5 秒之间。');
  if(!Number.isFinite(input.hold)||input.hold<500||input.hold>12000)throw new Error('停留时长需要在 0.5–12 秒之间。');
  const colors=normalizeColors(input.colors);if(input.colors&&!colors)throw new Error('自定义配色格式无效。');
  const doc={title:input.doc.title,subtitle:typeof input.doc.subtitle==='string'?input.doc.subtitle.slice(0,400):'',unit:input.doc.unit,
    source:structuredClone(input.doc.source),...(input.doc.tableInput?{tableInput:structuredClone(input.doc.tableInput)}:{}),data:input.doc.data.map(r=>({... (r._id?{_id:r._id}:{}),...(r._extra?{_extra:structuredClone(r._extra)}:{}),label:r.label,value:r.value}))};
  return {kind:'forma-morph-sequence',version:1,id:input.id,name:input.name.trim(),preset:sequencePresets.some(p=>p.id===input.preset)?input.preset:'custom',
    doc,views:[...views],currentView:views.includes(input.currentView)?input.currentView:views[0],effect:input.effect,duration:input.duration,hold:input.hold,
    palette:normalizePalette(input.palette),dark:!!input.dark,...(colors?{colors}:{}),updated:Number.isFinite(input.updated)?input.updated:Date.now()};
}

// Only map a complete, single-series table. Never discard extra measures or groupings.
export function sequenceSource(item){
  try{
    if(item.disabled)throw new Error(item.reason||'请先完成这张图的数据。');
    const doc=item.doc,key=doc?.data?.every(r=>r&&typeof r.label==='string')?'label':'date';
    if(!Array.isArray(doc?.data)||doc.data.some(r=>!r||typeof r[key]!=='string'||Object.keys(r).some(k=>![key,'value','_id','_extra'].includes(k))))throw new Error('需要一列类别或日期、一列数值；多指标图请先在数据编辑中整理。');
    const data=doc.data.map(r=>({...r,label:r[key],value:r.value}));
    const mapped={title:doc.title,subtitle:doc.subtitle||'',unit:doc.unit,source:structuredClone(doc.source),data};
    validateMorphDocument(mapped);return {ok:true,doc:mapped};
  }catch(error){return {ok:false,reason:error.message};}
}

export function readSequences(storage){
  let raw;try{raw=storage?.getItem(SEQUENCE_KEY);if(!raw)return {projects:[],draft:null};const input=JSON.parse(raw);
    if(!Array.isArray(input.projects)||input.projects.length>20)throw new Error('invalid collection');
    return {projects:input.projects.map(cleanSequence),draft:input.draft?cleanSequence(input.draft):null};
  }catch{return {projects:[],draft:null,recoveryRaw:raw};}
}
export function writeSequences(storage,projects,draft){
  if(projects.length>20)throw new Error('最多保存 20 套组合，请先移除不再使用的组合。');
  const payload={version:1,projects:projects.map(cleanSequence),draft:draft?cleanSequence(draft):null};
  const old=readSequences(storage);if(old.recoveryRaw)storage.setItem(`${SEQUENCE_KEY}.recovery.${Date.now()}`,old.recoveryRaw);
  storage.setItem(SEQUENCE_KEY,JSON.stringify(payload));
  return payload;
}
