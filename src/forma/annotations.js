import {uiText,uiMarkup,uiMessage} from './locale.js';
import {findTemplate} from './catalog.js';
import {observedMeasure} from './data-contract.js';

export const ANNOTATION_LIMIT=12;
export const annotationKinds=[['object',uiText('对象标记')],['range',uiText('区间标记')],['note',uiText('文字说明')]];
export const annotationPlacements=[['auto',uiText('自动避让')],['top-left',uiText('左上')],['top-right',uiText('右上')],['bottom-left',uiText('左下')],['bottom-right',uiText('右下')]];
const clone=v=>structuredClone(v),fail=m=>{throw new Error(m);};
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const fields={single:['value'],paired:['before','after'],method:['observation'],samples:['value'],estimates:['estimate','low','high'],matrix:['value'],ordered:['estimate','low','high']};

// These describe observations, not screen coordinates or row positions.
export function annotationContext(doc){
  const keys=findTemplate(doc.template)?.fields.map(f=>f[0])||[];
  const family=['interval','forest'].includes(doc.template)?'estimates':doc.template==='ribbon'?'ordered':['swarm','boxplot','violin','raincloud','ridges','errorbar'].includes(doc.template)?'samples':['heatmap','clusterheatmap'].includes(doc.template)?'matrix':['slope','dumbbell','paired'].includes(doc.template)?'paired':doc.template==='blandaltman'?'method':keys.includes('value')&&keys.some(k=>['label','period','date'].includes(k))&&(keys.length===2||doc.template==='funnel')?'single':null;
  const measure=observedMeasure(doc)||'';
  return {family,unit:doc.unit,measure:measure===uiMessage`数值 / ${doc.unit}`?'':measure,observations:family==='paired'?[...(doc.periodLabels||doc.pairLabels||[uiText('前值'),uiText('后值')])]:family==='method'?[...(doc.methodLabels||[])]:['estimates','ordered'].includes(family)?[doc.intervalLabel,doc.template==='forest'?'log':'linear']:[]};
}
export const annotationFieldNames=doc=>{const c=annotationContext(doc);return c.family==='paired'?[['before',c.observations[0]],['after',c.observations[1]]]:c.family==='method'?[['observation',uiText('同一样本的两次测量')]]:['single','samples','matrix'].includes(c.family)?[['value',c.measure||uiText('原始值')]]:['estimates','ordered'].includes(c.family)?[['estimate',uiText('点估计')],['low',uiText('下界')],['high',uiText('上界')]]:[];};
const formatAnnotationValue=v=>String(v??'—');
export const annotationValue=(doc,row,field)=>row[doc.template==='forest'?({low:'lower',high:'upper'}[field]||field):field];
export const annotationRowName=row=>String(row.label??row.period??row.date??(row.row!==undefined&&row.column!==undefined?`${row.row} × ${row.column}`:row.group!==undefined?`${row.group} · ${formatAnnotationValue(row.value)}`:uiText('未命名记录')));
export function cleanAnnotations(value){
  if(value===undefined)return [];
  if(!Array.isArray(value)||value.length>ANNOTATION_LIMIT)fail(uiMessage`每步最多保存 ${ANNOTATION_LIMIT} 条标注；原始数据行数不受此限制。`);
  const seen=new Set();
  return value.map(a=>{
    if(!a||!text(a.id,100)||!/^[a-zA-Z0-9:_-]+$/.test(a.id)||seen.has(a.id))fail(uiText('标注 ID 无效或重复。'));seen.add(a.id);
    if(!annotationKinds.some(([k])=>k===a.kind)||!text(a.text,120))fail(uiText('标注需要 1–120 个字，并选择有效类型。'));
    if(!annotationPlacements.some(([k])=>k===a.placement))fail(uiText('标注位置无效。'));
    if(!a.when||!Number.isFinite(a.when.start)||!Number.isFinite(a.when.end)||a.when.start<0||a.when.end>1||a.when.start>=a.when.end)fail(uiText('标注时间需要在当前步骤内，结束时间须晚于开始时间。'));
    if(typeof a.showValue!=='boolean')fail(uiText('标注数值显示设置无效。'));
    const count=a.kind==='object'?1:a.kind==='range'?2:0;
    if(!Array.isArray(a.targets)||a.targets.length!==count)fail(uiText('请选择标注对应的数据对象。'));
    const result={id:a.id,kind:a.kind,text:a.text.trim(),placement:a.placement,when:{start:a.when.start,end:a.when.end},showValue:a.showValue,targets:a.targets.map(t=>{
      if(!t||!text(t.recordId,4096)||!Object.values(fields).flat().includes(t.field))fail(uiText('标注必须使用持久记录 ID 与明确的观测字段。'));
      return {recordId:t.recordId,field:t.field};
    })};
    if(a.position!==undefined){if(!a.position||!['x','y'].every(k=>Number.isFinite(a.position[k])&&a.position[k]>=0&&a.position[k]<=1))fail(uiText('标注位置无效。'));result.position={x:a.position.x,y:a.position.y};}
    if(count){
      const b=a.binding;
      if(!b||!Object.hasOwn(fields,b.family)||!text(b.unit,160)||typeof b.measure!=='string'||b.measure.length>300||!Array.isArray(b.observations)||b.observations.length!==(['paired','method','estimates','ordered'].includes(b.family)?2:0)||b.observations.some(x=>!text(x,160))||result.targets.some(t=>!fields[b.family].includes(t.field)))fail(uiText('标注的单位或观测定义无效。'));
      if(count===2&&JSON.stringify(result.targets[0])===JSON.stringify(result.targets[1]))fail(uiText('区间两端需要选择不同对象或不同观测。'));
      result.binding={family:b.family,unit:b.unit,measure:b.measure,observations:[...b.observations]};
    }
    return result;
  });
}
export function annotationStatus(doc,a){
  if(a.kind==='note')return {valid:true,rows:[]};
  const c=annotationContext(doc),b=a.binding;
  if(!b||c.family!==b.family)return {valid:false,reason:uiText('数据结构改变，请重新指定对象')};
  if(c.unit!==b.unit)return {valid:false,reason:uiMessage`单位已从 ${b.unit} 改为 ${c.unit}`};
  if(c.measure!==b.measure||JSON.stringify(c.observations)!==JSON.stringify(b.observations))return {valid:false,reason:uiText('观测含义或顺序改变，请重新确认')};
  const rows=a.targets.map(t=>doc.data.find(r=>r._id===t.recordId));
  if(rows.some(r=>!r))return {valid:false,reason:uiText('对应记录已移除，请重新定位')};
  if(a.targets.some((t,i)=>t.field==='observation'?!Number.isFinite(rows[i].a)||!Number.isFinite(rows[i].b):!Number.isFinite(annotationValue(doc,rows[i],t.field))))return {valid:false,reason:uiText('对应数值缺失，未按零值标记')};
  return {valid:true,rows};
}
export function newAnnotation(doc,{kind='object',targets,text:content=uiText('重点说明')}={}){
  const c=annotationContext(doc),first=doc.data[0],second=doc.data[1],key=fields[c.family]?.[0];
  targets??=kind==='note'?[]:kind==='range'&&c.family==='paired'?[{recordId:first?._id,field:'before'},{recordId:first?._id,field:'after'}]:[{recordId:first?._id,field:key},...(kind==='range'?[{recordId:second?._id,field:key}]:[])];
  return cleanAnnotations([{id:`annotation:${crypto.randomUUID()}`,kind,text:content,targets,binding:c,placement:'auto',showValue:kind!=='note',when:{start:0,end:1}}])[0];
}
export function annotationOpacity(a,fraction,{staticFrame=false,reducedMotion=false}={}){
  if(staticFrame)return 1;
  if(!Number.isFinite(fraction)||fraction<a.when.start||fraction>a.when.end)return 0;
  if(reducedMotion)return 1;
  const edge=Math.min(.045,(a.when.end-a.when.start)/3);
  return Math.min(a.when.start===0?1:(fraction-a.when.start)/edge,a.when.end===1?1:(a.when.end-fraction)/edge,1);
}
export function annotationWarnings(step){return (step.options.annotations||[]).flatMap(a=>{const s=annotationStatus(step.doc,a);return s.valid?[]:[{id:a.id,text:a.text,reason:s.reason}];});}

// An annotation transaction owns only the annotation lists. It never rolls
// back later spreadsheet, palette, source, rhythm or step-order edits.
export function applyAnnotation(work,sourceId,value,targetIds=[sourceId]){
  const a=cleanAnnotations([value])[0],ids=new Set(targetIds),source=work.steps.find(s=>s.id===sourceId);
  if(!source||!ids.has(sourceId)||[...ids].some(id=>!work.steps.some(s=>s.id===id)))fail(uiText('标注应用范围已变化，请重新选择步骤。'));
  const result=clone(work),entries=[];
  for(const s of result.steps){if(!ids.has(s.id))continue;const status=annotationStatus(s.doc,a);if(!status.valid)fail(`「${s.doc.title}」：${status.reason}`);
    if(s.id!==sourceId&&(s.relation==='separate'||source.relation==='separate'||s.dataGroup!==source.dataGroup))fail(uiText('只能将标注明确应用到同一数据组的关联步骤。'));
    const before=s.options.annotations?clone(s.options.annotations):null,list=clone(s.options.annotations||[]),index=list.findIndex(x=>x.id===a.id);if(index>=0)list[index]=clone(a);else list.push(clone(a));
    s.options.annotations=cleanAnnotations(list);entries.push({id:s.id,before,after:clone(s.options.annotations)});
  }
  result.updated=Date.now();return {work:result,transaction:{workId:work.id,entries}};
}
export function removeAnnotation(work,stepId,id){
  const result=clone(work),s=result.steps.find(s=>s.id===stepId),before=s?.options.annotations;
  if(!before?.some(a=>a.id===id))fail(uiText('标注已移除或步骤已变化。'));
  const after=before.filter(a=>a.id!==id);if(after.length)s.options.annotations=after;else delete s.options.annotations;
  result.updated=Date.now();return {work:result,transaction:{workId:work.id,entries:[{id:stepId,before,after:after.length?after:null}]}};
}
export function undoAnnotation(work,transaction,{redo=false}={}){
  if(transaction?.workId!==work.id)fail(uiText('这次标注操作不属于当前作品。'));
  const from=redo?'before':'after',to=redo?'after':'before';
  for(const e of transaction.entries){const s=work.steps.find(s=>s.id===e.id);if(!s||JSON.stringify(s.options.annotations||null)!==JSON.stringify(e[from]))fail(uiText('标注或步骤已有后续变化，未覆盖编辑。可使用「版本与备份」恢复。'));}
  const result=clone(work);for(const e of transaction.entries){const s=result.steps.find(s=>s.id===e.id);if(e[to])s.options.annotations=clone(e[to]);else delete s.options.annotations;}result.updated=Date.now();return result;
}
