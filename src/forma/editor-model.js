import {multivariateExtendedOrderFields} from './multivariate-extended-rules.js';
import {temporalOrderFields} from './temporal-series-rules.js';
import {resolveCountry,countryName} from './country-input.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {entityReferences} from './entity-identity.js';
import {withRecordIds,newRecordId} from './data-identity.js';
import {bindEntitySnapshot,editEntitySnapshot} from './entity-identity.js';
import {withDataUnit} from './data-contract.js';
import { findTemplate } from './catalog.js';
import { validateDocument } from './data.js';
import { cellsToDocument, documentCells, pasteCells, TABLE_LIMIT, tableHistory } from './table-data.js';
import { cleanOptions } from './project-file.js';
import { checkedRange } from './sheet-range.js';

export const EDITOR_LIMIT = 12;
export const directEditTemplates = new Set(['column','bar','singleline','area','xy','groupedbarh','stackedbar','percentcolumn','comboline','progress','kpi','pie','donut']);
const axisDefaults = {
  column:{x:uiText('类别'),y:uiText('数值')},bar:{x:uiText('数值'),y:uiText('类别')},singleline:{x:uiText('时期'),y:uiText('数值')},area:{x:uiText('时期'),y:uiText('数值')},
  groupedbarh:{x:uiText('数值'),y:uiText('类别')},stackedbar:{x:uiText('数值'),y:uiText('类别')},percentcolumn:{x:uiText('时期'),y:uiText('占比 / %')},comboline:{x:uiText('时期'),y:uiText('数值')},
};
export function withEditorAxes(doc) {
  const result=structuredClone(doc),axes=axisDefaults[doc.template];
  if(axes&&!doc.axes)result.axes=Object.fromEntries(Object.entries(axes).map(([key,value])=>[key,value===uiText('数值')?uiMessage`数值 / ${doc.unit}`:value]));
  return result;
}
const snapshotOf = input => {const doc=withRecordIds(input);return {meta:{...doc,data:[]},cells:documentCells(doc),rowMeta:doc.data.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>['_id','_extra',...entityReferences].includes(key))))};};
function safeDraft(draft,doc){
  return draft?.meta?.template===doc.template && Array.isArray(draft.cells) && draft.cells.length<=TABLE_LIMIT &&
    draft.cells.every(row=>Array.isArray(row)&&row.length===findTemplate(doc.template).fields.length&&row.every(v=>typeof v==='string'&&v.length<=2000000));
}

// Group and category names are labels; a declared order belongs to populations.
// Keep membership only in draft/history snapshots so a multi-cell rename can
// finish after an invalid intermediate state, undo/redo, or session recovery.
function groupOrderMembers(snapshot,column,key){
  const order=snapshot.meta[key];if(column<0||!Array.isArray(order)||!order.length||new Set(order).size!==order.length)return null;
  const groups=new Map(order.map(name=>[name,[]])),ids=[];
  for(const [i,row]of snapshot.cells.entries()){
    const name=String(row[column]??'').trim(),id=snapshot.rowMeta?.[i]?._id;if(!groups.has(name)||typeof id!=='string'||!id)return null;
    groups.get(name).push(id);ids.push(id);
  }
  if(new Set(ids).size!==ids.length||[...groups.values()].some(rows=>!rows.length))return null;
  return [...groups.values()].map(rows=>rows.sort());
}
function reconcileGroupOrder(current,next,column,original,key){
  const read=snapshot=>key==='groupOrder'?snapshot.groupOrderMembers:snapshot.temporalOrderMembers?.[key];
  const write=members=>{if(key==='groupOrder'){if(members)next.groupOrderMembers=members;else delete next.groupOrderMembers;}else if(members){next.temporalOrderMembers={...next.temporalOrderMembers,[key]:members};}else if(next.temporalOrderMembers){delete next.temporalOrderMembers[key];if(!Object.keys(next.temporalOrderMembers).length)delete next.temporalOrderMembers;}};
  if(column<0||!Array.isArray(next.meta[key])){write(null);return;}
  const sameOrder=JSON.stringify(current.meta[key])===JSON.stringify(next.meta[key]);
  let members;
  if(sameOrder){
    members=groupOrderMembers(current,column,key)||read(current)||(JSON.stringify(original.meta[key])===JSON.stringify(current.meta[key])?groupOrderMembers(original,column,key):null);
    if(!Array.isArray(members)||members.length!==next.meta[key].length||members.some(rows=>!Array.isArray(rows)||!rows.length||rows.some(id=>typeof id!=='string'))||new Set(members.flat()).size!==members.flat().length)members=null;
    if(members){
      const names=new Map(next.cells.map((row,i)=>[next.rowMeta[i]._id,String(row[column]??'').trim()])),ids=members.flat();
      if(names.size===next.cells.length&&ids.length===names.size&&ids.every(id=>names.has(id))){
        const renamed=members.map(rows=>[...new Set(rows.map(id=>names.get(id)))]);
        if(renamed.every(values=>values.length===1&&values[0])&&new Set(renamed.map(values=>values[0])).size===renamed.length)next.meta[key]=renamed.map(values=>values[0]);
      }
    }
  }
  write(groupOrderMembers(next,column,key)||members);
}

/** A draft may be incomplete. Only validated documents become renderable/exportable. */
export function createEditorModel(original, draft, {viewValidation,session}={}) {
  let lastValid=withEditorAxes(withRecordIds(original));
  if(!validateDocument(lastValid).dataValid)throw new Error(uiText('需要有效的初始图表数据。'));
  const initial=safeDraft(draft,lastValid)?structuredClone(draft):snapshotOf(lastValid);
  if(lastValid.entities&&!initial.meta.entities)initial.meta.entities=structuredClone(lastValid.entities);
  if(lastValid.template==='splom')for(const key of ['sampleEntities','selectedPair','variableUnits'])if(lastValid[key]!==undefined&&initial.meta[key]===undefined)initial.meta[key]=structuredClone(lastValid[key]);
  const originalSnapshot=snapshotOf(lastValid),originalRowMeta=originalSnapshot.rowMeta,orderColumns=Object.entries({groupOrder:'group',...temporalOrderFields(original),...multivariateExtendedOrderFields(original)}).map(([key,name])=>[key,findTemplate(original.template).fields.findIndex(field=>field[0]===name)]);
  initial.rowMeta=initial.cells.map((_,i)=>initial.rowMeta?.[i]||originalRowMeta[i]||{_id:newRecordId()});
  bindEntitySnapshot(initial,findTemplate(original.template).fields);
  const initialIds=initial.rowMeta.map(row=>row?._id);
  if(initialIds.some(id=>typeof id!=='string'||!id)||new Set(initialIds).size!==initialIds.length)throw new Error(uiText('草稿中的记录 ID 无效或重复；请检查原文件，数据不会被自动覆盖。'));
  if(session){
    const snapshots=[session.current,...(session.past||[]),...(session.future||[])];
    if(!Array.isArray(session.past)||!Array.isArray(session.future)||session.past.length+session.future.length>20||JSON.stringify(session.current)!==JSON.stringify(initial)||snapshots.some(s=>!safeDraft(s,lastValid)||!Array.isArray(s.rowMeta)||s.rowMeta.length!==s.cells.length||s.rowMeta.some(r=>typeof r?._id!=='string'||!r._id)||new Set(s.rowMeta.map(r=>r._id)).size!==s.cells.length))throw Error(uiText('编辑现场已变化，无法恢复旧撤销记录。已保留当前保存的数据。'));
  }
  const history=tableHistory(initial,session);
  let current=history.value, report;
  function review(){
    const result=cellsToDocument(current.meta,current.cells,current.rowMeta),validation=validateDocument(result.doc),view=validation.dataValid&&viewValidation?viewValidation(result.doc):null;
    const accepted=view?view.valid:validation.valid;
    report={...validation,...(view?{layoutValid:view.valid,layoutErrors:view.valid?[]:[view.reason],errors:view.valid?[]:[view.reason]}:{}),cellErrors:result.errors,dataValid:validation.dataValid&&!result.errors.length,valid:accepted&&!result.errors.length};
    if(report.dataValid)lastValid=result.doc;
    return report;
  }
  function commit(next,userData=false){
    if(userData&&next.meta.template==='choropleth')for(const [i,row] of next.cells.entries()){
      const country=resolveCountry(row[0]);if(!country)continue;
      const previous=resolveCountry(current.cells[i]?.[0]),label=resolveCountry(row[1]);
      if(!row[1]||previous&&label?.code===previous.code&&country.code!==previous.code)row[1]=countryName(country);
      row[0]=country.code;
    }
    if(userData&&next.meta.source.type==='demo'){next.meta.source={type:'user',name:uiText('用户编辑数据（基于演示模板）')};next.meta.provenance={origin:'demo',partialEdit:true};}
    if(userData&&next.meta.source.type==='public'){next.meta.source={...next.meta.source,type:'user'};next.meta.provenance={...next.meta.provenance,origin:'public',partialEdit:true};}
    next.rowMeta=next.cells.map((_,i)=>next.rowMeta?.[i]||{_id:newRecordId()});
    bindEntitySnapshot(next,findTemplate(original.template).fields);
    for(const [key,column]of orderColumns)reconcileGroupOrder(current,next,column,originalSnapshot,key);
    history.set(next);current=history.value;return review();
  }
  review();
  return {
    get cells(){return structuredClone(current.cells);},get meta(){return structuredClone(current.meta);},
    get doc(){return structuredClone(lastValid);},get report(){return structuredClone(report);},
    get snapshot(){return structuredClone(current);},get canUndo(){return history.canUndo;},get canRedo(){return history.canRedo;},
    captureSession:()=>history.snapshot(),
    recordIds(){return current.rowMeta.map(r=>r._id);},
    editEntity(action,options){return commit(editEntitySnapshot(current,findTemplate(original.template).fields,action,options),true);},
    setCell(row,col,value){
      if(!current.cells[row]||!Number.isInteger(col)||col<0||col>=current.cells[row].length)throw new Error(uiText('单元格不存在。'));
      if(current.cells[row][col]===String(value))return report;
      const next=structuredClone(current);next.cells[row][col]=String(value);return commit(next,true);
    },
    setRow(row,values){
      if(!current.cells[row]||values.length!==current.cells[row].length)throw new Error(uiText('记录与图型字段不匹配。'));
      const next=structuredClone(current);next.cells[row]=values.map(String);return commit(next,true);
    },
    setMeta(path,value){
      const parts=path.split('.');
      if(parts.some(p=>['__proto__','prototype','constructor'].includes(p))||parts.length>2||['version','template','data'].includes(parts[0]))throw new Error(uiText('这个字段不能修改。'));
      const next=structuredClone(current);
      if(path==='unit')next.meta=withDataUnit(next.meta,value);
      if(parts.length===2){if(!next.meta[parts[0]]||!Object.hasOwn(next.meta[parts[0]],parts[1]))throw new Error(uiText('字段不存在。'));next.meta[parts[0]][parts[1]]=value;}
      else{if(!Object.hasOwn(next.meta,path))throw new Error(uiText('字段不存在。'));next.meta[path]=value;}
      if(path==='source.name')next.meta.source.type='user';
      return commit(next);
    },
    addRow(){if(current.cells.length>=TABLE_LIMIT)throw new Error(uiText('单张图最多 1,500 行。'));const next=structuredClone(current);next.cells.push(Array(findTemplate(original.template).fields.length).fill(''));return commit(next,true);},
    deleteRow(row){if(!current.cells[row])return report;const next=structuredClone(current);next.cells.splice(row,1);next.rowMeta.splice(row,1);return commit(next,true);},
    insertRows(index,count=1){
      if(!Number.isInteger(index)||index<0||index>current.cells.length||!Number.isInteger(count)||count<1||count>TABLE_LIMIT)throw new Error(uiText('请输入有效的插入位置和行数。'));
      if(current.cells.length+count>TABLE_LIMIT)throw new Error(uiText('增加后超出 1,500 行，请减少行数。'));
      const next=structuredClone(current),rows=Array.from({length:count},()=>Array(findTemplate(original.template).fields.length).fill(''));
      next.cells.splice(index,0,...rows);next.rowMeta.splice(index,0,...rows.map(()=>({_id:newRecordId()})));return commit(next,true);
    },
    deleteRows(top,bottom){
      checkedRange({top,bottom,left:0,right:0},current.cells);
      const next=structuredClone(current);next.cells.splice(top,bottom-top+1);next.rowMeta.splice(top,bottom-top+1);return commit(next,true);
    },
    fillRange(range,value,{down=false}={}){
      checkedRange(range,current.cells);const next=structuredClone(current);
      for(let r=range.top;r<=range.bottom;r++)for(let c=range.left;c<=range.right;c++)next.cells[r][c]=down?current.cells[range.top][c]:String(value);
      return commit(next,true);
    },
    paste(matrix,row,col){const next=structuredClone(current);next.cells=pasteCells(next.cells,matrix,row,col,findTemplate(original.template).fields.length);return commit(next,true);},
    replace(doc){if(doc.template!==original.template)throw new Error(uiText('导入数据的图型不匹配。'));return commit(snapshotOf(withEditorAxes(doc)));},
    undo(){current=history.undo();return review();},redo(){current=history.redo();return review();},
  };
}

export function normalizeEditorRecords(value){
  if(!Array.isArray(value))return [];
  const seen=new Set();
  return value.filter(item=>{
    if(typeof item?.key!=='string'||item.key.length>160||seen.has(item.key)||!validateDocument(item.doc).dataValid)return false;
    seen.add(item.key);return true;
  }).slice(0,EDITOR_LIMIT).map(item=>({key:item.key,doc:structuredClone(item.doc),options:cleanOptions(item.options),
    savedId:typeof item.savedId==='string'?item.savedId:undefined,
    draft:safeDraft(item.draft,item.doc)?structuredClone(item.draft):undefined}));
}
