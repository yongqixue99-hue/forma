import {findTemplate} from './catalog.js';
import {cleanWork,stepReport,workReport} from './work-model.js';
import {previewDataSync,applyDataSync} from './work-data-sync.js';
import {annotationWarnings} from './annotations.js';
import {newRecordId} from './data-identity.js';
import {entitySpec} from './entity-identity.js';
import {semanticChanges} from './data-semantics.js';
import {isEnglish} from './locale.js';
const text=(zh,en)=>isEnglish()?en:zh,clone=v=>structuredClone(v);
export const reportFingerprint=work=>JSON.stringify({...cleanWork(work),updated:0});
const keyFor=(row,fields)=>JSON.stringify(fields.map(k=>row[k]));
function uniqueKeys(doc,fields){const keys=doc.data.map(r=>keyFor(r,fields));return doc.data.every(r=>fields.every(k=>r[k]!==undefined&&r[k]!==null&&String(r[k]).trim()!==''))&&new Set(keys).size===keys.length;}
export function reportMatchOptions(previous,next){
 const fields=findTemplate(previous.template).fields.filter(([,type])=>!type.includes('number')).map(f=>f[0]);
 const candidates=[...(previous.tableInput?.idColumn>=0&&next.tableInput?.idColumn>=0?[['_id']]:[]),...fields.map(k=>[k]),...(fields.length>1?[fields]:[])];
 return candidates.filter(keys=>uniqueKeys(previous,keys)&&uniqueKeys(next,keys));
}
function reconcileEntities(previous,next,matched){
 if(!matched)return;
 const spec=entitySpec(next);
 if(spec&&previous.entities?.kind===next.entities?.kind){
  const previousByName=new Map(previous.entities.items.map(e=>[e.name,e.id]));next.entities.items=next.entities.items.map(e=>({...e,id:previousByName.get(e.name)||e.id}));
  const ids=new Map(next.entities.items.map(e=>[e.name,e.id]));next.data.forEach(row=>row[spec.ref]=ids.get(row[spec.field]));
 }
 if(previous.sampleEntities&&next.sampleEntities){const old=new Map(previous.sampleEntities.items.map(e=>[e.name,e.id]));next.sampleEntities.items.forEach(e=>{e.id=old.get(e.name)||e.id;});const ids=new Map(next.sampleEntities.items.map(e=>[e.name,e.id]));next.data.forEach(r=>r._sampleId=ids.get(r.sample));}
}
/** Preview replacement without changing the existing work. Object correspondence
 * is explicit; never infer identity from row order or measured values. */
export function prepareReportUpdate(value,{sourceStepId=value.activeStep,document,matchBy=[]}={}){
 const original=cleanWork(value),source=original.steps.find(s=>s.id===sourceStepId);if(!source)throw Error(text('找不到当前步骤。','Current step was not found.'));
 if(document?.template!==source.doc.template)throw Error(text('新数据需要沿用当前图表字段结构。','New data must use the current chart schema.'));
 if(!Array.isArray(matchBy)||new Set(matchBy).size!==matchBy.length)throw Error(text('对象对应字段无效。','Invalid identity fields.'));
 if(matchBy.length&&!reportMatchOptions(source.doc,document).some(keys=>JSON.stringify(keys)===JSON.stringify(matchBy)))throw Error(text('对应字段必须在两期数据中完整且唯一。','Identity fields must be complete and unique in both datasets.'));
 const next=clone(document),byKey=new Map(source.doc.data.map(r=>[keyFor(r,matchBy),r])),used=new Set(),fields=findTemplate(next.template).fields.map(f=>f[0]);let matched=0,changed=0;
 const idChanges=new Map();next.data=next.data.map(row=>{
  const old=matchBy.length?byKey.get(keyFor(row,matchBy)):null,newId=old?old._id:(matchBy.length===1&&matchBy[0]==='_id'?row._id:newRecordId());
  idChanges.set(row._id,newId);if(old){matched++;used.add(old._id);changed+=fields.filter(k=>row[k]!==old[k]).length;}return {...row,_id:newId};
 });
 if(next.tableInput?.rowRefs)next.tableInput.rowRefs=Object.fromEntries(Object.entries(next.tableInput.rowRefs).map(([id,refs])=>[idChanges.get(id)||id,refs]));
 // A name-based match can retain an internal ID different from the incoming
 // ID column. Keep that column as source data, without claiming it owns IDs.
 if(next.tableInput&&!(matchBy.length===1&&matchBy[0]==='_id'))next.tableInput.idColumn=-1;
 reconcileEntities(source.doc,next,matchBy.length>0);
 const candidate=clone(original),target=candidate.steps.find(s=>s.id===source.id);target.doc=next;delete target.draft;
 const report=stepReport(target);if(!report.valid)throw Error(report.errors?.[0]||report.cellErrors?.[0]?.message||text('新数据不适合当前图型。','New data does not fit this view.'));
 const sync=previewDataSync(candidate,source.id),headersBefore=source.doc.tableInput?.headers||fields,headersAfter=next.tableInput?.headers||fields;
 return {version:1,token:reportFingerprint(original),sourceStepId,document:clone(document),matchBy:clone(matchBy),candidate,sync,
  summary:{matched,added:next.data.length-matched,removed:source.doc.data.length-used.size,changed,headersChanged:JSON.stringify(headersBefore)!==JSON.stringify(headersAfter),headersBefore,headersAfter,
   semanticChanges:semanticChanges(source.doc,next),annotationWarnings:annotationWarnings(target),titleReview:source.doc.title===next.title,unmatched:matchBy.length===0}};
}
export function createNextReport(value,preview,{name,stepIds=[]}={}){
 if(typeof name!=='string'||!name.trim()||name.length>80)throw Error(text('请填写 1–80 字的新报告名称。','Enter a new report name of 1–80 characters.'));
 if(!Array.isArray(stepIds))throw Error(text('关联步骤必须是列表。','Related steps must be a list.'));
 if(preview?.version!==1||preview.token!==reportFingerprint(value))throw Error(text('原作品已变化，请重新预览新报告。','The original work changed. Preview the update again.'));
 const fresh=prepareReportUpdate(value,preview);
 // Recompute from the submitted document and explicit identity choice, so
 // previews cannot inject unvalidated candidate or target work data.
 let work=stepIds.length?applyDataSync(fresh.candidate,fresh.sync,stepIds).work:fresh.candidate;
 work={...work,id:crypto.randomUUID(),name,updated:Date.now()};work=cleanWork(work);const report=workReport(work);if(!report.valid)throw Error(report.message);
 return work;
}
