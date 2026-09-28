import {isEnglish} from './locale.js';
import {englishDemo} from './locale-catalog.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {cleanSyncHistories,hasInvalidSyncHistory} from './sync-history.js';
import {withRecordIds,recordId} from './data-identity.js';
import {measurementDomain,singleZeroBased} from './axis-policy.js';
import {observedMeasure} from './data-contract.js';
import {getExample,findTemplate} from './catalog.js';
import {validateDocument} from './data.js';
import {morphViews,validateMorphDocument,morphExample} from './morph.js';
import {cleanSequence,sequencePresets,readSequences} from './morph-sequence.js';
import {createEditorModel} from './editor-model.js';
import {cleanOptions} from './project-file.js';
import {removeLegacyPublicNotes} from './public-case-notes.js';
import {morphEligibility,numericDomain,pairRecipe,signedViews} from './morph-rules.js';
import {scenarioPresets,scenarioRecords,morphBaseDocument} from './scenario-presets.js';
import {seriesViews,seriesViewMap,seriesDocument,seriesEligibility,seriesDomain,seriesRecipe,isSeriesView} from './series-rules.js';
import {relationalViews,relationalViewMap,relationalDocument,relationalEligibility,relationalRecipe,isRelationalView,isPairedView,isHierarchyView,pairedDomain} from './relational-rules.js';
import {scientificViews,scientificViewMap,scientificDocument,scientificEligibility,scientificRecipe,scientificFamily,isScientificView,scientificBounds,scientificSharedBounds,scientificCompatibility} from './scientific-rules.js';
import {scientificCorrespondence} from './scientific-rules.js';
export const workViews=[...morphViews,...seriesViews,...relationalViews,...scientificViews];
export const transitionChoices=[['auto',uiText('推荐过渡')],['smooth',uiText('连续变形')],['cascade',uiText('逐项接力')],['arc',uiText('弧线迁移')],['turn',uiText('旋转落位')],['entrance',uiText('原生入场')],['slide',uiText('横向接续')],['fade',uiText('淡入淡出')],['gather',uiText('收拢展开')]];

export const WORK_KEY='forma.works.v1';
export const STEP_LIMIT=20;
const uuid=()=>globalThis.crypto.randomUUID();
const clone=value=>structuredClone(value);
const viewMap={column:'columns',bar:'bars',singleline:'line',area:'area',pie:'pie',donut:'donut',rose:'rose',lollipop:'lollipop',pareto:'pareto',waffle:'waffle',mosaic:'treemap',circlepack:'bubbles',diverging:'diverging',step:'step',polarline:'polarline',unit:'unit',orbit:'radialbars',funnel:'funnel-bars'};
function migrateSeriesBindings(options,original,identified){
  if(original.entities||identified.entities?.kind!=='series'||!options.colorBindings)return options;
  const ids=new Map(identified.entities.items.map(e=>[`unmigrated:${JSON.stringify(['series',e.name])}`,e.id]));
  return {...options,colorBindings:options.colorBindings.map(b=>({...b,id:ids.get(b.id)||b.id}))};
}

// Persist the initial comparison direction before table sorting can reorder groups.
// Existing declarations are user metadata and must never be silently replaced.
function identifyWorkDocument(doc,options){
  const identified=withRecordIds(doc,options),family=scientificFamily(scientificViewMap[doc.template]);
  if(family?.startsWith('comparison-')&&family!=='comparison-counts'&&identified.groupOrder===undefined)identified.groupOrder=[...new Set(identified.data.map(r=>r.group))];
  return identified;
}

// A step owns its full chart document. Source charts and other steps are never
// mutated when that step is edited, even when they started with the same data.
export function makeStep(record,overrides={}){
  const identified=identifyWorkDocument(record.doc,{legacyNamespace:record.dataGroup});
  return {id:uuid(),dataGroup:record.dataGroup||uuid(),relation:record.relation||'auto',scale:record.scale||'shared',doc:identified,options:migrateSeriesBindings({palette:'ink',ratio:'wide',duration:8,...clone(record.options||{})},record.doc,identified),
    ...(record.draft?{draft:clone(record.draft)}:{}),...(record.view?{view:record.view}:{}),transition:record.transition||'auto',duration:record.duration||1500,hold:record.hold||2200,...overrides};
}
export function newWork(records=[{doc:getExample('column')}],name){
  const steps=records.map(r=>makeStep(r));
  return cleanWork({kind:'forma-work',version:1,id:uuid(),name:name||records[0]?.doc.title||uiText('未命名作品'),steps,activeStep:steps[0]?.id,updated:Date.now()});
}
export function morphDocument(step){
  const doc=step.doc,fields=findTemplate(doc.template)?.fields.map(f=>f[0]),key=fields?.find(k=>['label','period','date'].includes(k));
  // Funnel's step is an explicit ordinal, not another numeric measure.
  const funnel=doc.template==='funnel'&&validateDocument(doc).valid;
  if(!key||!funnel&&fields.length!==2||!fields.includes('value'))return null;
  try{
    const rows=funnel?[...doc.data].sort((a,b)=>a.step-b.step):doc.data;
    const mapped={template:doc.template,title:doc.title,subtitle:doc.subtitle||'',unit:doc.unit,source:clone(doc.source),...(doc.axes?{axes:clone(doc.axes)}:{}),...(doc.tableInput?{tableInput:clone(doc.tableInput)}:{}),...(doc.provenance?{provenance:clone(doc.provenance)}:{}),data:rows.map(r=>({...r,label:r[key],value:r.value}))};
    validateMorphDocument(mapped,{layout:false});return mapped;
  }catch{return null;}
}
export function stepView(step){return step.view||scientificViewMap[step.doc.template]||relationalViewMap[step.doc.template]||seriesViewMap[step.doc.template]||viewMap[step.doc.template]||null;}
export function viewFamily(view){return scientificFamily(view)|| (isPairedView(view)?'paired':isHierarchyView(view)?'hierarchy':isSeriesView(view)?'series':'single');}
export function stepMorphDocument(step){return isScientificView(stepView(step))?scientificDocument(step):isRelationalView(stepView(step))?relationalDocument(step):isSeriesView(stepView(step))?seriesDocument(step):morphDocument(step);}
export function stepEligibility(step,view=stepView(step)){
  if(isScientificView(view))return scientificEligibility(scientificDocument(step),view);
  if(isRelationalView(view)){const doc=relationalDocument(step);return relationalEligibility(doc,view);}
  const doc=isSeriesView(view)?seriesDocument(step):morphDocument(step);
  return doc?(isSeriesView(view)?seriesEligibility(doc,view):morphEligibility(doc,view)):{valid:false,reason:uiText('当前数据结构不支持此图型的连续变形。')};
}
export function morphReady(step){return !!stepView(step)&&stepEligibility(step).valid;}
export function recommendedTransitions(step){
  const from=stepView(step),family=viewFamily(from),priority=['serial-acf','serial-pacf','process-individual','process-imr','multivariate-focus','multivariate-matrix','series-rank','small-multiples','multi-line','sample-ridge','sample-raincloud','matrix-clustered','matrix-bubbles','matrix-heatmap','ordered-estimate-band','ordered-estimate-intervals','ordered-estimate-line','trajectory-path','trajectory-points','spatial-surface','spatial-bubbles','spatial-3d','spatial-xy','spatial-xz','spatial-yz'];
  return workViews.filter(v=>v.id!==from&&viewFamily(v.id)===family&&stepEligibility(step,v.id).valid).sort((a,b)=>(priority.includes(a.id)?priority.indexOf(a.id):100)-(priority.includes(b.id)?priority.indexOf(b.id):100)).slice(0,6).map(v=>{
    const recipe=isScientificView(v.id)?scientificRecipe(from,v.id):isSeriesView(v.id)?seriesRecipe(from,v.id):isRelationalView(v.id)?relationalRecipe(from,v.id):pairRecipe(from,v.id);
    return {view:v.id,name:v.name,note:v.note,reason:recipe.description,recipe:recipe.id};
  });
}
export function relatedSteps(step,steps){
  if(step.relation==='separate')return [step];
  const ids=new Set([step.id]);let changed=true;
  while(changed){changed=false;for(const s of steps){if(s.doc.unit!==step.doc.unit||s.relation==='separate')continue;const i=steps.indexOf(s),previous=steps[i-1];const same=steps.some(x=>ids.has(x.id)&&x.dataGroup&&x.dataGroup===s.dataGroup);const linked=(s.relation==='related'&&previous&&ids.has(previous.id))||(steps[i+1]?.relation==='related'&&ids.has(steps[i+1].id));if((same||linked)&&!ids.has(s.id)){ids.add(s.id);changed=true;}}}
  return steps.filter(s=>ids.has(s.id));
}
export function stepDomain(step,steps){
  if(isScientificView(stepView(step))&&step.scale!=='step'){
    const current=scientificDocument(step);if(!current)return undefined;
    const entries=relatedSteps(step,steps).filter(s=>isScientificView(stepView(s))).flatMap(s=>{const doc=scientificDocument(s);return doc&&!scientificCompatibility(current,doc)?[{doc,view:stepView(s)}]:[];});
    return scientificSharedBounds(entries);
  }
  if(isPairedView(stepView(step))&&step.scale!=='step'){
    const delta=stepView(step)==='paired-change';
    const bounds=relatedSteps(step,steps).filter(s=>isPairedView(stepView(s))&&(stepView(s)==='paired-change')===delta).flatMap(s=>{const doc=relationalDocument(s);return doc?pairedDomain(doc,stepView(s)):[];});
    return bounds.length?[Math.min(...bounds),Math.max(...bounds)]:undefined;
  }
  if(step.scale==='step'||!signedViews.has(stepView(step))&&!isSeriesView(stepView(step)))return undefined;
  if(stepView(step)?.startsWith('percent'))return [0,100];
  const related=relatedSteps(step,steps);
  if(isSeriesView(stepView(step))){
    if(stepView(step)==='series-rank')return seriesDomain(seriesDocument(step),'series-rank');
    const bounds=related.filter(s=>isSeriesView(stepView(s))&&!stepView(s).startsWith('percent')&&stepView(s)!=='series-rank').flatMap(s=>{const d=seriesDocument(s);return d?seriesDomain(d,stepView(s)):[];});
    return bounds.length?[Math.min(...bounds),Math.max(...bounds)]:undefined;
  }
  const entries=related.filter(s=>viewFamily(stepView(s))==='single');
  return measurementDomain(entries.flatMap(s=>morphDocument(s)?.data.map(r=>r.value)||[]),{zero:entries.some(s=>singleZeroBased(stepView(s)))});
}
export function replaceStepData(current,source){
  const incoming=makeStep(source),mapped=morphDocument(incoming);
  if(isScientificView(current.view)&&scientificEligibility(scientificDocument(incoming),current.view).valid){incoming.view=current.view;}
  else if(isRelationalView(current.view)&&relationalEligibility(relationalDocument(incoming),current.view).valid){incoming.view=current.view;}
  else if(isSeriesView(current.view)&&seriesDocument(incoming)&&seriesEligibility(seriesDocument(incoming),current.view).valid){incoming.view=current.view;}
  else if(current.view&&!isScientificView(current.view)&&!isSeriesView(current.view)&&!isRelationalView(current.view)&&mapped&&morphEligibility(mapped,current.view).valid){
    const base=morphBaseDocument(mapped);
    // Longer periodic tables keep their native schema and every row.
    if(validateDocument(base).valid)incoming.doc=base;
    incoming.view=current.view;
  }
  else if(!current.view){
    const candidate={...incoming.doc,template:current.doc.template};
    if(validateDocument(candidate).valid){incoming.doc=candidate;delete incoming.view;}
  }
  incoming.id=current.id;incoming.options=clone(current.options);
  incoming.transition=current.transition;incoming.duration=current.duration;incoming.hold=current.hold;incoming.scale=current.scale;incoming.relation='auto';
  return incoming;
}
export function transitionPlan(from,to,{steps}={}){
  const a=stepMorphDocument(from),b=stepMorphDocument(to),family=viewFamily(stepView(to));
  const compatible=morphReady(from)&&morphReady(to)&&viewFamily(stepView(from))===family;
  const fromIndex=steps?.findIndex(s=>s.id===from.id)??-1,toIndex=steps?.findIndex(s=>s.id===to.id)??-1,reverse=toIndex>=0&&fromIndex===toIndex+1;
  const boundary=reverse?from:to;
  const sameGroup=!!from.dataGroup&&from.dataGroup===to.dataGroup,legacy=!from.dataGroup&&!to.dataGroup;
  const related=boundary.relation==='related'||(boundary.relation!=='separate'&&(sameGroup||legacy));
  const scienceMismatch=compatible&&isScientificView(stepView(to))?scientificCompatibility(a,b):'';
  const scalarMismatch=family==='single'&&observedMeasure(from.doc)&&observedMeasure(to.doc)&&observedMeasure(from.doc)!==observedMeasure(to.doc)?uiText('观测指标含义不同'):'';
  const sameObservations=!scienceMismatch&&!scalarMismatch&&(family!=='paired'||JSON.stringify(a?.periodLabels)===JSON.stringify(b?.periodLabels));
  const correspondence=compatible&&related&&sameObservations&&a.unit===b.unit&&isScientificView(stepView(to))?scientificCorrespondence(a,b,stepView(from),stepView(to)):null;
  const matched=compatible&&related&&sameObservations&&a.unit===b.unit?(correspondence?.keys||a.data.map(recordId).filter(key=>b.data.some(r=>recordId(r)===key))):[];
  const recipe=isScientificView(stepView(to))?scientificRecipe(stepView(from),stepView(to)):isRelationalView(stepView(to))?relationalRecipe(stepView(from),stepView(to)):family==='series'?seriesRecipe(stepView(from),stepView(to)):pairRecipe(stepView(from),stepView(to));
  const forced=['gather','fade','slide','entrance'].includes(boundary.transition),mode=forced||!matched.length?'gather':'morph';
  const effect=mode==='gather'?(forced?boundary.transition:'entrance'):boundary.transition==='auto'?'guided':boundary.transition;
  const name=mode==='gather'?transitionChoices.find(c=>c[0]===effect)[1]:boundary.transition==='auto'?recipe.name:transitionChoices.find(c=>c[0]===effect)?.[1];
  const why=!compatible?uiText('图型结构不同'):a.unit!==b.unit?uiText('单位不同'):!related?uiText('独立数据'):!sameObservations?scienceMismatch||scalarMismatch||uiText('两次观测的名称或顺序不同'):correspondence?uiText('没有对应阈值或模型'):uiText('没有对应记录 ID');
  return {mode,family,effect,recipe:recipe.id,name,matched,duration:boundary.duration,canMorph:!!matched.length,
    reason:mode==='morph'?uiMessage`${matched.length} 个对应${correspondence?.noun||(family==='series'?uiText('观测'):family==='paired'?uiText('配对对象'):family==='hierarchy'?uiText('子项'):['observations','samples','estimates','univariate','evaluation','correlation','method','prediction','confusion','serial','process','multivariate'].includes(family)?uiText('观测'):uiText('类别'))} · ${name}`:forced?uiMessage`已选择${name}`:uiMessage`${why} · 播放图表入场`,
    description:mode==='morph'?recipe.description:uiText('旧图退场后，播放新图本身的生长、描线或展开动画；不同内容保持各自的数据。')};
}
export function availableTransitions(from,to){
  const ready=transitionPlan(from,{...to,transition:'auto'}).canMorph;
  return transitionChoices.map(([id,name])=>({id,name,disabled:!ready&&['smooth','cascade','arc','turn'].includes(id)}));
}
export function stepReport(step){
  const base=validateDocument(step.doc);if(!base.dataValid)return {...base,cellErrors:[]};
  const report=createEditorModel(step.doc,step.draft,{viewValidation:step.view?doc=>stepEligibility({...step,doc}):undefined}).report;
  if(!report.valid)return report;
  if(step.view){const eligibility=stepEligibility(step);if(!eligibility.valid)return {valid:false,errors:[eligibility.reason],cellErrors:[]};}
  return report;
}
export function workReport(work){
  for(let i=0;i<work.steps.length;i++){const report=stepReport(work.steps[i]);if(!report.valid)return {valid:false,index:i,message:uiMessage`第 ${i+1} 步：${report.errors[0]||report.cellErrors?.[0]?.message}`};}
  return {valid:true};
}
export function cleanWork(value){
  if(value?.kind!=='forma-work'||value.version!==1)throw new Error(uiText('这不是 FORMA 作品文件。'));
  if(typeof value.id!=='string'||!/^[a-zA-Z0-9:_-]{1,100}$/.test(value.id))throw new Error(uiText('作品标识无效。'));
  if(typeof value.name!=='string'||!value.name.trim()||value.name.length>80)throw new Error(uiText('作品名称需要 1–80 个字。'));
  if(!Array.isArray(value.steps)||!value.steps.length||value.steps.length>STEP_LIMIT)throw new Error(uiMessage`一个作品支持 1–${STEP_LIMIT} 步。`);
  const ids=new Set(),steps=value.steps.map(s=>{
    if(typeof s?.id!=='string'||!/^[a-zA-Z0-9:_-]{1,100}$/.test(s.id)||ids.has(s.id))throw new Error(uiText('步骤标识无效或重复。'));ids.add(s.id);
    const report=validateDocument(s.doc);if(!report.dataValid)throw new Error(report.errors[0]);
    if(s.view&&!workViews.some(v=>v.id===s.view))throw new Error(uiText('未知的变形图型。'));
    if(!transitionChoices.some(c=>c[0]===s.transition))throw new Error(uiText('过渡方式无效。'));
    if(!Number.isFinite(s.duration)||s.duration<600||s.duration>5000||!Number.isFinite(s.hold)||s.hold<500||s.hold>12000)throw new Error(uiText('动画时长超出可用范围。'));
    if(s.dataGroup!==undefined&&(typeof s.dataGroup!=='string'||!/^[a-zA-Z0-9:_-]{1,100}$/.test(s.dataGroup)))throw new Error(uiText('数据组标识无效。'));
    if(s.relation!==undefined&&!['auto','related','separate'].includes(s.relation))throw new Error(uiText('数据关系无效。'));
    if(s.scale!==undefined&&!['shared','step'].includes(s.scale))throw new Error(uiText('刻度设置无效。'));
    const identified=identifyWorkDocument(s.doc,{legacyNamespace:s.dataGroup||`legacy:${value.id}`}),options=removeLegacyPublicNotes(s.doc,migrateSeriesBindings(cleanOptions(s.options),s.doc,identified));
    const result={id:s.id,dataGroup:s.dataGroup||`legacy:${value.id.slice(0,88)}`,relation:s.relation||'auto',scale:s.scale||'shared',doc:identified,options,transition:s.transition,duration:s.duration,hold:s.hold,...(s.view?{view:s.view}:{})};
    if(s.draft)result.draft=createEditorModel(result.doc,s.draft).snapshot;
    return result;
  });
  return {kind:'forma-work',version:1,id:value.id,name:value.name.trim(),steps,activeStep:ids.has(value.activeStep)?value.activeStep:steps[0].id,updated:Number.isFinite(value.updated)?value.updated:Date.now()};
}
export function workFromSequence(value){
  const sequence=cleanSequence(value),base={...getExample('bar'),...clone(sequence.doc)};
  const steps=sequence.views.map((view,i)=>makeStep({doc:base,dataGroup:`legacy:${sequence.id}`,view,options:{palette:sequence.palette,dark:sequence.dark,colors:sequence.colors}},
    {id:`${sequence.id}:${i}`,transition:sequence.effect,duration:sequence.duration,hold:sequence.hold}));
  return cleanWork({kind:'forma-work',version:1,id:`sequence:${sequence.id}`,name:sequence.name,steps,activeStep:steps[sequence.views.indexOf(sequence.currentView)].id,updated:sequence.updated});
}
export function presetWork(id,palette){
 const work=originalPresetWork(id,palette);if(!isEnglish())return work;
 work.name=uiText(work.name);
 for(const step of work.steps){if(step.doc.source?.type==='demo')step.doc=englishDemo(step.doc,work.name);}
 return work;
}
function originalPresetWork(id,palette){
  const scenario=scenarioPresets.find(p=>p.id===id);if(scenario)return newWork(scenarioRecords(id,palette),scenario.name);
  palette??='ink';
  if(id==='independent'){
    const doc={...getExample('bar'),title:uiText('上半年渠道销售额'),subtitle:uiText('同名渠道在不同数据中保持对应'),unit:uiText('万元'),data:[{label:uiText('官网'),value:128},{label:uiText('门店'),value:104},{label:uiText('合作伙伴'),value:82},{label:uiText('电商'),value:65},{label:uiText('其他'),value:39}]};
    const next={...clone(doc),title:uiText('下半年渠道销售额'),data:[{label:uiText('官网'),value:152},{label:uiText('门店'),value:98},{label:uiText('电商'),value:123},{label:uiText('海外'),value:74},{label:uiText('其他'),value:46}]};
    const final={...getExample('bar'),title:uiText('季度项目交付量'),subtitle:uiText('切换主题，图形收拢后展开'),unit:uiText('个'),data:[{label:uiText('第一季度'),value:24},{label:uiText('第二季度'),value:32},{label:uiText('第三季度'),value:28},{label:uiText('第四季度'),value:41}]};
    return newWork([{doc,dataGroup:'demo:sales',view:'columns',options:{palette}},{doc:next,dataGroup:'demo:sales',view:'bars',options:{palette}},{doc:final,dataGroup:'demo:delivery',view:'pie',options:{palette}}],uiText('多组数据 · 连续叙事'));
  }
  const preset=sequencePresets.find(p=>p.id===id)||sequencePresets[0];
  const work=newWork(preset.views.map(view=>({doc:{...getExample('bar'),...clone(morphExample)},dataGroup:`effect:${id}`,view,options:{palette}})),preset.name);
  work.steps.forEach(s=>s.transition=preset.effect);return work;
}
export function readWorks(storage){
  let raw;try{raw=storage.getItem(WORK_KEY);if(!raw)return {projects:[],drafts:[],draft:null};const input=JSON.parse(raw);
    if(!Array.isArray(input.projects)||input.projects.length>40)throw new Error('invalid collection');
    const projects=input.projects.map(cleanWork),drafts=(input.drafts||[]).map(cleanWork),draft=input.draft?cleanWork(input.draft):null;
    const works=[...projects,...drafts,...(draft?[draft]:[])],workIds=new Set(works.map(w=>w.id)),syncHistories=cleanSyncHistories(input.syncHistories,workIds,works);
    return {projects,drafts,draft,syncHistories,...(hasInvalidSyncHistory(input.syncHistories,workIds)?{historyRecoveryRaw:raw}:{})};
  }catch{return {projects:[],drafts:[],draft:null,recoveryRaw:raw};}
}
export function writeWorks(storage,projects,draft,{syncHistory}={}){
  if(projects.length>40)throw new Error(uiText('最多保存 40 个作品，请先备份并移除不需要的作品。'));
  const old=readWorks(storage),drafts=draft?[cleanWork(draft),...old.drafts.filter(d=>d.id!==draft.id)]:old.drafts;
  if(new Set([...drafts,...projects].map(p=>p.id)).size>40)throw new Error(uiText('作品空间已满，请先从「我的作品」备份并移除不需要的作品。'));
  const histories={...old.syncHistories,...(draft&&syncHistory!==undefined?{[draft.id]:syncHistory}:{})};
  const payload={version:1,projects:projects.map(cleanWork),drafts,draft:draft?cleanWork(draft):null,syncHistories:cleanSyncHistories(histories,new Set([...drafts,...projects,...(draft?[draft]:[])].map(w=>w.id)))};
  if(old.recoveryRaw||old.historyRecoveryRaw)storage.setItem(`${WORK_KEY}.recovery.${Date.now()}`,old.recoveryRaw||old.historyRecoveryRaw);
  try{storage.setItem(WORK_KEY,JSON.stringify(payload));}
  catch(error){if(error.name!=='QuotaExceededError')throw error;const failure=new Error(uiText('浏览器存储空间不足，本次保存未完成。当前编辑仍在页面中，请先导出作品文件备份，再清理不需要的作品。'),{cause:error});failure.name=error.name;throw failure;}
  return payload;
}
export function listWorks(storage){const {projects,drafts,draft}=readWorks(storage);return [...new Map([...projects,...drafts,...(draft?[draft]:[])].map(p=>[p.id,p])).values()].sort((a,b)=>b.updated-a.updated);}
export function removeWork(storage,id){const state=readWorks(storage),histories={...state.syncHistories};delete histories[id];storage.setItem(WORK_KEY,JSON.stringify({version:1,projects:state.projects.filter(p=>p.id!==id),drafts:state.drafts.filter(p=>p.id!==id),draft:state.draft?.id===id?null:state.draft,syncHistories:histories}));}
export function legacyWorks(storage){
  const stored=readSequences(storage),items=[...stored.projects];
  if(stored.draft&&!items.some(p=>p.id===stored.draft.id))items.unshift(stored.draft);
  return items.map(workFromSequence);
}
