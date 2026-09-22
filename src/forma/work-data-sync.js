import {uiText,uiMarkup,uiMessage} from './locale.js';
import {findTemplate} from './catalog.js';
import {semanticChanges} from './data-semantics.js';
import {annotationWarnings} from './annotations.js';
import {recordId} from './data-identity.js';
import {mappedAxes} from './data-contract.js';
import {createEditorModel,withEditorAxes} from './editor-model.js';
import {morphDocument,replaceStepData,stepReport,stepView,stepEligibility} from './work-model.js';

const clone=value=>structuredClone(value);
const fingerprint=step=>JSON.stringify([step.id,step.dataGroup,step.relation,step.view,step.doc,step.draft,step.options.annotations]);
const snapshot=work=>JSON.stringify([work.id,work.steps.map(fingerprint)]);
const content=step=>JSON.stringify([step.doc,step.draft]);
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const sameContent=(step,expected)=>{
  try{
    const [doc,draft]=JSON.parse(expected);
    if(canonical(withEditorAxes(step.doc))!==canonical(withEditorAxes(doc)))return false;
    // Changing a palette may materialize the unchanged spreadsheet snapshot.
    // Compare its actual cells, metadata and IDs, not the mere presence of it.
    return !step.draft||canonical(step.draft)===canonical(createEditorModel(doc,draft).snapshot);
  }catch{return false;}
};

// Membership is explicit. Matching labels alone never authorizes overwriting
// an independently edited step. Unit changes can be included in this operation.
function connected(work,source){
  const ids=new Set([source.id]);let changed=true;
  while(changed){changed=false;for(let i=0;i<work.steps.length;i++){
    const s=work.steps[i],previous=work.steps[i-1],next=work.steps[i+1];
    if(s.id!==source.id&&s.relation==='separate')continue;
    const same=s.dataGroup&&work.steps.some(x=>ids.has(x.id)&&x.relation!=='separate'&&x.dataGroup===s.dataGroup);
    const linked=s.relation==='related'&&previous&&ids.has(previous.id)||next?.relation==='related'&&ids.has(next.id);
    if((same||linked)&&!ids.has(s.id)){ids.add(s.id);changed=true;}
  }}
  return ids;
}
function candidate(source,target){
  let next=replaceStepData(target,source);
  // Two-column native charts use explicit category aliases. Preserve the
  // target schema and all rows instead of falling back to the source chart.
  if(!target.view&&stepView(next)!==stepView(target)){
    const mapped=morphDocument(source),fields=findTemplate(target.doc.template)?.fields||[],category=fields.find(f=>['label','period','date'].includes(f[0]))?.[0];
    if(mapped&&fields.length===2&&category&&fields.some(f=>f[0]==='value')){
      const doc={...clone(source.doc),template:target.doc.template,data:mapped.data.map(r=>({... (r._id?{_id:r._id}:{}),...(r._extra?{_extra:r._extra}:{}),[category]:r.label,value:r.value}))};
      if(doc.tableInput){const originalCategory=findTemplate(source.doc.template).fields.find(f=>['label','period','date'].includes(f[0]))?.[0];doc.tableInput.fieldColumns[category]=doc.tableInput.fieldColumns[originalCategory];if(originalCategory!==category)delete doc.tableInput.fieldColumns[originalCategory];}
      next={...clone(target),doc};
    }
  }
  if(stepView(next)!==stepView(target))throw new Error(stepEligibility({...source,view:stepView(target)}).reason||uiText('数据结构不适用于这个图型'));
  next={...clone(target),doc:{...clone(next.doc),title:target.doc.title,subtitle:target.doc.subtitle||''}};
  // A focus pair is a step's view choice; variable identities and units still
  // come from the explicitly synchronized source data. Removed variables make
  // the target incompatible instead of silently choosing a different pair.
  if(next.doc.template==='splom'){if(target.doc.selectedPair)next.doc.selectedPair=clone(target.doc.selectedPair);else delete next.doc.selectedPair;}
  const axes=mappedAxes(source.doc,next.doc.template);if(axes)next.doc.axes=axes;else delete next.doc.axes;
  delete next.draft;
  const report=stepReport(next);if(!report.valid)throw new Error(report.errors?.[0]||report.cellErrors?.[0]?.message||uiText('数据不符合图型要求'));
  return next;
}
function cellChanges(a,b){
  const keys=[...new Set([...a,...b].flatMap(Object.keys))].filter(k=>!k.startsWith('_')),before=new Map(a.map(r=>[recordId(r),r])),after=new Map(b.map(r=>[recordId(r),r]));let count=0;
  for(const id of new Set([...before.keys(),...after.keys()]))for(const key of keys)if(before.get(id)?.[key]!==after.get(id)?.[key])count++;
  return count;
}
export function previewDataSync(work,sourceId=work.activeStep){
  const source=work.steps.find(s=>s.id===sourceId);if(!source)throw new Error(uiText('当前步骤不存在。'));
  if(!stepReport(source).valid)throw new Error(uiText('请先修正当前数据表中的错误，再同步。'));
  const links=connected(work,source);
  const targets=work.steps.filter(s=>s.id!==sourceId).map(target=>{
    const common={id:target.id,index:work.steps.indexOf(target),beforeRows:target.doc.data.length,afterRows:source.doc.data.length};
    if(!links.has(target.id))return {...common,eligible:false,reason:uiText('独立数据，保持不变')};
    if(!stepReport(target).valid)return {...common,eligible:false,reason:uiText('请先修正该步骤尚未完成的数据')};
    try{const next=candidate(source,target),changed=cellChanges(target.doc.data,next.doc.data),metadataChanged=JSON.stringify([target.doc.unit,target.doc.source])!==JSON.stringify([next.doc.unit,next.doc.source]);
      const identical=content({...target,draft:undefined})===content(next);
      return {...common,afterRows:next.doc.data.length,eligible:!identical,reason:identical?uiText('数据已一致，无需同步'):'',changed,metadataChanged,semanticChanges:semanticChanges(target.doc,next.doc),annotationWarnings:annotationWarnings(next),titleReview:target.doc.title!==source.doc.title||target.doc.subtitle!==source.doc.subtitle,next};
    }catch(error){return {...common,eligible:false,reason:error.message};}
  });
  return {sourceId,sourceRows:source.doc.data.length,token:snapshot(work),targets};
}
export function applyDataSync(work,preview,ids){
  if(preview.token!==snapshot(work))throw new Error(uiText('预览后数据或步骤已变化，请重新打开同步预览。'));
  if(!ids.length||new Set(ids).size!==ids.length)throw new Error(uiText('请选择要同步的步骤，每步只选一次。'));
  const fresh=previewDataSync(work,preview.sourceId),selected=ids.map(id=>fresh.targets.find(t=>t.id===id));
  if(selected.some(t=>!t?.eligible))throw new Error(uiText('所选步骤无法同步，请重新检查。'));
  const result=clone(work),entries=selected.map(item=>{
    const target=result.steps.find(s=>s.id===item.id),before={doc:clone(target.doc),...(target.draft?{draft:clone(target.draft)}:{})};
    target.doc=clone(item.next.doc);delete target.draft;
    return {id:target.id,before,after:content(target)};
  });
  return {work:result,transaction:{id:`sync:${crypto.randomUUID()}`,createdAt:Date.now(),sourceId:preview.sourceId,sourceTitle:work.steps.find(s=>s.id===preview.sourceId).doc.title,workId:work.id,entries}};
}
export function undoDataSync(work,transaction){
  if(!transaction||transaction.workId!==work.id)throw new Error(uiText('请在同步时的作品中撤销。'));
  for(const entry of transaction.entries){const target=work.steps.find(s=>s.id===entry.id);if(!target||!sameContent(target,entry.after))throw new Error(uiText('同步后的数据已被修改或步骤已移除，无法整体撤销。请先核对目标数据，避免覆盖后续编辑。'));}
  const result=clone(work);
  for(const entry of transaction.entries){const target=result.steps.find(s=>s.id===entry.id);target.doc=clone(entry.before.doc);if(entry.before.draft)target.draft=clone(entry.before.draft);else delete target.draft;}
  for(const entry of transaction.entries){const report=stepReport(result.steps.find(s=>s.id===entry.id));if(!report.valid)throw new Error(uiText('当前图型已变化，同步前的数据不再适用；本次撤销未应用。'));}
  return result;
}
